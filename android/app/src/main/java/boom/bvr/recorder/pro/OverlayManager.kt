package boom.bvr.recorder.pro

import android.content.Context
import android.graphics.PixelFormat
import android.hardware.camera2.CameraDevice
import android.os.Build
import android.provider.Settings
import android.util.Log
import android.view.Gravity
import android.view.WindowManager

class OverlayManager(private val context: Context) {
    
    companion object {
        const val TAG = "OverlayManager"
    }
    
    private var windowManager: WindowManager? = null
    private var overlayView: RecordingOverlayView? = null
    private var isOverlayShowing = false
    private var service: VideoRecordingService? = null
    
    init {
        windowManager = context.getSystemService(Context.WINDOW_SERVICE) as WindowManager
    }
    
    fun showOverlay(cameraDevice: CameraDevice? = null, onStopRecording: (() -> Unit)? = null, service: VideoRecordingService? = null): Boolean {
        Log.d(TAG, "showOverlay called - isShowing: $isOverlayShowing")
        
        if (isOverlayShowing) {
            Log.d(TAG, "OVERLAY_DEBUG: Overlay is already showing")
            return true
        }
        
        val canDraw = canDrawOverlays()
        Log.d(TAG, "OVERLAY_DEBUG: Can draw overlays permission: $canDraw")
        
        if (!canDraw) {
            Log.e(TAG, "OVERLAY_DEBUG: No permission to draw overlays")
            return false
        }
        
        this.service = service
        Log.d(TAG, "OVERLAY_DEBUG: Service set in overlay manager: ${service != null}")
        
        try {
            Log.d(TAG, "OVERLAY_DEBUG: Creating RecordingOverlayView...")
            overlayView = RecordingOverlayView(context).apply {
                onCloseCallback = {
                    hideOverlay()
                }
                onStopRecordingCallback = onStopRecording
                Log.d(TAG, "OVERLAY_DEBUG: Setting service to overlay: ${service != null}")
                setService(service)
                Log.d(TAG, "OVERLAY_DEBUG: Service set to overlay successfully")
            }
            
            val layoutParams = WindowManager.LayoutParams().apply {
                width = WindowManager.LayoutParams.WRAP_CONTENT
                height = WindowManager.LayoutParams.WRAP_CONTENT
                type = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
                } else {
                    @Suppress("DEPRECATION")
                    WindowManager.LayoutParams.TYPE_PHONE
                }
                flags = WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                        WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL or
                        WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN
                format = PixelFormat.TRANSLUCENT
                gravity = Gravity.TOP or Gravity.START
                x = 50
                y = 200
            }
            
            windowManager?.addView(overlayView, layoutParams)
            isOverlayShowing = true
            
            Log.d(TAG, "OVERLAY_DEBUG: Overlay shown successfully")
            return true
            
        } catch (e: Exception) {
            Log.e(TAG, "OVERLAY_DEBUG: Failed to show overlay", e)
            return false
        }
    }
    
    fun hideOverlay() {
        try {
            overlayView?.let { view ->
                windowManager?.removeView(view)
                overlayView = null
                isOverlayShowing = false
                Log.d(TAG, "Overlay hidden successfully")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to hide overlay", e)
        }
    }
    
    fun startRecording() {
        overlayView?.startRecording()
    }
    
    fun stopRecording() {
        overlayView?.stopRecording()
    }
    
    fun isShowing(): Boolean = isOverlayShowing
    
    fun updateCameraDevice(cameraDevice: CameraDevice?) {
        overlayView?.setCameraDevice(cameraDevice)
    }
    
    private fun canDrawOverlays(): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            Settings.canDrawOverlays(context)
        } else {
            true
        }
    }
    
    fun destroy() {
        hideOverlay()
        windowManager = null
    }
}