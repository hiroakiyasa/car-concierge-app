import React, { useState, useEffect } from 'react';
import { TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/stores/useAuthStore';
import { FavoritesService } from '@/services/favorites.service';
import { Colors } from '@/utils/constants';

interface FavoriteButtonProps {
  spotId: string;
  spotType: string;
  size?: number;
  style?: any;
}

export const FavoriteButton: React.FC<FavoriteButtonProps> = ({
  spotId,
  spotType,
  size = 24,
  style,
}) => {
  const { user, isAuthenticated } = useAuthStore();
  const [isFavorite, setIsFavorite] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user && spotId) {
      checkFavoriteStatus();
    }
  }, [user, spotId]);

  const checkFavoriteStatus = async () => {
    if (!user) return;
    
    const status = await FavoritesService.isFavorite(user.id, spotId);
    setIsFavorite(status);
  };

  const handleToggleFavorite = async () => {
    if (!isAuthenticated) {
      Alert.alert(
        'ログインが必要です',
        'お気に入り機能を使用するにはログインしてください。',
        [
          { text: 'キャンセル', style: 'cancel' },
          { text: 'ログイン', onPress: () => {} }, // TODO: Navigate to login
        ]
      );
      return;
    }

    if (!user || isLoading) return;

    setIsLoading(true);
    
    try {
      if (isFavorite) {
        const { error } = await FavoritesService.removeFavorite(user.id, spotId);
        if (!error) {
          setIsFavorite(false);
        } else {
          Alert.alert('エラー', error);
        }
      } else {
        const { error } = await FavoritesService.addFavorite(user.id, spotId, spotType);
        if (!error) {
          setIsFavorite(true);
        } else {
          Alert.alert('エラー', error);
        }
      }
    } catch (error) {
      Alert.alert('エラー', 'お気に入りの更新に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <TouchableOpacity
      style={[styles.button, style]}
      onPress={handleToggleFavorite}
      activeOpacity={0.7}
      disabled={isLoading}
    >
      <Ionicons
        name={isFavorite ? 'heart' : 'heart-outline'}
        size={size}
        color={isFavorite ? Colors.error : '#666'}
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
});