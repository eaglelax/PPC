import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet as RNStyleSheet, Platform } from 'react-native';
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
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
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
  scrollBox: {
    maxHeight: 200,
    marginBottom: 16,
  },
  errorText: {
    color: '#ffffff',
    fontSize: 13,
    lineHeight: 18,
  },
  button: {
    backgroundColor: '#e74c3c',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

function AppNavigator() {
  const { firebaseUser, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: COLORS.background },
        animation: 'slide_from_right',
      }}
    >
      {firebaseUser ? (
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
        </>
      ) : (
        <Stack.Screen name="Auth" component={AuthScreen} />
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
    // Catch unhandled promise rejections (e.g. failed API calls, Firestore errors)
    const rejectionHandler = (event: any) => {
      const reason = event?.reason || event;
      const msg = reason?.message || reason?.toString?.() || 'Unknown promise rejection';
      const stack = reason?.stack || '';
      console.error('[GLOBAL] Unhandled rejection:', msg);
      setGlobalError(`[Promise] ${msg}\n\n${stack.slice(0, 300)}`);
    };

    // For web
    if (Platform.OS === 'web') {
      window.addEventListener('unhandledrejection', rejectionHandler);
      return () => window.removeEventListener('unhandledrejection', rejectionHandler);
    }

    // For React Native (Hermes)
    const g = global as any;
    if (typeof g.HermesInternal !== 'undefined') {
      // Hermes supports tracking promise rejections
      const origHandler = g.onunhandledrejection;
      g.onunhandledrejection = (e: any) => {
        rejectionHandler(e);
        if (origHandler) origHandler(e);
      };
      return () => { g.onunhandledrejection = origHandler; };
    }

    // Fallback: Override the default ErrorUtils global handler
    if (g.ErrorUtils) {
      const origHandler = g.ErrorUtils.getGlobalHandler();
      g.ErrorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
        const msg = error?.message || 'Unknown error';
        const stack = error?.stack || '';
        console.error('[GLOBAL] JS error:', msg, isFatal ? '(FATAL)' : '');
        setGlobalError(`${isFatal ? '[FATAL] ' : ''}${msg}\n\n${stack.slice(0, 300)}`);
        // Don't call the original handler for non-fatal - it would crash the app
        if (isFatal && origHandler) {
          origHandler(error, isFatal);
        }
      });
      return () => { g.ErrorUtils.setGlobalHandler(origHandler); };
    }
  }, []);

  if (!fontsLoaded) {
    return <LoadingScreen />;
  }

  return (
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
  );
}
