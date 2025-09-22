package boom.bvr.recorder.pro

import android.content.Context
import android.graphics.PixelFormat
import android.graphics.SurfaceTexture
import android.hardware.camera2.CameraDevice
import android.os.Build
import android.provider.Settings
import android.util.Log
import android.view.Gravity
import android.view.Surface
import android.view.TextureView
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
                    // Update notification to show overlay is hidden
                    service?.updateNotification("Recording video... (Overlay hidden)")
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
            
            // Set window manager and layout params for dragging
            windowManager?.let { wm ->
                overlayView?.setWindowManagerAndParams(wm, layoutParams)
            }
            
            windowManager?.addView(overlayView, layoutParams)
            isOverlayShowing = true
            
            // Update notification to show overlay is visible
            service?.updateNotification("Recording video... (Overlay shown)")
            
            Log.d(TAG, "OVERLAY_DEBUG: Overlay shown successfully")
            return true
            
        } catch (e: Exception) {
            Log.e(TAG, "OVERLAY_DEBUG: Failed to show overlay", e)
            return false
        }
    }
    
    fun hideOverlay() {
        try {
            Log.d(TAG, "OVERLAY_DEBUG: Hiding overlay - recording should continue")
            
            // Chỉ ẩn overlay view nhưng giữ camera session hoạt động
            overlayView?.let { view ->
                // Notify service that overlay is being hidden (but keep recording)
                service?.setPreviewSurface(null)
                
                windowManager?.removeView(view)
                overlayView = null
                isOverlayShowing = false
                Log.d(TAG, "OVERLAY_DEBUG: Overlay hidden, recording continues in background")
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
    
    fun showOverlayDuringRecording(): Boolean {
        Log.d(TAG, "OVERLAY_DEBUG: Showing overlay during active recording")
        
        if (isOverlayShowing) {
            Log.d(TAG, "OVERLAY_DEBUG: Overlay already showing")
            return true
        }
        
        if (!canDrawOverlays()) {
            Log.e(TAG, "OVERLAY_DEBUG: No permission to draw overlays")
            return false
        }
        
        // Show overlay without restarting camera (camera is already recording)
        try {
            val service = this.service
            if (service != null && service.getRecordingStatus()) {
                Log.d(TAG, "OVERLAY_DEBUG: Creating overlay for active recording...")
                overlayView = RecordingOverlayView(context).apply {
                    onCloseCallback = {
                        hideOverlay()
                    }
                    // Don't set onStopRecordingCallback - overlay should only hide, not stop recording
                }
                
                // Set window layout parameters for overlay
                val layoutParams = createOverlayLayoutParams()
                
                Log.d(TAG, "OVERLAY_DEBUG: Adding overlay view to window manager")
                windowManager?.addView(overlayView, layoutParams)
                isOverlayShowing = true
                
                // Set preview surface to service so camera can show preview again
                val textureView = overlayView?.getTextureView()
                if (textureView != null) {
                    overlayView?.setCameraDevice(service.getCameraDevice())
                    textureView.surfaceTextureListener = object : TextureView.SurfaceTextureListener {
                        override fun onSurfaceTextureAvailable(surface: SurfaceTexture, width: Int, height: Int) {
                            Log.d(TAG, "OVERLAY_DEBUG: TextureView surface available during recording")
                            service.setPreviewSurface(Surface(surface))
                        }
                        
                        override fun onSurfaceTextureSizeChanged(surface: SurfaceTexture, width: Int, height: Int) {}
                        override fun onSurfaceTextureDestroyed(surface: SurfaceTexture): Boolean = true
                        override fun onSurfaceTextureUpdated(surface: SurfaceTexture) = Unit
                    }
                }
                
                overlayView?.startRecording() // Show recording indicator
                Log.d(TAG, "OVERLAY_DEBUG: Overlay shown successfully during recording")
                return true
            } else {
                Log.e(TAG, "OVERLAY_DEBUG: Service not available or not recording")
                return false
            }
        } catch (e: Exception) {
            Log.e(TAG, "OVERLAY_DEBUG: Failed to show overlay during recording", e)
            return false
        }
    }
    
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
    
    private fun createOverlayLayoutParams(): WindowManager.LayoutParams {
        return WindowManager.LayoutParams().apply {
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
    }
    
    fun destroy() {
        hideOverlay()
        windowManager = null
    }
}