import { Platform, PermissionsAndroid, Alert } from 'react-native';
import {
  getMessaging,
  getToken,
  onMessage,
  onNotificationOpenedApp,
  onTokenRefresh,
  requestPermission,
  getInitialNotification,
  setBackgroundMessageHandler,
  isDeviceRegisteredForRemoteMessages,
  registerDeviceForRemoteMessages,
  AuthorizationStatus,
  type RemoteMessage,
} from '@react-native-firebase/messaging';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getBackendUrl } from './api';

const FCM_TOKEN_STORAGE_KEY = '@swift_fcm_token';

/**
 * Request notification permissions from user (handles Android 13+ POST_NOTIFICATIONS)
 */
export async function requestNotificationPermission(): Promise<boolean> {
  try {
    if (Platform.OS === 'android') {
      if (Platform.Version >= 33) {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
          {
            title: 'SWIFT HR Notification Permission',
            message: 'SWIFT HR needs notification access to alert you about approvals, punch reminders, and company notices.',
            buttonPositive: 'Allow',
            buttonNegative: 'Deny',
          }
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          console.log('[FCM] Android 13+ Notification permission denied');
          return false;
        }
      }
    }

    const messaging = getMessaging();
    const authStatus = await requestPermission(messaging, {
      alert: true,
      badge: true,
      sound: true,
    });

    const enabled =
      authStatus === AuthorizationStatus.AUTHORIZED ||
      authStatus === AuthorizationStatus.PROVISIONAL;

    console.log('[FCM] Authorization status:', authStatus, 'Enabled:', enabled);
    return enabled;
  } catch (error) {
    console.error('[FCM] Error requesting notification permission:', error);
    return false;
  }
}

/**
 * Retrieves the device's FCM token and registers it with backend
 */
export async function getFCMToken(employeeId?: string): Promise<string | null> {
  try {
    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) {
      console.log('[FCM] No permission to fetch FCM token');
      return null;
    }

    const messaging = getMessaging();

    // Register device for remote messages on iOS
    if (Platform.OS === 'ios' && !isDeviceRegisteredForRemoteMessages(messaging)) {
      await registerDeviceForRemoteMessages(messaging);
    }

    const token = await getToken(messaging);

    if (token) {
      console.log('\n===========================================================');
      console.log('🔥 [FCM SUCCESS] YOUR MOBILE FCM TOKEN:');
      console.log(token);
      console.log('===========================================================\n');

      await AsyncStorage.setItem(FCM_TOKEN_STORAGE_KEY, token);

      // Register device token with backend
      await registerTokenWithBackend(employeeId || 'mobile_user', token);
    }

    return token;
  } catch (error) {
    console.error('[FCM] Error getting FCM token:', error);
    return null;
  }
}

/**
 * Gets cached token from AsyncStorage
 */
export async function getCachedFCMToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(FCM_TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

/**
 * Sends device token to SWIFT backend server with multi-endpoint fallback
 */
export async function registerTokenWithBackend(employeeId: string, fcmToken: string): Promise<boolean> {
  const candidates = [
    getBackendUrl(),
    'http://10.0.2.2:5000', // Standard Android Emulator host IP
    'http://localhost:5000', // USB physical device with port forward
  ].filter(Boolean);

  let success = false;
  for (const url of candidates) {
    try {
      const res = await fetch(`${url}/api/notifications/register-device-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
        },
        body: JSON.stringify({
          employeeId: employeeId || 'mobile_user',
          fcmToken,
          platform: Platform.OS,
          updatedAt: new Date().toISOString(),
        }),
      });

      if (res.ok) {
        console.log(`[FCM] Token registered successfully at: ${url}`);
        success = true;
        break;
      }
    } catch (err) {
      // Continue to next candidate
    }
  }

  return success;
}

/**
 * Listeners for foreground, background, and notification tap events
 */
export function setupNotificationListeners(
  onNotificationReceived?: (message: RemoteMessage) => void,
  onNotificationOpened?: (message: RemoteMessage) => void
) {
  const messaging = getMessaging();

  // 1. Foreground message handler (when app is open and in use)
  const unsubscribeForeground = onMessage(messaging, async (remoteMessage: RemoteMessage) => {
    console.log('[FCM] Foreground notification received:', remoteMessage);

    if (onNotificationReceived) {
      onNotificationReceived(remoteMessage);
    } else {
      // Default foreground alert
      const title = remoteMessage.notification?.title || remoteMessage.data?.title || 'SWIFT HR Notice';
      const body = remoteMessage.notification?.body || remoteMessage.data?.body || 'New announcement published.';
      Alert.alert(String(title), String(body));
    }
  });

  // 2. Notification opened from Background state
  const unsubscribeOpenedApp = onNotificationOpenedApp(messaging, (remoteMessage: RemoteMessage) => {
    console.log('[FCM] App opened from background notification:', remoteMessage);
    if (onNotificationOpened) {
      onNotificationOpened(remoteMessage);
    }
  });

  // 3. Notification opened from Quit / Killed state
  getInitialNotification(messaging)
    .then((remoteMessage) => {
      if (remoteMessage) {
        console.log('[FCM] App opened from quit state via notification:', remoteMessage);
        if (onNotificationOpened) {
          onNotificationOpened(remoteMessage);
        }
      }
    })
    .catch((err) => console.log('[FCM] Error checking initial notification:', err));

  // 4. Token refresh listener
  const unsubscribeTokenRefresh = onTokenRefresh(messaging, async (newToken: string) => {
    console.log('[FCM] Token refreshed:', newToken);
    await AsyncStorage.setItem(FCM_TOKEN_STORAGE_KEY, newToken);
  });

  return () => {
    unsubscribeForeground();
    unsubscribeOpenedApp();
    unsubscribeTokenRefresh();
  };
}

/**
 * Background message handler (Must be called outside React lifecycle in index.js)
 */
export async function backgroundMessageHandler(remoteMessage: RemoteMessage) {
  console.log('[FCM] Background message handled in background:', remoteMessage);
  return Promise.resolve();
}

/**
 * Initializes the background message handler in index.js
 */
export function registerBackgroundHandler() {
  try {
    const messaging = getMessaging();
    setBackgroundMessageHandler(messaging, backgroundMessageHandler);
  } catch (err) {
    console.warn('[FCM] Could not register background handler:', err);
  }
}
