/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import { registerBackgroundHandler } from './src/services/notificationService';

// Register background FCM notification handler
registerBackgroundHandler();

AppRegistry.registerComponent(appName, () => App);
