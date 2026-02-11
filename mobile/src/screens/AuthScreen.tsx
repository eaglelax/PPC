import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Modal,
  FlatList,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../config/firebase';
import { createUser } from '../services/userService';
import { COLORS, FONTS, SPACING, FONT_FAMILY } from '../config/theme';
import { showAlert } from '../utils/alert';
import { ORANGE_MONEY_COUNTRIES, DEFAULT_COUNTRY, Country } from '../config/countries';
import GradientButton from '../components/GradientButton';
import LoadingScreen from '../components/LoadingScreen';

export default function AuthScreen() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState<Country>(DEFAULT_COUNTRY);
  const [countryPickerVisible, setCountryPickerVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      showAlert('Erreur', 'Veuillez remplir tous les champs.');
      return;
    }
    if (!isLogin && !displayName.trim()) {
      showAlert('Erreur', 'Veuillez entrer un pseudo.');
      return;
    }
    if (!isLogin && phone.length < 8) {
      showAlert('Erreur', 'Veuillez entrer un numero de telephone valide.');
      return;
    }
    if (password.length < 6) {
      showAlert('Erreur', 'Le mot de passe doit contenir au moins 6 caracteres.');
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      } else {
        const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
        const fullPhone = country.dialCode + phone.trim();
        await createUser(credential.user.uid, email.trim(), displayName.trim(), fullPhone);
      }
    } catch (error: any) {
      let message = 'Une erreur est survenue.';
      if (error.code === 'auth/email-already-in-use') {
        message = 'Cet email est deja utilise.';
      } else if (error.code === 'auth/invalid-email') {
        message = 'Email invalide.';
      } else if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        message = 'Email ou mot de passe incorrect.';
      } else if (error.code === 'auth/user-not-found') {
        message = 'Aucun compte trouve avec cet email.';
      } else if (error.message) {
        message = error.message;
      }
      showAlert('Erreur', message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingScreen message={isLogin ? 'Connexion...' : 'Creation du compte...'} />;
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Image
            source={require('../../assets/P2C_Icon_Only.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <View style={styles.titleRow}>
            <Text style={styles.titleP}>P</Text>
            <Text style={styles.title2}>2</Text>
            <Text style={styles.titleC}>C</Text>
          </View>
          <Text style={styles.subtitle}>Pierre - Papier - Ciseaux</Text>
        </View>

        <View style={styles.form}>
          {!isLogin && (
            <TextInput
              style={styles.input}
              placeholder="Pseudo"
              placeholderTextColor={COLORS.textSecondary}
              value={displayName}
              onChangeText={setDisplayName}
              autoCapitalize="none"
            />
          )}
          {!isLogin && (
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
                placeholder="Numero de telephone"
                placeholderTextColor={COLORS.textSecondary}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
            </View>
          )}
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={COLORS.textSecondary}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TextInput
            style={styles.input}
            placeholder="Mot de passe"
            placeholderTextColor={COLORS.textSecondary}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <GradientButton
            title={loading ? 'Chargement...' : isLogin ? 'Se connecter' : "S'inscrire"}
            onPress={handleSubmit}
            disabled={loading}
          />

          {!isLogin && (
            <Text style={styles.bonus}>Bonus : 5 000F offerts a l'inscription !</Text>
          )}

          <TouchableOpacity onPress={() => setIsLogin(!isLogin)}>
            <Text style={styles.switchText}>
              {isLogin ? "Pas de compte ? S'inscrire" : 'Deja un compte ? Se connecter'}
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.poweredBy}>POWERED BY LEXOVA</Text>
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
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.xxl,
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: SPACING.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  titleP: {
    fontSize: FONTS.title,
    fontWeight: 'bold',
    fontFamily: FONT_FAMILY.bold,
    color: COLORS.text,
  },
  title2: {
    fontSize: FONTS.title,
    fontWeight: 'bold',
    fontFamily: FONT_FAMILY.bold,
    color: COLORS.primary,
  },
  titleC: {
    fontSize: FONTS.title,
    fontWeight: 'bold',
    fontFamily: FONT_FAMILY.bold,
    color: COLORS.text,
  },
  subtitle: {
    fontSize: FONTS.regular,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  form: {
    gap: SPACING.md,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SPACING.md,
    fontSize: FONTS.regular,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  bonus: {
    color: COLORS.gold,
    fontSize: FONTS.regular,
    fontFamily: FONT_FAMILY.medium,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  switchText: {
    color: COLORS.primary,
    fontSize: FONTS.regular,
    fontFamily: FONT_FAMILY.regular,
    textAlign: 'center',
    marginTop: SPACING.sm,
  },
  poweredBy: {
    color: COLORS.textSecondary,
    fontSize: 10,
    fontFamily: FONT_FAMILY.regular,
    textAlign: 'center',
    letterSpacing: 3,
    marginTop: SPACING.xxl,
  },
  phoneRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
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
    fontSize: FONTS.regular,
    fontFamily: FONT_FAMILY.regular,
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
    fontFamily: FONT_FAMILY.bold,
    fontWeight: 'bold',
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
    fontFamily: FONT_FAMILY.regular,
  },
  countryItemDial: {
    color: COLORS.textSecondary,
    fontSize: FONTS.regular,
  },
});
