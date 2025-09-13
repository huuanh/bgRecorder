package boom.bvr.recorder.pro;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import androidx.annotation.NonNull;

import com.facebook.react.bridge.ActivityEventListener;
import com.facebook.react.bridge.BaseActivityEventListener;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;

public class OverlayPermissionModule extends ReactContextBaseJavaModule {

    private static final int OVERLAY_PERMISSION_REQUEST_CODE = 1234;
    private Promise mOverlayPermissionPromise;

    private final ActivityEventListener mActivityEventListener = new BaseActivityEventListener() {
        @Override
        public void onActivityResult(Activity activity, int requestCode, int resultCode, Intent intent) {
            if (requestCode == OVERLAY_PERMISSION_REQUEST_CODE) {
                if (mOverlayPermissionPromise != null) {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                        boolean granted = Settings.canDrawOverlays(getReactApplicationContext());
                        mOverlayPermissionPromise.resolve(granted);
                    } else {
                        mOverlayPermissionPromise.resolve(true);
                    }
                    mOverlayPermissionPromise = null;
                }
            }
        }
    };

    public OverlayPermissionModule(ReactApplicationContext reactContext) {
        super(reactContext);
        reactContext.addActivityEventListener(mActivityEventListener);
    }

    @NonNull
    @Override
    public String getName() {
        return "OverlayPermissionModule";
    }

    @ReactMethod
    public void canDrawOverlays(Promise promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                boolean canDraw = Settings.canDrawOverlays(getReactApplicationContext());
                promise.resolve(canDraw);
            } else {
                // API < 23, permission is automatically granted
                promise.resolve(true);
            }
        } catch (Exception e) {
            promise.reject("ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void requestOverlayPermission(Promise promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                if (!Settings.canDrawOverlays(getReactApplicationContext())) {
                    mOverlayPermissionPromise = promise;
                    
                    Intent intent = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                            Uri.parse("package:" + getReactApplicationContext().getPackageName()));
                    
                    Activity currentActivity = getCurrentActivity();
                    if (currentActivity != null) {
                        currentActivity.startActivityForResult(intent, OVERLAY_PERMISSION_REQUEST_CODE);
                    } else {
                        promise.reject("NO_ACTIVITY", "No current activity found");
                    }
                } else {
                    promise.resolve(true);
                }
            } else {
                // API < 23, permission is automatically granted
                promise.resolve(true);
            }
        } catch (Exception e) {
            promise.reject("ERROR", e.getMessage());
        }
    }
}