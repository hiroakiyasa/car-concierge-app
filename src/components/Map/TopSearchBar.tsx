import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Platform, FlatList, ActivityIndicator } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMainStore } from '@/stores/useMainStore';
import { Colors } from '@/utils/constants';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PlacesSearchService, PlaceSearchResult } from '@/services/places-search.service';

interface TopSearchBarProps {
  onMenuPress: () => void;
  onSearchPress?: () => void;
  onSearch?: (query: string) => void;
  onPlaceSelect?: (place: PlaceSearchResult) => void;
  placeholder?: string;
  dismissSignal?: number;
}

export const TopSearchBar: React.FC<TopSearchBarProps> = ({
  onMenuPress,
  onSearchPress,
  onSearch,
  onPlaceSelect,
  placeholder = 'ここで検索',
  dismissSignal,
}) => {
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [placeSuggestions, setPlaceSuggestions] = useState<PlaceSearchResult[]>([]);
  const [isLoadingPlaces, setIsLoadingPlaces] = useState(false);
  const { searchResults } = useMainStore();

  const HISTORY_KEY = 'search_history_v1';

  const handleSearch = () => {
    const q = searchQuery.trim();
    if (!q) return;

    // 予測検索結果がある場合は、一番上の候補を選択
    if (placeSuggestions.length > 0) {
      const firstSuggestion = placeSuggestions[0];
      setSearchQuery(firstSuggestion.displayName);
      onPlaceSelect?.(firstSuggestion);
      saveToHistory(firstSuggestion.displayName);
      setIsSearching(false);
      return;
    }

    // 予測検索結果がない場合は通常の検索
    if (onSearch) {
      onSearch(q);
      saveToHistory(q);
      setIsSearching(false);
    }
  };

  // 外部からの非表示要求
  React.useEffect(() => {
    if (dismissSignal !== undefined) {
      setIsSearching(false);
    }
  }, [dismissSignal]);

  const loadHistory = async () => {
    try {
      const raw = await AsyncStorage.getItem(HISTORY_KEY);
      const list = raw ? (JSON.parse(raw) as string[]) : [];
      setHistory(Array.isArray(list) ? list : []);
    } catch {}
  };

  const saveToHistory = async (q: string) => {
    try {
      const next = [q, ...history.filter(h => h !== q)].slice(0, 10);
      setHistory(next);
      await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(next));
    } catch {}
  };

  const clearHistory = async () => {
    try {
      await AsyncStorage.removeItem(HISTORY_KEY);
    } finally {
      setHistory([]);
    }
  };

  // 場所の予測検索
  useEffect(() => {
    const searchTimer = setTimeout(async () => {
      if (searchQuery.trim().length > 0) {
        setIsLoadingPlaces(true);
        try {
          const results = await PlacesSearchService.searchPlaces(searchQuery);
          setPlaceSuggestions(results);
        } catch (error) {
          console.error('Place search error:', error);
          setPlaceSuggestions([]);
        } finally {
          setIsLoadingPlaces(false);
        }
      } else {
        setPlaceSuggestions([]);
      }
    }, 300); // 300msのデバウンス

    return () => clearTimeout(searchTimer);
  }, [searchQuery]);
  return (
    <View
      style={[
        styles.wrapper,
        { top: (Platform.OS === 'ios' ? 6 : 4) + insets.top },
      ]}
      pointerEvents="box-none"
    >
      <View style={styles.container}>
        {/* Google Maps pin icon */}
        <TouchableOpacity style={styles.leadingIcon}>
          <MaterialIcons name="location-pin" size={24} color="#4285F4" />
        </TouchableOpacity>

        {/* Search Input */}
        {isSearching ? (
          <>
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
            {/* Clear button */}
            {searchQuery.length > 0 && (
              <TouchableOpacity
                style={styles.clearButton}
                onPress={() => {
                  setSearchQuery('');
                  setPlaceSuggestions([]);
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="close-circle" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </>
        ) : (
          <TouchableOpacity
            style={styles.searchTextArea}
            onPress={() => {
              setIsSearching(true);
              onSearchPress?.();
              loadHistory();
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.placeholder}>{placeholder}</Text>
          </TouchableOpacity>
        )}

        {/* Action icons */}
        <View style={styles.actionsRow}>
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
      {/* Suggestions / History dropdown */}
      {isSearching && (
        <View style={styles.suggestionsContainer}>
          {searchQuery.trim().length === 0 ? (
            <>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionHeader}>検索履歴</Text>
                {history.length > 0 && (
                  <TouchableOpacity onPress={clearHistory}>
                    <Text style={styles.clearButton}>履歴をクリア</Text>
                  </TouchableOpacity>
                )}
              </View>
              {history.length === 0 ? (
                <Text style={styles.emptyText}>履歴はありません</Text>
              ) : (
                <FlatList
                  keyboardShouldPersistTaps="handled"
                  data={history}
                  keyExtractor={(item) => item}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.suggestionRow}
                      onPress={() => {
                        setSearchQuery(item);
                        onSearch?.(item);
                        saveToHistory(item);
                        setIsSearching(false);
                      }}
                    >
                      <Ionicons name="time-outline" size={18} color="#6B7280" />
                      <Text style={styles.suggestionText}>{item}</Text>
                    </TouchableOpacity>
                  )}
                />
              )}
            </>
          ) : (
            <>
              {isLoadingPlaces && (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#3B82F6" />
                  <Text style={styles.loadingText}>場所を検索中...</Text>
                </View>
              )}
              {!isLoadingPlaces && placeSuggestions.length > 0 && (
                <FlatList
                  keyboardShouldPersistTaps="handled"
                  data={placeSuggestions}
                  keyExtractor={(item) => `${item.name}-${item.type}`}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.suggestionRow}
                      onPress={() => {
                        setSearchQuery(item.displayName);
                        onPlaceSelect?.(item);
                        saveToHistory(item.displayName);
                        setIsSearching(false);
                      }}
                    >
                      <MaterialIcons
                        name={PlacesSearchService.getIconForPlaceType(item.type) as any}
                        size={18}
                        color="#6B7280"
                      />
                      <View style={styles.suggestionTextContainer}>
                        <Text style={styles.suggestionText}>{item.displayName}</Text>
                        <View style={styles.suggestionDetailsRow}>
                          {item.description && (
                            <Text style={styles.suggestionDescription}>{item.description}</Text>
                          )}
                          {item.address && (
                            <Text style={styles.suggestionAddress} numberOfLines={1}>
                              {item.address}
                            </Text>
                          )}
                        </View>
                      </View>
                    </TouchableOpacity>
                  )}
                />
              )}
              {!isLoadingPlaces && placeSuggestions.length === 0 && searchQuery.trim().length > 0 && (
                <View style={styles.noResultsContainer}>
                  <Text style={styles.noResultsText}>該当する場所が見つかりません</Text>
                </View>
              )}
            </>
          )}
        </View>
      )}
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
    paddingHorizontal: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  suggestionsContainer: {
    position: 'absolute',
    top: 56,
    left: 0,
    right: 0,
    backgroundColor: Colors.white,
    borderRadius: 14,
    marginTop: 4,
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
    maxHeight: 260,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  leadingIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
    borderRadius: 20,
    backgroundColor: '#EEF2FF',
  },
  searchTextArea: {
    flex: 1,
    height: 40,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  sectionHeaderRow: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionHeader: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
  clearButton: {
    fontSize: 12,
    color: '#3B82F6',
    fontWeight: '600',
  },
  emptyText: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    color: '#9CA3AF',
  },
  suggestionRow: {
    paddingHorizontal: 12,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  suggestionTextContainer: {
    flex: 1,
  },
  suggestionText: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
  },
  suggestionDescription: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  suggestionDetailsRow: {
    flexDirection: 'column',
    marginTop: 2,
  },
  suggestionAddress: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 8,
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
  },
  noResultsContainer: {
    padding: 16,
    alignItems: 'center',
  },
  noResultsText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    paddingHorizontal: 8,
  },
  clearButton: {
    paddingHorizontal: 8,
    justifyContent: 'center',
  },
  placeholder: {
    fontSize: 16,
    color: '#6B7280',
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
    backgroundColor: '#111827',
  },
});
