import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  FlatList,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/stores/useAuthStore';
import { Colors, Spacing, Typography } from '@/utils/constants';
import { supabase } from '@/config/supabase';
import { PhotoUploadModal } from './PhotoUploadModal';
import { PhotoViewer } from './PhotoViewer';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PHOTO_MARGIN = 4;
const PHOTO_SIZE = (SCREEN_WIDTH - 48 - PHOTO_MARGIN * 4) / 3;

interface PhotoListProps {
  spotId: string;
  spotType: 'parking' | 'hotspring' | 'gasstation';
}

interface Photo {
  id: string;
  url: string;
  thumbnail_url: string;
  user_id: string;
  user_name?: string;
  created_at: string;
}

export const PhotoList: React.FC<PhotoListProps> = ({ spotId, spotType }) => {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [selectedPhotoUrl, setSelectedPhotoUrl] = useState<string>('');
  const [viewerVisible, setViewerVisible] = useState(false);
  const { isAuthenticated, user } = useAuthStore();

  useEffect(() => {
    fetchPhotos();
  }, [spotId]);

  const fetchPhotos = async () => {
    setLoading(true);
    try {
      const columnName = spotType === 'parking' ? 'parking_spot_id' : `${spotType}_id`;
      
      const { data, error } = await supabase
        .from(`${spotType}_photos`)
        .select(`
          id,
          url,
          thumbnail_url,
          user_id,
          created_at,
          user_profiles (
            display_name
          )
        `)
        .eq(columnName, spotId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedPhotos = data?.map(photo => ({
        ...photo,
        user_name: photo.user_profiles?.display_name || '匿名ユーザー',
      })) || [];

      setPhotos(formattedPhotos);
    } catch (error) {
      console.error('Error fetching photos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = () => {
    if (!isAuthenticated) {
      alert('写真を投稿するにはログインが必要です');
      return;
    }
    setUploadModalVisible(true);
  };

  const handlePhotoPress = (photo: Photo) => {
    setSelectedPhotoUrl(photo.url);
    setViewerVisible(true);
  };

  const onPhotoUploaded = () => {
    setUploadModalVisible(false);
    fetchPhotos();
  };

  const renderPhoto = ({ item, index }: { item: Photo; index: number }) => {
    const isLastInRow = (index + 1) % 3 === 0;
    return (
      <TouchableOpacity
        style={[
          styles.photoItem,
          { marginRight: isLastInRow ? 0 : PHOTO_MARGIN }
        ]}
        onPress={() => handlePhotoPress(item)}
        activeOpacity={0.8}
      >
        <Image
          source={{ uri: item.thumbnail_url || item.url }}
          style={styles.photo}
          resizeMode="cover"
        />
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="camera-outline" size={48} color={Colors.textSecondary} />
      <Text style={styles.emptyText}>まだ写真が投稿されていません</Text>
      <Text style={styles.emptySubText}>最初の写真を投稿してみましょう</Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={Colors.primary} />
        <Text style={styles.loadingText}>写真を読み込み中...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header with Upload Button */}
      <View style={styles.header}>
        <Text style={styles.title}>写真 ({photos.length}枚)</Text>
        {isAuthenticated && (
          <TouchableOpacity style={styles.uploadButton} onPress={handlePhotoUpload}>
            <Ionicons name="camera" size={20} color={Colors.primary} />
            <Text style={styles.uploadButtonText}>写真を追加</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Photo Grid */}
      <FlatList
        data={photos}
        renderItem={renderPhoto}
        keyExtractor={(item) => item.id}
        numColumns={3}
        columnWrapperStyle={styles.row}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={photos.length === 0 ? styles.emptyContent : undefined}
      />

      {/* Upload Modal */}
      {uploadModalVisible && (
        <PhotoUploadModal
          visible={uploadModalVisible}
          onClose={() => setUploadModalVisible(false)}
          onPhotoUploaded={onPhotoUploaded}
          spotId={spotId}
          spotType={spotType}
        />
      )}

      {/* Photo Viewer Modal */}
      <PhotoViewer
        visible={viewerVisible}
        onClose={() => setViewerVisible(false)}
        imageUrl={selectedPhotoUrl}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: Spacing.medium,
  },
  title: {
    fontSize: Typography.h6,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary + '10',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  uploadButtonText: {
    fontSize: Typography.bodySmall,
    color: Colors.primary,
    fontWeight: '600',
  },
  row: {
    marginBottom: PHOTO_MARGIN,
  },
  photoItem: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#F0F0F0',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.small,
  },
  loadingText: {
    fontSize: Typography.bodySmall,
    color: Colors.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.small,
  },
  emptyContent: {
    flex: 1,
  },
  emptyText: {
    fontSize: Typography.body,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  emptySubText: {
    fontSize: Typography.bodySmall,
    color: Colors.textSecondary,
  },
});