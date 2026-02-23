# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# Add any project specific keep options here:

# ============================================================
# Google Mobile Ads SDK & Mediation Networks
# ============================================================

# Google Mobile Ads
-keep class com.google.android.gms.ads.** { *; }
-dontwarn com.google.android.gms.ads.**

# Unity Ads
-keepclassmembers class com.unity3d.ads.** { *; }
-keepclassmembers class com.unity3d.services.** { *; }
-dontwarn com.unity3d.ads.**
-dontwarn com.unity3d.services.**
-keepattributes SourceFile,LineNumberTable
-keepattributes JavascriptInterface

# AppLovin
-keepclassmembers class com.applovin.** { *; }
-keep class com.applovin.** { *; }
-dontwarn com.applovin.**

# IronSource
-keepclassmembers class com.ironsource.** { *; }
-keepclassmembers class com.ironsource.adapters.** { *; }
-dontwarn com.ironsource.**
-dontwarn com.ironsource.adapters.**

# InMobi
-keepattributes SourceFile,LineNumberTable
-keep class com.inmobi.** { *; }
-dontwarn com.inmobi.**
-dontwarn com.squareup.picasso.**
-keep class com.google.android.gms.ads.identifier.AdvertisingIdClient {
    com.google.android.gms.ads.identifier.AdvertisingIdClient$Info getAdvertisingIdInfo(android.content.Context);
}
-keep class com.google.android.gms.ads.identifier.AdvertisingIdClient$Info {
    java.lang.String getId();
    boolean isLimitAdTrackingEnabled();
}

# Vungle
-keep class com.vungle.** { *; }
-keepclassmembers class com.vungle.** { *; }
-dontwarn com.vungle.**
-keep class javax.inject.*
-keepattributes *Annotation*
-keepattributes Signature
-keep class dagger.*

# Mintegral
-keepattributes Signature
-keepattributes *Annotation*
-keep class com.mbridge.** { *; }
-keep interface com.mbridge.** { *; }
-dontwarn com.mbridge.**

# Pangle (ByteDance)
-keep class com.bytedance.sdk.** { *; }
-keep class com.pgl.sys.ces.** { *; }
-dontwarn com.bytedance.sdk.**

# AdColony
-keepclassmembers class com.adcolony.** { *; }
-keep class com.adcolony.** { *; }
-dontwarn com.adcolony.**

# OkHttp (used by multiple networks)
-dontwarn okhttp3.**
-dontwarn okio.**
-keepnames class okhttp3.internal.publicsuffix.PublicSuffixDatabase

# Gson (used by multiple networks)
-keepattributes Signature
-keepattributes *Annotation*
-dontwarn sun.misc.**
-keep class com.google.gson.** { *; }
-keep class * implements com.google.gson.TypeAdapterFactory
-keep class * implements com.google.gson.JsonSerializer
-keep class * implements com.google.gson.JsonDeserializer
