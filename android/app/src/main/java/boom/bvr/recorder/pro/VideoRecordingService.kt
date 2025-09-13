package boom.bvr.recorder.pro

import android.app.*
import android.content.Context
import android.content.Intent
import android.os.Binder
import android.os.Build
import android.os.IBinder
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import java.text.SimpleDateFormat
import java.util.*

class VideoRecordingService : Service() {
    
    private val binder = LocalBinder()
    private var isRecording = false
    private var recordingStartTime: Long = 0
    private var recordingDuration: Int = 5 // minutes
    private var recordingQuality: String = "HD"
    private var cameraType: String = "front"
    private var enablePreview: Boolean = true
    
    companion object {
        const val TAG = "VideoRecordingService"
        const val NOTIFICATION_ID = 1001
        const val CHANNEL_ID = "video_recording_channel"
        const val ACTION_START_RECORDING = "START_RECORDING"
        const val ACTION_STOP_RECORDING = "STOP_RECORDING"
        
        // Recording settings extras
        const val EXTRA_DURATION = "duration"
        const val EXTRA_QUALITY = "quality"
        const val EXTRA_CAMERA = "camera"
        const val EXTRA_PREVIEW = "preview"
    }
    
    inner class LocalBinder : Binder() {
        fun getService(): VideoRecordingService = this@VideoRecordingService
    }
    
    override fun onCreate() {
        super.onCreate()
        Log.d(TAG, "VideoRecordingService created")
        createNotificationChannel()
    }
    
    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        Log.d(TAG, "onStartCommand: ${intent?.action}")
        
        when (intent?.action) {
            ACTION_START_RECORDING -> {
                // Get recording settings from intent
                recordingDuration = intent.getIntExtra(EXTRA_DURATION, 5)
                recordingQuality = intent.getStringExtra(EXTRA_QUALITY) ?: "HD"
                cameraType = intent.getStringExtra(EXTRA_CAMERA) ?: "front"
                enablePreview = intent.getBooleanExtra(EXTRA_PREVIEW, true)
                
                startRecording()
            }
            ACTION_STOP_RECORDING -> {
                stopRecording()
            }
        }
        
        return START_STICKY // Restart service if killed
    }
    
    override fun onBind(intent: Intent?): IBinder {
        Log.d(TAG, "Service bound")
        return binder
    }
    
    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Video Recording",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Background video recording notification"
                setSound(null, null)
                enableVibration(false)
            }
            
            val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.createNotificationChannel(channel)
        }
    }
    
    private fun startRecording() {
        if (isRecording) {
            Log.w(TAG, "Recording already in progress")
            return
        }
        
        recordingStartTime = System.currentTimeMillis()
        isRecording = true
        
        Log.d(TAG, "Starting recording: quality=$recordingQuality, duration=${recordingDuration}min, camera=$cameraType, preview=$enablePreview")
        
        // Start foreground service with notification
        val notification = createRecordingNotification()
        startForeground(NOTIFICATION_ID, notification)
        
        // For now, we'll create a placeholder recording process
        // In a real implementation, this would integrate with camera API
        Log.d(TAG, "Mock recording started - actual camera integration needed")
        
        // Schedule auto-stop after duration
        scheduleAutoStop()
        
        // Broadcast recording started
        sendBroadcast(Intent("com.bgrecorder.RECORDING_STARTED"))
    }
    
    private fun stopRecording() {
        if (!isRecording) {
            Log.w(TAG, "No recording in progress")
            return
        }
        
        isRecording = false
        
        Log.d(TAG, "Stopping recording")
        
        // TODO: Stop camera recording and save file
        
        // Stop foreground service
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            stopForeground(Service.STOP_FOREGROUND_REMOVE)
        } else {
            @Suppress("DEPRECATION")
            stopForeground(true)
        }
        stopSelf()
        
        // Broadcast recording stopped
        val recordingTime = (System.currentTimeMillis() - recordingStartTime) / 1000
        val intent = Intent("com.bgrecorder.RECORDING_STOPPED").apply {
            putExtra("duration", recordingTime)
        }
        sendBroadcast(intent)
        
        // Show completion notification
        showCompletionNotification(recordingTime)
    }
    
    private fun createRecordingNotification(): Notification {
        val stopIntent = Intent(this, VideoRecordingService::class.java).apply {
            action = ACTION_STOP_RECORDING
        }
        val stopPendingIntent = PendingIntent.getService(
            this, 0, stopIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        
        val openAppIntent = packageManager.getLaunchIntentForPackage(packageName)
        val openAppPendingIntent = PendingIntent.getActivity(
            this, 0, openAppIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Recording Video")
            .setContentText("$recordingQuality quality • ${recordingDuration}min • $cameraType camera${if (!enablePreview) " • No preview" else ""}")
            .setSmallIcon(android.R.drawable.ic_media_play)
            .setOngoing(true)
            .setContentIntent(openAppPendingIntent)
            .addAction(
                android.R.drawable.ic_media_pause,
                "Stop",
                stopPendingIntent
            )
            .setStyle(NotificationCompat.BigTextStyle()
                .bigText("Recording ${if (enablePreview) "with preview" else "in background only"} using $recordingQuality quality $cameraType camera for ${recordingDuration} minutes"))
            .build()
    }
    
    private fun scheduleAutoStop() {
        Thread {
            try {
                Thread.sleep(recordingDuration * 60 * 1000L) // Convert minutes to milliseconds
                if (isRecording) {
                    Log.d(TAG, "Auto-stopping recording after $recordingDuration minutes")
                    stopRecording()
                }
            } catch (e: InterruptedException) {
                Log.d(TAG, "Auto-stop timer interrupted")
            }
        }.start()
    }
    
    private fun showCompletionNotification(durationSeconds: Long) {
        val openAppIntent = packageManager.getLaunchIntentForPackage(packageName)
        val pendingIntent = PendingIntent.getActivity(
            this, 0, openAppIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        
        val minutes = durationSeconds / 60
        val seconds = durationSeconds % 60
        val durationText = String.format("%02d:%02d", minutes, seconds)
        
        val notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Recording Completed")
            .setContentText("Video recorded for $durationText")
            .setSmallIcon(android.R.drawable.ic_media_ff)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .build()
            
        val notificationManager = NotificationManagerCompat.from(this)
        notificationManager.notify(NOTIFICATION_ID + 1, notification)
    }
    
    override fun onDestroy() {
        super.onDestroy()
        Log.d(TAG, "VideoRecordingService destroyed")
        if (isRecording) {
            stopRecording()
        }
    }
    
    // Public methods for React Native bridge
    fun getRecordingStatus(): Boolean = isRecording
    
    fun getRecordingDuration(): Long {
        return if (isRecording) {
            (System.currentTimeMillis() - recordingStartTime) / 1000
        } else 0
    }
    
    fun getRecordingSettings(): Map<String, Any> {
        return mapOf(
            "duration" to recordingDuration,
            "quality" to recordingQuality,
            "camera" to cameraType,
            "preview" to enablePreview
        )
    }
}