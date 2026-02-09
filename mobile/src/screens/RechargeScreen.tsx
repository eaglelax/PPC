import React, { useState, useRef, useCallback } from 'react';
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
import * as WebBrowser from 'expo-web-browser';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../contexts/AuthContext';
import { createPaydunyaInvoice, checkPaydunyaStatus } from '../config/api';
import { COLORS, FONTS, SPACING } from '../config/theme';
import { RootStackParamList } from '../types';
import Navbar, { NAVBAR_HEIGHT } from '../components/Navbar';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Recharge'>;
};

type Step = 'amount' | 'processing' | 'polling';

export default function RechargeScreen({ navigation }: Props) {
  const { userData } = useAuth();
  const [amount, setAmount] = useState('');
  const [step, setStep] = useState<Step>('amount');
  const [loading, setLoading] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const numAmount = parseInt(amount, 10) || 0;
  const quickAmounts = [1000, 2000, 5000, 10000];

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearTimeout(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const pollStatus = useCallback(
    (token: string, attempt: number = 0) => {
      if (attempt >= 10) {
        setStep('amount');
        setLoading(false);
        Alert.alert(
          'Paiement en attente',
          'Votre paiement est en cours de traitement. Votre solde sera mis a jour automatiquement.'
        );
        return;
      }

      pollingRef.current = setTimeout(async () => {
        try {
          const data = await checkPaydunyaStatus(token);
          if (data.status === 'completed') {
            setStep('amount');
            setLoading(false);
            Alert.alert('Recharge reussie !', `+${numAmount.toLocaleString()}F ajoutes a votre solde.`, [
              { text: 'OK', onPress: () => navigation.goBack() },
            ]);
          } else {
            pollStatus(token, attempt + 1);
          }
        } catch {
          pollStatus(token, attempt + 1);
        }
      }, 3000);
    },
    [numAmount, navigation]
  );

  const handlePay = async () => {
    if (numAmount <= 0) {
      Alert.alert('Erreur', 'Veuillez entrer un montant valide.');
      return;
    }

    setLoading(true);
    setStep('processing');

    try {
      const { checkoutUrl, token } = await createPaydunyaInvoice(numAmount);

      // Open PayDunya checkout page
      await WebBrowser.openBrowserAsync(checkoutUrl);

      // Browser closed — start polling for payment confirmation
      setStep('polling');
      pollStatus(token, 0);
    } catch (error: any) {
      setStep('amount');
      setLoading(false);
      Alert.alert('Erreur', error.message || 'Impossible de creer la facture.');
    }
  };

  const handleCancel = () => {
    stopPolling();
    setStep('amount');
    setLoading(false);
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

        {step === 'amount' && (
          <>
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
              style={[styles.button, (!numAmount || loading) && styles.buttonDisabled]}
              onPress={handlePay}
              disabled={!numAmount || loading}
            >
              <Text style={styles.buttonText}>
                {loading ? 'Chargement...' : 'Payer avec PayDunya'}
              </Text>
            </TouchableOpacity>
          </>
        )}

        {step === 'processing' && (
          <View style={styles.processingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.processingText}>Ouverture de la page de paiement...</Text>
          </View>
        )}

        {step === 'polling' && (
          <View style={styles.processingContainer}>
            <ActivityIndicator size="large" color={COLORS.gold} />
            <Text style={styles.processingText}>Verification du paiement en cours...</Text>
            <Text style={styles.processingSubtext}>
              Votre solde sera mis a jour automatiquement.
            </Text>
            <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
              <Text style={styles.cancelButtonText}>Annuler</Text>
            </TouchableOpacity>
          </View>
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
  processingContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.xxl,
    gap: SPACING.md,
  },
  processingText: {
    color: COLORS.text,
    fontSize: FONTS.medium,
    textAlign: 'center',
  },
  processingSubtext: {
    color: COLORS.textSecondary,
    fontSize: FONTS.regular,
    textAlign: 'center',
  },
  cancelButton: {
    marginTop: SPACING.lg,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
  },
  cancelButtonText: {
    color: COLORS.textSecondary,
    fontSize: FONTS.regular,
    textDecorationLine: 'underline',
  },
});
