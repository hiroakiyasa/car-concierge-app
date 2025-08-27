import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/utils/constants';

interface SimpleMapControlsProps {
  onLocationPress: () => void;
}

export const SimpleMapControls: React.FC<SimpleMapControlsProps> = ({
  onLocationPress,
}) => {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.locationButton}
        onPress={onLocationPress}
        activeOpacity={0.7}
      >
        <Ionicons name="location" size={24} color={Colors.primary} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 120, // パネルの最小高さより少し上
    right: 20,
  },
  locationButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
});