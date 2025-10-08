package boom.bvr.recorder.pro;

import android.content.ComponentName;
import android.content.pm.PackageManager;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.Arguments;

public class IconChangeModule extends ReactContextBaseJavaModule {

    private final ReactApplicationContext reactContext;

    public IconChangeModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
    }

    @Override
    public String getName() {
        return "IconChangeModule";
    }

    @ReactMethod
    public void changeIcon(String aliasName, Promise promise) {
        try {
            PackageManager pm = reactContext.getPackageManager();
            String pkg = reactContext.getPackageName();
            
            // Define all possible aliases
            String[] allAliases = {
                "MainActivityDefault",
                "MainActivityBr1", 
                "MainActivityBr2", 
                "MainActivityBr3",
                "MainActivityCac1", 
                "MainActivityCac2", 
                "MainActivityCac3",
                "MainActivityWe1", 
                "MainActivityWe2", 
                "MainActivityWe3"
            };
            
            // Disable all aliases first
            for (String alias : allAliases) {
                ComponentName component = new ComponentName(pkg, pkg + "." + alias);
                pm.setComponentEnabledSetting(component,
                    PackageManager.COMPONENT_ENABLED_STATE_DISABLED,
                    PackageManager.DONT_KILL_APP);
            }
            
            // Enable the selected alias
            String targetAlias = aliasName.equals("default") ? "MainActivityDefault" : "MainActivity" + capitalize(aliasName);
            ComponentName newAlias = new ComponentName(pkg, pkg + "." + targetAlias);
            
            pm.setComponentEnabledSetting(newAlias,
                PackageManager.COMPONENT_ENABLED_STATE_ENABLED,
                PackageManager.DONT_KILL_APP);
                
            // Return success and schedule restart
            WritableMap result = Arguments.createMap();
            result.putString("status", "success");
            result.putString("message", "Icon changed to " + aliasName + ". App will restart.");
            promise.resolve(result);
            
            // Schedule app restart after a short delay to allow the result to be sent
            android.os.Handler mainHandler = new android.os.Handler(reactContext.getMainLooper());
            mainHandler.postDelayed(new Runnable() {
                @Override
                public void run() {
                    // This will cause the app to restart gracefully
                    System.exit(0);
                }
            }, 500); // 500ms delay
            
        } catch (Exception e) {
            promise.reject("ICON_CHANGE_ERROR", "Failed to change icon: " + e.getMessage(), e);
        }
    }
    
    @ReactMethod
    public void getCurrentIcon(Promise promise) {
        try {
            PackageManager pm = reactContext.getPackageManager();
            String pkg = reactContext.getPackageName();
            
            // Check which alias is currently enabled
            String[] allAliases = {
                "MainActivityDefault",
                "MainActivityBr1", 
                "MainActivityBr2", 
                "MainActivityBr3",
                "MainActivityCac1", 
                "MainActivityCac2", 
                "MainActivityCac3",
                "MainActivityWe1", 
                "MainActivityWe2", 
                "MainActivityWe3"
            };
            
            String currentIcon = "default";
            
            for (String alias : allAliases) {
                ComponentName component = new ComponentName(pkg, pkg + "." + alias);
                int enabledState = pm.getComponentEnabledSetting(component);
                
                if (enabledState == PackageManager.COMPONENT_ENABLED_STATE_ENABLED) {
                    if (alias.equals("MainActivityDefault")) {
                        currentIcon = "default";
                    } else {
                        // Extract icon name from alias (e.g., MainActivityBr1 -> br1)
                        currentIcon = alias.replace("MainActivity", "").toLowerCase();
                    }
                    break;
                }
            }
            
            WritableMap result = Arguments.createMap();
            result.putString("currentIcon", currentIcon);
            promise.resolve(result);
            
        } catch (Exception e) {
            promise.reject("GET_ICON_ERROR", "Failed to get current icon: " + e.getMessage(), e);
        }
    }
    
    @ReactMethod
    public void isIconChangeSupported(Promise promise) {
        // Android supports icon changing through activity-alias
        WritableMap result = Arguments.createMap();
        result.putBoolean("supported", true);
        result.putString("platform", "android");
        promise.resolve(result);
    }
    
    private String capitalize(String str) {
        if (str == null || str.isEmpty()) {
            return str;
        }
        return str.substring(0, 1).toUpperCase() + str.substring(1);
    }
}