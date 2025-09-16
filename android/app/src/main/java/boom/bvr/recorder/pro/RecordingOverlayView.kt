package boom.bvr.recorder.pro

import android.animation.ObjectAnimator
import android.animation.ValueAnimator
import android.content.Context
import android.graphics.*
import android.graphics.drawable.Drawable
import android.graphics.drawable.GradientDrawable
import android.hardware.camera2.*
import android.util.AttributeSet
import android.util.Log
import android.view.*
import android.widget.*
import kotlinx.coroutines.*

class RecordingOverlayView @JvmOverloads constructor(
    context: Context,
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

    var onCloseCallback: (() -> Unit)? = null
    var onStopRecordingCallback: (() -> Unit)? = null

    init {
        setupOverlayView()
    }

    private fun setupOverlayView() {
        setBackgroundColor(Color.TRANSPARENT)

        // Create main container with rounded corners
        val containerView = FrameLayout(context).apply {
            layoutParams = FrameLayout.LayoutParams(
                (200 * context.resources.displayMetrics.density).toInt(),
                (280 * context.resources.displayMetrics.density).toInt()
            ).apply {
                gravity = Gravity.TOP or Gravity.START
                marginStart = (16 * context.resources.displayMetrics.density).toInt()
                topMargin = (100 * context.resources.displayMetrics.density).toInt()
            }
            background = createRoundedBackground()
            elevation = 8f
        }

        // Create TextureView for camera preview
        textureView = TextureView(context).apply {
            layoutParams = FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                (200 * context.resources.displayMetrics.density).toInt()
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

        // Create close button
        closeButton = ImageButton(context).apply {
            layoutParams = FrameLayout.LayoutParams(
                (32 * context.resources.displayMetrics.density).toInt(),
                (32 * context.resources.displayMetrics.density).toInt()
            ).apply {
                gravity = Gravity.TOP or Gravity.END
                marginEnd = (8 * context.resources.displayMetrics.density).toInt()
                topMargin = (8 * context.resources.displayMetrics.density).toInt()
            }
            setImageDrawable(createCloseIcon())
            background = createCircleDrawable(Color.parseColor("#80000000"))
            scaleType = ImageView.ScaleType.CENTER
            setOnClickListener {
                onStopRecordingCallback?.invoke()
                onCloseCallback?.invoke()
            }
        }
        containerView.addView(closeButton)

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
    
    fun setService(videoService: VideoRecordingService?) {
        service = videoService
        Log.d(TAG, "OVERLAY_DEBUG: Service set for overlay: ${service != null}")
        
        // Setup camera preview after service is set with small delay
        textureView?.post {
            Log.d(TAG, "OVERLAY_DEBUG: TextureView post - setting up camera preview")
            Log.d(TAG, "OVERLAY_DEBUG: TextureView isAvailable: ${textureView?.isAvailable}")
            setupCameraPreview()
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
            
            // Set up transform matrix for proper camera preview
            val matrix = Matrix()
            val centerX = viewWidth / 2f
            val centerY = viewHeight / 2f
            
            // Apply rotation if needed (for front camera)
            val cameraIsBack = recordingSettings?.get("camera") != "Front"
            if (!cameraIsBack) {
                matrix.postRotate(270f, centerX, centerY)
            }
            
            textureView.setTransform(matrix)
            Log.d(TAG, "OVERLAY_DEBUG: TextureView transform applied")
        }
    }
    
    private val recordingSettings: Map<String, Any>?
        get() = service?.getRecordingSettings()

    override fun onDetachedFromWindow() {
        super.onDetachedFromWindow()
        stopRecording()
        captureSession?.close()
    }
}