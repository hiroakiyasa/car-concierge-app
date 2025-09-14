import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Image,
  ActivityIndicator,
  Alert,
  Platform,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import { Colors, Spacing, Typography } from '@/utils/constants';
import { supabase } from '@/config/supabase';
import { useAuthStore } from '@/stores/useAuthStore';

interface PhotoUploadModalProps {
  visible: boolean;
  onClose: () => void;
  onPhotoUploaded: () => void;
  spotId: string;
  spotType: 'parking' | 'hotspring' | 'gasstation';
}

export const PhotoUploadModal: React.FC<PhotoUploadModalProps> = ({
  visible,
  onClose,
  onPhotoUploaded,
  spotId,
  spotType,
}) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const { user } = useAuthStore();

  const pickImage = async (source: 'camera' | 'gallery') => {
    try {
      let result: ImagePicker.ImagePickerResult;

      if (source === 'camera') {
        // まずカメラが利用可能か確認
        const cameraAvailable = await ImagePicker.getCameraPermissionsAsync();

        // カメラ権限のリクエスト
        const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();

        console.log('Camera permission status:', cameraPermission.status);

        if (cameraPermission.status !== 'granted') {
          const title = Platform.OS === 'ios'
            ? 'カメラへのアクセスが必要です'
            : 'カメラの権限が必要です';
          const message = Platform.OS === 'ios'
            ? '「設定」→「車旅コンシェルジュ」→「カメラ」から許可してください。'
            : 'アプリ設定からカメラへのアクセスを許可してください。';

          Alert.alert(
            title,
            message,
            [
              { text: 'キャンセル', style: 'cancel' },
              {
                text: '設定を開く',
                onPress: () => {
                  if (Platform.OS === 'ios') {
                    Linking.openURL('app-settings:');
                  } else {
                    Linking.openSettings();
                  }
                }
              },
            ]
          );
          return;
        }

        // カメラを起動
        console.log('Launching camera...');
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          allowsEditing: false,
          quality: Platform.OS === 'ios' ? 0.9 : 0.85,
          exif: false,
        });

        console.log('Camera result:', result);

      } else {
        // ギャラリー権限のリクエスト
        const libraryPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();

        console.log('Library permission status:', libraryPermission.status);

        if (libraryPermission.status !== 'granted') {
          const title = Platform.OS === 'ios'
            ? '写真へのアクセスが必要です'
            : 'ストレージの権限が必要です';
          const message = Platform.OS === 'ios'
            ? '「設定」→「車旅コンシェルジュ」→「写真」から「選択した写真」または「すべての写真」を選択してください。'
            : 'アプリ設定からストレージへのアクセスを許可してください。';

          Alert.alert(
            title,
            message,
            [
              { text: 'キャンセル', style: 'cancel' },
              {
                text: '設定を開く',
                onPress: () => {
                  if (Platform.OS === 'ios') {
                    Linking.openURL('app-settings:');
                  } else {
                    Linking.openSettings();
                  }
                }
              },
            ]
          );
          return;
        }

        // ギャラリーを起動
        console.log('Launching image library...');
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: false,
          quality: Platform.OS === 'ios' ? 0.9 : 0.85,
          exif: false,
          allowsMultipleSelection: false,
        });

        console.log('Library result:', result);
      }

      // 画像が選択された場合
      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        console.log('Selected image:', asset.uri);
        console.log('Image dimensions:', asset.width, 'x', asset.height);

        // 画像を圧縮して設定
        await compressAndSetImage(asset.uri, asset.width || 1000, asset.height || 1000);
      } else {
        console.log('Image selection cancelled or no asset returned');
      }
    } catch (error) {
      console.error('Error picking image:', error);

      // シミュレータでカメラを使おうとした場合のエラー処理
      if (source === 'camera' && Platform.OS === 'ios') {
        Alert.alert(
          'カメラが利用できません',
          'シミュレータではカメラを使用できません。実機でお試しいただくか、ギャラリーから選択してください。',
          [
            { text: 'OK', style: 'default' },
            {
              text: 'ギャラリーを開く',
              onPress: () => pickImage('gallery')
            }
          ]
        );
      } else {
        Alert.alert('エラー', '画像の選択に失敗しました');
      }
    }
  };

  const compressAndSetImage = async (uri: string, originalWidth: number, originalHeight: number) => {
    try {
      console.log('Compressing image:', uri);
      console.log('Original dimensions:', originalWidth, 'x', originalHeight);

      // アスペクト比を保持しながら最大辺を2000pxに制限
      const maxDimension = 2000;
      const resizeOptions: ImageManipulator.ResizeAction[] = [];

      if (originalWidth > maxDimension || originalHeight > maxDimension) {
        if (originalWidth > originalHeight) {
          resizeOptions.push({ resize: { width: maxDimension } });
        } else {
          resizeOptions.push({ resize: { height: maxDimension } });
        }
      }

      // 画像を圧縮（品質75%でファイルサイズと画質のバランスを取る）
      const manipResult = await ImageManipulator.manipulateAsync(
        uri,
        resizeOptions,
        {
          compress: 0.75,
          format: ImageManipulator.SaveFormat.JPEG
        }
      );

      console.log('Compressed image:', manipResult.uri);
      setSelectedImage(manipResult.uri);
    } catch (error) {
      console.error('Error compressing image:', error);
      // 圧縮に失敗した場合は元の画像を使用
      setSelectedImage(uri);
    }
  };

  const uploadImage = async () => {
    if (!selectedImage) {
      Alert.alert('エラー', '画像が選択されていません');
      return;
    }

    if (!user) {
      Alert.alert('エラー', 'ログインが必要です');
      return;
    }

    setUploading(true);
    try {
      // ファイル名を生成
      const fileName = `${spotType}_${spotId}_${user.id}_${Date.now()}.jpg`;
      const filePath = `${spotType}/${spotId}/${fileName}`;

      // 画像をBase64に変換
      console.log('Reading image as base64:', selectedImage);
      const base64Image = await FileSystem.readAsStringAsync(selectedImage, {
        encoding: 'base64',
      });

      // Base64をデコードしてArrayBufferに変換
      const binaryString = atob(base64Image);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // サムネイル用の画像も作成（最大辺400px、アスペクト比保持）
      console.log('Creating thumbnail...');
      const thumbnailResult = await ImageManipulator.manipulateAsync(
        selectedImage,
        [{ resize: { width: 400 } }],
        {
          compress: 0.7,
          format: ImageManipulator.SaveFormat.JPEG
        }
      );

      // サムネイルもBase64で読み込み
      const thumbnailBase64 = await FileSystem.readAsStringAsync(thumbnailResult.uri, {
        encoding: 'base64',
      });

      // サムネイルもArrayBufferに変換
      const thumbnailBinaryString = atob(thumbnailBase64);
      const thumbnailBytes = new Uint8Array(thumbnailBinaryString.length);
      for (let i = 0; i < thumbnailBinaryString.length; i++) {
        thumbnailBytes[i] = thumbnailBinaryString.charCodeAt(i);
      }

      const thumbnailPath = `${spotType}/${spotId}/thumb_${fileName}`;

      // Supabase Storageにアップロード
      console.log('Uploading image to:', filePath);
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('spot-photos')
        .upload(filePath, bytes, {
          contentType: 'image/jpeg',
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      // サムネイルをアップロード
      console.log('Uploading thumbnail to:', thumbnailPath);
      const { error: thumbError } = await supabase.storage
        .from('spot-photos')
        .upload(thumbnailPath, thumbnailBytes, {
          contentType: 'image/jpeg',
          cacheControl: '3600',
          upsert: false
        });

      if (thumbError) {
        console.error('Thumbnail upload error:', thumbError);
      }

      // URLを取得
      const { data: urlData } = supabase.storage
        .from('spot-photos')
        .getPublicUrl(filePath);

      const { data: thumbUrlData } = supabase.storage
        .from('spot-photos')
        .getPublicUrl(thumbnailPath);

      // データベースに保存
      const columnName = spotType === 'parking' ? 'parking_spot_id' : `${spotType}_id`;

      // parking_spot_idはbigint型なので、数値に変換
      const idValue = spotType === 'parking' ? parseInt(spotId, 10) : spotId;

      console.log('Saving to database:', {
        table: `${spotType}_photos`,
        columnName,
        spotId: idValue,
        userId: user.id,
        url: urlData.publicUrl,
        thumbnail: thumbUrlData.publicUrl,
      });

      const { error: dbError } = await supabase
        .from(`${spotType}_photos`)
        .insert({
          [columnName]: idValue,
          user_id: user.id,
          url: urlData.publicUrl,
          thumbnail_url: thumbUrlData.publicUrl,
        });

      if (dbError) {
        console.error('Database error:', dbError);
        throw dbError;
      }

      console.log('Photo uploaded successfully:', {
        imageUrl: urlData.publicUrl,
        thumbnailUrl: thumbUrlData.publicUrl,
        spotId: idValue,
        spotType,
      });

      Alert.alert('成功', '写真を投稿しました');
      onPhotoUploaded();
      handleClose();
    } catch (error: any) {
      console.error('Error uploading image:', error);

      let errorMessage = '写真のアップロードに失敗しました';
      if (error?.message) {
        errorMessage += ': ' + error.message;
      }

      Alert.alert('エラー', errorMessage);
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    setSelectedImage(null);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>写真を投稿</Text>
            <TouchableOpacity onPress={handleClose}>
              <Ionicons name="close" size={24} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {!selectedImage ? (
            <View style={styles.content}>
              <Text style={styles.instructionText}>
                写真を選択してください
              </Text>

              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={styles.optionButton}
                  onPress={() => pickImage('camera')}
                >
                  <Ionicons name="camera" size={32} color={Colors.primary} />
                  <Text style={styles.optionText}>カメラで撮影</Text>
                  {Platform.OS === 'ios' && __DEV__ && (
                    <Text style={styles.simulatorNote}>
                      ※シミュレータでは利用不可
                    </Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.optionButton}
                  onPress={() => pickImage('gallery')}
                >
                  <Ionicons name="images" size={32} color={Colors.primary} />
                  <Text style={styles.optionText}>ギャラリーから選択</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.content}>
              <Image source={{ uri: selectedImage }} style={styles.preview} />

              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={styles.changeButton}
                  onPress={() => setSelectedImage(null)}
                >
                  <Text style={styles.changeButtonText}>写真を変更</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.uploadButton, uploading && styles.uploadButtonDisabled]}
                  onPress={uploadImage}
                  disabled={uploading}
                >
                  {uploading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="cloud-upload" size={20} color="#FFFFFF" />
                      <Text style={styles.uploadButtonText}>投稿する</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '90%',
    maxWidth: 400,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.medium,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  title: {
    fontSize: Typography.h6,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  content: {
    padding: Spacing.large,
  },
  instructionText: {
    fontSize: Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.large,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: Spacing.medium,
  },
  optionButton: {
    flex: 1,
    alignItems: 'center',
    padding: Spacing.large,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  optionText: {
    marginTop: Spacing.small,
    fontSize: Typography.bodySmall,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  simulatorNote: {
    marginTop: 4,
    fontSize: 10,
    color: Colors.textSecondary,
  },
  preview: {
    width: '100%',
    height: 250,
    borderRadius: 12,
    marginBottom: Spacing.medium,
    backgroundColor: '#F0F0F0',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: Spacing.small,
  },
  changeButton: {
    flex: 1,
    padding: Spacing.medium,
    backgroundColor: '#F0F0F0',
    borderRadius: 8,
    alignItems: 'center',
  },
  changeButtonText: {
    fontSize: Typography.body,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  uploadButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: Spacing.medium,
    backgroundColor: Colors.primary,
    borderRadius: 8,
  },
  uploadButtonDisabled: {
    opacity: 0.6,
  },
  uploadButtonText: {
    fontSize: Typography.body,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});