import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { MaterialIcons, FontAwesome5, Ionicons } from '@expo/vector-icons';
import { Colors } from '@/utils/constants';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface TopCategoryTabsProps {
  selectedCategories: Set<string>;
  onCategoryToggle: (category: string) => void;
}

const categories = [
  { id: 'コインパーキング', label: '駐車場', icon: 'local-parking', iconFamily: 'MaterialIcons' },
  { id: 'コンビニ', label: 'コンビニ', icon: 'store', iconFamily: 'MaterialIcons' },
  { id: 'トイレ', label: 'トイレ', icon: 'wc', iconFamily: 'MaterialIcons' },
  { id: '温泉', label: '温泉', icon: 'hot-tub', iconFamily: 'FontAwesome5' },
  { id: 'お祭り・花火大会', label: 'お祭り', icon: 'sparkles', iconFamily: 'Ionicons' },
  { id: 'ガソリンスタンド', label: 'ガソリン', icon: 'local-gas-station', iconFamily: 'MaterialIcons' },
];

export const TopCategoryTabs: React.FC<TopCategoryTabsProps> = ({
  selectedCategories,
  onCategoryToggle,
}) => {
  const insets = useSafeAreaInsets();
  const renderIcon = (category: any) => {
    const size = 16;
    const isActive = selectedCategories.has(category.id);
    const color = isActive ? Colors.white : '#5F6368';

    if (category.iconFamily === 'MaterialIcons') {
      return <MaterialIcons name={category.icon as any} size={size} color={color} />;
    } else if (category.iconFamily === 'FontAwesome5') {
      return <FontAwesome5 name={category.icon as any} size={size} color={color} />;
    } else {
      return <Ionicons name={category.icon as any} size={size} color={color} />;
    }
  };

  return (
    <View style={[
      styles.container,
      { top: (Platform.OS === 'ios' ? 64 : 58) + insets.top },
    ]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {categories.map((category) => (
          <TouchableOpacity
            key={category.id}
            style={[
              styles.categoryButton,
              selectedCategories.has(category.id) && styles.categoryButtonActive,
              selectedCategories.has(category.id) && styles.categoryButtonActiveShadow,
            ]}
            onPress={() => onCategoryToggle(category.id)}
            activeOpacity={0.7}
          >
            {renderIcon(category)}
            <Text style={[
              styles.categoryLabel,
              selectedCategories.has(category.id) && styles.categoryLabelActive
            ]}>
              {category.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 64 : 58, // ほぼ余白なしで検索バー直下
    left: 0,
    right: 0,
    zIndex: 1999,
  },
  scrollContent: {
    paddingHorizontal: 12,
    gap: 6,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    gap: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  categoryButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  categoryButtonActiveShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 6,
  },
  categoryLabel: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '600',
  },
  categoryLabelActive: {
    color: Colors.white,
  },
});
