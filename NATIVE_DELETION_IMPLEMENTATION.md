# Native Deletion Implementation Guide

## Issue
Current `VideoRecordingModule.deleteVideo()` fails with generic "Failed to delete video file" error due to Android scoped storage restrictions (Android 10+).

## Required Native Methods

Add these methods to your `VideoRecordingModule` (Java/Kotlin):

### 1. MediaStore ContentResolver Deletion
```java
@ReactMethod
public void deleteViaMediaStore(String filePath, boolean isAudio, Promise promise) {
    try {
        ContentResolver resolver = getReactApplicationContext().getContentResolver();
        
        // Determine the correct MediaStore URI
        Uri contentUri = isAudio ? 
            MediaStore.Audio.Media.EXTERNAL_CONTENT_URI : 
            MediaStore.Video.Media.EXTERNAL_CONTENT_URI;
            
        // Query for the file
        String[] projection = {MediaStore.MediaColumns._ID};
        String selection = MediaStore.MediaColumns.DATA + "=?";
        String[] selectionArgs = {filePath};
        
        Cursor cursor = resolver.query(contentUri, projection, selection, selectionArgs, null);
        
        if (cursor != null && cursor.moveToFirst()) {
            long id = cursor.getLong(cursor.getColumnIndexOrThrow(MediaStore.MediaColumns._ID));
            Uri deleteUri = ContentUris.withAppendedId(contentUri, id);
            
            int deletedRows = resolver.delete(deleteUri, null, null);
            cursor.close();
            
            if (deletedRows > 0) {
                promise.resolve("File deleted successfully via MediaStore");
            } else {
                promise.reject("DELETE_ERROR", "Failed to delete via MediaStore");
            }
        } else {
            if (cursor != null) cursor.close();
            promise.reject("NOT_FOUND", "File not found in MediaStore");
        }
    } catch (Exception e) {
        promise.reject("DELETE_ERROR", "MediaStore deletion failed: " + e.getMessage());
    }
}
```

### 2. Document File API Deletion (Android 5.0+)
```java
@ReactMethod
public void deleteViaDocumentFile(String filePath, Promise promise) {
    try {
        File file = new File(filePath);
        DocumentFile documentFile = DocumentFile.fromFile(file);
        
        if (documentFile.exists() && documentFile.delete()) {
            promise.resolve("File deleted successfully via DocumentFile API");
        } else {
            promise.reject("DELETE_ERROR", "DocumentFile deletion failed");
        }
    } catch (Exception e) {
        promise.reject("DELETE_ERROR", "DocumentFile API error: " + e.getMessage());
    }
}
```

### 3. Improved Standard Deletion with Better Error Handling
```java
@ReactMethod
public void deleteVideoImproved(String filePath, Promise promise) {
    try {
        File file = new File(filePath);
        
        if (!file.exists()) {
            promise.reject("NOT_FOUND", "File does not exist: " + filePath);
            return;
        }
        
        if (!file.canWrite()) {
            promise.reject("PERMISSION_DENIED", "No write permission for file: " + filePath);
            return;
        }
        
        // Try standard deletion first
        if (file.delete()) {
            // Notify MediaScanner about the deletion
            MediaScannerConnection.scanFile(
                getReactApplicationContext(),
                new String[]{filePath},
                null,
                null
            );
            promise.resolve("File deleted successfully");
        } else {
            // If standard deletion fails, try to understand why
            String errorReason = "Unknown error";
            
            if (file.exists()) {
                errorReason = "File still exists after deletion attempt";
            }
            
            if (!file.getParentFile().canWrite()) {
                errorReason = "Parent directory is not writable";
            }
            
            promise.reject("DELETE_ERROR", "Standard deletion failed: " + errorReason);
        }
    } catch (SecurityException e) {
        promise.reject("PERMISSION_DENIED", "Security exception: " + e.getMessage());
    } catch (Exception e) {
        promise.reject("DELETE_ERROR", "Unexpected error: " + e.getMessage());
    }
}
```

### 4. MediaStore Notification
```java
@ReactMethod
public void notifyMediaStoreDelete(String filePath, Promise promise) {
    try {
        // Scan the file to remove it from MediaStore
        MediaScannerConnection.scanFile(
            getReactApplicationContext(),
            new String[]{filePath},
            null,
            new MediaScannerConnection.OnScanCompletedListener() {
                @Override
                public void onScanCompleted(String path, Uri uri) {
                    promise.resolve("MediaStore notified of deletion");
                }
            }
        );
    } catch (Exception e) {
        promise.reject("MEDIA_STORE_ERROR", "Failed to notify MediaStore: " + e.getMessage());
    }
}
```

## Android Manifest Requirements

Add these permissions to `android/app/src/main/AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />

<!-- For Android 10+ scoped storage -->
<uses-permission android:name="android.permission.MANAGE_EXTERNAL_STORAGE" 
    tools:ignore="ScopedStorage" />

<!-- For MediaStore operations -->
<uses-permission android:name="android.permission.ACCESS_MEDIA_LOCATION" />
```

For Android 10+ compatibility, also add to `<application>` tag:
```xml
<application
    android:requestLegacyExternalStorage="true"
    ... >
```

## Gradle Dependencies

Add to `android/app/build.gradle`:
```gradle
dependencies {
    implementation 'androidx.documentfile:documentfile:1.0.1'
}
```

## Implementation Priority

1. **High Priority**: Replace current `deleteVideo()` with `deleteVideoImproved()` 
2. **Medium Priority**: Implement `deleteViaMediaStore()` for Android 10+ compatibility
3. **Low Priority**: Add `deleteViaDocumentFile()` and `notifyMediaStoreDelete()` as fallbacks

## Testing

Test on different Android versions:
- Android 9 and below (legacy storage)
- Android 10+ (scoped storage)
- Different file locations (/storage/emulated/0/, /sdcard/)

## Current Workaround

The React Native code now falls back to RNFS deletion which works but doesn't update MediaStore properly. Implementing the native methods above will provide:

1. ✅ Proper MediaStore integration
2. ✅ Better error messages  
3. ✅ Android 10+ scoped storage support
4. ✅ Comprehensive fallback strategies

## Log Analysis

Current logs show:
- ✅ File exists and is accessible via RNFS
- ❌ Native deletion fails with generic error
- ✅ RNFS fallback works but may leave MediaStore inconsistent

The native implementation will solve these MediaStore sync issues.