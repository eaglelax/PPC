import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getTransactionHistory } from '../config/api';
import { COLORS, FONTS, SPACING, FONT_FAMILY } from '../config/theme';
import { Transaction } from '../types';
import LoadingScreen from '../components/LoadingScreen';
import Navbar, { NAVBAR_HEIGHT } from '../components/Navbar';

const TYPE_CONFIG: Record<string, { label: string; icon: keyof typeof Ionicons.glyphMap; color: string; sign: string }> = {
  win: { label: 'Victoire', icon: 'trophy', color: COLORS.success, sign: '+' },
  loss: { label: 'Defaite', icon: 'close-circle', color: COLORS.danger, sign: '-' },
  recharge: { label: 'Recharge', icon: 'wallet', color: '#4A90D9', sign: '+' },
  withdrawal: { label: 'Retrait', icon: 'cash', color: COLORS.primary, sign: '-' },
  bet: { label: 'Mise', icon: 'game-controller', color: COLORS.textSecondary, sign: '-' },
  refund: { label: 'Remboursement', icon: 'refresh-circle', color: COLORS.pix, sign: '+' },
};

type FilterType = 'all' | 'wins' | 'losses' | 'recharges' | 'withdrawals';

const FILTERS: { key: FilterType; label: string }[] = [
  { key: 'all', label: 'Tous' },
  { key: 'wins', label: 'Gains' },
  { key: 'losses', label: 'Pertes' },
  { key: 'recharges', label: 'Recharges' },
  { key: 'withdrawals', label: 'Retraits' },
];

const FILTER_TYPES: Record<FilterType, string[]> = {
  all: [],
  wins: ['win'],
  losses: ['loss'],
  recharges: ['recharge'],
  withdrawals: ['withdrawal'],
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
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

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

  const filteredTransactions = activeFilter === 'all'
    ? transactions
    : transactions.filter((t) => FILTER_TYPES[activeFilter].includes(t.type));

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
          {item.fee > 0 && (
            <Text style={styles.rowFee}>Frais : {item.fee.toLocaleString()}F</Text>
          )}
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

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
        style={styles.filterScroll}
      >
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterChip, activeFilter === f.key && styles.filterChipActive]}
            onPress={() => setActiveFilter(f.key)}
          >
            <Text style={[styles.filterText, activeFilter === f.key && styles.filterTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {filteredTransactions.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="receipt-outline" size={64} color={COLORS.textSecondary} />
          <Text style={styles.emptyText}>Aucune transaction</Text>
        </View>
      ) : (
        <FlatList
          data={filteredTransactions}
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
    marginBottom: SPACING.sm,
    paddingHorizontal: SPACING.lg,
  },
  filterScroll: {
    maxHeight: 44,
    marginBottom: SPACING.md,
  },
  filterRow: {
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
  },
  filterChip: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontFamily: FONT_FAMILY.medium,
  },
  filterTextActive: {
    color: COLORS.text,
    fontWeight: 'bold',
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
  rowFee: {
    color: COLORS.textSecondary,
    fontSize: 11,
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
