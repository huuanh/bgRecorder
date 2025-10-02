package boom.bvr.recorder.pro

import android.animation.ObjectAnimator
import android.animation.ValueAnimator
import android.content.Context
import android.graphics.*
import android.graphics.drawable.Drawable
import android.graphics.drawable.GradientDrawable
import android.hardware.camera2.*
import android.os.VibrationEffect
import android.os.Vibrator
import android.util.AttributeSet
import android.util.Log
import android.view.*
import android.widget.*
import kotlinx.coroutines.*

class RecordingOverlayView @JvmOverloads constructor(
    context: Context,
    private val initPreviewWidth: Int = 160,  // Default medium size
    private val initPreviewHeight: Int = 120,
    attrs: AttributeSet? = null,
    defStyleAttr: Int = 0
) : FrameLayout(context, attrs, defStyleAttr) {

    companion object {
        const val TAG = "RecordingOverlayView"
    }

    private var textureView: TextureView? = null
    private var timeLabel: TextView? = null
    private var closeButton: ImageButton? = null
    private var recordingIndicator: View? = null
    private var service: VideoRecordingService? = null

    private var cameraDevice: CameraDevice? = null
    private var captureSession: CameraCaptureSession? = null
    private var previewRequestBuilder: CaptureRequest.Builder? = null

    private var startTime = 0L
    private var updateJob: Job? = null
    private var frameUpdateCount = 0 // Add counter for frame updates

    // Preview size settings - initialize with constructor values
    private var previewWidth = initPreviewWidth
    private var previewHeight = initPreviewHeight

    // Touch and drag variables
    private var lastTouchX = 0f
    private var lastTouchY = 0f
    private var isDragging = false
    private var initialX = 0
    private var initialY = 0
    private var windowManager: WindowManager? = null
    private var layoutParams: WindowManager.LayoutParams? = null

    var onCloseCallback: (() -> Unit)? = null
    var onStopRecordingCallback: (() -> Unit)? = null

    init {
        Log.d(TAG, "🏗️ RecordingOverlayView initialized with preview size: ${previewWidth}x${previewHeight}")
        // Setup with constructor provided size
        setupOverlayView()
    }

    private fun setupOverlayView() {
        setBackgroundColor(Color.TRANSPARENT)

        // Create main container with rounded corners using preview size settings
        val density = context.resources.displayMetrics.density
        val containerWidth = (previewWidth * density).toInt()
        val containerHeight = (previewHeight * density).toInt() // Add space for controls
        
        Log.d(TAG, "📐 setupOverlayView with size: ${previewWidth}x${previewHeight}, density: $density, container: ${containerWidth}x${containerHeight}")
        
        val containerView = FrameLayout(context).apply {
            layoutParams = FrameLayout.LayoutParams(
                containerWidth,
                containerHeight
            ).apply {
                gravity = Gravity.TOP or Gravity.START
                marginStart = (16 * context.resources.displayMetrics.density).toInt()
                topMargin = (100 * context.resources.displayMetrics.density).toInt()
            }
            background = createRoundedBackground()
            elevation = 8f
        }

        // Create TextureView for camera preview using preview size settings
        val textureWidth = (previewWidth * density).toInt()
        val textureHeight = (previewHeight * density).toInt()
        textureView = TextureView(context).apply {
            layoutParams = FrameLayout.LayoutParams(
                textureWidth,
                textureHeight
            )
        }
        containerView.addView(textureView)

        // Create recording indicator (red dot)
        recordingIndicator = View(context).apply {
            layoutParams = FrameLayout.LayoutParams(
                (12 * context.resources.displayMetrics.density).toInt(),
                (12 * context.resources.displayMetrics.density).toInt()
            ).apply {
                gravity = Gravity.TOP or Gravity.START
                marginStart = (12 * context.resources.displayMetrics.density).toInt()
                topMargin = (12 * context.resources.displayMetrics.density).toInt()
            }
            background = createCircleDrawable(Color.RED)
        }
        containerView.addView(recordingIndicator)

        // Create time label
        timeLabel = TextView(context).apply {
            layoutParams = FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.WRAP_CONTENT,
                FrameLayout.LayoutParams.WRAP_CONTENT
            ).apply {
                gravity = Gravity.BOTTOM or Gravity.CENTER_HORIZONTAL
                bottomMargin = (16 * context.resources.displayMetrics.density).toInt()
            }
            text = "00:00:00"
            setTextColor(Color.WHITE)
            textSize = 14f
            setTypeface(null, Typeface.BOLD)
            background = createRoundedBackground(Color.parseColor("#80000000"))
            setPadding(
                (8 * context.resources.displayMetrics.density).toInt(),
                (4 * context.resources.displayMetrics.density).toInt(),
                (8 * context.resources.displayMetrics.density).toInt(),
                (4 * context.resources.displayMetrics.density).toInt()
            )
        }
        containerView.addView(timeLabel)

        // Create hide button
        closeButton = ImageButton(context).apply {
            layoutParams = FrameLayout.LayoutParams(
                (32 * context.resources.displayMetrics.density).toInt(),
                (32 * context.resources.displayMetrics.density).toInt()
            ).apply {
                gravity = Gravity.TOP or Gravity.END
                marginEnd = (8 * context.resources.displayMetrics.density).toInt()
                topMargin = (8 * context.resources.displayMetrics.density).toInt()
            }
            setImageDrawable(createHideIcon())
            background = createCircleDrawable(Color.parseColor("#80000000"))
            scaleType = ImageView.ScaleType.CENTER
            setOnClickListener {
                // Only hide overlay, don't stop recording
                onCloseCallback?.invoke()
            }
        }
        containerView.addView(closeButton)

        // Add touch listener for dragging
        containerView.setOnTouchListener { view, event ->
            when (event.action) {
                MotionEvent.ACTION_DOWN -> {
                    lastTouchX = event.rawX
                    lastTouchY = event.rawY
                    isDragging = false
                    // Add scale animation to show it's pressable
                    view.animate().scaleX(0.95f).scaleY(0.95f).setDuration(100).start()
                    true
                }
                MotionEvent.ACTION_MOVE -> {
                    val deltaX = event.rawX - lastTouchX
                    val deltaY = event.rawY - lastTouchY
                    
                    // Consider it dragging if moved more than 10 pixels
                    if (!isDragging && (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10)) {
                        isDragging = true
                        // Haptic feedback when dragging starts
                        val vibrator = context.getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
                        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                            vibrator.vibrate(VibrationEffect.createOneShot(50, VibrationEffect.DEFAULT_AMPLITUDE))
                        } else {
                            @Suppress("DEPRECATION")
                            vibrator.vibrate(50)
                        }
                        // Scale up slightly when dragging
                        view.animate().scaleX(1.05f).scaleY(1.05f).setDuration(100).start()
                    }
                    
                    if (isDragging) {
                        updateOverlayPosition(deltaX.toInt(), deltaY.toInt())
                        lastTouchX = event.rawX
                        lastTouchY = event.rawY
                    }
                    true
                }
                MotionEvent.ACTION_UP -> {
                    // Return to normal scale
                    view.animate().scaleX(1.0f).scaleY(1.0f).setDuration(100).start()
                    
                    if (!isDragging) {
                        // If not dragging, treat as click - don't handle here to allow child views to handle
                        false
                    } else {
                        isDragging = false
                        // Snap to nearest edge after dragging
                        snapToNearestEdge()
                        true
                    }
                }
                else -> false
            }
        }

        addView(containerView)
        startBlinkingAnimation()
    }

    private fun createRoundedBackground(color: Int = Color.parseColor("#90000000")): Drawable {
        return GradientDrawable().apply {
            setColor(color)
            cornerRadius = 12f * context.resources.displayMetrics.density
        }
    }

    private fun createCircleDrawable(color: Int): Drawable {
        return GradientDrawable().apply {
            setColor(color)
            shape = GradientDrawable.OVAL
        }
    }

    private fun createCloseIcon(): Drawable {
        return object : Drawable() {
            override fun draw(canvas: Canvas) {
                val paint = Paint().apply {
                    color = Color.WHITE
                    strokeWidth = 2f * context.resources.displayMetrics.density
                    isAntiAlias = true
                }

                val bounds = bounds
                val centerX = bounds.centerX().toFloat()
                val centerY = bounds.centerY().toFloat()
                val size = 6f * context.resources.displayMetrics.density

                canvas.drawLine(centerX - size, centerY - size, centerX + size, centerY + size, paint)
                canvas.drawLine(centerX + size, centerY - size, centerX - size, centerY + size, paint)
            }

            override fun setAlpha(alpha: Int) {}
            override fun setColorFilter(colorFilter: ColorFilter?) {}
            override fun getOpacity(): Int = PixelFormat.TRANSLUCENT
        }
    }

    private fun createHideIcon(): Drawable {
        return object : Drawable() {
            override fun draw(canvas: Canvas) {
                val paint = Paint().apply {
                    color = Color.WHITE
                    strokeWidth = 2f * context.resources.displayMetrics.density
                    isAntiAlias = true
                    strokeCap = Paint.Cap.ROUND
                }

                val bounds = bounds
                val centerX = bounds.centerX().toFloat()
                val centerY = bounds.centerY().toFloat()
                val size = 6f * context.resources.displayMetrics.density

                // Draw horizontal line (minimize/hide icon)
                canvas.drawLine(centerX - size, centerY, centerX + size, centerY, paint)
            }

            override fun setAlpha(alpha: Int) {}
            override fun setColorFilter(colorFilter: ColorFilter?) {}
            override fun getOpacity(): Int = PixelFormat.TRANSLUCENT
        }
    }

    private fun startBlinkingAnimation() {
        recordingIndicator?.let { indicator ->
            val animator = ObjectAnimator.ofFloat(indicator, "alpha", 1f, 0.3f)
            animator.duration = 500
            animator.repeatCount = ValueAnimator.INFINITE
            animator.repeatMode = ValueAnimator.REVERSE
            animator.start()
        }
    }

    fun startRecording() {
        startTime = System.currentTimeMillis()
        startTimeUpdate()
        Log.d(TAG, "Recording overlay started")
    }

    fun stopRecording() {
        updateJob?.cancel()
        Log.d(TAG, "Recording overlay stopped")
    }

    private fun startTimeUpdate() {
        updateJob = CoroutineScope(Dispatchers.Main).launch {
            while (isActive) {
                val elapsed = System.currentTimeMillis() - startTime
                val hours = elapsed / 3600000
                val minutes = (elapsed % 3600000) / 60000
                val seconds = (elapsed % 60000) / 1000

                timeLabel?.text = String.format("%02d:%02d:%02d", hours, minutes, seconds)
                delay(1000)
            }
        }
    }

    fun setCameraDevice(camera: CameraDevice?) {
        cameraDevice = camera
        // Don't setup preview here, wait for service to be set
        Log.d(TAG, "Camera device set: ${camera != null}")
    }
    
    fun getTextureView(): TextureView? = textureView
    
    private fun adjustTextureViewAspectRatio(previewWidth: Int, previewHeight: Int) {
        textureView?.let { texture ->
            texture.post {
                // Get actual camera preview size ratio (typically 4:3 or 16:9)
                val cameraAspectRatio = previewWidth.toFloat() / previewHeight.toFloat()
                
                // Get TextureView current size
                val textureWidth = texture.width
                val textureHeight = texture.height
                val textureAspectRatio = textureWidth.toFloat() / textureHeight.toFloat()
                
                Log.d(TAG, "OVERLAY_DEBUG: Camera ratio: $cameraAspectRatio, Texture ratio: $textureAspectRatio")
                
                if (Math.abs(cameraAspectRatio - textureAspectRatio) > 0.1f) {
                    // Apply scaling to maintain aspect ratio
                    val matrix = Matrix()
                    
                    if (cameraAspectRatio > textureAspectRatio) {
                        // Camera is wider, scale height
                        val scale = cameraAspectRatio / textureAspectRatio
                        matrix.setScale(1f, scale, textureWidth / 2f, textureHeight / 2f)
                    } else {
                        // Camera is taller, scale width  
                        val scale = textureAspectRatio / cameraAspectRatio
                        matrix.setScale(scale, 1f, textureWidth / 2f, textureHeight / 2f)
                    }
                    
                    texture.setTransform(matrix)
                    Log.d(TAG, "OVERLAY_DEBUG: Applied transform matrix to fix aspect ratio")
                }
            }
        }
    }
    
    fun setService(videoService: VideoRecordingService?) {
        service = videoService
        Log.d(TAG, "OVERLAY_DEBUG: Service set for overlay: ${service != null}")
        
        // Setup camera preview after service is set with small delay
        setupCameraPreviewDelayed()
    }
    
    private fun setupCameraPreviewDelayed() {
        textureView?.post {
            Log.d(TAG, "OVERLAY_DEBUG: TextureView post - setting up camera preview")
            Log.d(TAG, "OVERLAY_DEBUG: TextureView isAvailable: ${textureView?.isAvailable}")
            setupCameraPreview()
        }
    }
    
    fun setPreviewSize(width: Int, height: Int) {
        Log.d(TAG, "🔄 setPreviewSize called with: ${width}x${height} (current: ${previewWidth}x${previewHeight})")
        
        // Must run on UI thread since we're touching views
        post {
            previewWidth = width
            previewHeight = height
            
            // Store current service reference
            val currentService = service
            
            Log.d(TAG, "🔄 Rebuilding overlay with new size on UI thread, service exists: ${currentService != null}")
            
            // Completely rebuild the overlay with new size
            removeAllViews()
            setupOverlayView()
            
            // Restore service connection if it existed
            if (currentService != null) {
                Log.d(TAG, "🔄 Restoring service connection after rebuild")
                setupCameraPreviewDelayed()
            }
            
            Log.d(TAG, "✅ Overlay recreated with new preview size: ${width}x${height}")
        }
    }

    private fun setupCameraPreview() {
        textureView?.let { textureView ->
            Log.d(TAG, "OVERLAY_DEBUG: Setting up camera preview, TextureView available: ${textureView.isAvailable}")
            if (textureView.isAvailable) {
                Log.d(TAG, "OVERLAY_DEBUG: TextureView is available, opening camera preview immediately")
                openCameraPreview()
            } else {
                Log.d(TAG, "OVERLAY_DEBUG: TextureView not available, setting surface texture listener")
                textureView.surfaceTextureListener = object : TextureView.SurfaceTextureListener {
                    override fun onSurfaceTextureAvailable(surface: SurfaceTexture, width: Int, height: Int) {
                        Log.d(TAG, "OVERLAY_DEBUG: SurfaceTexture available, size: ${width}x${height}")
                        openCameraPreview()
                    }

                    override fun onSurfaceTextureSizeChanged(surface: SurfaceTexture, width: Int, height: Int) {
                        Log.d(TAG, "OVERLAY_DEBUG: SurfaceTexture size changed: ${width}x${height}")
                        // Reapply transform when size changes to maintain proper aspect ratio
                        setupTextureViewTransform()
                    }
                    
                    override fun onSurfaceTextureDestroyed(surface: SurfaceTexture): Boolean {
                        Log.d(TAG, "OVERLAY_DEBUG: SurfaceTexture destroyed")
                        // Clear preview surface from service
                        service?.setPreviewSurface(null)
                        return true
                    }
                    
                    override fun onSurfaceTextureUpdated(surface: SurfaceTexture) {
                        // Log only first few updates to avoid spam
                        frameUpdateCount++
                        if (frameUpdateCount <= 5 || frameUpdateCount % 30 == 0) {
                            Log.d(TAG, "OVERLAY_DEBUG: SurfaceTexture updated (camera frame received) - frame #$frameUpdateCount")
                        }
                    }
                }
            }
        } ?: run {
            Log.e(TAG, "OVERLAY_DEBUG: TextureView is null in setupCameraPreview")
        }
    }

    private fun openCameraPreview() {
        textureView?.let { textureView ->
            try {
                val surfaceTexture = textureView.surfaceTexture
                Log.d(TAG, "OVERLAY_DEBUG: Creating surface from TextureView, surfaceTexture: ${surfaceTexture != null}")
                
                if (surfaceTexture == null) {
                    Log.e(TAG, "OVERLAY_DEBUG: SurfaceTexture is null!")
                    return
                }
                
                val surface = Surface(surfaceTexture)
                Log.d(TAG, "OVERLAY_DEBUG: Surface created successfully: ${surface.isValid}")
                
                // Setup TextureView transform for proper camera orientation
                setupTextureViewTransform()
                
                // Set preview surface to service
                service?.setPreviewSurface(surface)
                
                Log.d(TAG, "OVERLAY_DEBUG: Preview surface created and set to service, service available: ${service != null}")
                
            } catch (e: Exception) {
                Log.e(TAG, "OVERLAY_DEBUG: Failed to create preview surface", e)
            }
        } ?: run {
            Log.w(TAG, "OVERLAY_DEBUG: TextureView is null when trying to create preview surface")
        }
    }

    private fun setupTextureViewTransform() {
        textureView?.let { textureView ->
            Log.d(TAG, "OVERLAY_DEBUG: Setting up TextureView transform")
            
            // Get texture view dimensions
            val viewWidth = textureView.width
            val viewHeight = textureView.height
            
            Log.d(TAG, "OVERLAY_DEBUG: TextureView dimensions: ${viewWidth}x${viewHeight}")
            
            if (viewWidth == 0 || viewHeight == 0) {
                Log.w(TAG, "OVERLAY_DEBUG: TextureView has zero dimensions, skipping transform")
                return
            }
            
            val matrix = Matrix()
            val centerX = viewWidth / 2f
            val centerY = viewHeight / 2f
            
            // Camera preview now using 3:4 for portrait orientation overlay
            // This matches our portrait overlay better for mobile usage
            val cameraAspectRatio = 3f / 4f // Portrait camera ratio for overlay
            val viewAspectRatio = viewWidth.toFloat() / viewHeight.toFloat()
            
            var scaleX = 1f
            var scaleY = 1f
            
            if (viewAspectRatio > cameraAspectRatio) {
                // View is wider than camera, fit to height and crop sides
                scaleX = viewAspectRatio / cameraAspectRatio
            } else {
                // View is taller than camera, fit to width and crop top/bottom
                scaleY = cameraAspectRatio / viewAspectRatio
            }
            
            // Apply scaling to fit camera preview properly
            matrix.postScale(scaleX, scaleY, centerX, centerY)
            
            // Check if front camera and apply mirror effect
            val cameraIsBack = recordingSettings?.get("camera") != "Front"
            if (!cameraIsBack) {
                // Front camera: mirror horizontally for natural selfie effect
                matrix.postScale(-1f, 1f, centerX, centerY)
            }
            
            textureView.setTransform(matrix)
            Log.d(TAG, "OVERLAY_DEBUG: TextureView transform applied - scaleX: $scaleX, scaleY: $scaleY, camera: ${if (cameraIsBack) "back" else "front"}")
        }
    }
    
    private val recordingSettings: Map<String, Any>?
        get() = service?.getRecordingSettings()

    fun setWindowManagerAndParams(wm: WindowManager, params: WindowManager.LayoutParams) {
        windowManager = wm
        layoutParams = params
        initialX = params.x
        initialY = params.y
    }

    private fun updateOverlayPosition(deltaX: Int, deltaY: Int) {
        layoutParams?.let { params ->
            params.x += deltaX
            params.y += deltaY
            
            // Get screen dimensions to constrain movement
            val displayMetrics = context.resources.displayMetrics
            val screenWidth = displayMetrics.widthPixels
            val screenHeight = displayMetrics.heightPixels
            
            // Get overlay dimensions using current preview size
            val overlayWidth = (previewWidth * displayMetrics.density).toInt()
            val overlayHeight = (previewHeight * displayMetrics.density).toInt()
            
            // Constrain to screen boundaries
            params.x = params.x.coerceIn(0, screenWidth - overlayWidth)
            params.y = params.y.coerceIn(0, screenHeight - overlayHeight)
            
            try {
                windowManager?.updateViewLayout(this, params)
            } catch (e: Exception) {
                Log.e(TAG, "Failed to update overlay position", e)
            }
        }
    }

    private fun snapToNearestEdge() {
        layoutParams?.let { params ->
            val displayMetrics = context.resources.displayMetrics
            val screenWidth = displayMetrics.widthPixels
            val screenHeight = displayMetrics.heightPixels
            
            // Use current preview width for snapping
            val overlayWidth = (previewWidth * displayMetrics.density).toInt()
            val centerX = params.x + overlayWidth / 2
            
            // Snap to left or right edge based on which is closer
            val targetX = if (centerX < screenWidth / 2) {
                20 // Left edge with some margin
            } else {
                screenWidth - overlayWidth - 20 // Right edge with some margin
            }
            
            // Animate to the target position
            val animator = ValueAnimator.ofInt(params.x, targetX)
            animator.duration = 200
            animator.addUpdateListener { animation ->
                params.x = animation.animatedValue as Int
                try {
                    windowManager?.updateViewLayout(this, params)
                } catch (e: Exception) {
                    Log.e(TAG, "Failed to animate overlay position", e)
                }
            }
            animator.start()
        }
    }

    override fun onDetachedFromWindow() {
        super.onDetachedFromWindow()
        stopRecording()
        captureSession?.close()
    }
}