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
  Platform,
  Modal,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../contexts/AuthContext';
import { withdrawFunds, getWithdrawalFee } from '../services/betService';
import { COLORS, FONTS, SPACING, FONT_FAMILY } from '../config/theme';
import { RootStackParamList } from '../types';
import Navbar, { NAVBAR_HEIGHT } from '../components/Navbar';
import { ORANGE_MONEY_COUNTRIES, DEFAULT_COUNTRY, Country } from '../config/countries';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Withdraw'>;
};

export default function WithdrawScreen({ navigation }: Props) {
  const { userData } = useAuth();
  const [amount, setAmount] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState<Country>(DEFAULT_COUNTRY);
  const [countryPickerVisible, setCountryPickerVisible] = useState(false);
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

  const handleWithdraw = () => {
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
    if (!phone || phone.length < 8) {
      Alert.alert('Erreur', 'Veuillez entrer un numero valide.');
      return;
    }

    if (Platform.OS === 'web') {
      if (window.confirm(`Confirmer le retrait de ${numAmount.toLocaleString()}F via Orange Money ?\nVous recevrez ${netAmount.toLocaleString()}F (frais ${fee.toLocaleString()}F)`)) {
        processWithdraw();
      }
    } else {
      Alert.alert(
        'Confirmer le retrait',
        `Retirer ${numAmount.toLocaleString()}F via Orange Money ?\nVous recevrez ${netAmount.toLocaleString()}F (frais ${fee.toLocaleString()}F)`,
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Confirmer', onPress: () => processWithdraw() },
        ]
      );
    }
  };

  const processWithdraw = async () => {
    setLoading(true);
    const fullPhone = country.dialCode + phone;
    try {
      const result = await withdrawFunds(numAmount, 'Orange', fullPhone);
      if (Platform.OS === 'web') {
        window.alert(`Retrait effectue ! ${result.netAmount.toLocaleString()}F envoyes sur Orange Money (${fullPhone})\nFrais: ${result.fee.toLocaleString()}F`);
      } else {
        Alert.alert(
          'Retrait effectue',
          `${result.netAmount.toLocaleString()}F envoyes sur Orange Money (${fullPhone})\nFrais: ${result.fee.toLocaleString()}F`
        );
      }
      setAmount('');
      setPhone('');
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
          (loading || !numAmount || !phone) && styles.buttonDisabled,
        ]}
        onPress={handleWithdraw}
        disabled={loading || !numAmount || !phone}
      >
        <Ionicons name="phone-portrait-outline" size={20} color={COLORS.text} />
        <Text style={styles.buttonText}>
          {loading ? 'Traitement...' : 'Retirer via Orange Money'}
        </Text>
      </TouchableOpacity>
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
    marginBottom: SPACING.xs,
    fontFamily: FONT_FAMILY.bold,
  },
  minText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    textAlign: 'center',
    marginBottom: SPACING.md,
    fontFamily: FONT_FAMILY.regular,
  },
  phoneRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
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
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: SPACING.md,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.sm,
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
  // Modal styles
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
