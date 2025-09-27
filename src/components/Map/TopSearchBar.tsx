import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Platform, FlatList } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMainStore } from '@/stores/useMainStore';
import { Colors } from '@/utils/constants';

interface TopSearchBarProps {
  onMenuPress: () => void;
  onSearchPress?: () => void;
  onSearch?: (query: string) => void;
  placeholder?: string;
  dismissSignal?: number;
}

export const TopSearchBar: React.FC<TopSearchBarProps> = ({
  onMenuPress,
  onSearchPress,
  onSearch,
  placeholder = 'ここで検索',
  dismissSignal,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const { searchResults } = useMainStore();

  const HISTORY_KEY = 'search_history_v1';

  const handleSearch = () => {
    if (searchQuery.trim() && onSearch) {
      const q = searchQuery.trim();
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

  const buildSuggestions = (q: string) => {
    const query = q.trim().toLowerCase();
    if (!query) {
      setSuggestions([]);
      return;
    }
    // 既存の検索結果から名前一致候補を生成
    const pool = (searchResults || [])
      .map(s => s.name)
      .filter(Boolean) as string[];
    const uniq = Array.from(new Set(pool));
    const matched = uniq
      .filter(name => name.toLowerCase().includes(query))
      .slice(0, 8);
    // 末尾に「地名で検索: q」を付与
    const withPlaceHint = matched.includes(`地名で検索: ${q}`)
      ? matched
      : [...matched, `地名で検索: ${q}`];
    setSuggestions(withPlaceHint);
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
            onChangeText={(t) => {
              setSearchQuery(t);
              if (t.trim().length === 0) {
                setSuggestions([]);
              } else {
                buildSuggestions(t);
              }
            }}
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
            <FlatList
              keyboardShouldPersistTaps="handled"
              data={suggestions}
              keyExtractor={(item, idx) => `${item}-${idx}`}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.suggestionRow}
                  onPress={() => {
                    const value = item.startsWith('地名で検索: ')
                      ? item.replace('地名で検索: ', '')
                      : item;
                    setSearchQuery(value);
                    onSearch?.(value);
                    saveToHistory(value);
                    setIsSearching(false);
                  }}
                >
                  <Ionicons name="search" size={18} color="#6B7280" />
                  <Text style={styles.suggestionText}>{item}</Text>
                </TouchableOpacity>
              )}
            />
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
    paddingHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  suggestionsContainer: {
    position: 'absolute',
    top: 56,
    left: 0,
    right: 0,
    backgroundColor: Colors.white,
    borderRadius: 16,
    marginTop: 4,
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    maxHeight: 260,
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
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  suggestionText: {
    fontSize: 14,
    color: '#111827',
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
