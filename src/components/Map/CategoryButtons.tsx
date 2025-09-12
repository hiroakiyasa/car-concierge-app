import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { CATEGORIES, CATEGORY_EMOJIS, CATEGORY_COLORS } from '@/types';
import { Colors, Spacing } from '@/utils/constants';
import { useMainStore } from '@/stores/useMainStore';

export const CategoryButtons: React.FC = () => {
  const { searchFilter, toggleCategory } = useMainStore();
  const categories = Object.values(CATEGORIES);
  
  return (
    <View style={styles.container}>
      {categories.map((category, index) => {
        const isSelected = searchFilter.selectedCategories.has(category);
        const backgroundColor = isSelected
          ? CATEGORY_COLORS[category]
          : Colors.white;
        
        return (
          <TouchableOpacity
            key={category}
            style={[
              styles.button,
              { backgroundColor, marginTop: index > 0 ? 12 : 0 },
              isSelected && styles.selectedButton,
            ]}
            onPress={() => toggleCategory(category)}
            activeOpacity={0.7}
          >
            <Text style={styles.emoji}>
              {CATEGORY_EMOJIS[category]}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 8,
    top: 100,
  },
  button: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  selectedButton: {
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },
  emoji: {
    fontSize: 24,
  },
});