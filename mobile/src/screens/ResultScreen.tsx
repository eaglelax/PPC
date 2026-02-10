import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { onGameUpdate } from '../services/gameService';
import { COLORS, FONTS, SPACING } from '../config/theme';
import { RootStackParamList, Game, Choice } from '../types';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Result'>;
  route: RouteProp<RootStackParamList, 'Result'>;
};

const CHOICE_ICONS: Record<Choice, keyof typeof MaterialCommunityIcons.glyphMap> = {
  pierre: 'hand-back-left',
  papier: 'hand-back-right',
  ciseaux: 'content-cut',
};

export default function ResultScreen({ navigation, route }: Props) {
  const { gameId } = route.params;
  const { firebaseUser, userData } = useAuth();
  const [game, setGame] = useState<Game | null>(null);
  const scaleAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    const unsub = onGameUpdate(gameId, (g) => {
      setGame(g);
    });
    return unsub;
  }, [gameId]);

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 4,
      tension: 60,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  if (!game || !firebaseUser) return null;

  const isPlayer1 = game.player1.userId === firebaseUser.uid;
  const myData = isPlayer1 ? game.player1 : game.player2;
  const opponentData = isPlayer1 ? game.player2 : game.player1;
  const isWinner = game.winner === firebaseUser.uid;
  const winAmount = game.betAmount * 2;

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.resultCard, { transform: [{ scale: scaleAnim }] }]}>
        <Ionicons
          name={isWinner ? 'trophy' : 'sad-outline'}
          size={80}
          color={isWinner ? COLORS.success : COLORS.danger}
          style={{ marginBottom: SPACING.md }}
        />
        <Text style={[styles.resultTitle, { color: isWinner ? COLORS.success : COLORS.danger }]}>
          {isWinner ? 'VICTOIRE !' : 'DEFAITE'}
        </Text>
        <Text style={[styles.resultAmount, { color: isWinner ? COLORS.success : COLORS.danger }]}>
          {isWinner ? `+${winAmount.toLocaleString()}F` : `-${game.betAmount.toLocaleString()}F`}
        </Text>
        {isWinner && (
          <View style={styles.pixReward}>
            <Ionicons name="diamond" size={24} color={COLORS.pix} />
            <Text style={styles.pixRewardText}>+1 Pix</Text>
          </View>
        )}
      </Animated.View>

      <View style={styles.matchup}>
        <View style={styles.playerSide}>
          <Text style={styles.playerName}>Vous</Text>
          {myData.choice ? (
            <MaterialCommunityIcons
              name={CHOICE_ICONS[myData.choice]}
              size={56}
              color={COLORS.text}
              style={{ marginBottom: SPACING.xs }}
            />
          ) : (
            <Text style={styles.playerChoicePlaceholder}>?</Text>
          )}
          <Text style={styles.choiceLabel}>
            {myData.choice || '?'}
          </Text>
        </View>

        <Text style={styles.vsText}>VS</Text>

        <View style={styles.playerSide}>
          <Text style={styles.playerName}>{opponentData.displayName}</Text>
          {opponentData.choice ? (
            <MaterialCommunityIcons
              name={CHOICE_ICONS[opponentData.choice]}
              size={56}
              color={COLORS.text}
              style={{ marginBottom: SPACING.xs }}
            />
          ) : (
            <Text style={styles.playerChoicePlaceholder}>?</Text>
          )}
          <Text style={styles.choiceLabel}>
            {opponentData.choice || '?'}
          </Text>
        </View>
      </View>

      <View style={styles.newBalance}>
        <Text style={styles.newBalanceLabel}>Nouveau solde</Text>
        <Text style={styles.newBalanceValue}>{userData?.balance.toLocaleString()}F</Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.playAgainButton}
          onPress={() => navigation.navigate('Bet')}
        >
          <Text style={styles.playAgainText}>Rejouer</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.homeButton}
          onPress={() => navigation.navigate('Home')}
        >
          <Text style={styles.homeText}>Accueil</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: SPACING.lg,
    justifyContent: 'center',
  },
  resultCard: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  resultTitle: {
    fontSize: FONTS.title,
    fontWeight: 'bold',
  },
  resultAmount: {
    fontSize: FONTS.xlarge,
    fontWeight: 'bold',
    marginTop: SPACING.sm,
  },
  pixReward: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.md,
  },
  pixRewardText: {
    color: COLORS.pix,
    fontSize: FONTS.medium,
    fontWeight: 'bold',
  },
  matchup: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  playerSide: {
    alignItems: 'center',
    flex: 1,
  },
  playerName: {
    fontSize: FONTS.regular,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  playerChoicePlaceholder: {
    fontSize: 56,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  choiceLabel: {
    fontSize: 14,
    color: COLORS.text,
    textTransform: 'capitalize',
  },
  vsText: {
    fontSize: FONTS.large,
    fontWeight: 'bold',
    color: COLORS.secondary,
  },
  newBalance: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SPACING.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  newBalanceLabel: {
    color: COLORS.textSecondary,
    fontSize: FONTS.regular,
  },
  newBalanceValue: {
    color: COLORS.gold,
    fontSize: FONTS.large,
    fontWeight: 'bold',
  },
  actions: {
    gap: SPACING.md,
  },
  playAgainButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: SPACING.md,
    alignItems: 'center',
  },
  playAgainText: {
    color: COLORS.text,
    fontSize: FONTS.medium,
    fontWeight: 'bold',
  },
  homeButton: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SPACING.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  homeText: {
    color: COLORS.textSecondary,
    fontSize: FONTS.medium,
  },
});
