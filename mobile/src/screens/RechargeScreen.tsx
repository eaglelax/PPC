import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
  Platform,
  Modal,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../contexts/AuthContext';
import { payWithOrangeMoney } from '../config/api';
import { COLORS, FONTS, SPACING, FONT_FAMILY, MIN_RECHARGE } from '../config/theme';
import { RootStackParamList } from '../types';
import Navbar, { NAVBAR_HEIGHT } from '../components/Navbar';
import { ORANGE_MONEY_COUNTRIES, DEFAULT_COUNTRY, Country } from '../config/countries';
import GradientButton from '../components/GradientButton';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Recharge'>;
};

type Step = 'amount' | 'details' | 'processing';

export default function RechargeScreen({ navigation }: Props) {
  const { userData } = useAuth();
  const [amount, setAmount] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [country, setCountry] = useState<Country>(DEFAULT_COUNTRY);
  const [countryPickerVisible, setCountryPickerVisible] = useState(false);
  const [step, setStep] = useState<Step>('amount');
  const [loading, setLoading] = useState(false);

  const numAmount = parseInt(amount, 10) || 0;
  const quickAmounts = [1010, 2000, 5000, 10000];

  const handleContinue = () => {
    if (numAmount <= 0) {
      Alert.alert('Erreur', 'Veuillez entrer un montant valide.');
      return;
    }
    if (numAmount < MIN_RECHARGE) {
      Alert.alert('Erreur', `Le montant minimum de recharge est de ${MIN_RECHARGE.toLocaleString()}F.`);
      return;
    }
    setStep('details');
  };

  const handlePay = () => {
    if (phone.length < 8) {
      Alert.alert('Erreur', 'Veuillez entrer un numero de telephone valide (8+ chiffres).');
      return;
    }
    if (otp.length !== 4) {
      Alert.alert('Erreur', 'Le code OTP doit contenir 4 chiffres.');
      return;
    }

    if (Platform.OS === 'web') {
      if (window.confirm(`Confirmer la recharge de ${numAmount.toLocaleString()}F via Orange Money ?`)) {
        processRecharge();
      }
    } else {
      Alert.alert(
        'Confirmer la recharge',
        `Recharger ${numAmount.toLocaleString()}F via Orange Money ?`,
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Confirmer', onPress: () => processRecharge() },
        ]
      );
    }
  };

  const processRecharge = async () => {
    setLoading(true);
    setStep('processing');
    const fullPhone = country.dialCode + phone;

    try {
      await payWithOrangeMoney(numAmount, fullPhone, otp);
      setStep('amount');
      setLoading(false);
      setAmount('');
      setPhone('');
      setOtp('');
      if (Platform.OS === 'web') {
        window.alert(`Recharge reussie ! +${numAmount.toLocaleString()}F ajoutes a votre solde.`);
      } else {
        Alert.alert('Recharge reussie !', `+${numAmount.toLocaleString()}F ajoutes a votre solde.`);
      }
    } catch (error: any) {
      setStep('details');
      setLoading(false);
      Alert.alert('Erreur', error.message || 'Le paiement a echoue. Veuillez reessayer.');
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

        {step === 'amount' && (
          <>
            <Text style={styles.label}>Montant de la recharge (min {MIN_RECHARGE.toLocaleString()}F)</Text>
            <TextInput
              style={styles.input}
              placeholder={`${MIN_RECHARGE.toLocaleString()}F minimum`}
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

            <GradientButton
              title="Continuer"
              onPress={handleContinue}
              disabled={!numAmount}
            />
          </>
        )}

        {step === 'details' && (
          <>
            <View style={styles.amountBadge}>
              <Text style={styles.amountBadgeText}>Montant : {numAmount.toLocaleString()}F</Text>
              <TouchableOpacity onPress={() => setStep('amount')}>
                <Text style={styles.changeLink}>Modifier</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Numero Orange Money</Text>
            <View style={styles.phoneRow}>
              <TouchableOpacity
                style={styles.countrySelector}
                onPress={() => setCountryPickerVisible(true)}
              >
                <Text style={styles.countryFlag}>{country.flag}</Text>
                <Text style={styles.countryDialCode}>{country.dialCode}</Text>
                <Ionicons name="chevron-down" size={14} color={COLORS.textSecondary} />
              </TouchableOpacity>
              <TextInput
                style={styles.phoneInput}
                placeholder="77123456"
                placeholderTextColor={COLORS.textSecondary}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
            </View>

            <Text style={styles.label}>Code OTP (4 chiffres)</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: 1234"
              placeholderTextColor={COLORS.textSecondary}
              value={otp}
              onChangeText={(text) => setOtp(text.replace(/[^0-9]/g, '').slice(0, 4))}
              keyboardType="numeric"
              maxLength={4}
            />

            <View style={styles.otpHint}>
              <Ionicons name="information-circle-outline" size={16} color={COLORS.gold} />
              <Text style={styles.otpHintText}>
                Composez #144*82# pour obtenir votre code OTP Orange Money.
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.button, styles.omButton, (phone.length < 8 || otp.length !== 4) && styles.buttonDisabled]}
              onPress={handlePay}
              disabled={phone.length < 8 || otp.length !== 4}
            >
              <Ionicons name="phone-portrait-outline" size={20} color={COLORS.text} />
              <Text style={styles.buttonText}>Payer avec Orange Money</Text>
            </TouchableOpacity>
          </>
        )}

        {step === 'processing' && (
          <View style={styles.processingContainer}>
            <ActivityIndicator size="large" color={COLORS.gold} />
            <Text style={styles.processingText}>Traitement du paiement en cours...</Text>
            <Text style={styles.processingSubtext}>
              Veuillez patienter, cela peut prendre quelques secondes.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Country Picker Modal */}
      <Modal
        visible={countryPickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCountryPickerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Choisir un pays</Text>
              <TouchableOpacity onPress={() => setCountryPickerVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={ORANGE_MONEY_COUNTRIES}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.countryItem,
                    country.code === item.code && styles.countryItemActive,
                  ]}
                  onPress={() => {
                    setCountry(item);
                    setCountryPickerVisible(false);
                  }}
                >
                  <Text style={styles.countryItemFlag}>{item.flag}</Text>
                  <Text style={styles.countryItemName}>{item.name}</Text>
                  <Text style={styles.countryItemDial}>{item.dialCode}</Text>
                  {country.code === item.code && (
                    <Ionicons name="checkmark" size={20} color={COLORS.primary} />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

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
    fontFamily: FONT_FAMILY.bold,
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
    fontFamily: FONT_FAMILY.regular,
  },
  balanceValue: {
    color: COLORS.gold,
    fontSize: FONTS.large,
    fontWeight: 'bold',
    fontFamily: FONT_FAMILY.bold,
  },
  label: {
    color: COLORS.textSecondary,
    fontSize: FONTS.regular,
    marginBottom: SPACING.sm,
    fontFamily: FONT_FAMILY.regular,
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
    fontFamily: FONT_FAMILY.bold,
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
    fontFamily: FONT_FAMILY.regular,
  },
  quickTextActive: {
    color: COLORS.primary,
    fontWeight: 'bold',
    fontFamily: FONT_FAMILY.semibold,
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
    fontFamily: FONT_FAMILY.regular,
  },
  summaryValue: {
    color: COLORS.text,
    fontSize: FONTS.regular,
    fontFamily: FONT_FAMILY.regular,
  },
  omButton: {
    flexDirection: 'row',
    gap: SPACING.sm,
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
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
    fontFamily: FONT_FAMILY.bold,
  },
  amountBadge: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SPACING.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  amountBadgeText: {
    color: COLORS.text,
    fontSize: FONTS.medium,
    fontWeight: 'bold',
    fontFamily: FONT_FAMILY.bold,
  },
  changeLink: {
    color: COLORS.primary,
    fontSize: FONTS.regular,
    textDecorationLine: 'underline',
  },
  otpHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  otpHintText: {
    color: COLORS.gold,
    fontSize: 13,
    flex: 1,
    fontFamily: FONT_FAMILY.regular,
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
    fontFamily: FONT_FAMILY.bold,
  },
  processingSubtext: {
    color: COLORS.textSecondary,
    fontSize: FONTS.regular,
    textAlign: 'center',
    fontFamily: FONT_FAMILY.regular,
  },
  phoneRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  countrySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  countryFlag: {
    fontSize: 16,
  },
  countryDialCode: {
    color: COLORS.text,
    fontSize: FONTS.regular,
    fontWeight: 'bold',
  },
  phoneInput: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SPACING.md,
    fontSize: FONTS.large,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '60%',
    paddingBottom: SPACING.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    color: COLORS.text,
    fontSize: FONTS.medium,
    fontWeight: 'bold',
    fontFamily: FONT_FAMILY.bold,
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  countryItemActive: {
    backgroundColor: COLORS.surface,
  },
  countryItemFlag: {
    fontSize: 20,
  },
  countryItemName: {
    flex: 1,
    color: COLORS.text,
    fontSize: FONTS.regular,
  },
  countryItemDial: {
    color: COLORS.textSecondary,
    fontSize: FONTS.regular,
  },
});
