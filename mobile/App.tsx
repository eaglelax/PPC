import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
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
    </ErrorBoundary>
  );
}
