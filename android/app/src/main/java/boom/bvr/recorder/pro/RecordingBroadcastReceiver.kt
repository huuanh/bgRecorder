package boom.bvr.recorder.pro

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule

class RecordingBroadcastReceiver(private val reactContext: ReactApplicationContext) : BroadcastReceiver() {
    
    companion object {
        const val TAG = "RecordingBroadcastReceiver"
    }
    
    override fun onReceive(context: Context?, intent: Intent?) {
        Log.d(TAG, "Received broadcast: ${intent?.action}")
        
        when (intent?.action) {
            "com.bgrecorder.RECORDING_STARTED" -> {
                sendEventToReactNative("onRecordingStarted", null)
            }
            "com.bgrecorder.RECORDING_STOPPED" -> {
                val duration = intent.getLongExtra("duration", 0L)
                val filePath = intent.getStringExtra("filePath")
                val fileName = intent.getStringExtra("fileName")
                val fileSize = intent.getStringExtra("fileSize")
                val quality = intent.getStringExtra("quality")
                val camera = intent.getStringExtra("camera")
                val timestamp = intent.getLongExtra("timestamp", System.currentTimeMillis())
                
                val params = Arguments.createMap().apply {
                    putDouble("duration", duration.toDouble())
                    putString("filePath", filePath)
                    putString("fileName", fileName)
                    putString("fileSize", fileSize)
                    putString("quality", quality)
                    putString("camera", camera)
                    putDouble("timestamp", timestamp.toDouble())
                }
                
                Log.d(TAG, "Sending recording stopped event with metadata: $params")
                sendEventToReactNative("onRecordingStopped", params)
            }
            "com.bgrecorder.RECORDING_SPLIT" -> {
                val duration = intent.getLongExtra("duration", 0L)
                val filePath = intent.getStringExtra("filePath")
                val fileName = intent.getStringExtra("fileName")
                val fileSize = intent.getStringExtra("fileSize")
                val partNumber = intent.getIntExtra("partNumber", 1)
                val quality = intent.getStringExtra("quality")
                val camera = intent.getStringExtra("camera")
                val timestamp = intent.getLongExtra("timestamp", System.currentTimeMillis())
                
                val params = Arguments.createMap().apply {
                    putDouble("duration", duration.toDouble())
                    putString("filePath", filePath)
                    putString("fileName", fileName)
                    putString("fileSize", fileSize)
                    putInt("partNumber", partNumber)
                    putString("quality", quality)
                    putString("camera", camera)
                    putDouble("timestamp", timestamp.toDouble())
                }
                
                Log.d(TAG, "Sending recording split event for part ${partNumber}: $params")
                sendEventToReactNative("onRecordingSplit", params)
            }
        }
    }
    
    private fun sendEventToReactNative(eventName: String, params: WritableMap?) {
        try {
            reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit(eventName, params)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to send event to React Native", e)
        }
    }
}