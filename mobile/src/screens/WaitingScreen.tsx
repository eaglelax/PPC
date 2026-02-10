import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Alert, AppState } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { onBetUpdate, cancelBet } from '../services/betService';
import { COLORS, FONTS, SPACING } from '../config/theme';
import { RootStackParamList } from '../types';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Waiting'>;
  route: RouteProp<RootStackParamList, 'Waiting'>;
};

export default function WaitingScreen({ navigation, route }: Props) {
  const { betId, betAmount } = route.params;
  const { firebaseUser } = useAuth();
  const [dots, setDots] = useState('');
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [cancelling, setCancelling] = useState(false);
  const matchedRef = useRef(false);
  const cancellingRef = useRef(false);

  // Pulse animation
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.2, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  // Animated dots
  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? '' : prev + '.'));
    }, 500);
    return () => clearInterval(interval);
  }, []);

  // Listen for bet match via Firestore
  useEffect(() => {
    if (!betId) return;

    const unsub = onBetUpdate(betId, (bet) => {
      if (bet && bet.status === 'matched' && bet.gameId) {
        matchedRef.current = true;
        navigation.replace('Game', { gameId: bet.gameId });
      }
    });

    return unsub;
  }, [betId, navigation]);

  // Auto-cancel bet when navigating away (unless matched)
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (matchedRef.current || cancellingRef.current) return;
      cancellingRef.current = true;
      cancelBet(betId).catch(() => {});
    });
    return unsubscribe;
  }, [navigation, betId]);

  // Auto-cancel bet when app goes to background
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'background' && !matchedRef.current && !cancellingRef.current) {
        cancellingRef.current = true;
        cancelBet(betId).catch(() => {});
        navigation.goBack();
      }
    });
    return () => subscription.remove();
  }, [betId, navigation]);

  const handleCancel = () => {
    if (!firebaseUser || cancelling) return;
    setCancelling(true);
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.iconContainer, { transform: [{ scale: pulseAnim }] }]}>
        <Ionicons name="search" size={80} color={COLORS.primary} />
      </Animated.View>

      <Text style={styles.title}>Recherche d'un adversaire{dots}</Text>
      <Text style={styles.betInfo}>Mise : {betAmount.toLocaleString()}F</Text>
      <Text style={styles.subtitle}>
        Un joueur peut rejoindre votre pari a tout moment
      </Text>

      <TouchableOpacity
        style={[styles.cancelButton, cancelling && styles.cancelButtonDisabled]}
        onPress={handleCancel}
        disabled={cancelling}
      >
        <Text style={styles.cancelText}>
          {cancelling ? 'Annulation...' : 'Annuler'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  iconContainer: {
    marginBottom: SPACING.xl,
  },
  title: {
    fontSize: FONTS.large,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  betInfo: {
    fontSize: FONTS.medium,
    color: COLORS.gold,
    fontWeight: 'bold',
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontSize: FONTS.regular,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.xxl,
  },
  cancelButton: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.danger,
  },
  cancelButtonDisabled: {
    opacity: 0.5,
  },
  cancelText: {
    color: COLORS.danger,
    fontSize: FONTS.regular,
    fontWeight: 'bold',
  },
});
