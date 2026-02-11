import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { signOut } from 'firebase/auth';
import { useAuth } from '../contexts/AuthContext';
import { auth } from '../config/firebase';
import { COLORS, FONTS, SPACING, FONT_FAMILY } from '../config/theme';
import Navbar, { NAVBAR_HEIGHT } from '../components/Navbar';

export default function HomeScreen() {
  const { userData } = useAuth();

  if (!userData) return null;

  const winRate =
    userData.stats.gamesPlayed > 0
      ? Math.round((userData.stats.wins / userData.stats.gamesPlayed) * 100)
      : 0;

  const initial = userData.displayName ? userData.displayName.charAt(0).toUpperCase() : '?';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.profileRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <View style={styles.nameContainer}>
            <Text style={styles.welcomeLabel}>Salut,</Text>
            <Text style={styles.welcomeName}>{userData.displayName} !</Text>
          </View>
        </View>
        <Image
          source={require('../../assets/P2C_Icon_Only.png')}
          style={styles.headerLogo}
          resizeMode="contain"
        />
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
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  avatarText: {
    color: COLORS.text,
    fontSize: FONTS.large,
    fontWeight: 'bold',
    fontFamily: FONT_FAMILY.bold,
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
  headerLogo: {
    width: 36,
    height: 36,
    marginRight: SPACING.sm,
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
});
