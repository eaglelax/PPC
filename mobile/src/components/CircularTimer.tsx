import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { COLORS, FONT_FAMILY, CHOICE_TIMER } from '../config/theme';

type Props = {
  timer: number;
  total?: number;
};

const SIZE = 160;
const STROKE_WIDTH = 8;
const RADIUS = (SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function CircularTimer({ timer, total = CHOICE_TIMER }: Props) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const progress = timer / total;
  const strokeDashoffset = CIRCUMFERENCE * (1 - progress);

  // Determine color based on time remaining
  const getColor = () => {
    if (timer <= 10) return COLORS.danger;
    if (timer <= 20) return COLORS.warning;
    return COLORS.primary;
  };

  const color = getColor();

  // Pulse animation when timer < 10
  useEffect(() => {
    if (timer <= 10 && timer > 0) {
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 300, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
    }
  }, [timer, pulseAnim]);

  return (
    <Animated.View style={[styles.container, { transform: [{ scale: pulseAnim }] }]}>
      <Svg width={SIZE} height={SIZE} style={styles.svg}>
        {/* Background circle */}
        <Circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          stroke={COLORS.surface}
          strokeWidth={STROKE_WIDTH}
          fill="none"
        />
        {/* Progress circle */}
        <Circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          stroke={color}
          strokeWidth={STROKE_WIDTH}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={strokeDashoffset}
          rotation="-90"
          origin={`${SIZE / 2}, ${SIZE / 2}`}
        />
      </Svg>
      <View style={styles.textContainer}>
        <Text style={[styles.timerText, { color }]}>{timer}</Text>
        <Text style={styles.timerLabel}>sec</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: SIZE,
    height: SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  svg: {
    position: 'absolute',
  },
  textContainer: {
    alignItems: 'center',
  },
  timerText: {
    fontSize: 48,
    fontWeight: 'bold',
    fontFamily: FONT_FAMILY.bold,
  },
  timerLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontFamily: FONT_FAMILY.regular,
    marginTop: -4,
  },
});
