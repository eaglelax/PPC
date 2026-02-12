import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../contexts/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, SPACING, FONT_FAMILY, GRADIENT_COLORS, MIN_BET_AMOUNT, GAME_FEE } from '../config/theme';
import { RootStackParamList, Bet } from '../types';
import { showAlert } from '../utils/alert';
import { onAvailableBets, createBet, joinBet } from '../services/betService';
import Navbar, { NAVBAR_HEIGHT } from '../components/Navbar';
import GradientButton from '../components/GradientButton';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Bet'>;
};

export default function BetScreen({ navigation }: Props) {
  const { userData, firebaseUser } = useAuth();
  const [bets, setBets] = useState<Bet[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [betAmount, setBetAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [joining, setJoining] = useState<string | null>(null);

  // Real-time listener for available bets
  useEffect(() => {
    const unsub = onAvailableBets((availableBets) => {
      // Filter out own bets from the joinable list display
      setBets(availableBets);
    });
    return unsub;
  }, []);

  if (!userData || !firebaseUser) return null;

  const handleCreateBet = async () => {
    const amount = parseInt(betAmount, 10);
    if (!amount || amount < MIN_BET_AMOUNT) {
      showAlert('Erreur', `Le montant minimum est de ${MIN_BET_AMOUNT.toLocaleString()}F.`);
      return;
    }
    if (amount + GAME_FEE > userData.balance) {
      showAlert('Solde insuffisant', `Il vous faut ${(amount + GAME_FEE).toLocaleString()}F (mise + frais).`, [
        { text: 'Recharger', onPress: () => navigation.navigate('Recharge') },
        { text: 'Annuler', style: 'cancel' },
      ]);
      return;
    }

    setLoading(true);
    try {
      const result = await createBet(amount);
      const betId = result?.betId;
      if (!betId) {
        showAlert('Erreur', `Reponse inattendue du serveur: ${JSON.stringify(result)}`);
        return;
      }
      // Close modal FIRST, then navigate after a short delay
      // Navigating while a Modal is open crashes on some Android devices
      setModalVisible(false);
      setBetAmount('');
      setTimeout(() => {
        try {
          navigation.navigate('Waiting', { betId, betAmount: amount });
        } catch (navError: any) {
          showAlert('Erreur navigation', navError.message || 'Erreur lors de la navigation.');
        }
      }, 150);
    } catch (error: any) {
      showAlert('Erreur', error.message || 'Erreur lors de la creation du pari.');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinBet = async (bet: Bet) => {
    if (bet.creatorId === firebaseUser.uid) {
      showAlert('Erreur', 'Vous ne pouvez pas rejoindre votre propre pari.');
      return;
    }
    if (bet.amount + GAME_FEE > userData.balance) {
      showAlert('Solde insuffisant', `Il vous faut ${(bet.amount + GAME_FEE).toLocaleString()}F (mise + frais).`, [
        { text: 'Recharger', onPress: () => navigation.navigate('Recharge') },
        { text: 'Annuler', style: 'cancel' },
      ]);
      return;
    }

    setJoining(bet.id);
    try {
      const result = await joinBet(bet.id);
      const gameId = result?.gameId;
      if (!gameId) {
        showAlert('Erreur', `Reponse inattendue du serveur: ${JSON.stringify(result)}`);
        return;
      }
      try {
        navigation.replace('Game', { gameId });
      } catch (navError: any) {
        showAlert('Erreur navigation', navError.message || 'Erreur lors de la navigation.');
      }
    } catch (error: any) {
      showAlert('Erreur', error.message || 'Erreur inconnue.');
    } finally {
      setJoining(null);
    }
  };

  const getTimeAgo = (createdAt: any): string => {
    if (!createdAt) return '';
    const date = createdAt.toDate ? createdAt.toDate() : new Date(createdAt);
    const diffMs = Date.now() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'A l\'instant';
    if (diffMin < 60) return `Il y a ${diffMin}min`;
    return `Il y a ${Math.floor(diffMin / 60)}h`;
  };

  const renderBetItem = ({ item }: { item: Bet }) => {
    const isOwn = item.creatorId === firebaseUser.uid;
    const isJoining = joining === item.id;

    return (
      <View style={styles.betItem}>
        <View style={styles.betInfo}>
          <View style={styles.betCreatorRow}>
            <Ionicons name="person-circle-outline" size={20} color={COLORS.textSecondary} style={{ marginRight: 6 }} />
            <Text style={styles.betCreator}>
              {isOwn ? 'Vous' : item.creatorName}
            </Text>
          </View>
          <Text style={styles.betTime}>{getTimeAgo(item.createdAt)}</Text>
        </View>
        <View style={{ alignItems: 'flex-end', marginRight: SPACING.md }}>
          <Text style={styles.betAmount}>{item.amount.toLocaleString()}F</Text>
          <Text style={styles.betFee}>+{GAME_FEE}F frais</Text>
        </View>
        {isOwn ? (
          <TouchableOpacity
            style={styles.ownBadge}
            onPress={() => navigation.navigate('Waiting', { betId: item.id, betAmount: item.amount })}
          >
            <Text style={styles.ownBadgeText}>Reprendre</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.joinButton, isJoining && styles.joinButtonDisabled]}
            onPress={() => handleJoinBet(item)}
            disabled={isJoining}
          >
            {isJoining ? (
              <ActivityIndicator size="small" color={COLORS.text} />
            ) : (
              <Text style={styles.joinButtonText}>Rejoindre</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Paris disponibles</Text>

      <View style={styles.balanceRow}>
        <Text style={styles.balanceLabel}>Solde :</Text>
        <Text style={styles.balanceValue}>{userData.balance.toLocaleString()}F</Text>
      </View>

      {bets.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="game-controller-outline" size={64} color={COLORS.textSecondary} />
          <Text style={styles.emptyText}>Aucun pari disponible</Text>
          <Text style={styles.emptySubtext}>Creez le premier pari !</Text>
        </View>
      ) : (
        <FlatList
          data={bets}
          keyExtractor={(item) => item.id}
          renderItem={renderBetItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Floating create button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={[...GRADIENT_COLORS]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.fabGradient}
        >
          <Ionicons name="add" size={32} color={COLORS.text} />
        </LinearGradient>
      </TouchableOpacity>

      <Navbar active="Bet" />

      {/* Create bet modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Creer un pari</Text>

            <Text style={styles.modalLabel}>Montant (min {MIN_BET_AMOUNT.toLocaleString()}F)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder={`${MIN_BET_AMOUNT.toLocaleString()}F minimum`}
              placeholderTextColor={COLORS.textSecondary}
              value={betAmount}
              onChangeText={setBetAmount}
              keyboardType="numeric"
            />

            {betAmount ? (
              <View style={styles.modalFeeInfo}>
                <Text style={styles.modalFeeText}>
                  Frais de partie : {GAME_FEE}F
                </Text>
                <Text style={styles.modalFeeText}>
                  Total debite : {((parseInt(betAmount, 10) || 0) + GAME_FEE).toLocaleString()}F
                </Text>
                <Text style={styles.modalGain}>
                  Gain potentiel : {(parseInt(betAmount, 10) * 2 || 0).toLocaleString()}F
                </Text>
              </View>
            ) : null}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => {
                  setModalVisible(false);
                  setBetAmount('');
                }}
              >
                <Text style={styles.modalCancelText}>Annuler</Text>
              </TouchableOpacity>

              <View style={{ flex: 1 }}>
                <GradientButton
                  title={loading ? 'Creation...' : 'Creer le pari'}
                  onPress={handleCreateBet}
                  disabled={loading}
                />
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: SPACING.lg,
  },
  title: {
    fontSize: FONTS.xlarge,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
    marginTop: SPACING.xl,
    marginBottom: SPACING.md,
    fontFamily: FONT_FAMILY.bold,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  balanceLabel: {
    color: COLORS.textSecondary,
    fontSize: FONTS.regular,
    fontFamily: FONT_FAMILY.regular,
  },
  balanceValue: {
    color: COLORS.gold,
    fontSize: FONTS.large,
    fontWeight: 'bold',
    fontFamily: FONT_FAMILY.bold,
  },
  list: {
    paddingBottom: NAVBAR_HEIGHT + 80,
  },
  betItem: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  betInfo: {
    flex: 1,
  },
  betCreatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  betCreator: {
    color: COLORS.text,
    fontSize: FONTS.regular,
    fontWeight: 'bold',
    fontFamily: FONT_FAMILY.semibold,
  },
  betTime: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 2,
    fontFamily: FONT_FAMILY.regular,
  },
  betAmount: {
    color: COLORS.gold,
    fontSize: FONTS.large,
    fontWeight: 'bold',
    fontFamily: FONT_FAMILY.bold,
  },
  betFee: {
    color: COLORS.textSecondary,
    fontSize: 11,
  },
  joinButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
  },
  joinButtonDisabled: {
    opacity: 0.5,
  },
  joinButtonText: {
    color: COLORS.text,
    fontWeight: 'bold',
    fontSize: 14,
    fontFamily: FONT_FAMILY.semibold,
  },
  ownBadge: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 8,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  ownBadgeText: {
    color: COLORS.primary,
    fontWeight: 'bold',
    fontSize: 12,
    fontFamily: FONT_FAMILY.semibold,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: FONTS.medium,
    marginBottom: SPACING.xs,
    marginTop: SPACING.md,
    fontFamily: FONT_FAMILY.bold,
  },
  emptySubtext: {
    color: COLORS.textSecondary,
    fontSize: FONTS.regular,
    fontFamily: FONT_FAMILY.regular,
  },
  fab: {
    position: 'absolute',
    bottom: NAVBAR_HEIGHT + SPACING.md,
    right: SPACING.lg,
    width: 60,
    height: 60,
    borderRadius: 30,
    elevation: 5,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
  },
  fabGradient: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: SPACING.xl,
  },
  modalTitle: {
    fontSize: FONTS.large,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.lg,
    textAlign: 'center',
    fontFamily: FONT_FAMILY.bold,
  },
  modalLabel: {
    color: COLORS.textSecondary,
    fontSize: FONTS.regular,
    marginBottom: SPACING.sm,
    fontFamily: FONT_FAMILY.regular,
  },
  modalInput: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: SPACING.md,
    fontSize: FONTS.large,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
    textAlign: 'center',
    marginBottom: SPACING.md,
    fontFamily: FONT_FAMILY.bold,
  },
  modalFeeInfo: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: SPACING.sm,
    marginBottom: SPACING.lg,
    gap: 4,
  },
  modalFeeText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    textAlign: 'center',
  },
  modalGain: {
    color: COLORS.success,
    fontSize: 14,
    textAlign: 'center',
    fontWeight: 'bold',
    fontFamily: FONT_FAMILY.bold,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  modalCancel: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: SPACING.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalCancelText: {
    color: COLORS.textSecondary,
    fontSize: FONTS.regular,
    fontWeight: 'bold',
  },
  modalConfirm: {
    flex: 1,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: SPACING.md,
    alignItems: 'center',
  },
  modalConfirmDisabled: {
    opacity: 0.5,
  },
  modalConfirmText: {
    color: COLORS.text,
    fontSize: FONTS.regular,
    fontWeight: 'bold',
  },
});
