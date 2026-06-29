import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View } from 'react-native';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { LocaleProvider, useLocale } from './src/context/LocaleContext';
import LoginScreen from './src/screens/LoginScreen';
import PreferencesScreen from './src/screens/PreferencesScreen';
import DailyBriefingScreen from './src/screens/DailyBriefingScreen';
import HomeScreen from './src/screens/HomeScreen';
import DetailScreen from './src/screens/DetailScreen';
import { RootStackParamList } from './src/navigation/types';
import { colors } from './src/theme';
import { storage } from './src/services/storage';

const Stack = createNativeStackNavigator<RootStackParamList>();

function Navigator() {
  const { user, loading, needsPreferences } = useAuth();
  const { language } = useLocale();
  const [briefingDone, setBriefingDone] = useState<boolean | null>(null);
  const briefingEnabled = language === 'en';

  useEffect(() => {
    if (!user || needsPreferences) {
      setBriefingDone(null);
      return;
    }
    if (!briefingEnabled) {
      setBriefingDone(true);
      return;
    }
    (async () => {
      const stored = await storage.getItem('briefingCompletedDate');
      const today = new Date().toISOString().slice(0, 10);
      setBriefingDone(stored === today);
    })();
  }, [user, needsPreferences, briefingEnabled]);

  if (loading || (user && !needsPreferences && briefingEnabled && briefingDone === null)) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator size="large" color={colors.orange} />
      </View>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName={
        user && !needsPreferences
          ? (briefingEnabled && !briefingDone ? 'DailyBriefing' : 'Home')
          : undefined
      }
    >
      {!user ? (
        <Stack.Screen name="Login" component={LoginScreen} />
      ) : needsPreferences ? (
        <Stack.Screen name="Preferences" component={PreferencesScreen} />
      ) : (
        <>
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="DailyBriefing" component={DailyBriefingScreen} />
          <Stack.Screen name="Preferences" component={PreferencesScreen} />
          <Stack.Screen name="Detail" component={DetailScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <LocaleProvider>
        <NavigationContainer>
          <Navigator />
        </NavigationContainer>
      </LocaleProvider>
    </AuthProvider>
  );
}
