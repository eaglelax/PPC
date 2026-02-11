import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Modal,
  FlatList,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../contexts/AuthContext';
import {
  payWithOrangeMoney,
  initiateGeniusPayment,
  getGeniusPaymentStatus,
  completeGeniusDemoPayment,
} from '../config/api';
import { COLORS, FONTS, SPACING, FONT_FAMILY, MIN_RECHARGE } from '../config/theme';
import { RootStackParamList } from '../types';
import { showAlert } from '../utils/alert';
import Navbar, { NAVBAR_HEIGHT } from '../components/Navbar';
import { ORANGE_MONEY_COUNTRIES, DEFAULT_COUNTRY, Country } from '../config/countries';
import GradientButton from '../components/GradientButton';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Recharge'>;
};

type Step = 'amount' | 'method' | 'om-details' | 'genius-checkout' | 'processing';

export default function RechargeScreen({ navigation }: Props) {
  const { userData } = useAuth();
  const [amount, setAmount] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [country, setCountry] = useState<Country>(DEFAULT_COUNTRY);
  const [countryPickerVisible, setCountryPickerVisible] = useState(false);
  const [step, setStep] = useState<Step>('amount');
  const [loading, setLoading] = useState(false);

  // GeniusPay state
  const [geniusRef, setGeniusRef] = useState('');
  const [geniusCheckoutUrl, setGeniusCheckoutUrl] = useState('');
  const [geniusMode, setGeniusMode] = useState<'live' | 'demo'>('demo');
  const pollInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const numAmount = parseInt(amount, 10) || 0;
  const quickAmounts = [1010, 2000, 5000, 10000];

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollInterval.current) clearInterval(pollInterval.current);
    };
  }, []);

  const handleContinue = () => {
    if (numAmount <= 0) {
      showAlert('Erreur', 'Veuillez entrer un montant valide.');
      return;
    }
    if (numAmount < MIN_RECHARGE) {
      showAlert('Erreur', `Le montant minimum de recharge est de ${MIN_RECHARGE.toLocaleString()}F.`);
      return;
    }
    setStep('method');
  };

  // ── Orange Money Flow ──

  const handleOmPay = () => {
    if (phone.length < 8) {
      showAlert('Erreur', 'Veuillez entrer un numero de telephone valide (8+ chiffres).');
      return;
    }
    if (otp.length !== 4) {
      showAlert('Erreur', 'Le code OTP doit contenir 4 chiffres.');
      return;
    }

    showAlert(
      'Confirmer la recharge',
      `Recharger ${numAmount.toLocaleString()}F via Orange Money ?`,
      [
        { text: 'Annuler' },
        { text: 'Confirmer', onPress: () => processOmRecharge() },
      ]
    );
  };

  const processOmRecharge = async () => {
    setLoading(true);
    setStep('processing');
    const fullPhone = country.dialCode + phone;

    try {
      await payWithOrangeMoney(numAmount, fullPhone, otp);
      resetForm();
      showAlert('Recharge reussie !', `+${numAmount.toLocaleString()}F ajoutes a votre solde.`);
    } catch (error: any) {
      setStep('om-details');
      setLoading(false);
      showAlert('Erreur', error.message || 'Le paiement a echoue. Veuillez reessayer.');
    }
  };

  // ── GeniusPay Flow ──

  const handleGeniusPay = async () => {
    setLoading(true);
    try {
      const result = await initiateGeniusPayment(numAmount);
      setGeniusRef(result.reference);
      setGeniusCheckoutUrl(result.checkout_url);
      setGeniusMode(result.mode);
      setStep('genius-checkout');
      setLoading(false);
    } catch (error: any) {
      setLoading(false);
      showAlert('Erreur', error.message || 'Impossible d\'initier le paiement.');
    }
  };

  const openCheckout = async () => {
    if (geniusCheckoutUrl) {
      try {
        await Linking.openURL(geniusCheckoutUrl);
      } catch {
        showAlert('Erreur', 'Impossible d\'ouvrir le lien de paiement.');
      }
    }
  };

  const startPolling = () => {
    if (pollInterval.current) clearInterval(pollInterval.current);

    pollInterval.current = setInterval(async () => {
      try {
        const result = await getGeniusPaymentStatus(geniusRef);
        if (result.status === 'completed') {
          if (pollInterval.current) clearInterval(pollInterval.current);
          pollInterval.current = null;
          resetForm();
          showAlert('Recharge reussie !', `+${numAmount.toLocaleString()}F ajoutes a votre solde.`);
        } else if (result.status === 'failed' || result.status === 'expired') {
          if (pollInterval.current) clearInterval(pollInterval.current);
          pollInterval.current = null;
          setStep('method');
          showAlert('Erreur', 'Le paiement a echoue ou a expire. Veuillez reessayer.');
        }
      } catch {
        // Silently retry on next interval
      }
    }, 5000);
  };

  const handleCheckPaymentStatus = async () => {
    setLoading(true);
    try {
      const result = await getGeniusPaymentStatus(geniusRef);
      setLoading(false);
      if (result.status === 'completed') {
        resetForm();
        showAlert('Recharge reussie !', `+${numAmount.toLocaleString()}F ajoutes a votre solde.`);
      } else if (result.status === 'failed' || result.status === 'expired') {
        setStep('method');
        showAlert('Erreur', 'Le paiement a echoue ou a expire.');
      } else {
        showAlert('En attente', 'Le paiement est toujours en cours de traitement.');
      }
    } catch (error: any) {
      setLoading(false);
      showAlert('Erreur', error.message || 'Impossible de verifier le statut.');
    }
  };

  // Demo mode: simulate completed payment
  const handleDemoComplete = async () => {
    setLoading(true);
    try {
      await completeGeniusDemoPayment(geniusRef);
      resetForm();
      showAlert('Recharge reussie ! (demo)', `+${numAmount.toLocaleString()}F ajoutes a votre solde.`);
    } catch (error: any) {
      setLoading(false);
      showAlert('Erreur', error.message || 'Erreur de simulation.');
    }
  };

  const resetForm = () => {
    setStep('amount');
    setLoading(false);
    setAmount('');
    setPhone('');
    setOtp('');
    setGeniusRef('');
    setGeniusCheckoutUrl('');
    if (pollInterval.current) {
      clearInterval(pollInterval.current);
      pollInterval.current = null;
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

        {/* ── Step 1: Amount ── */}
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

        {/* ── Step 2: Payment Method ── */}
        {step === 'method' && (
          <>
            <View style={styles.amountBadge}>
              <Text style={styles.amountBadgeText}>Montant : {numAmount.toLocaleString()}F</Text>
              <TouchableOpacity onPress={() => setStep('amount')}>
                <Text style={styles.changeLink}>Modifier</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.sectionTitle}>Choisir un moyen de paiement</Text>

            {/* GeniusPay - Multi-method */}
            <TouchableOpacity
              style={styles.methodCard}
              onPress={handleGeniusPay}
              disabled={loading}
            >
              <View style={styles.methodIconContainer}>
                <Ionicons name="card-outline" size={28} color={COLORS.primary} />
              </View>
              <View style={styles.methodInfo}>
                <Text style={styles.methodName}>GeniusPay</Text>
                <Text style={styles.methodDesc}>Wave, Orange Money, MTN, Carte bancaire</Text>
              </View>
              {loading ? (
                <ActivityIndicator size="small" color={COLORS.primary} />
              ) : (
                <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
              )}
            </TouchableOpacity>

            {/* Orange Money Direct */}
            <TouchableOpacity
              style={styles.methodCard}
              onPress={() => setStep('om-details')}
            >
              <View style={[styles.methodIconContainer, { backgroundColor: '#FF6600' + '20' }]}>
                <Ionicons name="phone-portrait-outline" size={28} color="#FF6600" />
              </View>
              <View style={styles.methodInfo}>
                <Text style={styles.methodName}>Orange Money Direct</Text>
                <Text style={styles.methodDesc}>Paiement avec code OTP</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </>
        )}

        {/* ── Step 3a: Orange Money Details ── */}
        {step === 'om-details' && (
          <>
            <View style={styles.amountBadge}>
              <Text style={styles.amountBadgeText}>Montant : {numAmount.toLocaleString()}F</Text>
              <TouchableOpacity onPress={() => setStep('method')}>
                <Text style={styles.changeLink}>Changer</Text>
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
              style={[styles.omButton, (phone.length < 8 || otp.length !== 4) && styles.buttonDisabled]}
              onPress={handleOmPay}
              disabled={phone.length < 8 || otp.length !== 4}
            >
              <Ionicons name="phone-portrait-outline" size={20} color={COLORS.text} />
              <Text style={styles.buttonText}>Payer avec Orange Money</Text>
            </TouchableOpacity>
          </>
        )}

        {/* ── Step 3b: GeniusPay Checkout ── */}
        {step === 'genius-checkout' && (
          <>
            <View style={styles.amountBadge}>
              <Text style={styles.amountBadgeText}>Montant : {numAmount.toLocaleString()}F</Text>
            </View>

            <View style={styles.geniusCheckoutCard}>
              <Ionicons name="card-outline" size={40} color={COLORS.primary} />
              <Text style={styles.geniusTitle}>Paiement GeniusPay</Text>

              <Text style={styles.geniusSubtext}>
                {geniusMode === 'demo'
                  ? 'Mode demo - Simulez un paiement pour tester.'
                  : 'Ouvrez la page de paiement securisee GeniusPay.'}
              </Text>

              {geniusMode === 'live' && (
                <GradientButton
                  title="Ouvrir le paiement"
                  onPress={() => {
                    openCheckout();
                    startPolling();
                  }}
                />
              )}

              {geniusMode === 'live' && (
                <TouchableOpacity
                  style={styles.checkStatusBtn}
                  onPress={handleCheckPaymentStatus}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color={COLORS.primary} />
                  ) : (
                    <>
                      <Ionicons name="refresh-outline" size={18} color={COLORS.primary} />
                      <Text style={styles.checkStatusText}>Verifier le statut</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}

              {/* Simulate button: shown in both demo and sandbox (webhooks can't reach localhost) */}
              <View style={styles.demoBanner}>
                <Ionicons name="flask-outline" size={16} color={COLORS.gold} />
                <Text style={styles.demoText}>
                  {geniusMode === 'demo' ? 'Mode demo' : 'Mode sandbox'}
                </Text>
              </View>

              <GradientButton
                title={loading ? 'Traitement...' : 'Valider le paiement'}
                onPress={handleDemoComplete}
                disabled={loading}
              />

              <Text style={styles.geniusRef}>Ref: {geniusRef}</Text>
            </View>

            <TouchableOpacity
              style={styles.cancelLink}
              onPress={() => {
                if (pollInterval.current) {
                  clearInterval(pollInterval.current);
                  pollInterval.current = null;
                }
                setStep('method');
              }}
            >
              <Text style={styles.cancelLinkText}>Annuler et choisir un autre moyen</Text>
            </TouchableOpacity>
          </>
        )}

        {/* ── Processing ── */}
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
  // ── Payment Method Selection ──
  sectionTitle: {
    color: COLORS.text,
    fontSize: FONTS.medium,
    fontWeight: 'bold',
    fontFamily: FONT_FAMILY.bold,
    marginBottom: SPACING.md,
  },
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.md,
  },
  methodIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: COLORS.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodInfo: {
    flex: 1,
  },
  methodName: {
    color: COLORS.text,
    fontSize: FONTS.regular,
    fontWeight: 'bold',
    fontFamily: FONT_FAMILY.bold,
  },
  methodDesc: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontFamily: FONT_FAMILY.regular,
    marginTop: 2,
  },
  // ── Orange Money ──
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
    fontFamily: FONT_FAMILY.regular,
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
  // ── GeniusPay Checkout ──
  geniusCheckoutCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: SPACING.xl,
    alignItems: 'center',
    gap: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  geniusTitle: {
    color: COLORS.text,
    fontSize: FONTS.large,
    fontWeight: 'bold',
    fontFamily: FONT_FAMILY.bold,
  },
  geniusSubtext: {
    color: COLORS.textSecondary,
    fontSize: FONTS.regular,
    fontFamily: FONT_FAMILY.regular,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  checkStatusBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.sm,
  },
  checkStatusText: {
    color: COLORS.primary,
    fontSize: FONTS.regular,
    fontFamily: FONT_FAMILY.regular,
  },
  demoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.gold + '15',
    borderRadius: 10,
    padding: SPACING.md,
    width: '100%',
    marginTop: SPACING.sm,
  },
  demoText: {
    color: COLORS.gold,
    fontSize: 13,
    fontFamily: FONT_FAMILY.regular,
    flex: 1,
  },
  demoCompleteBtn: {
    backgroundColor: COLORS.gold,
    borderRadius: 8,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
  },
  demoCompleteBtnText: {
    color: COLORS.background,
    fontSize: 13,
    fontWeight: 'bold',
    fontFamily: FONT_FAMILY.bold,
  },
  geniusRef: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontFamily: FONT_FAMILY.regular,
    marginTop: SPACING.sm,
  },
  cancelLink: {
    alignItems: 'center',
    paddingVertical: SPACING.lg,
  },
  cancelLinkText: {
    color: COLORS.primary,
    fontSize: FONTS.regular,
    fontFamily: FONT_FAMILY.regular,
    textDecorationLine: 'underline',
  },
  // ── Processing ──
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
  // ── Phone / Country ──
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
  // ── Modal ──
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
