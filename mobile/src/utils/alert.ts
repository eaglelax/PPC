import { Alert, Platform } from 'react-native';

type AlertButton = { text: string; onPress?: () => void; style?: 'default' | 'cancel' | 'destructive' };

/**
 * Cross-platform alert that works on both native and web.
 * On web, falls back to window.alert/confirm since RN Alert.alert is a no-op.
 */
export function showAlert(
  title: string,
  message?: string,
  buttons?: AlertButton[]
) {
  if (Platform.OS !== 'web') {
    Alert.alert(title, message, buttons);
    return;
  }

  // Web fallback
  const fullMessage = message ? `${title}\n\n${message}` : title;

  if (!buttons || buttons.length <= 1) {
    window.alert(fullMessage);
    buttons?.[0]?.onPress?.();
    return;
  }

  // Multiple buttons: use confirm for the action button
  const actionBtn = buttons.find((b) => b.onPress);
  if (actionBtn) {
    const confirmed = window.confirm(fullMessage);
    if (confirmed) {
      actionBtn.onPress?.();
    }
  } else {
    window.alert(fullMessage);
  }
}
