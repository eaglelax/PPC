import React, { useState, useEffect } from 'react';
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
import {
  signInWithCustomToken,
  signInWithCredential,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { auth, GOOGLE_WEB_CLIENT_ID } from '../config/firebase';
import { sendOtp, verifyOtp, validateReferralCode } from '../config/api';
import { createUser } from '../services/userService';
import { useAuth } from '../contexts/AuthContext';
import { COLORS, FONTS, SPACING, FONT_FAMILY } from '../config/theme';
import { showAlert } from '../utils/alert';
import { ORANGE_MONEY_COUNTRIES, DEFAULT_COUNTRY, Country } from '../config/countries';
import GradientButton from '../components/GradientButton';
import LoadingScreen from '../components/LoadingScreen';

WebBrowser.maybeCompleteAuthSession();

type Step = 'phone' | 'phoneInput' | 'otp' | 'profile';

export default function AuthScreen() {
  const { needsProfile, firebaseUser } = useAuth();

  // Step management
  const [step, setStep] = useState<Step>(needsProfile ? 'profile' : 'phone');

  // Phone step
  const [isLogin, setIsLogin] = useState(true);
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState<Country>(DEFAULT_COUNTRY);
  const [countryPickerVisible, setCountryPickerVisible] = useState(false);

  // OTP step
  const [otpCode, setOtpCode] = useState('');
  const [testCode, setTestCode] = useState('');
  const [resendTimer, setResendTimer] = useState(0);

  // Email/password step
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');

  // Profile step
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [referralValid, setReferralValid] = useState<boolean | null>(null);
  const [referrerName, setReferrerName] = useState('');
  const [referralChecking, setReferralChecking] = useState(false);

  const [loading, setLoading] = useState(false);
  const referralTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Google Sign-In (native only - web uses signInWithPopup)
  const [, googleResponse, promptGoogleAsync] = Google.useIdTokenAuthRequest({
    clientId: GOOGLE_WEB_CLIENT_ID,
  });

  // Handle Google auth response (native)
  useEffect(() => {
    if (googleResponse?.type === 'success') {
      const { id_token } = googleResponse.params;
      const credential = GoogleAuthProvider.credential(id_token);
      setLoading(true);
      signInWithCredential(auth, credential)
        .catch((err: Error) => {
          showAlert('Erreur', err.message || 'Erreur de connexion Google.');
        })
        .finally(() => setLoading(false));
    }
  }, [googleResponse]);

  // If needsProfile changes to true, jump to profile & pre-fill from Google data
  useEffect(() => {
    if (needsProfile) {
      setStep('profile');
      if (firebaseUser?.displayName && !displayName) {
        setDisplayName(firebaseUser.displayName);
      }
      if (firebaseUser?.email && !email) {
        setEmail(firebaseUser.email);
      }
    }
  }, [needsProfile]);

  // Resend timer countdown
  useEffect(() => {
    if (resendTimer <= 0) return;
    const interval = setInterval(() => {
      setResendTimer((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [resendTimer]);

  const fullPhone = country.dialCode + phone.trim();

  // Google Sign-In handler
  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      if (Platform.OS === 'web') {
        const provider = new GoogleAuthProvider();
        await signInWithPopup(auth, provider);
        // onAuthStateChanged will fire → needsProfile will be checked
      } else {
        await promptGoogleAsync();
        // Response handled in useEffect above
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erreur de connexion Google.';
      showAlert('Erreur', message);
    } finally {
      // For native, loading state is managed by the useEffect
      if (Platform.OS === 'web') setLoading(false);
    }
  };

  const handleSendOtp = async () => {
    if (phone.length < 8) {
      showAlert('Erreur', 'Veuillez entrer un numero de telephone valide.');
      return;
    }

    setLoading(true);
    try {
      const result = await sendOtp(fullPhone, !isLogin);
      setTestCode(result.code || '');
      setStep('otp');
      setResendTimer(60);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Une erreur est survenue.';
      showAlert('Erreur', message);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async () => {
    if (!authEmail.trim() || !authPassword.trim()) {
      showAlert('Erreur', 'Email et mot de passe requis.');
      return;
    }
    if (authPassword.length < 6) {
      showAlert('Erreur', 'Le mot de passe doit contenir au moins 6 caracteres.');
      return;
    }

    setLoading(true);
    try {
      const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), 15000)
      );
      const authPromise = isLogin
        ? signInWithEmailAndPassword(auth, authEmail.trim(), authPassword)
        : createUserWithEmailAndPassword(auth, authEmail.trim(), authPassword);

      await Promise.race([authPromise, timeout]);
    } catch (error: unknown) {
      const err = error as any;
      let message = 'Une erreur est survenue.';
      if (err.message === 'timeout') {
        message = 'Connexion trop lente. Verifiez votre connexion internet.';
      } else if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        message = 'Email ou mot de passe incorrect.';
      } else if (err.code === 'auth/email-already-in-use') {
        message = 'Cet email est deja utilise. Essayez de vous connecter.';
      } else if (err.code === 'auth/invalid-email') {
        message = 'Email invalide.';
      } else if (err.code === 'auth/weak-password') {
        message = 'Mot de passe trop faible (min 6 caracteres).';
      } else if (err.code === 'auth/network-request-failed') {
        message = 'Erreur reseau. Verifiez votre connexion internet.';
      }
      showAlert('Erreur', message);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendTimer > 0) return;
    setLoading(true);
    try {
      const result = await sendOtp(fullPhone, !isLogin);
      setTestCode(result.code || '');
      setOtpCode('');
      setResendTimer(60);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Une erreur est survenue.';
      showAlert('Erreur', message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otpCode.length !== 6) {
      showAlert('Erreur', 'Veuillez entrer le code a 6 chiffres.');
      return;
    }

    setLoading(true);
    try {
      const result = await verifyOtp(fullPhone, otpCode);
      await signInWithCustomToken(auth, result.token);

      if (result.isNewUser) {
        setStep('profile');
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Une erreur est survenue.';
      showAlert('Erreur', message);
    } finally {
      setLoading(false);
    }
  };

  const handleReferralCodeChange = (text: string) => {
    const upper = text.toUpperCase();
    setReferralCode(upper);
    setReferralValid(null);
    setReferrerName('');

    if (referralTimer.current) clearTimeout(referralTimer.current);

    if (!upper || upper.length < 10) {
      return;
    }

    setReferralChecking(true);
    referralTimer.current = setTimeout(async () => {
      try {
        const result = await validateReferralCode(upper);
        setReferralValid(result.valid);
        if (result.valid && result.referrerName) {
          setReferrerName(result.referrerName);
        }
      } catch {
        setReferralValid(false);
      } finally {
        setReferralChecking(false);
      }
    }, 500);
  };

  const handleCreateProfile = async () => {
    if (!displayName.trim()) {
      showAlert('Erreur', 'Veuillez entrer un pseudo.');
      return;
    }
    if (referralCode && referralValid === false) {
      showAlert('Erreur', 'Le code parrain est invalide. Corrigez-le ou laissez le champ vide.');
      return;
    }

    setLoading(true);
    try {
      await createUser(
        displayName.trim(),
        email.trim() || undefined,
        referralValid ? referralCode : undefined,
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Une erreur est survenue.';
      showAlert('Erreur', message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    const messages: Record<Step, string> = {
      phone: 'Connexion...',
      phoneInput: 'Envoi du code...',
      otp: 'Verification...',
      profile: 'Creation du compte...',
    };
    return <LoadingScreen message={messages[step]} />;
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

        {/* STEP: PHONE */}
        {step === 'phone' && (
          <View style={styles.form}>
            {/* Mode toggle tabs */}
            <View style={styles.modeTabs}>
              <TouchableOpacity
                style={[styles.modeTab, isLogin && styles.modeTabActive]}
                onPress={() => setIsLogin(true)}
              >
                <Text style={[styles.modeTabText, isLogin && styles.modeTabTextActive]}>Connexion</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modeTab, !isLogin && styles.modeTabActive]}
                onPress={() => setIsLogin(false)}
              >
                <Text style={[styles.modeTabText, !isLogin && styles.modeTabTextActive]}>Inscription</Text>
              </TouchableOpacity>
            </View>

            {/* Email / Password */}
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor={COLORS.textSecondary}
              value={authEmail}
              onChangeText={setAuthEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <TextInput
              style={styles.input}
              placeholder="Mot de passe"
              placeholderTextColor={COLORS.textSecondary}
              value={authPassword}
              onChangeText={setAuthPassword}
              secureTextEntry
            />

            <GradientButton
              title={isLogin ? 'Se connecter' : "S'inscrire"}
              onPress={handleEmailAuth}
            />

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>ou</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Google Sign-In */}
            <TouchableOpacity style={styles.googleButton} onPress={handleGoogleSignIn}>
              <Ionicons name="logo-google" size={20} color={COLORS.text} />
              <Text style={styles.googleButtonText}>
                {isLogin ? 'Se connecter avec Google' : "S'inscrire avec Google"}
              </Text>
            </TouchableOpacity>

            {/* Switch to phone auth */}
            <TouchableOpacity onPress={() => setStep('phoneInput')}>
              <Text style={styles.switchText}>Utiliser un numero de telephone</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* STEP: PHONE INPUT */}
        {step === 'phoneInput' && (
          <View style={styles.form}>
            {/* Mode toggle tabs */}
            <View style={styles.modeTabs}>
              <TouchableOpacity
                style={[styles.modeTab, isLogin && styles.modeTabActive]}
                onPress={() => setIsLogin(true)}
              >
                <Text style={[styles.modeTabText, isLogin && styles.modeTabTextActive]}>Connexion</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modeTab, !isLogin && styles.modeTabActive]}
                onPress={() => setIsLogin(false)}
              >
                <Text style={[styles.modeTabText, !isLogin && styles.modeTabTextActive]}>Inscription</Text>
              </TouchableOpacity>
            </View>

            {/* Phone input */}
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

            <GradientButton
              title={isLogin ? 'Recevoir le code' : "S'inscrire par telephone"}
              onPress={handleSendOtp}
            />

            <TouchableOpacity onPress={() => setStep('phone')}>
              <Text style={styles.switchText}>Retour a email / mot de passe</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* STEP: OTP */}
        {step === 'otp' && (
          <View style={styles.form}>
            <Text style={styles.otpTitle}>
              Code envoye au {fullPhone}
            </Text>

            {testCode ? (
              <View style={styles.testCodeBox}>
                <Text style={styles.testCodeLabel}>Mode test - Code :</Text>
                <Text style={styles.testCodeValue}>{testCode}</Text>
              </View>
            ) : null}

            <TextInput
              style={[styles.input, styles.otpInput]}
              placeholder="000000"
              placeholderTextColor={COLORS.textSecondary}
              value={otpCode}
              onChangeText={(t) => setOtpCode(t.replace(/[^0-9]/g, '').slice(0, 6))}
              keyboardType="number-pad"
              maxLength={6}
              textContentType="oneTimeCode"
            />

            <GradientButton
              title="Verifier"
              onPress={handleVerifyOtp}
              disabled={otpCode.length !== 6}
            />

            <TouchableOpacity onPress={handleResendOtp} disabled={resendTimer > 0}>
              <Text style={[styles.switchText, resendTimer > 0 && styles.textDisabled]}>
                {resendTimer > 0
                  ? `Renvoyer le code dans ${resendTimer}s`
                  : 'Renvoyer le code'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => { setStep('phone'); setOtpCode(''); setTestCode(''); }}>
              <Text style={styles.switchText}>Changer de numero</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* STEP: PROFILE (new user - both Google and phone) */}
        {step === 'profile' && (
          <View style={styles.form}>
            <Text style={styles.otpTitle}>Completez votre profil</Text>

            <TextInput
              style={styles.input}
              placeholder="Pseudo"
              placeholderTextColor={COLORS.textSecondary}
              value={displayName}
              onChangeText={setDisplayName}
              autoCapitalize="none"
            />

            <TextInput
              style={styles.input}
              placeholder="Email (optionnel)"
              placeholderTextColor={COLORS.textSecondary}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <TextInput
              style={styles.input}
              placeholder="Code parrain (optionnel)"
              placeholderTextColor={COLORS.textSecondary}
              value={referralCode}
              onChangeText={handleReferralCodeChange}
              autoCapitalize="characters"
              maxLength={10}
            />
            {referralCode.length > 0 && (
              <Text style={[
                styles.referralFeedback,
                referralChecking ? styles.referralChecking :
                referralValid === true ? styles.referralValid :
                referralValid === false ? styles.referralInvalid : null,
              ]}>
                {referralChecking ? 'Verification...' :
                 referralValid === true ? `Parraine par ${referrerName}` :
                 referralValid === false ? 'Code invalide' :
                 'Entrez les 10 caracteres (ex: PPC-A7X3K9)'}
              </Text>
            )}

            <GradientButton
              title="Commencer"
              onPress={handleCreateProfile}
            />
          </View>
        )}

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
  otpInput: {
    textAlign: 'center',
    fontSize: FONTS.xlarge,
    fontFamily: FONT_FAMILY.bold,
    letterSpacing: 8,
  },
  otpTitle: {
    color: COLORS.text,
    fontSize: FONTS.medium,
    fontFamily: FONT_FAMILY.medium,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  testCodeBox: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.warning,
    alignItems: 'center',
  },
  testCodeLabel: {
    color: COLORS.warning,
    fontSize: 13,
    fontFamily: FONT_FAMILY.regular,
  },
  testCodeValue: {
    color: COLORS.warning,
    fontSize: FONTS.large,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: 'bold',
    letterSpacing: 6,
    marginTop: SPACING.xs,
  },
  modeTabs: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 4,
  },
  modeTab: {
    flex: 1,
    paddingVertical: SPACING.sm,
    borderRadius: 10,
    alignItems: 'center',
  },
  modeTabActive: {
    backgroundColor: COLORS.primary,
  },
  modeTabText: {
    color: COLORS.textSecondary,
    fontSize: FONTS.regular,
    fontFamily: FONT_FAMILY.medium,
  },
  modeTabTextActive: {
    color: COLORS.text,
    fontWeight: 'bold',
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  googleButtonText: {
    color: COLORS.text,
    fontSize: FONTS.regular,
    fontFamily: FONT_FAMILY.medium,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  dividerText: {
    color: COLORS.textSecondary,
    fontSize: FONTS.regular,
    fontFamily: FONT_FAMILY.regular,
  },
  referralFeedback: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.regular,
    marginTop: -8,
    marginLeft: 4,
    color: COLORS.textSecondary,
  },
  referralChecking: {
    color: COLORS.warning,
  },
  referralValid: {
    color: COLORS.success,
  },
  referralInvalid: {
    color: COLORS.danger,
  },
  switchText: {
    color: COLORS.primary,
    fontSize: FONTS.regular,
    fontFamily: FONT_FAMILY.regular,
    textAlign: 'center',
    marginTop: SPACING.sm,
  },
  textDisabled: {
    color: COLORS.textSecondary,
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
