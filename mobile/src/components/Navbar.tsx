import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { COLORS, SPACING, FONT_FAMILY } from '../config/theme';
import { RootStackParamList } from '../types';

type NavScreen = 'Home' | 'Bet' | 'Recharge' | 'Withdraw' | 'History';

type Props = {
  active: NavScreen;
};

const TABS: { key: NavScreen; label: string; iconOutline: keyof typeof Ionicons.glyphMap; iconSolid: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'Home', label: 'Accueil', iconOutline: 'home-outline', iconSolid: 'home' },
  { key: 'Bet', label: 'Jouer', iconOutline: 'game-controller-outline', iconSolid: 'game-controller' },
  { key: 'Recharge', label: 'Recharger', iconOutline: 'wallet-outline', iconSolid: 'wallet' },
  { key: 'Withdraw', label: 'Retirer', iconOutline: 'cash-outline', iconSolid: 'cash' },
  { key: 'History', label: 'Historique', iconOutline: 'time-outline', iconSolid: 'time' },
];

export default function Navbar({ active }: Props) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <View style={styles.container}>
      {TABS.map((tab) => {
        const isActive = tab.key === active;
        return (
          <TouchableOpacity
            key={tab.key}
            style={styles.tab}
            onPress={() => {
              if (tab.key !== active) {
                navigation.navigate(tab.key as any);
              }
            }}
          >
            <Ionicons
              name={isActive ? tab.iconSolid : tab.iconOutline}
              size={24}
              color={isActive ? COLORS.primary : COLORS.textSecondary}
            />
            <Text style={[styles.label, isActive && styles.labelActive]}>
              {tab.label}
            </Text>
            {isActive && <View style={styles.activeDot} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const NAVBAR_HEIGHT = 60;

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: NAVBAR_HEIGHT,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    flexDirection: 'row',
    paddingBottom: 4,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
    fontFamily: FONT_FAMILY.regular,
  },
  labelActive: {
    color: COLORS.primary,
    fontWeight: 'bold',
    fontFamily: FONT_FAMILY.semibold,
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.primary,
    marginTop: 2,
  },
});

export { NAVBAR_HEIGHT };
