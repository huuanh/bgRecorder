package boom.bvr.recorder.pro

import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.ServiceConnection
import android.graphics.Bitmap
import android.media.MediaMetadataRetriever
import android.media.ThumbnailUtils
import android.os.IBinder
import android.provider.MediaStore
import android.util.Base64
import android.util.Log
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.io.ByteArrayOutputStream
import java.io.File

class VideoRecordingModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    
    private var recordingService: VideoRecordingService? = null
    private var serviceBound = false
    private val broadcastReceiver = RecordingBroadcastReceiver(reactContext)
    
    // Cache for thumbnails and durations to improve performance
    private val thumbnailCache = mutableMapOf<String, String?>()
    private val durationCache = mutableMapOf<String, String>()
    
    companion object {
        const val TAG = "VideoRecordingModule"
    }
    
    init {
        // Register broadcast receiver
        val filter = IntentFilter().apply {
            addAction("com.bgrecorder.RECORDING_STARTED")
            addAction("com.bgrecorder.RECORDING_STOPPED")
        }
        reactContext.registerReceiver(broadcastReceiver, filter)
    }
    
    override fun getName(): String = "VideoRecordingModule"
    
    private val serviceConnection = object : ServiceConnection {
        override fun onServiceConnected(name: ComponentName?, service: IBinder?) {
            Log.d(TAG, "Service connected")
            val binder = service as VideoRecordingService.LocalBinder
            recordingService = binder.getService()
            serviceBound = true
        }
        
        override fun onServiceDisconnected(name: ComponentName?) {
            Log.d(TAG, "Service disconnected")
            recordingService = null
            serviceBound = false
        }
    }
    
    @ReactMethod
    fun startRecording(settings: ReadableMap, promise: Promise) {
        try {
            Log.d(TAG, "Starting recording with settings: $settings")
            
            val context = reactApplicationContext
            val serviceIntent = Intent(context, VideoRecordingService::class.java).apply {
                action = VideoRecordingService.ACTION_START_RECORDING
                putExtra(VideoRecordingService.EXTRA_DURATION, settings.getInt("duration"))
                putExtra(VideoRecordingService.EXTRA_QUALITY, settings.getString("quality"))
                putExtra(VideoRecordingService.EXTRA_CAMERA, settings.getString("camera"))
                putExtra(VideoRecordingService.EXTRA_PREVIEW, settings.getBoolean("preview"))
            }
            
            // Start and bind to service
            context.startForegroundService(serviceIntent)
            context.bindService(serviceIntent, serviceConnection, Context.BIND_AUTO_CREATE)
            
            promise.resolve(WritableNativeMap().apply {
                putBoolean("success", true)
                putString("message", "Recording started successfully")
            })
            
        } catch (e: Exception) {
            Log.e(TAG, "Failed to start recording", e)
            promise.reject("START_RECORDING_ERROR", "Failed to start recording: ${e.message}")
        }
    }
    
    @ReactMethod
    fun stopRecording(promise: Promise) {
        try {
            Log.d(TAG, "Stopping recording")
            
            val context = reactApplicationContext
            val serviceIntent = Intent(context, VideoRecordingService::class.java).apply {
                action = VideoRecordingService.ACTION_STOP_RECORDING
            }
            
            context.startService(serviceIntent)
            
            if (serviceBound) {
                context.unbindService(serviceConnection)
                serviceBound = false
            }
            
            promise.resolve(WritableNativeMap().apply {
                putBoolean("success", true)
                putString("message", "Recording stopped successfully")
            })
            
        } catch (e: Exception) {
            Log.e(TAG, "Failed to stop recording", e)
            promise.reject("STOP_RECORDING_ERROR", "Failed to stop recording: ${e.message}")
        }
    }
    
    @ReactMethod
    fun getRecordingStatus(promise: Promise) {
        try {
            val isRecording = recordingService?.getRecordingStatus() ?: false
            val duration = recordingService?.getRecordingDuration() ?: 0L
            val settings = recordingService?.getRecordingSettings() ?: emptyMap<String, Any>()
            
            promise.resolve(WritableNativeMap().apply {
                putBoolean("isRecording", isRecording)
                putDouble("duration", duration.toDouble())
                putMap("settings", Arguments.makeNativeMap(settings))
            })
            
        } catch (e: Exception) {
            Log.e(TAG, "Failed to get recording status", e)
            promise.reject("GET_STATUS_ERROR", "Failed to get recording status: ${e.message}")
        }
    }
    
    @ReactMethod
    fun isServiceRunning(promise: Promise) {
        try {
            promise.resolve(WritableNativeMap().apply {
                putBoolean("isRunning", serviceBound && recordingService != null)
                putBoolean("isRecording", recordingService?.getRecordingStatus() ?: false)
            })
        } catch (e: Exception) {
            Log.e(TAG, "Failed to check service status", e)
            promise.reject("SERVICE_STATUS_ERROR", "Failed to check service status: ${e.message}")
        }
    }
    
    @ReactMethod
    fun getRecordedVideos(promise: Promise) {
        getRecordedVideos(true, promise) // Default with thumbnails
    }
    
    @ReactMethod
    fun getRecordedVideosQuick(promise: Promise) {
        getRecordedVideos(false, promise) // Quick load without thumbnails
    }
    
    private fun getRecordedVideos(includeThumbnails: Boolean, promise: Promise) {
        try {
            // Use a consistent directory path regardless of service state
            val videosDirectory = getVideosDirectory()
            val videosList = getVideosFromDirectory(videosDirectory, includeThumbnails)
            
            val result = WritableNativeMap().apply {
                putString("directory", videosDirectory)
                putArray("videos", Arguments.createArray().apply {
                    videosList.forEach { video ->
                        pushMap(Arguments.createMap().apply {
                            putDouble("id", (video["id"] as Long).toDouble())
                            putString("title", video["title"] as String)
                            putString("filePath", video["filePath"] as String)
                            putString("fileSize", video["fileSize"] as String)
                            putDouble("lastModified", (video["lastModified"] as Long).toDouble())
                            putString("date", video["date"] as String)
                            putString("thumbnail", video["thumbnail"] as? String ?: "")
                            putString("duration", video["duration"] as? String ?: "00:00")
                        })
                    }
                })
            }
            
            Log.d(TAG, "Returning ${videosList.size} recorded videos from consistent directory")
            promise.resolve(result)
            
        } catch (e: Exception) {
            Log.e(TAG, "Failed to get recorded videos", e)
            promise.reject("GET_VIDEOS_ERROR", "Failed to get recorded videos: ${e.message}")
        }
    }
    
    private fun getVideosDirectory(): String {
        val appDataDir = java.io.File(reactApplicationContext.getExternalFilesDir(null), "RecordedVideos")
        if (!appDataDir.exists()) {
            val created = appDataDir.mkdirs()
            Log.d(TAG, "Created videos directory: $created, Path: ${appDataDir.absolutePath}")
        }
        return appDataDir.absolutePath
    }
    
    private fun getVideosFromDirectory(directoryPath: String, includeThumbnails: Boolean = true): List<Map<String, Any>> {
        val videosList = mutableListOf<Map<String, Any>>()
        val directory = java.io.File(directoryPath)
        
        if (directory.exists() && directory.isDirectory) {
            val videoFiles = directory.listFiles { file ->
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
                
                // Use cache key based on file path and last modified time
                val cacheKey = "${file.absolutePath}_${file.lastModified()}"
                
                // Get thumbnail from cache or generate new one (only if requested)
                val thumbnailBase64 = if (includeThumbnails) {
                    thumbnailCache[cacheKey] ?: generateVideoThumbnail(file.absolutePath).also {
                        thumbnailCache[cacheKey] = it
                    }
                } else null
                
                // Get video duration from cache or calculate new one
                val videoDuration = durationCache[cacheKey] ?: getVideoDuration(file.absolutePath).also {
                    durationCache[cacheKey] = it
                }
                
                val videoMap = mutableMapOf<String, Any>(
                    "id" to file.lastModified(),
                    "title" to file.name,
                    "filePath" to file.absolutePath,
                    "fileSize" to sizeFormatted,
                    "lastModified" to file.lastModified(),
                    "date" to java.text.SimpleDateFormat("dd/MM/yyyy HH:mm", java.util.Locale.getDefault()).format(java.util.Date(file.lastModified())),
                    "duration" to videoDuration
                )
                
                // Add thumbnail if available
                thumbnailBase64?.let { 
                    videoMap["thumbnail"] = it 
                }
                
                videosList.add(videoMap)
            }
        }
        
        Log.d(TAG, "Found ${videosList.size} videos in directory: $directoryPath")
        return videosList
    }
    
    private fun generateVideoThumbnail(videoPath: String): String? {
        return try {
            val bitmap = ThumbnailUtils.createVideoThumbnail(
                videoPath, 
                MediaStore.Images.Thumbnails.MINI_KIND
            )
            
            if (bitmap != null) {
                // Convert bitmap to base64 string
                val byteArrayOutputStream = ByteArrayOutputStream()
                bitmap.compress(Bitmap.CompressFormat.JPEG, 80, byteArrayOutputStream)
                val byteArray = byteArrayOutputStream.toByteArray()
                val base64String = Base64.encodeToString(byteArray, Base64.DEFAULT)
                
                bitmap.recycle() // Free memory
                "data:image/jpeg;base64,$base64String"
            } else {
                Log.w(TAG, "Failed to generate thumbnail for: $videoPath")
                null
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error generating thumbnail for: $videoPath", e)
            null
        }
    }
    
    private fun getVideoDuration(videoPath: String): String {
        return try {
            val retriever = MediaMetadataRetriever()
            retriever.setDataSource(videoPath)
            
            val durationMs = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION)?.toLongOrNull() ?: 0L
            retriever.release()
            
            // Convert milliseconds to MM:SS or HH:MM:SS format
            val totalSeconds = durationMs / 1000
            val hours = totalSeconds / 3600
            val minutes = (totalSeconds % 3600) / 60
            val seconds = totalSeconds % 60
            
            if (hours > 0) {
                String.format("%02d:%02d:%02d", hours, minutes, seconds)
            } else {
                String.format("%02d:%02d", minutes, seconds)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error getting video duration for: $videoPath", e)
            "00:00" // Default duration on error
        }
    }
    
    @ReactMethod
    fun deleteVideo(filePath: String, promise: Promise) {
        try {
            val file = java.io.File(filePath)
            if (file.exists() && file.delete()) {
                Log.d(TAG, "Video deleted successfully: $filePath")
                promise.resolve(WritableNativeMap().apply {
                    putBoolean("success", true)
                    putString("message", "Video deleted successfully")
                })
            } else {
                promise.reject("DELETE_ERROR", "Failed to delete video file")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to delete video", e)
            promise.reject("DELETE_ERROR", "Failed to delete video: ${e.message}")
        }
    }
    
    @ReactMethod
    fun getVideoThumbnail(filePath: String, promise: Promise) {
        try {
            val file = java.io.File(filePath)
            if (!file.exists()) {
                promise.reject("FILE_NOT_FOUND", "Video file not found: $filePath")
                return
            }
            
            val cacheKey = "${file.absolutePath}_${file.lastModified()}"
            val thumbnail = thumbnailCache[cacheKey] ?: generateVideoThumbnail(file.absolutePath).also {
                thumbnailCache[cacheKey] = it
            }
            
            promise.resolve(thumbnail ?: "")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to get video thumbnail", e)
            promise.reject("THUMBNAIL_ERROR", "Failed to get video thumbnail: ${e.message}")
        }
    }
    
    @ReactMethod
    fun showRecordingOverlay(promise: Promise) {
        try {
            val success = recordingService?.getOverlayManager()?.showOverlay() ?: false
            if (success) {
                promise.resolve(WritableNativeMap().apply {
                    putBoolean("success", true)
                    putString("message", "Overlay shown successfully")
                })
            } else {
                promise.reject("OVERLAY_ERROR", "Failed to show overlay. Check overlay permission.")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to show overlay", e)
            promise.reject("OVERLAY_ERROR", "Failed to show overlay: ${e.message}")
        }
    }
    
    @ReactMethod
    fun hideRecordingOverlay(promise: Promise) {
        try {
            recordingService?.getOverlayManager()?.hideOverlay()
            promise.resolve(WritableNativeMap().apply {
                putBoolean("success", true)
                putString("message", "Overlay hidden successfully")
            })
        } catch (e: Exception) {
            Log.e(TAG, "Failed to hide overlay", e)
            promise.reject("OVERLAY_ERROR", "Failed to hide overlay: ${e.message}")
        }
    }
    
    @ReactMethod
    fun checkOverlayPermission(promise: Promise) {
        try {
            val hasPermission = OverlayPermissionHelper.canDrawOverlays(reactApplicationContext)
            promise.resolve(WritableNativeMap().apply {
                putBoolean("hasPermission", hasPermission)
            })
        } catch (e: Exception) {
            Log.e(TAG, "Failed to check overlay permission", e)
            promise.reject("PERMISSION_ERROR", "Failed to check overlay permission: ${e.message}")
        }
    }
    
    @ReactMethod
    fun requestOverlayPermission(promise: Promise) {
        try {
            OverlayPermissionHelper.requestOverlayPermission(reactApplicationContext)
            promise.resolve(WritableNativeMap().apply {
                putBoolean("success", true)
                putString("message", "Permission request sent")
            })
        } catch (e: Exception) {
            Log.e(TAG, "Failed to request overlay permission", e)
            promise.reject("PERMISSION_ERROR", "Failed to request overlay permission: ${e.message}")
        }
    }
    
    private fun sendEvent(eventName: String, params: WritableMap?) {
        reactApplicationContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, params)
    }
    
    // Method to send events to React Native
    fun notifyRecordingStarted() {
        sendEvent("onRecordingStarted", null)
    }
    
    fun notifyRecordingStopped(duration: Long) {
        sendEvent("onRecordingStopped", WritableNativeMap().apply {
            putDouble("duration", duration.toDouble())
        })
    }
    
    override fun onCatalystInstanceDestroy() {
        super.onCatalystInstanceDestroy()
        
        // Unregister broadcast receiver
        try {
            reactApplicationContext.unregisterReceiver(broadcastReceiver)
        } catch (e: Exception) {
            Log.w(TAG, "Failed to unregister broadcast receiver", e)
        }
        
        if (serviceBound) {
            reactApplicationContext.unbindService(serviceConnection)
            serviceBound = false
        }
    }
}