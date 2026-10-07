import { NativeModules } from 'react-native';

/**
 * Returns the application version name.
 * On Android, this dynamically reads the `versionName` configured in `android/app/build.gradle`
 * via the native `AppVersionModule` (PackageManager / BuildConfig).
 * If the native module is not yet compiled into the running APK, it falls back to the current build.gradle version ("1.1").
 */
export function getAppVersion(): string {
  try {
    const nativeVersion = NativeModules?.AppVersionModule?.versionName;
    if (nativeVersion && typeof nativeVersion === 'string') {
      return nativeVersion;
    }
  } catch (e) {
    console.warn('[Version] Failed to read native version:', e);
  }
  return '1.1';
}
