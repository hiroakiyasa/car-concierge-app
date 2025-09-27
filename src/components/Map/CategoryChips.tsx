import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Colors } from '@/utils/constants';
import { useMainStore } from '@/stores/useMainStore';
import { CATEGORIES, CATEGORY_EMOJIS } from '@/types';

const ORDERED_CATEGORIES = [
  CATEGORIES.PARKING,
  CATEGORIES.CONVENIENCE,
  CATEGORIES.HOT_SPRING,
  CATEGORIES.FESTIVAL,
  CATEGORIES.GAS_STATION,
];

export const CategoryChips: React.FC = () => {
  const { searchFilter, toggleCategory } = useMainStore();

  return (
    <View style={styles.wrapper} pointerEvents="box-none">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {ORDERED_CATEGORIES.map((category) => {
          const selected = searchFilter.selectedCategories.has(category);
          return (
            <TouchableOpacity
              key={category}
              style={[styles.chip, selected && styles.chipSelected]}
              activeOpacity={0.8}
              onPress={() => toggleCategory(category)}
            >
              <Text style={styles.emoji}>{CATEGORY_EMOJIS[category]}</Text>
              <Text style={[styles.label, selected && styles.labelSelected]}>
                {category.replace('・花火大会', '')}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    top: 62,
    left: 8,
    right: 8,
    zIndex: 1900,
  },
  row: {
    paddingVertical: 4,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    paddingHorizontal: 16,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
  },
  chipSelected: {
    backgroundColor: '#F0F7FF',
    borderColor: '#BFDBFE',
  },
  emoji: {
    fontSize: 20,
    marginRight: 10,
  },
  label: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '600',
  },
  labelSelected: {
    color: Colors.primary,
  },
});
