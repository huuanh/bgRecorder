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
    }
    
    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        Log.d(TAG, "onStartCommand: ${intent?.action}")
        
        when (intent?.action) {
            ACTION_START_RECORDING -> {
                val duration = intent.getIntExtra(EXTRA_DURATION, 5) * 60 * 1000L // Convert to milliseconds
                val quality = intent.getStringExtra(EXTRA_QUALITY) ?: "HD"
                val camera = intent.getStringExtra(EXTRA_CAMERA) ?: "Back"
                val preview = intent.getBooleanExtra(EXTRA_PREVIEW, false)
                
                recordingSettings = mutableMapOf(
                    "duration" to duration,
                    "quality" to quality,
                    "camera" to camera,
                    "preview" to preview
                )
                
                startRecording()
                setupAutoStop(duration)
            }
            ACTION_STOP_RECORDING -> {
                stopRecording()
            }
            ACTION_SHOW_OVERLAY -> {
                if (isRecording) {
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
        try {
            Log.d(TAG, "Stopping recording")
            
            if (!isRecording) {
                Log.w(TAG, "Not recording")
                return
            }
            
            // Stop auto-stop timer
            autoStopRunnable?.let { handler.removeCallbacks(it) }
            
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

            // Send broadcast with full metadata
            sendBroadcast(Intent("com.bgrecorder.RECORDING_STOPPED").apply {
                putExtra("duration", duration)
                putExtra("filePath", recordingFile?.absolutePath)
                putExtra("fileName", recordingFile?.name)
                putExtra("fileSize", fileSize)
                putExtra("quality", recordingSettings["quality"] as? String ?: "HD 720p")
                putExtra("camera", recordingSettings["camera"] as? String ?: "Back")
                putExtra("timestamp", System.currentTimeMillis())
            })
            
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
        val fileName = "REC_${timestamp}.mp4"
        
        // Use the consistent directory method
        val appDataDir = File(getRecordedVideosDirectory())
        recordingFile = File(appDataDir, fileName)
        Log.d(TAG, "Output file will be: ${recordingFile?.absolutePath}")
        
        // Ensure parent directory exists
        recordingFile?.parentFile?.let { parentDir ->
            if (!parentDir.exists()) {
                parentDir.mkdirs()
            }
        }
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
            val captureRequestBuilder = cameraDevice?.createCaptureRequest(CameraDevice.TEMPLATE_RECORD)
            captureRequestBuilder?.addTarget(recordingSurface!!)
            
            // Add preview surface if overlay is showing
            previewSurface?.let { surface ->
                captureRequestBuilder?.addTarget(surface)
                Log.d(TAG, "OVERLAY_DEBUG: Added preview surface to capture request")
            }
            
            val surfaces = mutableListOf<Surface>().apply {
                add(recordingSurface!!)
                previewSurface?.let { add(it) }
            }
            
            // Use new SessionConfiguration API (API 28+) or fallback to deprecated method
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                val outputConfigurations = surfaces.map { OutputConfiguration(it) }
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
            val captureRequestBuilder = cameraDevice?.createCaptureRequest(CameraDevice.TEMPLATE_RECORD)
            captureRequestBuilder?.addTarget(recordingSurface!!)
            
            // Chỉ sử dụng recording surface, không có preview
            val surfaces = listOf(recordingSurface!!)
            
            // Use new SessionConfiguration API (API 28+) or fallback to deprecated method
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                val outputConfigurations = surfaces.map { OutputConfiguration(it) }
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
                                    captureRequestBuilder!!.build(),
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
    
    private fun setupAutoStop(duration: Long) {
        autoStopRunnable = Runnable {
            Log.d(TAG, "Auto-stopping recording after ${duration}ms")
            stopRecording()
        }
        handler.postDelayed(autoStopRunnable!!, duration)
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
        previewSurface = surface
        Log.d(TAG, "OVERLAY_DEBUG: Preview surface set: ${surface != null}")
        Log.d(TAG, "OVERLAY_DEBUG: Current state - isRecording: $isRecording, cameraDevice: ${cameraDevice != null}, captureSession: ${captureSession != null}")
        
        // If recording is active and camera device exists
        if (isRecording && cameraDevice != null) {
            if (surface != null) {
                // Surface được set lại (show overlay) - restart capture session với preview
                Log.d(TAG, "OVERLAY_DEBUG: Restarting capture session with preview surface")
                try {
                    captureSession?.close()
                    captureSession = null
                    
                    handler.postDelayed({
                        Log.d(TAG, "OVERLAY_DEBUG: Starting new capture session with preview")
                        startCameraRecording()
                    }, 100)
                    
                } catch (e: Exception) {
                    Log.e(TAG, "OVERLAY_DEBUG: Failed to restart capture session with preview", e)
                }
            } else {
                // Surface = null (hide overlay) - chỉ ghi video, không có preview
                Log.d(TAG, "OVERLAY_DEBUG: Preview surface removed, continuing recording without preview")
                try {
                    // Restart capture session chỉ với recording surface (không có preview)
                    captureSession?.close()
                    captureSession = null
                    
                    handler.postDelayed({
                        Log.d(TAG, "OVERLAY_DEBUG: Starting recording-only capture session")
                        startCameraRecordingWithoutPreview()
                    }, 100)
                    
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
            overlayManager!!.showOverlayDuringRecording()
        } else {
            Log.w(TAG, "Cannot show overlay - not recording or overlay manager not available")
            false
        }
    }
    
    fun getRecordedVideosDirectory(): String {
        val appDataDir = File(getExternalFilesDir(null), "RecordedVideos")
        if (!appDataDir.exists()) {
            val created = appDataDir.mkdirs()
            Log.d(TAG, "Created videos directory: $created, Path: ${appDataDir.absolutePath}")
        }
        return appDataDir.absolutePath
    }
    
    fun getRecordedVideosList(): List<Map<String, Any>> {
        val videosList = mutableListOf<Map<String, Any>>()
        val appDataDir = File(getRecordedVideosDirectory()) // Use the consistent directory method
        
        if (appDataDir.exists() && appDataDir.isDirectory) {
            val videoFiles = appDataDir.listFiles { file ->
                file.isFile && file.name.endsWith(".mp4", ignoreCase = true)
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
                    "id" to file.lastModified(),
                    "title" to file.name,
                    "filePath" to file.absolutePath,
                    "fileSize" to sizeFormatted,
                    "lastModified" to file.lastModified(),
                    "date" to SimpleDateFormat("dd/MM/yyyy HH:mm", Locale.getDefault()).format(Date(file.lastModified()))
                ))
            }
        }
        
        Log.d(TAG, "Found ${videosList.size} recorded videos in app directory")
        return videosList
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