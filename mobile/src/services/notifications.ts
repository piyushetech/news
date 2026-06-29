import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { authApi } from './api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function registerPushNotifications(): Promise<void> {
  if (Platform.OS === 'web') return;

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') return;

  try {
    const tokenData = await Notifications.getDevicePushTokenAsync();
    if (tokenData?.data) {
      await authApi.updateFcm(tokenData.data);
    }
  } catch {
    /* push not available in Expo Go or simulator */
  }
}
