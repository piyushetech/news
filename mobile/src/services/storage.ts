import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const isWeb = Platform.OS === 'web';

export const storage = {
  getItem: async (key: string) => (isWeb ? localStorage.getItem(key) : SecureStore.getItemAsync(key)),
  setItem: async (key: string, val: string) => {
    if (isWeb) localStorage.setItem(key, val);
    else await SecureStore.setItemAsync(key, val);
  },
  deleteItem: async (key: string) => {
    if (isWeb) localStorage.removeItem(key);
    else await SecureStore.deleteItemAsync(key);
  },
};
