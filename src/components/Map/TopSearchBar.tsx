import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Platform } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { Colors } from '@/utils/constants';

interface TopSearchBarProps {
  onMenuPress: () => void;
  onSearchPress?: () => void;
  onSearch?: (query: string) => void;
  placeholder?: string;
}

export const TopSearchBar: React.FC<TopSearchBarProps> = ({
  onMenuPress,
  onSearchPress,
  onSearch,
  placeholder = 'ここで検索',
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = () => {
    if (searchQuery.trim() && onSearch) {
      onSearch(searchQuery.trim());
    }
  };
  return (
    <View style={styles.wrapper} pointerEvents="box-none">
      <View style={styles.container}>
        {/* Google Maps pin icon */}
        <TouchableOpacity style={styles.leadingIcon}>
          <MaterialIcons name="location-pin" size={24} color="#4285F4" />
        </TouchableOpacity>

        {/* Search Input */}
        {isSearching ? (
          <TextInput
            style={styles.searchInput}
            placeholder={placeholder}
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            onBlur={() => setIsSearching(false)}
            autoFocus
            returnKeyType="search"
          />
        ) : (
          <TouchableOpacity
            style={styles.searchTextArea}
            onPress={() => {
              setIsSearching(true);
              onSearchPress?.();
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.placeholder}>{placeholder}</Text>
          </TouchableOpacity>
        )}

        {/* Action icons */}
        <View style={styles.actionsRow}>
          {/* Microphone icon */}
          <TouchableOpacity style={styles.iconButton} activeOpacity={0.7}>
            <Ionicons name="mic" size={20} color="#5F6368" />
          </TouchableOpacity>

          {/* Menu button (replaces profile initial) */}
          <TouchableOpacity
            style={styles.menuButton}
            activeOpacity={0.8}
            onPress={onMenuPress}
          >
            <Ionicons name="menu" size={20} color={Colors.white} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 6 : 4, // ほとんど余白なし
    left: 8,
    right: 8,
    zIndex: 2000,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    height: 52,
    borderRadius: 26,
    paddingHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  leadingIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  searchTextArea: {
    flex: 1,
    height: 40,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    paddingHorizontal: 8,
  },
  placeholder: {
    fontSize: 16,
    color: '#9CA3AF',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 2,
  },
  menuButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    backgroundColor: '#6B7280',
  },
});
