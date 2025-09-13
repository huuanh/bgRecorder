package boom.bvr.recorder.pro

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.WritableNativeMap
import com.facebook.react.modules.core.DeviceEventManagerModule

class RecordingBroadcastReceiver(private val reactContext: ReactApplicationContext) : BroadcastReceiver() {
    
    companion object {
        const val TAG = "RecordingBroadcastReceiver"
    }
    
    override fun onReceive(context: Context?, intent: Intent?) {
        Log.d(TAG, "Received broadcast: ${intent?.action}")
        
        when (intent?.action) {
            "com.bgrecorder.RECORDING_STARTED" -> {
                sendEvent("onRecordingStarted", null)
            }
            "com.bgrecorder.RECORDING_STOPPED" -> {
                val duration = intent.getLongExtra("duration", 0L)
                sendEvent("onRecordingStopped", WritableNativeMap().apply {
                    putDouble("duration", duration.toDouble())
                })
            }
        }
    }
    
    private fun sendEvent(eventName: String, params: WritableNativeMap?) {
        if (reactContext.hasActiveReactInstance()) {
            reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit(eventName, params)
        }
    }
}