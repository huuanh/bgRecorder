package boom.bvr.recorder.pro

import android.Manifest
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.ServiceConnection
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.media.MediaMetadataRetriever
import android.media.ThumbnailUtils
import android.net.Uri
import android.os.Build
import android.os.IBinder
import android.provider.MediaStore
import android.util.Base64
import android.util.Log
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
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
        
        // Use ContextCompat.registerReceiver for Android 13+ compatibility
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            ContextCompat.registerReceiver(
                reactContext,
                broadcastReceiver,
                filter,
                ContextCompat.RECEIVER_NOT_EXPORTED
            )
        } else {
            reactContext.registerReceiver(broadcastReceiver, filter)
        }
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
            
            // Check required permissions first
            val context = reactApplicationContext
            val missingPermissions = mutableListOf<String>()
            
            if (ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
                missingPermissions.add("CAMERA")
            }
            
            if (ContextCompat.checkSelfPermission(context, Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
                missingPermissions.add("RECORD_AUDIO")
            }
            
            if (missingPermissions.isNotEmpty()) {
                promise.reject("PERMISSION_ERROR", "Missing permissions: ${missingPermissions.joinToString(", ")}")
                return
            }
            
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
                            putInt("width", video["width"] as Int)
                            putInt("height", video["height"] as Int)
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
    
    @ReactMethod
    fun getAudioFiles(promise: Promise) {
        try {
            Log.d(TAG, "Getting audio files...")
            
            // Get audio directory path
            val audioDirectory = getAudioDirectory()
            val audiosList = getAudioFromDirectory(audioDirectory)
            
            val result = WritableNativeMap().apply {
                putString("directory", audioDirectory)
                putArray("audios", Arguments.createArray().apply {
                    audiosList.forEach { audio ->
                        pushMap(Arguments.createMap().apply {
                            putDouble("id", (audio["id"] as Long).toDouble())
                            putString("title", audio["title"] as String)
                            putString("filePath", audio["filePath"] as String)
                            putString("fileSize", audio["fileSize"] as String)
                            putDouble("lastModified", (audio["lastModified"] as Long).toDouble())
                            putString("date", audio["date"] as String)
                            putString("duration", audio["duration"] as? String ?: "00:00")
                            putString("format", audio["format"] as String)
                        })
                    }
                })
            }
            
            Log.d(TAG, "Returning ${audiosList.size} audio files from directory")
            promise.resolve(result)
            
        } catch (e: Exception) {
            Log.e(TAG, "Failed to get audio files", e)
            promise.reject("GET_AUDIO_ERROR", "Failed to get audio files: ${e.message}")
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
    
    private fun getAudioDirectory(): String {
        val audioDataDir = java.io.File(reactApplicationContext.getExternalFilesDir(null), "RecordedVideos/Audio")
        if (!audioDataDir.exists()) {
            val created = audioDataDir.mkdirs()
            Log.d(TAG, "Created audio directory: $created, Path: ${audioDataDir.absolutePath}")
        }
        return audioDataDir.absolutePath
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
                        if (it != null) {
                            thumbnailCache[cacheKey] = it
                        }
                    }
                } else null
                
                // Get video duration from cache or calculate new one
                val videoDuration = durationCache[cacheKey] ?: getVideoDuration(file.absolutePath).also {
                    durationCache[cacheKey] = it
                }
                
                // Get video dimensions
                val videoDimensions = getVideoDimensions(file.absolutePath)
                
                val videoMap = mutableMapOf<String, Any>(
                    "id" to file.lastModified(),
                    "title" to file.name,
                    "filePath" to file.absolutePath,
                    "fileSize" to sizeFormatted,
                    "lastModified" to file.lastModified(),
                    "date" to java.text.SimpleDateFormat("dd/MM/yyyy HH:mm", java.util.Locale.getDefault()).format(java.util.Date(file.lastModified())),
                    "duration" to videoDuration,
                    "width" to videoDimensions.first,
                    "height" to videoDimensions.second
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
            // First try using MediaMetadataRetriever which is more reliable
            val retriever = MediaMetadataRetriever()
            try {
                retriever.setDataSource(videoPath)
                
                // Get frame at 1 second or at the beginning if video is shorter
                val bitmap = retriever.getFrameAtTime(1000000L, MediaMetadataRetriever.OPTION_CLOSEST_SYNC)
                    ?: retriever.getFrameAtTime(0L, MediaMetadataRetriever.OPTION_CLOSEST_SYNC)
                
                if (bitmap != null) {
                    // Convert bitmap to base64 string
                    val byteArrayOutputStream = ByteArrayOutputStream()
                    bitmap.compress(Bitmap.CompressFormat.JPEG, 80, byteArrayOutputStream)
                    val byteArray = byteArrayOutputStream.toByteArray()
                    val base64String = Base64.encodeToString(byteArray, Base64.DEFAULT)
                    
                    bitmap.recycle() // Free memory
                    return "data:image/jpeg;base64,$base64String"
                }
            } catch (e: Exception) {
                Log.w(TAG, "MediaMetadataRetriever failed for: $videoPath, trying ThumbnailUtils", e)
                
                // Fallback to ThumbnailUtils with additional safety checks
                val file = java.io.File(videoPath)
                if (file.exists() && file.length() > 0) {
                    val bitmap = ThumbnailUtils.createVideoThumbnail(
                        videoPath, 
                        MediaStore.Images.Thumbnails.MINI_KIND
                    )
                    
                    if (bitmap != null) {
                        val byteArrayOutputStream = ByteArrayOutputStream()
                        bitmap.compress(Bitmap.CompressFormat.JPEG, 80, byteArrayOutputStream)
                        val byteArray = byteArrayOutputStream.toByteArray()
                        val base64String = Base64.encodeToString(byteArray, Base64.DEFAULT)
                        
                        bitmap.recycle() // Free memory
                        return "data:image/jpeg;base64,$base64String"
                    }
                }
            } finally {
                try {
                    retriever.release()
                } catch (e: Exception) {
                    Log.w(TAG, "Error releasing MediaMetadataRetriever", e)
                }
            }
            
            Log.w(TAG, "Failed to generate thumbnail for: $videoPath")
            null
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
    
    private fun getVideoDimensions(videoPath: String): Pair<Int, Int> {
        return try {
            val retriever = MediaMetadataRetriever()
            retriever.setDataSource(videoPath)
            
            val width = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_WIDTH)?.toIntOrNull() ?: 720
            val height = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_HEIGHT)?.toIntOrNull() ?: 1280
            
            retriever.release()
            
            Pair(width, height)
        } catch (e: Exception) {
            Log.e(TAG, "Error getting video dimensions for: $videoPath", e)
            Pair(720, 1280) // Default dimensions on error
        }
    }
    
    private fun getAudioFromDirectory(directoryPath: String): List<Map<String, Any>> {
        val audiosList = mutableListOf<Map<String, Any>>()
        val directory = java.io.File(directoryPath)
        
        if (directory.exists() && directory.isDirectory) {
            val audioFiles = directory.listFiles { file ->
                file.isFile && (file.name.endsWith(".m4a", ignoreCase = true) || 
                               file.name.endsWith(".mp3", ignoreCase = true) ||
                               file.name.endsWith(".aac", ignoreCase = true))
            }
            
            audioFiles?.sortedByDescending { it.lastModified() }?.forEach { file ->
                val sizeInBytes = file.length()
                val sizeFormatted = when {
                    sizeInBytes >= 1024 * 1024 * 1024 -> "${sizeInBytes / (1024 * 1024 * 1024)} GB"
                    sizeInBytes >= 1024 * 1024 -> "${sizeInBytes / (1024 * 1024)} MB"
                    sizeInBytes >= 1024 -> "${sizeInBytes / 1024} KB"
                    else -> "${sizeInBytes} B"
                }
                
                // Get audio duration
                val audioDuration = getAudioDuration(file.absolutePath)
                
                // Get audio format
                val audioFormat = file.extension.uppercase()
                
                val audioMap = mutableMapOf<String, Any>(
                    "id" to file.lastModified(), // Use timestamp as ID
                    "title" to file.name,
                    "filePath" to file.absolutePath,
                    "fileSize" to sizeFormatted,
                    "lastModified" to file.lastModified(),
                    "date" to java.text.SimpleDateFormat("dd/MM/yyyy HH:mm", java.util.Locale.getDefault()).format(java.util.Date(file.lastModified())),
                    "duration" to audioDuration,
                    "format" to audioFormat
                )
                
                audiosList.add(audioMap)
            }
        }
        
        Log.d(TAG, "Found ${audiosList.size} audio files in directory: $directoryPath")
        return audiosList
    }
    
    private fun getAudioDuration(audioPath: String): String {
        return try {
            val retriever = MediaMetadataRetriever()
            retriever.setDataSource(audioPath)
            
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
            Log.e(TAG, "Error getting audio duration for: $audioPath", e)
            "00:00" // Default duration on error
        }
    }
    
    @ReactMethod
    fun checkVideoHasAudio(filePath: String, promise: Promise) {
        try {
            val retriever = MediaMetadataRetriever()
            retriever.setDataSource(filePath)
            
            val hasAudio = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_HAS_AUDIO)
            val numTracks = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_NUM_TRACKS)?.toIntOrNull() ?: 0
            
            retriever.release()
            
            val result = WritableNativeMap().apply {
                putBoolean("hasAudio", hasAudio == "yes")
                putInt("numTracks", numTracks)
            }
            
            Log.d(TAG, "Video audio check for $filePath: hasAudio=$hasAudio, numTracks=$numTracks")
            promise.resolve(result)
            
        } catch (e: Exception) {
            Log.e(TAG, "Failed to check video audio", e)
            promise.reject("AUDIO_CHECK_ERROR", "Failed to check video audio: ${e.message}")
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
    fun deleteAudio(filePath: String, promise: Promise) {
        try {
            val file = java.io.File(filePath)
            if (file.exists() && file.delete()) {
                Log.d(TAG, "Audio deleted successfully: $filePath")
                promise.resolve(WritableNativeMap().apply {
                    putBoolean("success", true)
                    putString("message", "Audio deleted successfully")
                })
            } else {
                promise.reject("DELETE_ERROR", "Failed to delete audio file")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to delete audio", e)
            promise.reject("DELETE_ERROR", "Failed to delete audio: ${e.message}")
        }
    }
    
    @ReactMethod
    fun renameVideo(filePath: String, newFileName: String, promise: Promise) {
        try {
            val file = File(filePath)
            if (!file.exists()) {
                promise.reject("FILE_NOT_FOUND", "Video file not found: $filePath")
                return
            }
            
            // Create new file path with the new name
            val parentDir = file.parentFile
            val newFile = File(parentDir, newFileName)
            
            // Check if target filename already exists
            if (newFile.exists()) {
                promise.reject("FILE_EXISTS", "A file with the name '$newFileName' already exists")
                return
            }
            
            // Perform the rename
            val success = file.renameTo(newFile)
            
            if (success) {
                // Clear cache entries for the old file
                val oldCacheKey = "${file.absolutePath}_${file.lastModified()}"
                thumbnailCache.remove(oldCacheKey)
                durationCache.remove(file.absolutePath)
                
                Log.d(TAG, "Video renamed successfully from ${file.name} to ${newFile.name}")
                promise.resolve(WritableNativeMap().apply {
                    putBoolean("success", true)
                    putString("message", "Video renamed successfully")
                    putString("oldPath", filePath)
                    putString("newPath", newFile.absolutePath)
                    putString("newFileName", newFileName)
                })
            } else {
                promise.reject("RENAME_FAILED", "Failed to rename video file")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to rename video", e)
            promise.reject("RENAME_ERROR", "Failed to rename video: ${e.message}")
        }
    }
    
    @ReactMethod
    fun renameAudio(filePath: String, newFileName: String, promise: Promise) {
        try {
            val file = File(filePath)
            if (!file.exists()) {
                promise.reject("FILE_NOT_FOUND", "Audio file not found: $filePath")
                return
            }
            
            // Create new file path with the new name
            val parentDir = file.parentFile
            val newFile = File(parentDir, newFileName)
            
            // Check if target filename already exists
            if (newFile.exists()) {
                promise.reject("FILE_EXISTS", "A file with the name '$newFileName' already exists")
                return
            }
            
            // Perform the rename
            val success = file.renameTo(newFile)
            
            if (success) {
                Log.d(TAG, "Audio renamed successfully from ${file.name} to ${newFile.name}")
                promise.resolve(WritableNativeMap().apply {
                    putBoolean("success", true)
                    putString("message", "Audio renamed successfully")
                    putString("oldPath", filePath)
                    putString("newPath", newFile.absolutePath)
                    putString("newFileName", newFileName)
                })
            } else {
                promise.reject("RENAME_FAILED", "Failed to rename audio file")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to rename audio", e)
            promise.reject("RENAME_ERROR", "Failed to rename audio: ${e.message}")
        }
    }
    
    @ReactMethod
    fun shareVideo(filePath: String, shareType: String, promise: Promise) {
        try {
            val file = File(filePath)
            if (!file.exists()) {
                promise.reject("FILE_NOT_FOUND", "Video file not found: $filePath")
                return
            }
            
            val context = reactApplicationContext
            val authority = "${context.packageName}.fileprovider"
            val uri: Uri = FileProvider.getUriForFile(context, authority, file)
            
            val shareIntent = Intent().apply {
                action = Intent.ACTION_SEND
                type = "video/*"
                putExtra(Intent.EXTRA_STREAM, uri)
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                
                // Set specific package based on share type
                when (shareType) {
                    "share_whatsapp" -> setPackage("com.whatsapp")
                    "share_telegram" -> setPackage("org.telegram.messenger")
                    "share_email" -> type = "message/rfc822"
                    "share_bluetooth" -> setPackage("com.android.bluetooth")
                    // For general share and others, let user choose
                }
            }
            
            val chooserIntent = Intent.createChooser(shareIntent, "Share Video")
            chooserIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            
            // Check if there are apps available to handle this intent
            if (shareIntent.resolveActivity(context.packageManager) != null || shareType == "share_general") {
                context.startActivity(chooserIntent)
                promise.resolve(WritableNativeMap().apply {
                    putBoolean("success", true)
                    putString("message", "Share dialog opened successfully")
                })
            } else {
                promise.reject("NO_APP_AVAILABLE", "No app available to handle this share type")
            }
            
        } catch (e: Exception) {
            Log.e(TAG, "Failed to share video", e)
            promise.reject("SHARE_ERROR", "Failed to share video: ${e.message}")
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
            
            // Check if file is not empty and give it time to finish writing if needed
            if (file.length() == 0L) {
                promise.reject("FILE_EMPTY", "Video file is empty: $filePath")
                return
            }
            
            // Add a small delay if file was just created (within last 2 seconds)
            val timeSinceCreation = System.currentTimeMillis() - file.lastModified()
            if (timeSinceCreation < 2000) {
                Thread.sleep(500) // Wait 500ms for file to be fully written
            }
            
            val cacheKey = "${file.absolutePath}_${file.lastModified()}"
            val thumbnail = thumbnailCache[cacheKey] ?: generateVideoThumbnail(file.absolutePath).also {
                if (it != null) {
                    thumbnailCache[cacheKey] = it
                }
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
            Log.d(TAG, "showRecordingOverlay called")
            
            val overlayManager = recordingService?.getOverlayManager()
            if (overlayManager == null) {
                Log.e(TAG, "OverlayManager is null")
                promise.reject("OVERLAY_ERROR", "Recording service not available")
                return
            }
            
            val success = overlayManager.showOverlay(
                cameraDevice = null,
                onStopRecording = {
                    Log.d(TAG, "Stop recording callback triggered from overlay")
                    // Send stop recording intent to service
                    val intent = Intent(reactApplicationContext, VideoRecordingService::class.java).apply {
                        action = "stop_recording"
                    }
                    reactApplicationContext.startService(intent)
                },
                service = recordingService
            )
            
            Log.d(TAG, "showOverlay result: $success")
            
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
    fun checkRecordingPermissions(promise: Promise) {
        try {
            val context = reactApplicationContext
            val cameraGranted = ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED
            val audioGranted = ContextCompat.checkSelfPermission(context, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED
            
            promise.resolve(WritableNativeMap().apply {
                putBoolean("cameraGranted", cameraGranted)
                putBoolean("audioGranted", audioGranted)
                putBoolean("allGranted", cameraGranted && audioGranted)
            })
        } catch (e: Exception) {
            Log.e(TAG, "Failed to check recording permissions", e)
            promise.reject("PERMISSION_ERROR", "Failed to check recording permissions: ${e.message}")
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
    
    @ReactMethod
    fun createDirectory(directoryPath: String, promise: Promise) {
        try {
            val directory = File(directoryPath)
            val created = directory.mkdirs()
            Log.d(TAG, "Create directory: $directoryPath, Success: $created")
            promise.resolve(created)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to create directory: $directoryPath", e)
            promise.reject("CREATE_DIRECTORY_ERROR", "Failed to create directory: ${e.message}")
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