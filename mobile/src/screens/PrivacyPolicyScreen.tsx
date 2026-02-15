import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { COLORS, FONTS, SPACING, FONT_FAMILY } from '../config/theme';
import { RootStackParamList } from '../types';
import GradientButton from '../components/GradientButton';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'PrivacyPolicy'>;
  route: RouteProp<RootStackParamList, 'PrivacyPolicy'>;
};

export default function PrivacyPolicyScreen({ navigation, route }: Props) {
  const fromSignup = route.params?.fromSignup;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Politique de Confidentialite</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.sectionTitle}>1. Collecte des donnees</Text>
        <Text style={styles.text}>
          Nous collectons les donnees suivantes lors de votre utilisation de l'application P2C :{'\n\n'}
          - Informations d'identification : email, numero de telephone, pseudo{'\n'}
          - Donnees de transaction : historique des parties, mises, gains, recharges et retraits{'\n'}
          - Statistiques de jeu : nombre de parties jouees, victoires, defaites{'\n'}
          - Donnees techniques : type d'appareil, version de l'application
        </Text>

        <Text style={styles.sectionTitle}>2. Utilisation des donnees</Text>
        <Text style={styles.text}>
          Vos donnees sont utilisees pour :{'\n\n'}
          - Gestion de votre compte et authentification{'\n'}
          - Traitement des paiements et transactions{'\n'}
          - Amelioration de l'experience utilisateur et des performances{'\n'}
          - Communication relative a votre compte (notifications, alertes)
        </Text>

        <Text style={styles.sectionTitle}>3. Protection des donnees</Text>
        <Text style={styles.text}>
          Nous mettons en oeuvre les mesures suivantes pour proteger vos donnees :{'\n\n'}
          - Chiffrement des donnees en transit et au repos{'\n'}
          - Serveurs securises avec acces restreint{'\n'}
          - Authentification renforcee via Firebase Authentication{'\n'}
          - Audits de securite reguliers
        </Text>

        <Text style={styles.sectionTitle}>4. Partage des donnees</Text>
        <Text style={styles.text}>
          Vos donnees peuvent etre partagees avec :{'\n\n'}
          - Nos prestataires de paiement (Orange Money, Wave, GeniusPay) pour le traitement des transactions{'\n'}
          - Les autorites competentes si la loi l'exige{'\n\n'}
          Nous ne vendons jamais vos donnees personnelles a des tiers.
        </Text>

        <Text style={styles.sectionTitle}>5. Vos droits</Text>
        <Text style={styles.text}>
          Conformement a la reglementation en vigueur, vous disposez des droits suivants :{'\n\n'}
          - Droit d'acces : consulter vos donnees personnelles{'\n'}
          - Droit de rectification : corriger vos informations{'\n'}
          - Droit de suppression : demander la suppression de votre compte{'\n'}
          - Droit de portabilite : obtenir une copie de vos donnees
        </Text>

        <Text style={styles.sectionTitle}>6. Conservation des donnees</Text>
        <Text style={styles.text}>
          Vos donnees sont conservees pendant toute la duree de vie de votre compte, puis pendant une periode de 5 ans apres la cloture de celui-ci, conformement aux obligations legales.
        </Text>

        <Text style={styles.sectionTitle}>7. Conditions de jeu et frais</Text>
        <Text style={styles.text}>
          Lors de chaque partie, des frais de lancement de 10 FCFA par joueur sont preleves.{'\n\n'}
          En cas d'annulation d'une partie en cours (par vous ou votre adversaire) :{'\n'}
          - Votre mise vous sera integralement restituee{'\n'}
          - Les frais de lancement (10 FCFA) ne sont pas remboursables{'\n\n'}
          Ces frais couvrent les couts d'infrastructure et de traitement des parties.
        </Text>

        <Text style={styles.sectionTitle}>8. Contact</Text>
        <Text style={styles.text}>
          Pour toute question relative a la protection de vos donnees, vous pouvez nous contacter par email a l'adresse :{'\n\n'}
          support@p2c-game.com
        </Text>

        {fromSignup && (
          <View style={styles.acceptContainer}>
            <GradientButton
              title="J'accepte et je continue"
              onPress={() => navigation.navigate('Auth', { privacyAccepted: true })}
            />
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: SPACING.xl,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    gap: SPACING.md,
  },
  backButton: {
    padding: SPACING.xs,
  },
  title: {
    fontSize: FONTS.large,
    fontWeight: 'bold',
    fontFamily: FONT_FAMILY.bold,
    color: COLORS.text,
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  sectionTitle: {
    fontSize: FONTS.medium,
    fontWeight: 'bold',
    fontFamily: FONT_FAMILY.bold,
    color: COLORS.text,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  text: {
    fontSize: FONTS.regular,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.textSecondary,
    lineHeight: 24,
  },
  acceptContainer: {
    marginTop: SPACING.xl,
  },
});
