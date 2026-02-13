import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Share,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';
import { Linking } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { getReferralStats } from '../config/api';
import { COLORS, FONTS, SPACING, FONT_FAMILY } from '../config/theme';
import { showAlert } from '../utils/alert';
import { ReferralInfo } from '../types';
import Navbar, { NAVBAR_HEIGHT } from '../components/Navbar';

export default function ReferralScreen() {
  const navigation = useNavigation();
  const { userData } = useAuth();
  const [loading, setLoading] = useState(true);
  const [referralCode, setReferralCode] = useState('');
  const [referrals, setReferrals] = useState<ReferralInfo[]>([]);
  const [totalPixEarned, setTotalPixEarned] = useState(0);

  const loadStats = useCallback(async () => {
    try {
      const stats = await getReferralStats();
      setReferralCode(stats.code || userData?.referralCode || '');
      setReferrals(stats.referrals || []);
      setTotalPixEarned(stats.totalPixEarned || 0);
    } catch (err) {
      setReferralCode(userData?.referralCode || '');
    } finally {
      setLoading(false);
    }
  }, [userData]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const shareMessage = `Rejoins-moi sur P2C et gagne de l'argent en jouant a Pierre-Papier-Ciseaux !\nUtilise mon code : ${referralCode}\nTelecharge l'app : https://p2c.app`;

  const handleCopy = async () => {
    await Clipboard.setStringAsync(referralCode);
    showAlert('Copie !', 'Code parrain copie dans le presse-papier.');
  };

  const handleShareWhatsApp = () => {
    const url = `whatsapp://send?text=${encodeURIComponent(shareMessage)}`;
    Linking.canOpenURL(url).then((supported) => {
      if (supported) {
        Linking.openURL(url);
      } else {
        handleShareGeneric();
      }
    });
  };

  const handleShareSMS = () => {
    const url = Platform.OS === 'ios'
      ? `sms:&body=${encodeURIComponent(shareMessage)}`
      : `sms:?body=${encodeURIComponent(shareMessage)}`;
    Linking.openURL(url);
  };

  const handleShareGeneric = async () => {
    try {
      await Share.share({ message: shareMessage });
    } catch {
      // User cancelled
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Parrainage</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Code Section */}
        <View style={styles.codeCard}>
          <Ionicons name="gift" size={32} color={COLORS.pix} style={{ marginBottom: SPACING.sm }} />
          <Text style={styles.codeLabel}>Mon code parrain</Text>
          <TouchableOpacity onPress={handleCopy}>
            <Text style={styles.codeText}>{referralCode}</Text>
          </TouchableOpacity>
          <Text style={styles.codeTip}>Appuyez pour copier</Text>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{referrals.length}</Text>
            <Text style={styles.statLabel}>Filleuls</Text>
          </View>
          <View style={styles.statBox}>
            <Ionicons name="diamond" size={18} color={COLORS.pix} />
            <Text style={[styles.statValue, { color: COLORS.pix }]}>{totalPixEarned}</Text>
            <Text style={styles.statLabel}>PIX gagnes</Text>
          </View>
        </View>

        {/* Share Buttons */}
        <View style={styles.shareSection}>
          <Text style={styles.sectionTitle}>Partager</Text>
          <View style={styles.shareButtons}>
            <TouchableOpacity style={[styles.shareBtn, { backgroundColor: '#25D366' }]} onPress={handleShareWhatsApp}>
              <Ionicons name="logo-whatsapp" size={22} color="#fff" />
              <Text style={styles.shareBtnText}>WhatsApp</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.shareBtn, { backgroundColor: COLORS.primary }]} onPress={handleShareSMS}>
              <Ionicons name="chatbubble" size={22} color="#fff" />
              <Text style={styles.shareBtnText}>SMS</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.shareBtn, { backgroundColor: COLORS.surfaceLight }]} onPress={handleCopy}>
              <Ionicons name="copy" size={22} color={COLORS.text} />
              <Text style={styles.shareBtnText}>Copier</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Rewards Info */}
        <View style={styles.rewardsCard}>
          <Text style={styles.sectionTitle}>Recompenses</Text>
          <View style={styles.rewardRow}>
            <Ionicons name="wallet" size={18} color={COLORS.success} />
            <Text style={styles.rewardText}>1ere recharge du filleul</Text>
            <Text style={styles.rewardPix}>+10 PIX</Text>
          </View>
          <View style={styles.rewardRow}>
            <Ionicons name="game-controller" size={18} color={COLORS.warning} />
            <Text style={styles.rewardText}>Toutes les 10 parties</Text>
            <Text style={styles.rewardPix}>+2 PIX</Text>
          </View>
          <View style={styles.rewardRow}>
            <Ionicons name="trophy" size={18} color={COLORS.gold} />
            <Text style={styles.rewardText}>50 victoires du filleul</Text>
            <Text style={styles.rewardPix}>+20 PIX</Text>
          </View>
        </View>

        {/* Referrals List */}
        {referrals.length > 0 && (
          <View style={styles.listSection}>
            <Text style={styles.sectionTitle}>Mes filleuls</Text>
            {referrals.map((ref, index) => (
              <View key={index} style={styles.referralItem}>
                <View style={styles.referralAvatar}>
                  <Text style={styles.referralAvatarText}>
                    {ref.displayName ? ref.displayName.charAt(0).toUpperCase() : '?'}
                  </Text>
                </View>
                <View style={styles.referralInfo}>
                  <Text style={styles.referralName}>{ref.displayName}</Text>
                  <Text style={styles.referralDetail}>
                    {ref.gamesPlayed} parties - {ref.wins} victoires
                  </Text>
                </View>
                <View style={styles.referralBadges}>
                  {ref.rewards.firstRecharge && (
                    <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
                  )}
                  {ref.rewards.fiftyWins && (
                    <Ionicons name="trophy" size={16} color={COLORS.gold} />
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        {referrals.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={48} color={COLORS.textSecondary} />
            <Text style={styles.emptyText}>Aucun filleul pour le moment</Text>
            <Text style={styles.emptySubtext}>Partagez votre code pour commencer a gagner des PIX !</Text>
          </View>
        )}
      </ScrollView>

      <Navbar active="Home" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingBottom: NAVBAR_HEIGHT,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.md,
  },
  backButton: {
    padding: SPACING.sm,
  },
  headerTitle: {
    fontSize: FONTS.large,
    fontWeight: 'bold',
    color: COLORS.text,
    fontFamily: FONT_FAMILY.bold,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.lg,
    gap: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  codeCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: SPACING.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.pix,
  },
  codeLabel: {
    fontSize: FONTS.regular,
    color: COLORS.textSecondary,
    fontFamily: FONT_FAMILY.regular,
    marginBottom: SPACING.sm,
  },
  codeText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.pix,
    fontFamily: FONT_FAMILY.bold,
    letterSpacing: 3,
  },
  codeTip: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontFamily: FONT_FAMILY.regular,
    marginTop: SPACING.xs,
  },
  statsRow: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  statBox: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SPACING.md,
    alignItems: 'center',
    gap: 4,
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
    fontFamily: FONT_FAMILY.regular,
  },
  shareSection: {
    gap: SPACING.sm,
  },
  sectionTitle: {
    fontSize: FONTS.medium,
    fontWeight: 'bold',
    color: COLORS.text,
    fontFamily: FONT_FAMILY.bold,
    marginBottom: SPACING.xs,
  },
  shareButtons: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  shareBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 12,
    paddingVertical: SPACING.md,
  },
  shareBtnText: {
    color: '#fff',
    fontSize: 13,
    fontFamily: FONT_FAMILY.medium,
    fontWeight: '600',
  },
  rewardsCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  rewardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: 4,
  },
  rewardText: {
    flex: 1,
    fontSize: FONTS.regular,
    color: COLORS.text,
    fontFamily: FONT_FAMILY.regular,
  },
  rewardPix: {
    fontSize: FONTS.regular,
    fontWeight: 'bold',
    color: COLORS.pix,
    fontFamily: FONT_FAMILY.bold,
  },
  listSection: {
    gap: SPACING.sm,
  },
  referralItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  referralAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.pix,
    alignItems: 'center',
    justifyContent: 'center',
  },
  referralAvatarText: {
    color: '#fff',
    fontSize: FONTS.medium,
    fontWeight: 'bold',
    fontFamily: FONT_FAMILY.bold,
  },
  referralInfo: {
    flex: 1,
  },
  referralName: {
    fontSize: FONTS.regular,
    color: COLORS.text,
    fontFamily: FONT_FAMILY.medium,
    fontWeight: '600',
  },
  referralDetail: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontFamily: FONT_FAMILY.regular,
  },
  referralBadges: {
    flexDirection: 'row',
    gap: 4,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
    gap: SPACING.sm,
  },
  emptyText: {
    fontSize: FONTS.medium,
    color: COLORS.textSecondary,
    fontFamily: FONT_FAMILY.medium,
  },
  emptySubtext: {
    fontSize: FONTS.regular,
    color: COLORS.textSecondary,
    fontFamily: FONT_FAMILY.regular,
    textAlign: 'center',
  },
});
