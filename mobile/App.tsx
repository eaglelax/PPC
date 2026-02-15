import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet as RNStyleSheet, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts, Sora_600SemiBold, Sora_700Bold } from '@expo-google-fonts/sora';
import { Outfit_400Regular, Outfit_500Medium } from '@expo-google-fonts/outfit';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import ErrorBoundary from './src/components/ErrorBoundary';
import LoadingScreen from './src/components/LoadingScreen';
import AuthScreen from './src/screens/AuthScreen';
import HomeScreen from './src/screens/HomeScreen';
import BetScreen from './src/screens/BetScreen';
import WaitingScreen from './src/screens/WaitingScreen';
import GameScreen from './src/screens/GameScreen';
import ResultScreen from './src/screens/ResultScreen';
import RechargeScreen from './src/screens/RechargeScreen';
import WithdrawScreen from './src/screens/WithdrawScreen';
import ReferralScreen from './src/screens/ReferralScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import PrivacyPolicyScreen from './src/screens/PrivacyPolicyScreen';
import { RootStackParamList } from './src/types';
import { COLORS } from './src/config/theme';

const Stack = createNativeStackNavigator<RootStackParamList>();

// Global crash screen for unhandled errors (async, promises, etc.)
function GlobalErrorScreen({ error, onDismiss }: { error: string; onDismiss: () => void }) {
  return (
    <View style={crashStyles.overlay}>
      <View style={crashStyles.card}>
        <Text style={crashStyles.title}>Erreur detectee</Text>
        <ScrollView style={crashStyles.scrollBox}>
          <Text style={crashStyles.errorText}>{error}</Text>
        </ScrollView>
        <TouchableOpacity style={crashStyles.button} onPress={onDismiss}>
          <Text style={crashStyles.buttonText}>Fermer</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const crashStyles = RNStyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    zIndex: 9999,
  },
  card: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxHeight: '70%',
    borderWidth: 1,
    borderColor: '#e74c3c',
  },
  title: {
    color: '#e74c3c',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  scrollBox: { maxHeight: 200, marginBottom: 16 },
  errorText: { color: '#ffffff', fontSize: 13, lineHeight: 18 },
  button: {
    backgroundColor: '#e74c3c',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },
});

function AppNavigator() {
  const { firebaseUser, userData, loading, needsProfile } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  // Show Auth screen if: no firebase user, OR firebase user but no profile yet
  const showAuth = !firebaseUser || needsProfile;

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: COLORS.background },
        animation: 'slide_from_right',
      }}
    >
      {!showAuth && userData ? (
        <>
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="Bet" component={BetScreen} />
          <Stack.Screen
            name="Waiting"
            component={WaitingScreen}
            options={{ gestureEnabled: false }}
          />
          <Stack.Screen
            name="Game"
            component={GameScreen}
            options={{ gestureEnabled: false }}
          />
          <Stack.Screen
            name="Result"
            component={ResultScreen}
            options={{ gestureEnabled: false }}
          />
          <Stack.Screen name="Recharge" component={RechargeScreen} />
          <Stack.Screen name="Withdraw" component={WithdrawScreen} />
          <Stack.Screen name="Referral" component={ReferralScreen} />
          <Stack.Screen name="History" component={HistoryScreen} />
          <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
        </>
      ) : (
        <>
          <Stack.Screen name="Auth" component={AuthScreen} />
          <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Sora_600SemiBold,
    Sora_700Bold,
    Outfit_400Regular,
    Outfit_500Medium,
  });

  const [globalError, setGlobalError] = useState<string | null>(null);

  // Catch ALL unhandled JS errors and promise rejections
  useEffect(() => {
    const g = global as any;

    // 1. Catch unhandled promise rejections
    const origRejHandler = g.onunhandledrejection;
    g.onunhandledrejection = (e: any) => {
      const reason = e?.reason || e;
      const msg = reason?.message || reason?.toString?.() || 'Unknown rejection';
      setGlobalError('[Promise] ' + msg);
      if (origRejHandler) origRejHandler(e);
    };

    // 2. Override global error handler (catches fatal + non-fatal JS errors)
    let origErrorHandler: any = null;
    if (g.ErrorUtils) {
      origErrorHandler = g.ErrorUtils.getGlobalHandler();
      g.ErrorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
        const msg = error?.message || 'Unknown error';
        const stack = error?.stack || '';
        setGlobalError((isFatal ? '[FATAL] ' : '[Error] ') + msg + '\n\n' + stack.slice(0, 300));
        // Don't call original for non-fatal to prevent crash
        if (isFatal && origErrorHandler) {
          origErrorHandler(error, isFatal);
        }
      });
    }

    // 3. Web fallback
    if (Platform.OS === 'web') {
      const webHandler = (event: any) => {
        const reason = event?.reason || event;
        const msg = reason?.message || reason?.toString?.() || 'Unknown';
        setGlobalError('[Web] ' + msg);
      };
      window.addEventListener('unhandledrejection', webHandler);
      return () => {
        window.removeEventListener('unhandledrejection', webHandler);
        g.onunhandledrejection = origRejHandler;
        if (g.ErrorUtils && origErrorHandler) g.ErrorUtils.setGlobalHandler(origErrorHandler);
      };
    }

    return () => {
      g.onunhandledrejection = origRejHandler;
      if (g.ErrorUtils && origErrorHandler) g.ErrorUtils.setGlobalHandler(origErrorHandler);
    };
  }, []);

  if (!fontsLoaded) {
    return <LoadingScreen />;
  }

  return (
    <SafeAreaProvider>
    <ErrorBoundary>
      <AuthProvider>
        <NavigationContainer>
          <StatusBar style="light" />
          <AppNavigator />
        </NavigationContainer>
      </AuthProvider>
      {globalError && (
        <GlobalErrorScreen
          error={globalError}
          onDismiss={() => setGlobalError(null)}
        />
      )}
    </ErrorBoundary>
    </SafeAreaProvider>
  );
}
