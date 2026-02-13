import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { signOut } from 'firebase/auth';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../contexts/AuthContext';
import { auth } from '../config/firebase';
import { cancelActiveGames } from '../config/api';
import { COLORS, FONTS, SPACING, FONT_FAMILY } from '../config/theme';
import { showAlert } from '../utils/alert';
import { RootStackParamList } from '../types';
import Navbar, { NAVBAR_HEIGHT } from '../components/Navbar';

export default function HomeScreen() {
  const { userData, firebaseUser } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const cleanupDone = useRef(false);

  // On mount, cancel any orphaned active games (e.g. after page reload)
  useEffect(() => {
    if (!firebaseUser || cleanupDone.current) return;
    cleanupDone.current = true;

    const doCleanup = async (attempt = 1) => {
      try {
        const result = await cancelActiveGames();
        if (result.cancelled?.length > 0) {
          console.log('[Cleanup] Cancelled active games:', result.cancelled);
          showAlert(
            'Partie interrompue',
            'Une partie en cours a ete detectee. Votre remboursement sera effectue dans moins de 24h.',
            [{ text: 'OK' }]
          );
        }
      } catch (err) {
        console.error('[Cleanup] Failed (attempt', attempt, '):', err);
        if (attempt < 3) {
          setTimeout(() => doCleanup(attempt + 1), 2000);
        }
      }
    };
    doCleanup();
  }, [firebaseUser]);

  if (!userData) return null;

  const winRate =
    userData.stats.gamesPlayed > 0
      ? Math.round((userData.stats.wins / userData.stats.gamesPlayed) * 100)
      : 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.profileRow}>
          <Image
            source={require('../../assets/P2C_Icon_Only.png')}
            style={styles.headerLogo}
            resizeMode="contain"
          />
          <View style={styles.nameContainer}>
            <Text style={styles.welcomeLabel}>Salut,</Text>
            <Text style={styles.welcomeName}>{userData.displayName} !</Text>
          </View>
        </View>
        <TouchableOpacity onPress={() => signOut(auth)} style={styles.logoutButton}>
          <Ionicons name="log-out-outline" size={24} color={COLORS.danger} />
        </TouchableOpacity>
      </View>

      <View style={styles.balanceCard}>
        <Ionicons name="wallet" size={32} color={COLORS.primary} style={{ marginBottom: SPACING.sm }} />
        <Text style={styles.balanceLabel}>Votre solde</Text>
        <Text style={styles.balanceAmount}>{userData.balance.toLocaleString()}F</Text>
        <View style={styles.pixContainer}>
          <Ionicons name="diamond" size={20} color={COLORS.pix} />
          <Text style={styles.pixValue}>{userData.pix || 0}</Text>
          <Text style={styles.pixLabel}>Pix</Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Ionicons name="game-controller-outline" size={22} color={COLORS.text} style={{ marginBottom: 4 }} />
          <Text style={styles.statValue}>{userData.stats.gamesPlayed}</Text>
          <Text style={styles.statLabel}>Parties</Text>
        </View>
        <View style={styles.statBox}>
          <Ionicons name="trophy-outline" size={22} color={COLORS.success} style={{ marginBottom: 4 }} />
          <Text style={[styles.statValue, { color: COLORS.success }]}>{userData.stats.wins}</Text>
          <Text style={styles.statLabel}>Victoires</Text>
        </View>
        <View style={styles.statBox}>
          <Ionicons name="close-circle-outline" size={22} color={COLORS.danger} style={{ marginBottom: 4 }} />
          <Text style={[styles.statValue, { color: COLORS.danger }]}>{userData.stats.losses}</Text>
          <Text style={styles.statLabel}>Defaites</Text>
        </View>
        <View style={styles.statBox}>
          <Ionicons name="stats-chart-outline" size={22} color={COLORS.warning} style={{ marginBottom: 4 }} />
          <Text style={[styles.statValue, { color: COLORS.warning }]}>{winRate}%</Text>
          <Text style={styles.statLabel}>Win Rate</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.referralButton}
        onPress={() => navigation.navigate('Referral')}
      >
        <View style={styles.referralLeft}>
          <Ionicons name="people" size={24} color={COLORS.pix} />
          <View>
            <Text style={styles.referralTitle}>Inviter des amis</Text>
            <Text style={styles.referralSub}>
              {userData.referralStats?.referralsCount || 0} filleul{(userData.referralStats?.referralsCount || 0) !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>
        <View style={styles.referralRight}>
          <Text style={styles.referralPix}>+{userData.referralStats?.pixEarned || 0} PIX</Text>
          <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
        </View>
      </TouchableOpacity>

      <Navbar active="Home" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: SPACING.lg,
    paddingBottom: NAVBAR_HEIGHT + SPACING.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
    marginTop: SPACING.xl,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerLogo: {
    width: 44,
    height: 44,
    marginRight: SPACING.sm,
  },
  nameContainer: {
    flex: 1,
  },
  welcomeLabel: {
    fontSize: FONTS.regular,
    color: COLORS.textSecondary,
    fontFamily: FONT_FAMILY.regular,
  },
  welcomeName: {
    fontSize: FONTS.large,
    fontWeight: 'bold',
    color: COLORS.text,
    fontFamily: FONT_FAMILY.bold,
  },
  logoutButton: {
    padding: SPACING.sm,
  },
  balanceCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: SPACING.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.primary,
    marginBottom: SPACING.lg,
  },
  balanceLabel: {
    fontSize: FONTS.regular,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
    fontFamily: FONT_FAMILY.regular,
  },
  balanceAmount: {
    fontSize: FONTS.title,
    fontWeight: 'bold',
    color: COLORS.gold,
    fontFamily: FONT_FAMILY.bold,
  },
  pixContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 12,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    gap: 6,
    marginTop: SPACING.md,
  },
  pixValue: {
    color: COLORS.pix,
    fontSize: FONTS.large,
    fontWeight: 'bold',
  },
  pixLabel: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.xl,
  },
  statBox: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SPACING.md,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 4,
  },
  statValue: {
    fontSize: FONTS.large,
    fontWeight: 'bold',
    color: COLORS.text,
    fontFamily: FONT_FAMILY.bold,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
    fontFamily: FONT_FAMILY.regular,
  },
  referralButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  referralLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  referralTitle: {
    color: COLORS.text,
    fontSize: FONTS.regular,
    fontFamily: FONT_FAMILY.medium,
    fontWeight: '600',
  },
  referralSub: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontFamily: FONT_FAMILY.regular,
  },
  referralRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  referralPix: {
    color: COLORS.pix,
    fontSize: FONTS.regular,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: 'bold',
  },
});
