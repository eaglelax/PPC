import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../contexts/AuthContext';
import { withdrawFunds, getWithdrawalFee } from '../services/betService';
import { COLORS, FONTS, SPACING } from '../config/theme';
import { RootStackParamList } from '../types';
import Navbar, { NAVBAR_HEIGHT } from '../components/Navbar';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Withdraw'>;
};

type PaymentMethod = 'Orange' | 'MTN' | 'Moov';

const PAYMENT_METHODS: { key: PaymentMethod; label: string; color: string }[] = [
  { key: 'Orange', label: 'Orange Money', color: '#FF6600' },
  { key: 'MTN', label: 'MTN MoMo', color: '#FFCC00' },
  { key: 'Moov', label: 'Moov Money', color: '#0066CC' },
];

export default function WithdrawScreen({ navigation }: Props) {
  const { userData } = useAuth();
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PaymentMethod | null>(null);
  const [phone, setPhone] = useState('');
  const [feePercent, setFeePercent] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingFee, setLoadingFee] = useState(true);

  const numAmount = parseInt(amount, 10) || 0;
  const fee = feePercent !== null ? Math.round((numAmount * feePercent) / 100) : 0;
  const netAmount = numAmount - fee;

  // Fetch withdrawal fee on mount
  useEffect(() => {
    getWithdrawalFee()
      .then((data) => setFeePercent(data.percent))
      .catch(() => setFeePercent(5)) // fallback
      .finally(() => setLoadingFee(false));
  }, []);

  const handleWithdraw = async () => {
    if (!userData) return;
    if (numAmount <= 0) {
      Alert.alert('Erreur', 'Veuillez entrer un montant valide.');
      return;
    }
    if (numAmount < 1000) {
      Alert.alert('Erreur', 'Le montant minimum de retrait est de 1 000F.');
      return;
    }
    if (numAmount > userData.balance) {
      Alert.alert('Solde insuffisant', `Votre solde est de ${userData.balance.toLocaleString()}F.`);
      return;
    }
    if (!method) {
      Alert.alert('Erreur', 'Veuillez choisir une methode de retrait.');
      return;
    }
    if (!phone || phone.length < 8) {
      Alert.alert('Erreur', 'Veuillez entrer un numero valide.');
      return;
    }

    setLoading(true);
    try {
      const result = await withdrawFunds(numAmount, method, phone);
      Alert.alert(
        'Retrait effectue',
        `${result.netAmount.toLocaleString()}F envoyes sur ${method} (${phone})\nFrais: ${result.fee.toLocaleString()}F`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error: any) {
      Alert.alert('Erreur', error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loadingFee) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Retirer</Text>

      <View style={styles.currentBalance}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ionicons name="wallet-outline" size={18} color={COLORS.textSecondary} />
          <Text style={styles.balanceLabel}>Solde disponible</Text>
        </View>
        <Text style={styles.balanceValue}>{userData?.balance.toLocaleString()}F</Text>
      </View>

      <Text style={styles.label}>Montant du retrait</Text>
      <TextInput
        style={styles.input}
        placeholder="Entrez le montant"
        placeholderTextColor={COLORS.textSecondary}
        value={amount}
        onChangeText={setAmount}
        keyboardType="numeric"
      />
      <Text style={styles.minText}>Minimum : 1 000F</Text>

      <Text style={styles.label}>Methode de retrait</Text>
      <View style={styles.methodsRow}>
        {PAYMENT_METHODS.map((m) => (
          <TouchableOpacity
            key={m.key}
            style={[
              styles.methodBtn,
              method === m.key && { borderColor: m.color, borderWidth: 2 },
            ]}
            onPress={() => setMethod(m.key)}
          >
            <Text
              style={[
                styles.methodText,
                method === m.key && { color: m.color, fontWeight: 'bold' },
              ]}
            >
              {m.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Numero de telephone</Text>
      <TextInput
        style={styles.input}
        placeholder="Ex: 07XXXXXXXX"
        placeholderTextColor={COLORS.textSecondary}
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
      />

      <View style={styles.summary}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Montant</Text>
          <Text style={styles.summaryValue}>{numAmount.toLocaleString()}F</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Frais ({feePercent}%)</Text>
          <Text style={[styles.summaryValue, { color: COLORS.danger }]}>
            -{fee.toLocaleString()}F
          </Text>
        </View>
        <View style={[styles.summaryRow, styles.summaryTotal]}>
          <Text style={[styles.summaryLabel, { fontWeight: 'bold' }]}>Vous recevrez</Text>
          <Text style={[styles.summaryValue, { color: COLORS.success, fontWeight: 'bold' }]}>
            {netAmount > 0 ? netAmount.toLocaleString() : 0}F
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={[
          styles.button,
          (loading || !numAmount || !method || !phone) && styles.buttonDisabled,
        ]}
        onPress={handleWithdraw}
        disabled={loading || !numAmount || !method || !phone}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Traitement...' : 'Retirer'}
        </Text>
      </TouchableOpacity>
    </ScrollView>

    <Navbar active="Withdraw" />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: SPACING.lg,
    paddingBottom: NAVBAR_HEIGHT + SPACING.lg,
  },
  title: {
    fontSize: FONTS.xlarge,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: SPACING.xl,
    marginBottom: SPACING.lg,
  },
  currentBalance: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SPACING.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  label: {
    color: COLORS.textSecondary,
    fontSize: FONTS.regular,
    marginBottom: SPACING.sm,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SPACING.md,
    fontSize: FONTS.large,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  minText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  methodsRow: {
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  methodBtn: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SPACING.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  methodText: {
    color: COLORS.textSecondary,
    fontSize: FONTS.regular,
  },
  summary: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
  },
  summaryTotal: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    marginTop: SPACING.sm,
    paddingTop: SPACING.md,
  },
  summaryLabel: {
    color: COLORS.textSecondary,
    fontSize: FONTS.regular,
  },
  summaryValue: {
    color: COLORS.text,
    fontSize: FONTS.regular,
  },
  button: {
    backgroundColor: COLORS.success,
    borderRadius: 12,
    padding: SPACING.md,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: COLORS.text,
    fontSize: FONTS.medium,
    fontWeight: 'bold',
  },
});
