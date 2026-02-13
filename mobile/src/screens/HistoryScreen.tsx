import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getTransactionHistory } from '../config/api';
import { COLORS, FONTS, SPACING, FONT_FAMILY } from '../config/theme';
import { Transaction } from '../types';
import LoadingScreen from '../components/LoadingScreen';
import Navbar, { NAVBAR_HEIGHT } from '../components/Navbar';

const TYPE_CONFIG: Record<string, { label: string; icon: keyof typeof Ionicons.glyphMap; color: string; sign: string }> = {
  recharge: { label: 'Recharge', icon: 'wallet', color: COLORS.success, sign: '+' },
  win: { label: 'Victoire', icon: 'trophy', color: COLORS.success, sign: '+' },
  loss: { label: 'Defaite', icon: 'close-circle', color: COLORS.danger, sign: '-' },
  bet: { label: 'Mise', icon: 'game-controller', color: COLORS.warning, sign: '-' },
  refund: { label: 'Remboursement', icon: 'refresh-circle', color: COLORS.primary, sign: '+' },
  withdrawal: { label: 'Retrait', icon: 'cash', color: COLORS.danger, sign: '-' },
};

function formatDate(date: { _seconds?: number; seconds?: number } | string | Date): string {
  let d: Date;
  if (typeof date === 'string') {
    d = new Date(date);
  } else if (date && ('_seconds' in date || 'seconds' in date)) {
    const seconds = (date as { _seconds?: number; seconds?: number })._seconds || (date as { seconds?: number }).seconds || 0;
    d = new Date(seconds * 1000);
  } else {
    d = new Date(date as Date);
  }
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function HistoryScreen() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchHistory = async () => {
    try {
      const data = await getTransactionHistory();
      setTransactions(Array.isArray(data) ? data : []);
    } catch {
      setTransactions([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchHistory();
  };

  if (loading) return <LoadingScreen message="Chargement..." />;

  const renderItem = ({ item }: { item: Transaction }) => {
    const config = TYPE_CONFIG[item.type] || { label: item.type, icon: 'help-circle' as const, color: COLORS.textSecondary, sign: '' };
    return (
      <View style={styles.row}>
        <View style={[styles.iconBox, { backgroundColor: config.color + '20' }]}>
          <Ionicons name={config.icon} size={22} color={config.color} />
        </View>
        <View style={styles.rowInfo}>
          <Text style={styles.rowLabel}>{config.label}</Text>
          <Text style={styles.rowDate}>{formatDate(item.createdAt)}</Text>
        </View>
        <Text style={[styles.rowAmount, { color: config.color }]}>
          {config.sign}{item.amount.toLocaleString()}F
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Historique</Text>

      {transactions.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="receipt-outline" size={64} color={COLORS.textSecondary} />
          <Text style={styles.emptyText}>Aucune transaction</Text>
        </View>
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={(item, index) => (item as any).id || String(index)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
          }
        />
      )}

      <Navbar active="History" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingBottom: NAVBAR_HEIGHT,
  },
  title: {
    fontSize: FONTS.xlarge,
    fontWeight: 'bold',
    fontFamily: FONT_FAMILY.bold,
    color: COLORS.text,
    marginTop: SPACING.xl,
    marginBottom: SPACING.lg,
    paddingHorizontal: SPACING.lg,
  },
  list: {
    padding: SPACING.lg,
    gap: SPACING.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SPACING.md,
    gap: SPACING.md,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowInfo: {
    flex: 1,
  },
  rowLabel: {
    color: COLORS.text,
    fontSize: FONTS.regular,
    fontFamily: FONT_FAMILY.medium,
  },
  rowDate: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontFamily: FONT_FAMILY.regular,
    marginTop: 2,
  },
  rowAmount: {
    fontSize: FONTS.medium,
    fontWeight: 'bold',
    fontFamily: FONT_FAMILY.bold,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.md,
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: FONTS.regular,
    fontFamily: FONT_FAMILY.regular,
  },
});
