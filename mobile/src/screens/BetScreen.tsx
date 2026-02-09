import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../contexts/AuthContext';
import { COLORS, FONTS, SPACING, MIN_BET_AMOUNT } from '../config/theme';
import { RootStackParamList, Bet } from '../types';
import { onAvailableBets, createBet, joinBet } from '../services/betService';
import Navbar, { NAVBAR_HEIGHT } from '../components/Navbar';

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
      Alert.alert('Erreur', `Le montant minimum est de ${MIN_BET_AMOUNT.toLocaleString()}F.`);
      return;
    }
    if (amount > userData.balance) {
      Alert.alert('Solde insuffisant', `Votre solde est de ${userData.balance.toLocaleString()}F.`, [
        { text: 'Recharger', onPress: () => navigation.navigate('Recharge') },
        { text: 'Annuler', style: 'cancel' },
      ]);
      return;
    }

    setLoading(true);
    try {
      const { betId } = await createBet(amount);
      setModalVisible(false);
      setBetAmount('');
      navigation.navigate('Waiting', { betId, betAmount: amount });
    } catch (error: any) {
      Alert.alert('Erreur', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinBet = async (bet: Bet) => {
    if (bet.creatorId === firebaseUser.uid) {
      Alert.alert('Erreur', 'Vous ne pouvez pas rejoindre votre propre pari.');
      return;
    }
    if (bet.amount > userData.balance) {
      Alert.alert('Solde insuffisant', `Il vous faut ${bet.amount.toLocaleString()}F.`, [
        { text: 'Recharger', onPress: () => navigation.navigate('Recharge') },
        { text: 'Annuler', style: 'cancel' },
      ]);
      return;
    }

    setJoining(bet.id);
    try {
      const { gameId } = await joinBet(bet.id);
      navigation.replace('Game', { gameId });
    } catch (error: any) {
      Alert.alert('Erreur', error.message);
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
        <Text style={styles.betAmount}>{item.amount.toLocaleString()}F</Text>
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
      >
        <Ionicons name="add" size={32} color={COLORS.text} />
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
              <Text style={styles.modalGain}>
                Gain potentiel : {(parseInt(betAmount, 10) * 2 || 0).toLocaleString()}F
              </Text>
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

              <TouchableOpacity
                style={[styles.modalConfirm, loading && styles.modalConfirmDisabled]}
                onPress={handleCreateBet}
                disabled={loading}
              >
                <Text style={styles.modalConfirmText}>
                  {loading ? 'Creation...' : 'Creer le pari'}
                </Text>
              </TouchableOpacity>
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
  },
  balanceValue: {
    color: COLORS.gold,
    fontSize: FONTS.large,
    fontWeight: 'bold',
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
  },
  betTime: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  betAmount: {
    color: COLORS.gold,
    fontSize: FONTS.large,
    fontWeight: 'bold',
    marginRight: SPACING.md,
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
  },
  emptySubtext: {
    color: COLORS.textSecondary,
    fontSize: FONTS.regular,
  },
  fab: {
    position: 'absolute',
    bottom: NAVBAR_HEIGHT + SPACING.md,
    right: SPACING.lg,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
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
  },
  modalLabel: {
    color: COLORS.textSecondary,
    fontSize: FONTS.regular,
    marginBottom: SPACING.sm,
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
  },
  modalGain: {
    color: COLORS.success,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: SPACING.lg,
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
