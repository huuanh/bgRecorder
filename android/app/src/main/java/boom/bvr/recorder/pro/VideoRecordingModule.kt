package boom.bvr.recorder.pro

import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.ServiceConnection
import android.os.IBinder
import android.util.Log
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule

class VideoRecordingModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    
    private var recordingService: VideoRecordingService? = null
    private var serviceBound = false
    private val broadcastReceiver = RecordingBroadcastReceiver(reactContext)
    
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
        try {
            val videosList = recordingService?.getRecordedVideosList() ?: emptyList()
            val videosDirectory = recordingService?.getRecordedVideosDirectory()
            
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
                        })
                    }
                })
            }
            
            Log.d(TAG, "Returning ${videosList.size} recorded videos")
            promise.resolve(result)
            
        } catch (e: Exception) {
            Log.e(TAG, "Failed to get recorded videos", e)
            promise.reject("GET_VIDEOS_ERROR", "Failed to get recorded videos: ${e.message}")
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