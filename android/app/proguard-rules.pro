# ProGuard / R8 Rules for DECKKNOB Android Application
# Package: com.deckknob.app

# --------------------------------------------------------------------------------
# Kotlin & Coroutines
# --------------------------------------------------------------------------------
-keepattributes *Annotation*, InnerClasses, EnclosingMethod, Signature
-dontwarn kotlin.**
-keep class kotlinx.coroutines.** { *; }

# --------------------------------------------------------------------------------
# AndroidX & Jetpack Compose
# --------------------------------------------------------------------------------
-keep class androidx.compose.** { *; }
-dontwarn androidx.compose.**
-keep class androidx.lifecycle.** { *; }
-keep class androidx.navigation.** { *; }

# --------------------------------------------------------------------------------
# Dagger / Hilt
# --------------------------------------------------------------------------------
-keep class dagger.hilt.** { *; }
-keep class * extends dagger.hilt.android.internal.managers.ViewComponentManager$FragmentContextWrapper { *; }
-dontwarn dagger.hilt.**
-keepclassmembers class * {
    @javax.inject.Inject <init>(...);
    @dagger.Provides <methods>;
}

# --------------------------------------------------------------------------------
# Firebase SDKs (Auth, Firestore, Storage, Messaging, Analytics)
# --------------------------------------------------------------------------------
-keepattributes *Annotation*
-keep class com.google.firebase.** { *; }
-dontwarn com.google.firebase.**

# Firestore Serialization & Deserialization
-keepclassmembers class com.deckknob.app.data.model.** {
    @com.google.firebase.firestore.PropertyName <fields>;
    @com.google.firebase.firestore.PropertyName <methods>;
    <init>();
    public <methods>;
    public <fields>;
}

# --------------------------------------------------------------------------------
# Networking & Serialization (Retrofit, OkHttp, Gson)
# --------------------------------------------------------------------------------
-keep class retrofit2.** { *; }
-dontwarn retrofit2.**
-keepclassmembers class * {
    @retrofit2.http.* <methods>;
}

-keep class okhttp3.** { *; }
-dontwarn okhttp3.**
-dontwarn okio.**

-keep class com.google.gson.** { *; }
-keepclassmembers class * {
    @com.google.gson.annotations.SerializedName <fields>;
}

# --------------------------------------------------------------------------------
# Media3 / ExoPlayer & Coil
# --------------------------------------------------------------------------------
-keep class androidx.media3.** { *; }
-dontwarn androidx.media3.**
-keep class coil.** { *; }
-dontwarn coil.**

