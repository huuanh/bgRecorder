package boom.bvr.recorder.pro

import android.Manifest
import android.app.*
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.hardware.camera2.*
import android.hardware.camera2.params.OutputConfiguration
import android.hardware.camera2.params.SessionConfiguration
import android.media.CamcorderProfile
import android.media.MediaRecorder
import android.os.*
import android.util.Log
import android.util.Size
import android.view.Surface
import android.view.SurfaceHolder
import android.view.SurfaceView
import androidx.annotation.RequiresPermission
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import android.os.Environment
import android.content.ContentValues
import android.provider.MediaStore
import android.media.MediaScannerConnection
import android.net.Uri
import android.content.SharedPreferences
import java.io.File
import java.text.SimpleDateFormat
import java.util.*

class VideoRecordingService : Service() {
    
    companion object {
        const val TAG = "VideoRecordingService"
        const val NOTIFICATION_ID = 1
        const val CHANNEL_ID = "video_recording_channel"
        
        // Actions
        const val ACTION_START_RECORDING = "start_recording"
        const val ACTION_STOP_RECORDING = "stop_recording"
        const val ACTION_SHOW_OVERLAY = "show_overlay"
        
        // Extras
        const val EXTRA_DURATION = "duration"
        const val EXTRA_QUALITY = "quality"
        const val EXTRA_CAMERA = "camera"
        const val EXTRA_PREVIEW = "preview"
        const val EXTRA_AUTO_SPLIT = "autoSplit"
    }
    
    private var mediaRecorder: MediaRecorder? = null
    private var cameraDevice: CameraDevice? = null
    private var cameraManager: CameraManager? = null
    private var recordingSurface: Surface? = null
    private var previewSurface: Surface? = null
    private var overlayManager: OverlayManager? = null
    private var captureSession: CameraCaptureSession? = null
    
    private var isRecording = false
    private var startTime = 0L
    private var recordingSettings = mutableMapOf<String, Any>()
    private var recordingFile: File? = null
    
    private val handler = Handler(Looper.getMainLooper())
    private var autoStopRunnable: Runnable? = null
    private var autoSplitRunnable: Runnable? = null
    private var isAutoSplitEnabled = false
    private var splitCounter = 1
    
    private val binder = LocalBinder()
    
    inner class LocalBinder : Binder() {
        fun getService(): VideoRecordingService = this@VideoRecordingService
    }
    
    override fun onCreate() {
        super.onCreate()
        Log.d(TAG, "VideoRecordingService created")
        createNotificationChannel()
        cameraManager = getSystemService(Context.CAMERA_SERVICE) as CameraManager
        overlayManager = OverlayManager(this)
        
        // Initialize preview size settings when service is created
        loadAndApplyPreviewSizeSettings()
    }
    
    @RequiresPermission(Manifest.permission.CAMERA)
    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        Log.d(TAG, "onStartCommand: ${intent?.action}")
        
        when (intent?.action) {
            ACTION_START_RECORDING -> {
                val duration = intent.getIntExtra(EXTRA_DURATION, 5) * 60 * 1000L // Convert to milliseconds
                val quality = intent.getStringExtra(EXTRA_QUALITY) ?: "HD"
                val camera = intent.getStringExtra(EXTRA_CAMERA) ?: "Back"
                val preview = intent.getBooleanExtra(EXTRA_PREVIEW, false)
                val autoSplit = intent.getBooleanExtra(EXTRA_AUTO_SPLIT, false)
                
                recordingSettings = mutableMapOf(
                    "duration" to duration,
                    "quality" to quality,
                    "camera" to camera,
                    "preview" to preview,
                    "autoSplit" to autoSplit
                )
                
                isAutoSplitEnabled = autoSplit
                splitCounter = 1
                
                startRecording()
                
                // Setup auto stop or auto split based on settings
                if (isAutoSplitEnabled && duration == -60000L) { // -1 minute means unlimited
                    setupAutoSplit() // Split every 3 minutes for unlimited recordings
                } else if (duration > 0) {
                    setupAutoStop(duration) // Normal timed recording
                }
            }
            ACTION_STOP_RECORDING -> {
                stopRecording()
            }
            ACTION_SHOW_OVERLAY -> {
                if (isRecording) {
                    // Load and apply preview size settings before showing overlay
                    loadAndApplyPreviewSizeSettings()
                    overlayManager?.showOverlay(cameraDevice, { stopRecording() }, this)
                    updateNotification("Recording video... (Overlay shown)")
                }
            }
        }
        
        return START_STICKY // Service will be restarted if killed
    }
    
    override fun onBind(intent: Intent): IBinder = binder
    
    @RequiresPermission(Manifest.permission.CAMERA)
    private fun startRecording() {
        startRecordingInternal()
    }
    
    @RequiresPermission(Manifest.permission.CAMERA)
    private fun startRecordingInternal() {
        try {
            Log.d(TAG, "Starting recording with settings: $recordingSettings")
            
            if (isRecording) {
                Log.w(TAG, "Already recording")
                return
            }
            
            // Create output file
            createOutputFile()
            
            // Setup media recorder
            setupMediaRecorder()
            
            // Setup camera (overlay will be shown in camera callback)
            setupCamera()
            
            // Start foreground notification
            startForeground(NOTIFICATION_ID, createNotification("Recording video...", true))
            
            // Start recording
            mediaRecorder?.start()
            isRecording = true
            startTime = System.currentTimeMillis()
            
            // Send broadcast
            sendBroadcast(Intent("com.bgrecorder.RECORDING_STARTED"))
            
            Log.d(TAG, "Recording started successfully")
            
        } catch (e: Exception) {
            Log.e(TAG, "Failed to start recording", e)
            stopRecording()
        }
    }
    
    private fun stopRecording() {
        stopRecordingInternal(true)
    }
    
    private fun stopRecordingInternal(sendBroadcast: Boolean = true) {
        try {
            Log.d(TAG, "Stopping recording (sendBroadcast: $sendBroadcast)")
            
            if (!isRecording) {
                Log.w(TAG, "Not recording")
                return
            }
            
            // Stop auto-stop and auto-split timers
            autoStopRunnable?.let { handler.removeCallbacks(it) }
            autoSplitRunnable?.let { handler.removeCallbacks(it) }
            
            // Hide overlay
            overlayManager?.stopRecording()
            overlayManager?.hideOverlay()
            
            // Stop media recorder
            mediaRecorder?.apply {
                try {
                    stop()
                    reset()
                    release()
                } catch (e: Exception) {
                    Log.e(TAG, "Error stopping MediaRecorder", e)
                }
            }
            mediaRecorder = null
            
            // Close camera
            captureSession?.close()
            captureSession = null
            cameraDevice?.close()
            cameraDevice = null
            
            // Clear preview surface
            previewSurface = null
            
            val duration = System.currentTimeMillis() - startTime
            isRecording = false
            
            // Update notification
            val notification = createNotification("Recording completed", false)
            val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.notify(NOTIFICATION_ID, notification)
            
            // Get file size
            val fileSize = recordingFile?.let { file ->
                if (file.exists()) {
                    val sizeInBytes = file.length()
                    when {
                        sizeInBytes >= 1024 * 1024 * 1024 -> "${sizeInBytes / (1024 * 1024 * 1024)} GB"
                        sizeInBytes >= 1024 * 1024 -> "${sizeInBytes / (1024 * 1024)} MB"
                        sizeInBytes >= 1024 -> "${sizeInBytes / 1024} KB"
                        else -> "$sizeInBytes B"
                    }
                } else "Unknown"
            } ?: "Unknown"

            // Send broadcast with full metadata (only if requested)
            if (sendBroadcast) {
                sendBroadcast(Intent("com.bgrecorder.RECORDING_STOPPED").apply {
                    putExtra("duration", duration)
                    putExtra("filePath", recordingFile?.absolutePath)
                    putExtra("fileName", recordingFile?.name)
                    putExtra("fileSize", fileSize)
                    putExtra("quality", recordingSettings["quality"] as? String ?: "HD 720p")
                    putExtra("camera", recordingSettings["camera"] as? String ?: "Back")
                    putExtra("timestamp", System.currentTimeMillis())
                })
            }
            
            // Notify MediaStore so video appears in Gallery
            recordingFile?.let { file ->
                if (file.exists()) {
                    addVideoToMediaStore(file)
                }
            }
            
            Log.d(TAG, "Recording stopped. Duration: ${duration}ms, File: ${recordingFile?.absolutePath}")
            
            // Stop foreground service after delay
            handler.postDelayed({
                stopForeground(STOP_FOREGROUND_REMOVE)
                stopSelf()
            }, 3000)
            
        } catch (e: Exception) {
            Log.e(TAG, "Failed to stop recording", e)
        }
    }
    
    private fun createOutputFile() {
        val timestamp = SimpleDateFormat("yyyyMMdd_HHmmss", Locale.getDefault()).format(Date())
        // Add app identifier prefix for easy filtering in gallery
        // Include split counter if auto split is enabled
        val fileName = if (isAutoSplitEnabled && splitCounter > 1) {
            "BGREC_${timestamp}_part${splitCounter}.mp4"
        } else {
            "BGREC_${timestamp}.mp4"
        }
        
        // Use Movies directory in DCIM so videos appear in Gallery
        val moviesDir = File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_MOVIES), "BgRecorder")
        
        // Ensure directory exists
        if (!moviesDir.exists()) {
            val created = moviesDir.mkdirs()
            Log.d(TAG, "Created BgRecorder directory in Movies: $created, Path: ${moviesDir.absolutePath}")
        }
        
        recordingFile = File(moviesDir, fileName)
        Log.d(TAG, "Output file will be: ${recordingFile?.absolutePath}")
    }
    
    private fun setupMediaRecorder() {
        mediaRecorder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            MediaRecorder(this)
        } else {
            @Suppress("DEPRECATION")
            MediaRecorder()
        }.apply {
            // Set audio source first
            setAudioSource(MediaRecorder.AudioSource.MIC)
            setVideoSource(MediaRecorder.VideoSource.SURFACE)
            setOutputFormat(MediaRecorder.OutputFormat.MPEG_4)
            setOutputFile(recordingFile?.absolutePath)
            
            // Set quality based on settings (Portrait orientation)
            val quality = recordingSettings["quality"] as String
//            val profile = CamcorderProfile.get(CamcorderProfile.QUALITY_480P)
            when (quality) {
                "SD" -> {
                    setVideoSize(640, 360) // QCIF  (4:3) 352*288
                    setVideoEncodingBitRate(256000)
                }
                "HD" -> {
                    setVideoSize(720, 480) // nHD   (16:9) 640*360
                    setVideoEncodingBitRate(256000)
                }
                "Full HD" -> {
                    setVideoSize(1280, 720) // 3:2   720*480
                    setVideoEncodingBitRate(512000)
                }
                else -> {
                    setVideoSize(352, 288)
                    setVideoEncodingBitRate(10000)
                }
            }

            setVideoEncoder(MediaRecorder.VideoEncoder.HEVC)
            setVideoFrameRate(24)
            
            // Set orientation for portrait recording
            val isFrontCamera = recordingSettings["camera"] == "Front"
            if (isFrontCamera) {
                setOrientationHint(270) // Front camera
            } else {
                setOrientationHint(90)  // Back camera
            }
            
            // Set audio encoding
            setAudioEncoder(MediaRecorder.AudioEncoder.AAC)
            setAudioSamplingRate(16000)
            setAudioEncodingBitRate(64000)
            
            prepare()
            recordingSurface = surface
        }
    }
    
    @RequiresPermission(Manifest.permission.CAMERA)
    private fun setupCamera() {
        try {
            val cameraId = if (recordingSettings["camera"] == "Front") "1" else "0"
            
            cameraManager?.openCamera(cameraId, object : CameraDevice.StateCallback() {
                override fun onOpened(camera: CameraDevice) {
                    Log.d(TAG, "Camera opened: $cameraId")
                    cameraDevice = camera
                    
                    // Show overlay if preview is enabled (after camera is ready)
                    val showPreview = recordingSettings["preview"] as? Boolean ?: false
                    Log.d(TAG, "OVERLAY_DEBUG: Show preview setting: $showPreview")
                    
                    if (showPreview) {
                        val service = this@VideoRecordingService
                        Log.d(TAG, "OVERLAY_DEBUG: About to show overlay with overlay manager: ${overlayManager != null}")
                        
                        // Load and apply preview size settings before showing overlay
                        loadAndApplyPreviewSizeSettings()
                        
                        val overlayResult = overlayManager?.showOverlay(cameraDevice, {
                            // Callback when user closes overlay - stop recording
                            Log.d(TAG, "OVERLAY_DEBUG: User requested stop recording from overlay")
                            stopRecording()
                        }, service)
                        
                        Log.d(TAG, "OVERLAY_DEBUG: Overlay show result: $overlayResult")
                        overlayManager?.startRecording()
                    }
                    
                    startCameraRecording()
                }
                
                override fun onDisconnected(camera: CameraDevice) {
                    Log.d(TAG, "Camera disconnected")
                    camera.close()
                    cameraDevice = null
                }
                
                override fun onError(camera: CameraDevice, error: Int) {
                    Log.e(TAG, "Camera error: $error")
                    camera.close()
                    cameraDevice = null
                }
            }, null)
            
        } catch (e: Exception) {
            Log.e(TAG, "Failed to setup camera", e)
        }
    }
    
    private fun startCameraRecording() {
        try {
            Log.d(TAG, "OVERLAY_DEBUG: Starting camera recording with preview")
            
            // Check if recording surface is safe
            val recSurface = recordingSurface
            if (!isSurfaceSafe(recSurface)) {
                Log.e(TAG, "OVERLAY_DEBUG: Recording surface is unsafe, cannot start recording")
                return
            }
            
            val captureRequestBuilder = cameraDevice?.createCaptureRequest(CameraDevice.TEMPLATE_RECORD)
            if (captureRequestBuilder == null) {
                Log.e(TAG, "OVERLAY_DEBUG: Cannot create capture request builder")
                return
            }
            
            captureRequestBuilder.addTarget(recSurface!!)
            
            val surfaces = mutableListOf<Surface>().apply {
                add(recSurface!!)
            }
            
            // Add preview surface if overlay is showing and surface is safe
            previewSurface?.let { surface ->
                if (isSurfaceSafe(surface)) {
                    captureRequestBuilder.addTarget(surface)
                    surfaces.add(surface)
                    Log.d(TAG, "OVERLAY_DEBUG: Added safe preview surface to capture request")
                } else {
                    Log.w(TAG, "OVERLAY_DEBUG: Preview surface is unsafe, skipping")
                }
            }
            
            // Use new SessionConfiguration API (API 28+) or fallback to deprecated method
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                val outputConfigurations = createSafeOutputConfigurations(surfaces)
                if (outputConfigurations == null || outputConfigurations.isEmpty()) {
                    Log.e(TAG, "OVERLAY_DEBUG: No valid surfaces for session configuration")
                    return
                }
                
                val sessionConfiguration = SessionConfiguration(
                    SessionConfiguration.SESSION_REGULAR,
                    outputConfigurations,
                    ContextCompat.getMainExecutor(this@VideoRecordingService),
                    object : CameraCaptureSession.StateCallback() {
                        override fun onConfigured(session: CameraCaptureSession) {
                            try {
                                captureSession = session
                                session.setRepeatingRequest(
                                    captureRequestBuilder!!.build(),
                                    null,
                                    null
                                )
                                Log.d(TAG, "OVERLAY_DEBUG: Camera capture session started with ${surfaces.size} surfaces")
                            } catch (e: Exception) {
                                Log.e(TAG, "Failed to start capture session", e)
                            }
                        }
                        
                        override fun onConfigureFailed(session: CameraCaptureSession) {
                            Log.e(TAG, "Capture session configuration failed")
                        }
                    }
                )
                cameraDevice?.createCaptureSession(sessionConfiguration)
            } else {
                // Fallback for older Android versions
                @Suppress("DEPRECATION")
                cameraDevice?.createCaptureSession(
                    surfaces,
                    object : CameraCaptureSession.StateCallback() {
                        override fun onConfigured(session: CameraCaptureSession) {
                            try {
                                captureSession = session
                                session.setRepeatingRequest(
                                    captureRequestBuilder!!.build(),
                                    null,
                                    null
                                )
                                Log.d(TAG, "OVERLAY_DEBUG: Camera capture session started with ${surfaces.size} surfaces")
                            } catch (e: Exception) {
                                Log.e(TAG, "Failed to start capture session", e)
                            }
                        }
                        
                        override fun onConfigureFailed(session: CameraCaptureSession) {
                            Log.e(TAG, "Capture session configuration failed")
                        }
                    },
                    null
                )
            }
            
        } catch (e: Exception) {
            Log.e(TAG, "Failed to start camera recording", e)
        }
    }
    
    private fun startCameraRecordingWithoutPreview() {
        try {
            Log.d(TAG, "OVERLAY_DEBUG: Starting camera recording without preview")
            
            // Check if recording surface is safe
            val recSurface = recordingSurface
            if (!isSurfaceSafe(recSurface)) {
                Log.e(TAG, "OVERLAY_DEBUG: Recording surface is unsafe, cannot start recording")
                return
            }
            
            val captureRequestBuilder = cameraDevice?.createCaptureRequest(CameraDevice.TEMPLATE_RECORD)
            if (captureRequestBuilder == null) {
                Log.e(TAG, "OVERLAY_DEBUG: Cannot create capture request builder")
                return
            }
            
            captureRequestBuilder.addTarget(recSurface!!)
            
            // Chỉ sử dụng recording surface, không có preview
            val surfaces = listOf(recSurface!!)
            
            // Use new SessionConfiguration API (API 28+) or fallback to deprecated method
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                val outputConfigurations = createSafeOutputConfigurations(surfaces)
                if (outputConfigurations == null || outputConfigurations.isEmpty()) {
                    Log.e(TAG, "OVERLAY_DEBUG: No valid surfaces for recording-only session configuration")
                    return
                }
                
                val sessionConfiguration = SessionConfiguration(
                    SessionConfiguration.SESSION_REGULAR,
                    outputConfigurations,
                    ContextCompat.getMainExecutor(this@VideoRecordingService),
                    object : CameraCaptureSession.StateCallback() {
                        override fun onConfigured(session: CameraCaptureSession) {
                            try {
                                captureSession = session
                                session.setRepeatingRequest(
                                    captureRequestBuilder.build(),
                                    null,
                                    null
                                )
                                Log.d(TAG, "OVERLAY_DEBUG: Recording-only capture session started successfully")
                            } catch (e: Exception) {
                                Log.e(TAG, "Failed to start recording-only capture session", e)
                            }
                        }
                        
                        override fun onConfigureFailed(session: CameraCaptureSession) {
                            Log.e(TAG, "Recording-only capture session configuration failed")
                        }
                    }
                )
                cameraDevice?.createCaptureSession(sessionConfiguration)
            } else {
                // Fallback for older Android versions
                @Suppress("DEPRECATION")
                cameraDevice?.createCaptureSession(
                    surfaces,
                    object : CameraCaptureSession.StateCallback() {
                        override fun onConfigured(session: CameraCaptureSession) {
                            try {
                                captureSession = session
                                session.setRepeatingRequest(
                                    captureRequestBuilder.build(),
                                    null,
                                    null
                                )
                                Log.d(TAG, "OVERLAY_DEBUG: Recording-only capture session started (legacy)")
                            } catch (e: Exception) {
                                Log.e(TAG, "Failed to start recording-only capture session (legacy)", e)
                            }
                        }
                        
                        override fun onConfigureFailed(session: CameraCaptureSession) {
                            Log.e(TAG, "Recording-only capture session configuration failed (legacy)")
                        }
                    },
                    null
                )
            }
            
        } catch (e: Exception) {
            Log.e(TAG, "Failed to start camera recording without preview", e)
        }
    }
    
    private fun isSurfaceSafe(surface: Surface?): Boolean {
        return try {
            surface != null && surface.isValid
        } catch (e: Exception) {
            Log.w(TAG, "OVERLAY_DEBUG: Error checking surface validity: ${e.message}")
            false
        }
    }
    
    private fun createSafeOutputConfigurations(surfaces: List<Surface>): List<OutputConfiguration>? {
        return try {
            val validConfigurations = surfaces.mapNotNull { surface ->
                try {
                    // Use safe surface check and create config atomically
                    if (isSurfaceSafe(surface)) {
                        OutputConfiguration(surface)
                    } else {
                        Log.w(TAG, "OVERLAY_DEBUG: Skipping unsafe surface in createSafeOutputConfigurations")
                        null
                    }
                } catch (e: IllegalArgumentException) {
                    // Surface became abandoned between check and OutputConfiguration creation
                    Log.w(TAG, "OVERLAY_DEBUG: Surface became abandoned during OutputConfiguration creation: ${e.message}")
                    null
                } catch (e: Exception) {
                    Log.e(TAG, "OVERLAY_DEBUG: Unexpected error creating OutputConfiguration", e)
                    null
                }
            }
            
            if (validConfigurations.isNotEmpty()) {
                Log.d(TAG, "OVERLAY_DEBUG: Created ${validConfigurations.size} valid output configurations from ${surfaces.size} surfaces")
                validConfigurations
            } else {
                Log.w(TAG, "OVERLAY_DEBUG: No valid output configurations could be created from ${surfaces.size} surfaces")
                null
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to create output configurations", e)
            null
        }
    }
    
    private fun loadAndApplyPreviewSizeSettings() {
        try {
            val prefs = getSharedPreferences("RNAsyncStorageDataSource", Context.MODE_PRIVATE)
            val cameraSettingsJson = prefs.getString("camera_settings", null)
            
            if (cameraSettingsJson != null) {
                Log.d(TAG, "OVERLAY_DEBUG: Found camera settings: $cameraSettingsJson")
                
                // Parse JSON manually (simple approach)
                val previewSize = when {
                    cameraSettingsJson.contains("\"previewSize\":\"small\"") -> "small"
                    cameraSettingsJson.contains("\"previewSize\":\"large\"") -> "large"
                    else -> "medium"
                }
                
                val (width, height) = when (previewSize) {
                    "small" -> Pair(135, 180)  // 3:4 ratio - portrait orientation
                    "large" -> Pair(225, 300)  // 3:4 ratio - portrait orientation
                    else -> Pair(180, 240)     // medium 3:4 ratio - portrait orientation
                }
                
                Log.d(TAG, "OVERLAY_DEBUG: Loaded preview size: $previewSize (${width}x${height})")
                overlayManager?.setPreviewSize(width, height)
            } else {
                Log.d(TAG, "OVERLAY_DEBUG: No camera settings found, using default medium size")
                overlayManager?.setPreviewSize(180, 240) // Default medium - portrait orientation
            }
        } catch (e: Exception) {
            Log.e(TAG, "OVERLAY_DEBUG: Failed to load preview size settings", e)
            overlayManager?.setPreviewSize(180, 240) // Fallback to default - portrait orientation
        }
    }
    
    private fun setupAutoStop(duration: Long) {
        autoStopRunnable = Runnable {
            Log.d(TAG, "Auto-stopping recording after ${duration}ms")
            stopRecording()
        }
        handler.postDelayed(autoStopRunnable!!, duration)
    }
    
    private fun setupAutoSplit() {
        val splitInterval = 3 * 60 * 1000L // 3 minutes in milliseconds
        autoSplitRunnable = Runnable {
            Log.d(TAG, "Auto-splitting recording after 3 minutes (part ${splitCounter})")
            performAutoSplit()
        }
        handler.postDelayed(autoSplitRunnable!!, splitInterval)
        Log.d(TAG, "✅ Auto split setup: will split every 3 minutes")
    }
    
    private fun performAutoSplit() {
        try {
            Log.d(TAG, "🔄 Starting auto split process...")
            
            // Stop current recording
            val currentRecordingFile = recordingFile
            val currentDuration = System.currentTimeMillis() - startTime
            stopRecordingInternal(false) // Don't send broadcast yet
            
            // Increment split counter for next part
            splitCounter++
            
            // Start new recording immediately
            Log.d(TAG, "📹 Starting recording part ${splitCounter}")
            startRecordingInternal()
            
            // Send broadcast for completed part
            currentRecordingFile?.let { file ->
                sendRecordingSplitBroadcast(file, currentDuration, splitCounter - 1)
            }
            
            // Setup next split
            if (isAutoSplitEnabled && isRecording) {
                setupAutoSplit()
            }
            
        } catch (e: Exception) {
            Log.e(TAG, "❌ Auto split failed", e)
            // If split fails, just continue recording
        }
    }
    
    private fun sendRecordingSplitBroadcast(file: File, duration: Long, partNumber: Int) {
        // Get file size
        val fileSize = if (file.exists()) {
            val sizeInBytes = file.length()
            when {
                sizeInBytes >= 1024 * 1024 * 1024 -> "${sizeInBytes / (1024 * 1024 * 1024)} GB"
                sizeInBytes >= 1024 * 1024 -> "${sizeInBytes / (1024 * 1024)} MB"
                sizeInBytes >= 1024 -> "${sizeInBytes / 1024} KB"
                else -> "$sizeInBytes B"
            }
        } else "Unknown"
        
        // Send broadcast for this split part
        sendBroadcast(Intent("com.bgrecorder.RECORDING_SPLIT").apply {
            putExtra("duration", duration)
            putExtra("filePath", file.absolutePath)
            putExtra("fileName", file.name)
            putExtra("fileSize", fileSize)
            putExtra("partNumber", partNumber)
            putExtra("quality", recordingSettings["quality"] as? String ?: "HD 720p")
            putExtra("camera", recordingSettings["camera"] as? String ?: "Back")
            putExtra("timestamp", System.currentTimeMillis())
        })
        
        // Notify MediaStore so video appears in Gallery
        if (file.exists()) {
            addVideoToMediaStore(file)
        }
        
        Log.d(TAG, "✅ Split part ${partNumber} completed. Duration: ${duration}ms, File: ${file.absolutePath}")
    }
    
    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Video Recording",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Background video recording service"
                setSound(null, null)
                enableVibration(false)
            }
            
            val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.createNotificationChannel(channel)
        }
    }
    
    private fun createNotification(message: String, isRecording: Boolean): Notification {
        val stopIntent = Intent(this, VideoRecordingService::class.java).apply {
            action = ACTION_STOP_RECORDING
        }
        val stopPendingIntent = PendingIntent.getService(
            this, 0, stopIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        
        val showOverlayIntent = Intent(this, VideoRecordingService::class.java).apply {
            action = ACTION_SHOW_OVERLAY
        }
        val showOverlayPendingIntent = PendingIntent.getService(
            this, 1, showOverlayIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Background Video Recorder")
            .setContentText(message)
            .setSmallIcon(android.R.drawable.ic_media_play)
            .setColor(Color.RED)
            .setOngoing(isRecording)
            .setAutoCancel(!isRecording)
            .apply {
                if (isRecording) {
                    addAction(
                        android.R.drawable.ic_media_pause,
                        "Stop Recording",
                        stopPendingIntent
                    )
                    addAction(
                        android.R.drawable.ic_menu_view,
                        "Show Overlay",
                        showOverlayPendingIntent
                    )
                }
            }
            .build()
    }
    
    fun updateNotification(message: String) {
        if (isRecording) {
            val notification = createNotification(message, true)
            val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.notify(NOTIFICATION_ID, notification)
        }
    }
    
    // Public methods for module access
    fun getRecordingStatus(): Boolean = isRecording
    
    fun getOverlayManager(): OverlayManager? = overlayManager
    
    fun getCameraDevice(): CameraDevice? = cameraDevice
    
    fun setPreviewSurface(surface: Surface?) {
        // Clean up old surface if it's unsafe
        previewSurface?.let { oldSurface ->
            if (!isSurfaceSafe(oldSurface)) {
                Log.d(TAG, "OVERLAY_DEBUG: Cleaning up unsafe preview surface")
                previewSurface = null
            }
        }
        
        previewSurface = surface
        Log.d(TAG, "OVERLAY_DEBUG: Preview surface set: ${surface != null}, safe: ${isSurfaceSafe(surface)}")
        Log.d(TAG, "OVERLAY_DEBUG: Current state - isRecording: $isRecording, cameraDevice: ${cameraDevice != null}, captureSession: ${captureSession != null}")
        
        // If recording is active and camera device exists
        if (isRecording && cameraDevice != null) {
            if (isSurfaceSafe(surface)) {
                // Surface được set lại (show overlay) - restart capture session với preview
                Log.d(TAG, "OVERLAY_DEBUG: Restarting capture session with preview surface")
                try {
                    captureSession?.close()
                    captureSession = null
                    
                    handler.postDelayed({
                        // Triple check all conditions before restarting
                        val currentPreviewSurface = previewSurface
                        val currentRecordingSurface = recordingSurface
                        
                        Log.d(TAG, "OVERLAY_DEBUG: Delayed restart check - preview safe: ${isSurfaceSafe(currentPreviewSurface)}, recording safe: ${isSurfaceSafe(currentRecordingSurface)}")
                        
                        if (isSurfaceSafe(currentPreviewSurface) && isSurfaceSafe(currentRecordingSurface)) {
                            Log.d(TAG, "OVERLAY_DEBUG: Starting new capture session with preview")
                            startCameraRecording()
                        } else if (isSurfaceSafe(currentRecordingSurface)) {
                            Log.w(TAG, "OVERLAY_DEBUG: Preview surface became invalid, starting without preview")
                            startCameraRecordingWithoutPreview()
                        } else {
                            Log.e(TAG, "OVERLAY_DEBUG: All surfaces invalid, cannot restart recording")
                        }
                    }, 200) // Further increased delay for better stability
                    
                } catch (e: Exception) {
                    Log.e(TAG, "OVERLAY_DEBUG: Failed to restart capture session with preview", e)
                }
            } else {
                // Surface = null hoặc invalid (hide overlay) - chỉ ghi video, không có preview
                Log.d(TAG, "OVERLAY_DEBUG: Preview surface removed/invalid, continuing recording without preview")
                
                // Kiểm tra recording surface vẫn safe trước khi restart
                val recSurface = recordingSurface
                if (!isSurfaceSafe(recSurface)) {
                    Log.e(TAG, "OVERLAY_DEBUG: Recording surface is unsafe, cannot continue recording")
                    return
                }
                
                try {
                    // Restart capture session chỉ với recording surface (không có preview)
                    captureSession?.close()
                    captureSession = null
                    
                    handler.postDelayed({
                        // Check recording surface is still safe before restarting
                        val currentRecordingSurface = recordingSurface
                        if (isSurfaceSafe(currentRecordingSurface)) {
                            Log.d(TAG, "OVERLAY_DEBUG: Starting recording-only capture session")
                            startCameraRecordingWithoutPreview()
                        } else {
                            Log.e(TAG, "OVERLAY_DEBUG: Recording surface became invalid, cannot restart")
                        }
                    }, 200) // Matched delay for consistency
                    
                } catch (e: Exception) {
                    Log.e(TAG, "OVERLAY_DEBUG: Failed to restart recording-only session", e)
                }
            }
        } else {
            Log.d(TAG, "OVERLAY_DEBUG: Not restarting capture session - conditions not met")
        }
    }
    
    fun getRecordingDuration(): Long = 
        if (isRecording) System.currentTimeMillis() - startTime else 0L
    
    fun getRecordingSettings(): Map<String, Any> = recordingSettings.toMap()
    
    fun showOverlayDuringRecording(): Boolean {
        return if (isRecording && overlayManager != null) {
            // Load and apply preview size settings before showing overlay
            loadAndApplyPreviewSizeSettings()
            overlayManager!!.showOverlayDuringRecording()
        } else {
            Log.w(TAG, "Cannot show overlay - not recording or overlay manager not available")
            false
        }
    }
    
    fun getRecordedVideosDirectory(): String {
        // Return the new Movies directory for backward compatibility
        val moviesDir = File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_MOVIES), "BgRecorder")
        if (!moviesDir.exists()) {
            val created = moviesDir.mkdirs()
            Log.d(TAG, "Created BgRecorder directory in Movies: $created, Path: ${moviesDir.absolutePath}")
        }
        return moviesDir.absolutePath
    }
    
    fun getRecordedVideosList(): List<Map<String, Any>> {
        val videosList = mutableListOf<Map<String, Any>>()
        
        // Scan both old and new directories for app-recorded videos
        val directories = listOf(
            File(getExternalFilesDir(null), "RecordedVideos"), // Old directory
            File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_MOVIES), "BgRecorder") // New directory
        )
        
        directories.forEach { dir ->
            if (dir.exists() && dir.isDirectory) {
                val videoFiles = dir.listFiles { file ->
                    file.isFile && file.name.endsWith(".mp4", ignoreCase = true) && 
                    (file.name.startsWith("BGREC_") || file.name.startsWith("REC_")) // Filter app-recorded videos
                }
                
                videoFiles?.sortedByDescending { it.lastModified() }?.forEach { file ->
                    val sizeInBytes = file.length()
                    val sizeFormatted = when {
                        sizeInBytes >= 1024 * 1024 * 1024 -> "${sizeInBytes / (1024 * 1024 * 1024)} GB"
                        sizeInBytes >= 1024 * 1024 -> "${sizeInBytes / (1024 * 1024)} MB"
                        sizeInBytes >= 1024 -> "${sizeInBytes / 1024} KB"
                        else -> "$sizeInBytes B"
                    }
                    
                    videosList.add(mapOf(
                        "id" to file.name.hashCode(),
                        "title" to file.name,
                        "filePath" to file.absolutePath,
                        "size" to sizeFormatted,
                        "duration" to "00:00:00", // Would need MediaMetadataRetriever for actual duration
                        "date" to SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.getDefault()).format(Date(file.lastModified())),
                        "isAppRecording" to true // Mark as app-recorded video
                    ))
                }
            }
        }
        
        return videosList.sortedByDescending { (it["date"] as String) }
    }
    
    private fun addVideoToMediaStore(videoFile: File) {
        try {
            Log.d(TAG, "Adding video to MediaStore: ${videoFile.absolutePath}")
            
            // Method 1: Use MediaScannerConnection for reliable scanning
            MediaScannerConnection.scanFile(
                this,
                arrayOf(videoFile.absolutePath),
                arrayOf("video/mp4")
            ) { path, uri ->
                Log.d(TAG, "MediaScanner completed for: $path with URI: $uri")
            }
            
            // Method 2: Broadcast media scan intent as backup
            sendBroadcast(Intent(Intent.ACTION_MEDIA_SCANNER_SCAN_FILE).apply {
                data = Uri.fromFile(videoFile)
            })
            
            Log.d(TAG, "Video scan initiated for Gallery visibility")
            
        } catch (e: Exception) {
            Log.e(TAG, "Error scanning video file", e)
        }
    }
    
    override fun onDestroy() {
        super.onDestroy()
        Log.d(TAG, "VideoRecordingService destroyed")
        if (isRecording) {
            stopRecording()
        }
        overlayManager?.destroy()
    }
}