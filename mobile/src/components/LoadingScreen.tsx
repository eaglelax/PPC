import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Image, ActivityIndicator } from 'react-native';
import { COLORS, FONT_FAMILY, SPACING } from '../config/theme';

interface Props {
  message?: string;
}

export default function LoadingScreen({ message }: Props) {
  const logoScale = useRef(new Animated.Value(0.5)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleSlide = useRef(new Animated.Value(20)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const footerOpacity = useRef(new Animated.Value(0)).current;
  const loaderOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      // Logo: scale up + fade in
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          friction: 5,
          tension: 60,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
      // Title: fade in + slide up
      Animated.parallel([
        Animated.timing(titleOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(titleSlide, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
      // Subtitle
      Animated.timing(subtitleOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      // Footer + loader
      Animated.parallel([
        Animated.timing(footerOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(loaderOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [logoScale, logoOpacity, titleOpacity, titleSlide, subtitleOpacity, footerOpacity, loaderOpacity]);

  return (
    <View style={styles.container}>
      {/* Decorative circles */}
      <View style={[styles.circle, styles.circleTopRight]} />
      <View style={[styles.circle, styles.circleBottomLeft]} />

      {/* Logo */}
      <Animated.View style={{
        opacity: logoOpacity,
        transform: [{ scale: logoScale }],
      }}>
        <Image
          source={require('../../assets/P2C_Icon_Only.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </Animated.View>

      {/* Title P2C */}
      <Animated.View style={[styles.titleRow, {
        opacity: titleOpacity,
        transform: [{ translateY: titleSlide }],
      }]}>
        <Text style={styles.titleP}>P</Text>
        <Text style={styles.title2}>2</Text>
        <Text style={styles.titleC}>C</Text>
      </Animated.View>

      {/* Subtitle */}
      <Animated.Text style={[styles.subtitle, { opacity: subtitleOpacity }]}>
        PIERRE  {'\u2022'}  PAPIER  {'\u2022'}  CISEAUX
      </Animated.Text>

      {/* Loader */}
      <Animated.View style={[styles.loaderContainer, { opacity: loaderOpacity }]}>
        <ActivityIndicator size="small" color={COLORS.primary} />
        {message && <Text style={styles.loadingText}>{message}</Text>}
      </Animated.View>

      {/* Footer */}
      <Animated.Text style={[styles.poweredBy, { opacity: footerOpacity }]}>
        POWERED BY LEXOVA
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  circle: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: COLORS.surfaceLight,
    opacity: 0.3,
  },
  circleTopRight: {
    width: 200,
    height: 200,
    top: -40,
    right: -60,
  },
  circleBottomLeft: {
    width: 250,
    height: 250,
    bottom: -80,
    left: -80,
  },
  logo: {
    width: 160,
    height: 160,
    marginBottom: SPACING.lg,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: SPACING.sm,
  },
  titleP: {
    fontSize: 52,
    fontWeight: 'bold',
    fontFamily: FONT_FAMILY.bold,
    color: COLORS.text,
  },
  title2: {
    fontSize: 52,
    fontWeight: 'bold',
    fontFamily: FONT_FAMILY.bold,
    color: COLORS.primary,
  },
  titleC: {
    fontSize: 52,
    fontWeight: 'bold',
    fontFamily: FONT_FAMILY.bold,
    color: COLORS.text,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    letterSpacing: 4,
    fontFamily: FONT_FAMILY.regular,
    marginBottom: SPACING.xxl,
  },
  loaderContainer: {
    alignItems: 'center',
    gap: SPACING.sm,
  },
  loadingText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontFamily: FONT_FAMILY.regular,
  },
  poweredBy: {
    position: 'absolute',
    bottom: SPACING.xl,
    color: COLORS.textSecondary,
    fontSize: 10,
    letterSpacing: 3,
    fontFamily: FONT_FAMILY.regular,
  },
});
