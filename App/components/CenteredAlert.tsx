import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  visible: boolean;
  message: string;
  type: 'error' | 'success';
  onClose: () => void;
  actionLabel?: string;
  onAction?: () => void;
};

export function CenteredAlert({ visible, message, type, onClose, actionLabel, onAction }: Props) {
  const isError = type === 'error';
  const bg = isError ? '#FEE2E2' : '#D1FAE5';
  const textColor = isError ? '#B91C1C' : '#047857';
  const borderColor = isError ? '#FECACA' : '#A7F3D0';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={[styles.box, { backgroundColor: bg, borderColor }]} onPress={(e) => e.stopPropagation()}>
          <Text style={[styles.message, { color: textColor }]}>{message}</Text>
          <View style={styles.actions}>
            {actionLabel && onAction && (
              <Pressable onPress={onAction} style={[styles.button, isError && styles.buttonError]}>
                <Text style={[styles.buttonText, isError && styles.buttonTextError]}>{actionLabel}</Text>
              </Pressable>
            )}
            <Pressable onPress={onClose} style={styles.dismiss}>
              <Text style={[styles.dismissText, { color: textColor }]}>Close</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  box: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 12,
    borderWidth: 1,
    padding: 20,
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#8B0000',
  },
  buttonError: {
    backgroundColor: '#B91C1C',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonTextError: {
    color: '#FFFFFF',
  },
  dismiss: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  dismissText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
