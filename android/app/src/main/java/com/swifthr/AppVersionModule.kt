package com.swifthr

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule

class AppVersionModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    override fun getName(): String = "AppVersionModule"

    override fun getConstants(): Map<String, Any> {
        val packageInfo = try {
            reactApplicationContext.packageManager.getPackageInfo(reactApplicationContext.packageName, 0)
        } catch (e: Exception) {
            null
        }
        val versionName = packageInfo?.versionName ?: BuildConfig.VERSION_NAME ?: "1.1"
        val versionCode = packageInfo?.let {
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.P) {
                it.longVersionCode
            } else {
                @Suppress("DEPRECATION")
                it.versionCode.toLong()
            }
        } ?: BuildConfig.VERSION_CODE.toLong()

        return mapOf(
            "versionName" to versionName,
            "versionCode" to versionCode
        )
    }
}
