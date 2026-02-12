import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { COLORS, FONTS, SPACING, FONT_FAMILY } from '../config/theme';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Une erreur est survenue</Text>
          <ScrollView style={styles.errorBox}>
            <Text style={styles.errorText}>
              {this.state.error?.message || 'Erreur inconnue'}
            </Text>
            <Text style={styles.stackText}>
              {this.state.error?.stack?.slice(0, 500)}
            </Text>
          </ScrollView>
          <TouchableOpacity
            style={styles.button}
            onPress={() => this.setState({ hasError: false, error: null })}
          >
            <Text style={styles.buttonText}>Reessayer</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: SPACING.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    color: COLORS.danger,
    fontSize: FONTS.large,
    fontWeight: 'bold',
    fontFamily: FONT_FAMILY.bold,
    marginBottom: SPACING.lg,
  },
  errorBox: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SPACING.md,
    maxHeight: 200,
    width: '100%',
    marginBottom: SPACING.lg,
  },
  errorText: {
    color: COLORS.text,
    fontSize: 14,
    fontFamily: FONT_FAMILY.regular,
    marginBottom: SPACING.sm,
  },
  stackText: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontFamily: FONT_FAMILY.regular,
  },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
  },
  buttonText: {
    color: COLORS.text,
    fontSize: FONTS.medium,
    fontWeight: 'bold',
    fontFamily: FONT_FAMILY.bold,
  },
});
