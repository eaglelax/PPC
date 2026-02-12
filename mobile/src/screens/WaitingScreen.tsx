import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, AppState, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { onBetUpdate, cancelBet } from '../services/betService';
import { COLORS, FONTS, SPACING, FONT_FAMILY } from '../config/theme';
import { RootStackParamList } from '../types';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Waiting'>;
  route: RouteProp<RootStackParamList, 'Waiting'>;
};

// Animated dots component
function AnimatedDots() {
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dot3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animate = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(dot, { toValue: 1, duration: 400, delay, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0.3, duration: 400, useNativeDriver: true }),
        ])
      );

    const a1 = animate(dot1, 0);
    const a2 = animate(dot2, 200);
    const a3 = animate(dot3, 400);
    a1.start();
    a2.start();
    a3.start();

    return () => {
      a1.stop();
      a2.stop();
      a3.stop();
    };
  }, [dot1, dot2, dot3]);

  return (
    <View style={dotsStyles.container}>
      {[dot1, dot2, dot3].map((dot, i) => (
        <Animated.View
          key={i}
          style={[dotsStyles.dot, { opacity: dot }]}
        />
      ))}
    </View>
  );
}

const dotsStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 6,
    marginTop: SPACING.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
  },
});

export default function WaitingScreen({ navigation, route }: Props) {
  const { betId, betAmount } = route.params;
  const { firebaseUser } = useAuth();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const [cancelling, setCancelling] = useState(false);
  const matchedRef = useRef(false);
  const cancellingRef = useRef(false);

  // Pulse animation for the shield logo
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

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
  // Use 'inactive' -> 'background' transition to avoid false triggers on Android
  const appStateRef = useRef(AppState.currentState);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      const prevState = appStateRef.current;
      appStateRef.current = nextState;
      // Only cancel if truly going to background from active state
      if (prevState === 'active' && nextState === 'background' && !matchedRef.current && !cancellingRef.current) {
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
      <Animated.View style={[styles.iconContainer, {
        transform: [{ scale: pulseAnim }],
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.4,
        shadowRadius: 30,
      }]}>
        <Image
          source={require('../../assets/P2C_Icon_Only.png')}
          style={styles.shieldLogo}
          resizeMode="contain"
        />
      </Animated.View>

      <Text style={styles.title}>Recherche d'un adversaire</Text>
      <AnimatedDots />

      <View style={styles.betCard}>
        <Ionicons name="cash-outline" size={20} color={COLORS.gold} />
        <Text style={styles.betInfo}>{betAmount.toLocaleString()}F</Text>
      </View>

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
  shieldLogo: {
    width: 100,
    height: 100,
  },
  title: {
    fontSize: FONTS.large,
    fontWeight: 'bold',
    color: COLORS.text,
    fontFamily: FONT_FAMILY.bold,
  },
  betCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.gold + '40',
  },
  betInfo: {
    fontSize: FONTS.large,
    color: COLORS.gold,
    fontWeight: 'bold',
    fontFamily: FONT_FAMILY.bold,
  },
  subtitle: {
    fontSize: FONTS.regular,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.lg,
    marginBottom: SPACING.xxl,
    fontFamily: FONT_FAMILY.regular,
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
    fontFamily: FONT_FAMILY.semibold,
  },
});
