import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../contexts/AuthContext';
import { rechargeBalance } from '../services/transactionService';
import { COLORS, FONTS, SPACING } from '../config/theme';
import { RootStackParamList } from '../types';
import Navbar, { NAVBAR_HEIGHT } from '../components/Navbar';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Recharge'>;
};

type PaymentMethod = 'Orange' | 'MTN' | 'Moov';

const PAYMENT_METHODS: { key: PaymentMethod; label: string; color: string }[] = [
  { key: 'Orange', label: 'Orange Money', color: '#FF6600' },
  { key: 'MTN', label: 'MTN MoMo', color: '#FFCC00' },
  { key: 'Moov', label: 'Moov Money', color: '#0066CC' },
];

export default function RechargeScreen({ navigation }: Props) {
  const { firebaseUser, userData } = useAuth();
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [phone, setPhone] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  const numAmount = parseInt(amount, 10) || 0;

  const quickAmounts = [1000, 2000, 5000, 10000];

  const handleSendOtp = () => {
    if (numAmount <= 0) {
      Alert.alert('Erreur', 'Veuillez entrer un montant valide.');
      return;
    }
    if (!paymentMethod) {
      Alert.alert('Erreur', 'Veuillez choisir une methode de paiement.');
      return;
    }
    if (!phone || phone.length < 8) {
      Alert.alert('Erreur', 'Veuillez entrer un numero de telephone valide.');
      return;
    }
    // Simulate OTP sending
    setOtpSent(true);
    Alert.alert('OTP envoye', `Un code a 4 chiffres a ete envoye au ${phone}.`);
  };

  const handleConfirmRecharge = async () => {
    if (!firebaseUser || !userData) return;
    if (otp.length !== 4) {
      Alert.alert('Erreur', 'Veuillez entrer un code OTP a 4 chiffres.');
      return;
    }

    // Simulated OTP validation: accept any 4-digit code
    setLoading(true);
    try {
      await rechargeBalance(firebaseUser.uid, userData.balance, numAmount);
      Alert.alert(
        'Recharge reussie !',
        `+${numAmount.toLocaleString()}F ajoutes via ${paymentMethod}`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch {
      Alert.alert('Erreur', 'La recharge a echoue. Reessayez.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.wrapper}>
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Recharger</Text>

      <View style={styles.currentBalance}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ionicons name="wallet-outline" size={18} color={COLORS.textSecondary} />
          <Text style={styles.balanceLabel}>Solde actuel</Text>
        </View>
        <Text style={styles.balanceValue}>{userData?.balance.toLocaleString()}F</Text>
      </View>

      {!otpSent ? (
        <>
          {/* Step 1: Amount + method + phone */}
          <Text style={styles.label}>Montant de la recharge</Text>
          <TextInput
            style={styles.input}
            placeholder="Entrez le montant"
            placeholderTextColor={COLORS.textSecondary}
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
          />

          <View style={styles.quickRow}>
            {quickAmounts.map((q) => (
              <TouchableOpacity
                key={q}
                style={[styles.quickBtn, amount === String(q) && styles.quickBtnActive]}
                onPress={() => setAmount(String(q))}
              >
                <Text style={[styles.quickText, amount === String(q) && styles.quickTextActive]}>
                  {q.toLocaleString()}F
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Methode de paiement</Text>
          <View style={styles.methodsRow}>
            {PAYMENT_METHODS.map((m) => (
              <TouchableOpacity
                key={m.key}
                style={[
                  styles.methodBtn,
                  paymentMethod === m.key && { borderColor: m.color, borderWidth: 2 },
                ]}
                onPress={() => setPaymentMethod(m.key)}
              >
                <Text
                  style={[
                    styles.methodText,
                    paymentMethod === m.key && { color: m.color, fontWeight: 'bold' },
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
              <Text style={styles.summaryLabel}>Frais</Text>
              <Text style={[styles.summaryValue, { color: COLORS.success }]}>0F</Text>
            </View>
            <View style={[styles.summaryRow, styles.summaryTotal]}>
              <Text style={[styles.summaryLabel, { fontWeight: 'bold' }]}>Credit net</Text>
              <Text style={[styles.summaryValue, { color: COLORS.success, fontWeight: 'bold' }]}>
                +{numAmount.toLocaleString()}F
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.button,
              (!numAmount || !paymentMethod || !phone) && styles.buttonDisabled,
            ]}
            onPress={handleSendOtp}
            disabled={!numAmount || !paymentMethod || !phone}
          >
            <Text style={styles.buttonText}>Generer OTP</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          {/* Step 2: OTP confirmation */}
          <View style={styles.otpSummary}>
            <Text style={styles.otpSummaryText}>
              {numAmount.toLocaleString()}F via {paymentMethod}
            </Text>
            <Text style={styles.otpSummaryPhone}>{phone}</Text>
          </View>

          <Text style={styles.label}>Code OTP (4 chiffres)</Text>
          <TextInput
            style={styles.otpInput}
            placeholder="_ _ _ _"
            placeholderTextColor={COLORS.textSecondary}
            value={otp}
            onChangeText={(text) => setOtp(text.replace(/[^0-9]/g, '').slice(0, 4))}
            keyboardType="numeric"
            maxLength={4}
          />

          <TouchableOpacity
            style={[styles.button, (loading || otp.length !== 4) && styles.buttonDisabled]}
            onPress={handleConfirmRecharge}
            disabled={loading || otp.length !== 4}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Traitement...' : 'Confirmer la recharge'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              setOtpSent(false);
              setOtp('');
            }}
          >
            <Text style={styles.backButtonText}>Modifier les informations</Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>

    <Navbar active="Recharge" />
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
    marginBottom: SPACING.md,
  },
  quickRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  quickBtn: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    padding: SPACING.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  quickBtnActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.surfaceLight,
  },
  quickText: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  quickTextActive: {
    color: COLORS.primary,
    fontWeight: 'bold',
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
  otpSummary: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SPACING.lg,
    alignItems: 'center',
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  otpSummaryText: {
    color: COLORS.gold,
    fontSize: FONTS.large,
    fontWeight: 'bold',
  },
  otpSummaryPhone: {
    color: COLORS.textSecondary,
    fontSize: FONTS.regular,
    marginTop: SPACING.xs,
  },
  otpInput: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SPACING.lg,
    fontSize: FONTS.xlarge,
    color: COLORS.text,
    borderWidth: 2,
    borderColor: COLORS.primary,
    textAlign: 'center',
    letterSpacing: 12,
    marginBottom: SPACING.lg,
  },
  backButton: {
    marginTop: SPACING.md,
    alignItems: 'center',
  },
  backButtonText: {
    color: COLORS.textSecondary,
    fontSize: FONTS.regular,
    textDecorationLine: 'underline',
  },
});
