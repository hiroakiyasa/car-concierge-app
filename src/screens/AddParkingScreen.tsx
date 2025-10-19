/**
 * 駐車場追加画面
 * ユーザーが駐車場の看板を撮影して投稿
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  TextInput,
  Alert,
  ScrollView,
  ActivityIndicator,
  Platform,
  Linking,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/utils/constants';
import { parkingSubmissionService } from '@/services/parking-submission.service';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { CrossPlatformMap, Marker } from '@/components/Map/CrossPlatformMap';

type AddParkingRouteParams = {
  mode?: 'new' | 'update';
  parkingSpotId?: number | string;
  parkingSpot?: {
    id: number | string;
    name?: string;
    latitude: number;
    longitude: number;
  };
};

export const AddParkingScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<{ params: AddParkingRouteParams }, 'params'>>();
  const { mode, parkingSpotId, parkingSpot } = route.params || {};

  const [imageUri, setImageUri] = useState<string | null>(null);
  // デフォルト位置: 東京駅
  const [location, setLocation] = useState<{
    latitude: number;
    longitude: number;
  }>({
    latitude: 35.6812,
    longitude: 139.7671,
  });
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);
  const [submissionType, setSubmissionType] = useState<'new_parking' | 'update_rates'>('new_parking');
  const [userNotes, setUserNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [locationPermission, setLocationPermission] = useState(false);
  const [cameraPermission, setCameraPermission] = useState(false);
  const [mediaLibraryPermission, setMediaLibraryPermission] = useState(false);
  const [isSelectingLocation, setIsSelectingLocation] = useState(false);
  const [photoHasLocation, setPhotoHasLocation] = useState(false); // 写真にGPS情報があるかどうか

  useEffect(() => {
    requestPermissions();
  }, []);

  // 更新モードの場合、既存駐車場の位置情報を設定
  useEffect(() => {
    if (mode === 'update' && parkingSpot) {
      console.log('📍 更新モード: 既存駐車場の位置を設定', parkingSpot);
      setLocation({
        latitude: parkingSpot.latitude,
        longitude: parkingSpot.longitude,
      });
      setSubmissionType('update_rates');
      setIsLoadingLocation(false);
    }
  }, [mode, parkingSpot]);

  const requestPermissions = async () => {
    console.log('🔐 権限をリクエスト中...');

    // カメラ権限
    const cameraStatus = await ImagePicker.requestCameraPermissionsAsync();
    console.log('📷 カメラ権限:', cameraStatus.status);
    setCameraPermission(cameraStatus.status === 'granted');

    // メディアライブラリ権限
    const mediaLibraryStatus = await ImagePicker.requestMediaLibraryPermissionsAsync();
    console.log('🖼️  メディアライブラリ権限:', mediaLibraryStatus.status);
    setMediaLibraryPermission(mediaLibraryStatus.status === 'granted');

    // 位置情報権限
    const locationStatus = await Location.requestForegroundPermissionsAsync();
    console.log('📍 位置情報権限:', locationStatus.status);
    setLocationPermission(locationStatus.status === 'granted');

    if (locationStatus.status === 'granted') {
      getCurrentLocation();
    }
  };

  const getCurrentLocation = async () => {
    setIsLoadingLocation(true);
    try {
      console.log('📍 現在地を取得中...');
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      console.log('📍 現在地取得成功:', location.coords);
      setLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
      setIsLoadingLocation(false);
    } catch (error) {
      console.error('位置情報取得エラー:', error);
      setIsLoadingLocation(false);
      Alert.alert(
        '位置情報エラー',
        '現在地の取得に失敗しました。デフォルト位置（東京駅）を使用しています。地図上で位置を調整してください。'
      );
    }
  };

  /**
   * 写真のEXIF位置情報を取得
   */
  const extractLocationFromPhoto = (exif: any): { latitude: number; longitude: number } | null => {
    try {
      // EXIFデータから位置情報を取得
      if (exif && exif.GPSLatitude && exif.GPSLongitude) {
        const latitude = exif.GPSLatitude;
        const longitude = exif.GPSLongitude;

        console.log('📸 写真からGPS情報を取得:', { latitude, longitude });

        // 有効な座標かチェック
        if (typeof latitude === 'number' && typeof longitude === 'number' &&
            !isNaN(latitude) && !isNaN(longitude) &&
            latitude >= -90 && latitude <= 90 &&
            longitude >= -180 && longitude <= 180) {
          return { latitude, longitude };
        }
      }

      // iOS形式のEXIFデータ (exif.GPS)
      if (exif && exif.GPS) {
        const gps = exif.GPS;
        let latitude: number | null = null;
        let longitude: number | null = null;

        // 緯度の変換
        if (gps.Latitude !== undefined) {
          latitude = gps.Latitude;
          if (gps.LatitudeRef === 'S') {
            latitude = -latitude;
          }
        }

        // 経度の変換
        if (gps.Longitude !== undefined) {
          longitude = gps.Longitude;
          if (gps.LongitudeRef === 'W') {
            longitude = -longitude;
          }
        }

        if (latitude !== null && longitude !== null &&
            !isNaN(latitude) && !isNaN(longitude) &&
            latitude >= -90 && latitude <= 90 &&
            longitude >= -180 && longitude <= 180) {
          console.log('📸 写真からGPS情報を取得 (iOS形式):', { latitude, longitude });
          return { latitude, longitude };
        }
      }

      console.log('📸 写真にGPS情報が含まれていません');
      return null;
    } catch (error) {
      console.error('📸 GPS情報の抽出エラー:', error);
      return null;
    }
  };

  /**
   * 画像を品質を維持しながら1MB以下に圧縮
   */
  const compressImageTo1MB = async (uri: string): Promise<string> => {
    try {
      console.log('🗜️  画像圧縮を開始...');

      // ファイルサイズを確認
      const fileInfo = await FileSystem.getInfoAsync(uri);
      if (!fileInfo.exists || !fileInfo.size) {
        console.log('⚠️ ファイル情報が取得できません');
        return uri;
      }

      const originalSizeKB = fileInfo.size / 1024;
      const originalSizeMB = originalSizeKB / 1024;
      console.log(`📊 元の画像サイズ: ${originalSizeMB.toFixed(2)} MB (${originalSizeKB.toFixed(0)} KB)`);

      // 1MB以下の場合はそのまま返す
      const TARGET_SIZE_MB = 1;
      if (originalSizeMB <= TARGET_SIZE_MB) {
        console.log('✅ 画像サイズが1MB以下のためそのまま使用');
        return uri;
      }

      console.log(`🗜️  画像を${TARGET_SIZE_MB}MB以下に圧縮中...`);

      // 段階的に圧縮品質を下げて試行
      const qualityLevels = [0.8, 0.7, 0.6, 0.5, 0.4, 0.3];

      for (const quality of qualityLevels) {
        console.log(`🔄 品質 ${quality} で圧縮を試行中...`);

        const manipResult = await ImageManipulator.manipulateAsync(
          uri,
          [], // リサイズなし（アスペクト比を維持）
          {
            compress: quality,
            format: ImageManipulator.SaveFormat.JPEG,
          }
        );

        // 圧縮後のサイズを確認
        const compressedFileInfo = await FileSystem.getInfoAsync(manipResult.uri);
        if (compressedFileInfo.exists && compressedFileInfo.size) {
          const compressedSizeMB = compressedFileInfo.size / 1024 / 1024;
          console.log(`📊 圧縮後のサイズ: ${compressedSizeMB.toFixed(2)} MB (品質: ${quality})`);

          if (compressedSizeMB <= TARGET_SIZE_MB) {
            console.log(`✅ 圧縮成功: ${originalSizeMB.toFixed(2)} MB → ${compressedSizeMB.toFixed(2)} MB`);
            return manipResult.uri;
          }
        }
      }

      // すべての品質レベルで1MBを超える場合、リサイズを試行
      console.log('🔄 品質調整だけでは1MB以下にならないため、リサイズを試行...');

      const resizeLevels = [
        { width: 2048, quality: 0.8 },
        { width: 1920, quality: 0.7 },
        { width: 1600, quality: 0.6 },
        { width: 1280, quality: 0.5 },
        { width: 1024, quality: 0.4 },
      ];

      for (const { width, quality } of resizeLevels) {
        console.log(`🔄 幅 ${width}px, 品質 ${quality} でリサイズ＋圧縮を試行中...`);

        const manipResult = await ImageManipulator.manipulateAsync(
          uri,
          [{ resize: { width } }], // 幅を指定（高さは自動計算）
          {
            compress: quality,
            format: ImageManipulator.SaveFormat.JPEG,
          }
        );

        const resizedFileInfo = await FileSystem.getInfoAsync(manipResult.uri);
        if (resizedFileInfo.exists && resizedFileInfo.size) {
          const resizedSizeMB = resizedFileInfo.size / 1024 / 1024;
          console.log(`📊 リサイズ後のサイズ: ${resizedSizeMB.toFixed(2)} MB`);

          if (resizedSizeMB <= TARGET_SIZE_MB) {
            console.log(`✅ リサイズ＋圧縮成功: ${originalSizeMB.toFixed(2)} MB → ${resizedSizeMB.toFixed(2)} MB`);
            return manipResult.uri;
          }
        }
      }

      // 最終的に1MB以下にならない場合は、最小サイズで妥協
      console.log('⚠️ 最終手段: 最小サイズ（1024px）で圧縮');
      const finalResult = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 1024 } }],
        {
          compress: 0.3,
          format: ImageManipulator.SaveFormat.JPEG,
        }
      );

      const finalFileInfo = await FileSystem.getInfoAsync(finalResult.uri);
      if (finalFileInfo.exists && finalFileInfo.size) {
        const finalSizeMB = finalFileInfo.size / 1024 / 1024;
        console.log(`📊 最終サイズ: ${finalSizeMB.toFixed(2)} MB`);
      }

      return finalResult.uri;

    } catch (error) {
      console.error('🗜️  画像圧縮エラー:', error);
      // エラーの場合は元の画像を返す
      return uri;
    }
  };

  const takePhoto = async () => {
    console.log('📷 カメラ撮影を開始...');
    console.log('📷 カメラ権限状態:', cameraPermission);

    if (!cameraPermission) {
      Alert.alert(
        '権限エラー',
        'カメラの使用を許可してください。設定アプリから権限を有効にしてください。',
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
            },
          },
        ]
      );
      return;
    }

    try {
      console.log('📷 ImagePicker.launchCameraAsync を呼び出し中...');
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: 'images',
        allowsEditing: false,
        quality: 0.8,
        exif: true, // EXIF情報を取得
      });

      console.log('📷 カメラ結果:', result);

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        console.log('📷 画像が選択されました:', asset.uri);
        console.log('📷 EXIF情報:', asset.exif);

        // 画像を1MB以下に圧縮
        const compressedUri = await compressImageTo1MB(asset.uri);
        setImageUri(compressedUri);

        // 写真のEXIF位置情報を優先的に使用
        const photoLocation = extractLocationFromPhoto(asset.exif);
        if (photoLocation) {
          console.log('✅ 写真のGPS情報を地図に反映:', photoLocation);
          setLocation(photoLocation);
          setPhotoHasLocation(true);
          Alert.alert(
            '位置情報を検出',
            '写真に含まれるGPS情報を使用しました。必要に応じて地図上で位置を調整してください。',
            [{ text: 'OK' }]
          );
        } else {
          // EXIF位置情報がない場合は現在地を使用
          if (locationPermission) {
            setPhotoHasLocation(false);
            getCurrentLocation();
          }
        }
      } else {
        console.log('📷 カメラがキャンセルされました');
      }
    } catch (error) {
      console.error('📷 カメラエラー:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      Alert.alert('エラー', `カメラの起動に失敗しました: ${errorMessage}`);
    }
  };

  const pickImage = async () => {
    console.log('🖼️  ギャラリー選択を開始...');
    console.log('🖼️  メディアライブラリ権限状態:', mediaLibraryPermission);

    if (!mediaLibraryPermission) {
      Alert.alert(
        '権限エラー',
        'ギャラリーへのアクセスを許可してください。設定アプリから権限を有効にしてください。',
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
            },
          },
        ]
      );
      return;
    }

    try {
      console.log('🖼️  ImagePicker.launchImageLibraryAsync を呼び出し中...');
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: false,
        quality: 0.8,
        exif: true, // EXIF情報を取得
      });

      console.log('🖼️  ギャラリー結果:', result);

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        console.log('🖼️  画像が選択されました:', asset.uri);
        console.log('🖼️  EXIF情報:', asset.exif);

        // 画像を1MB以下に圧縮
        const compressedUri = await compressImageTo1MB(asset.uri);
        setImageUri(compressedUri);

        // 写真のEXIF位置情報を優先的に使用
        const photoLocation = extractLocationFromPhoto(asset.exif);
        if (photoLocation) {
          console.log('✅ 写真のGPS情報を地図に反映:', photoLocation);
          setLocation(photoLocation);
          setPhotoHasLocation(true);
          Alert.alert(
            '位置情報を検出',
            '写真に含まれるGPS情報を使用しました。必要に応じて地図上で位置を調整してください。',
            [{ text: 'OK' }]
          );
        } else {
          // EXIF位置情報がない場合は現在地を使用
          console.log('📸 写真にGPS情報なし - 現在の位置を維持します');
          setPhotoHasLocation(false);
        }
      } else {
        console.log('🖼️  ギャラリーがキャンセルされました');
      }
    } catch (error) {
      console.error('🖼️  ギャラリーエラー:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      Alert.alert('エラー', `ギャラリーの起動に失敗しました: ${errorMessage}`);
    }
  };

  const handleMapPress = (event: any) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    setLocation({ latitude, longitude });
  };

  const handleSubmit = async () => {
    // バリデーション
    if (!imageUri) {
      Alert.alert('エラー', '駐車場の看板を撮影してください');
      return;
    }

    setIsLoading(true);

    try {
      const result = await parkingSubmissionService.submitParking({
        type: submissionType,
        latitude: location.latitude,
        longitude: location.longitude,
        imageUri,
        userNotes: userNotes.trim() || undefined,
        // 更新モードの場合は駐車場IDを含める
        ...(mode === 'update' && parkingSpotId ? { parkingSpotId: Number(parkingSpotId) } : {}),
      });

      if (result.success) {
        Alert.alert(
          '投稿完了',
          '駐車場情報の投稿が完了しました。\n運営チームが確認後、データベースに反映されます。',
          [
            {
              text: 'OK',
              onPress: () => {
                navigation.goBack();
              },
            },
          ]
        );
      } else {
        const errorMessage = result.error || '投稿に失敗しました';

        // Storage バケットエラーの場合は詳細な案内を表示
        if (errorMessage.includes('parking-submissions') || errorMessage.includes('Bucket not found')) {
          Alert.alert(
            'Storageバケット未作成',
            'Supabase Storageに「parking-submissions」バケットを作成する必要があります。\n\nセットアップガイド（SETUP_STORAGE_BUCKET.md）を参照して、バケットを作成してください。',
            [{ text: '了解' }]
          );
        } else {
          Alert.alert('エラー', errorMessage);
        }
      }
    } catch (error) {
      console.error('投稿エラー:', error);
      Alert.alert('エラー', '予期しないエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* ヘッダー */}
        <View style={styles.header}>
          <Ionicons
            name={mode === 'update' ? 'create' : 'information-circle'}
            size={24}
            color={Colors.primary}
          />
          <Text style={styles.headerText}>
            {mode === 'update'
              ? `${parkingSpot?.name || '駐車場'}の料金を更新しましょう`
              : '駐車場の看板を撮影して、情報をデータベースに追加しましょう'
            }
          </Text>
        </View>

        {/* 投稿タイプ選択 - 更新モードでは非表示 */}
        {mode !== 'update' && (
          <View style={styles.typeSelector}>
            <TouchableOpacity
              style={[
                styles.typeButton,
                submissionType === 'new_parking' && styles.typeButtonActive,
              ]}
              onPress={() => setSubmissionType('new_parking')}
            >
              <Ionicons
                name="add-circle"
                size={20}
                color={submissionType === 'new_parking' ? Colors.white : Colors.textSecondary}
              />
              <Text
                style={[
                  styles.typeButtonText,
                  submissionType === 'new_parking' && styles.typeButtonTextActive,
                ]}
              >
                新しい駐車場
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.typeButton,
                submissionType === 'update_rates' && styles.typeButtonActive,
              ]}
              onPress={() => setSubmissionType('update_rates')}
            >
              <Ionicons
                name="create"
                size={20}
                color={submissionType === 'update_rates' ? Colors.white : Colors.textSecondary}
              />
              <Text
                style={[
                  styles.typeButtonText,
                  submissionType === 'update_rates' && styles.typeButtonTextActive,
                ]}
              >
                料金更新
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 画像撮影/選択 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>駐車場の看板を撮影</Text>

          {imageUri ? (
            <View style={styles.imageContainer}>
              <Image source={{ uri: imageUri }} style={styles.image} />
              <TouchableOpacity
                style={styles.removeImageButton}
                onPress={() => setImageUri(null)}
              >
                <Ionicons name="close-circle" size={32} color={Colors.error} />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons name="camera" size={48} color={Colors.textSecondary} />
              <Text style={styles.placeholderText}>
                料金や駐車場名が明確に写るように撮影してください
              </Text>
            </View>
          )}

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.cameraButton,
                !cameraPermission && styles.actionButtonDisabled,
              ]}
              onPress={takePhoto}
              disabled={!cameraPermission}
            >
              <Ionicons name="camera" size={20} color={Colors.white} />
              <Text style={styles.actionButtonText}>
                {cameraPermission ? 'カメラで撮影' : 'カメラ権限なし'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.galleryButton,
                !mediaLibraryPermission && styles.actionButtonDisabled,
              ]}
              onPress={pickImage}
              disabled={!mediaLibraryPermission}
            >
              <Ionicons name="images" size={20} color={Colors.white} />
              <Text style={styles.actionButtonText}>
                {mediaLibraryPermission ? 'ギャラリーから選択' : 'ギャラリー権限なし'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* 権限警告 */}
          {(!cameraPermission || !mediaLibraryPermission) && (
            <View style={styles.permissionWarningBox}>
              <Ionicons name="warning" size={20} color={Colors.warning} />
              <Text style={styles.permissionWarningText}>
                画像を選択するには、カメラとギャラリーの権限を許可してください。
                設定アプリから権限を有効にできます。
              </Text>
            </View>
          )}
        </View>

        {/* 位置情報 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>位置情報</Text>
            {mode !== 'update' && (
              <TouchableOpacity
                style={styles.useCurrentLocationButton}
                onPress={getCurrentLocation}
                disabled={isLoadingLocation}
              >
                {isLoadingLocation ? (
                  <ActivityIndicator size="small" color={Colors.primary} />
                ) : (
                  <>
                    <Ionicons name="navigate" size={16} color={Colors.primary} />
                    <Text style={styles.useCurrentLocationText}>現在地を使用</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.locationInfo}>
            <Ionicons
              name="location"
              size={20}
              color={isLoadingLocation ? Colors.textSecondary : Colors.success}
            />
            <Text style={styles.locationText}>
              {isLoadingLocation
                ? '現在地を取得中...'
                : location && location.latitude !== undefined && location.longitude !== undefined
                  ? `緯度: ${location.latitude.toFixed(6)}, 経度: ${location.longitude.toFixed(6)}`
                  : '位置情報を取得できませんでした'
              }
            </Text>
          </View>

          {/* 地図 - ネイティブ版のみ、Web版はGoogle Mapsリンク */}
          {Platform.OS === 'web' ? (
            <View style={styles.webMapContainer}>
              <View style={styles.webMapPlaceholder}>
                <Ionicons name="map" size={48} color={Colors.primary} />
                <Text style={styles.webMapText}>
                  📍 位置情報：緯度 {location.latitude.toFixed(6)}, 経度 {location.longitude.toFixed(6)}
                </Text>
                <TouchableOpacity
                  style={styles.webMapButton}
                  onPress={() => {
                    const url = `https://www.google.com/maps?q=${location.latitude},${location.longitude}`;
                    if (Platform.OS === 'web') {
                      window.open(url, '_blank');
                    } else {
                      Linking.openURL(url);
                    }
                  }}
                >
                  <Ionicons name="open-outline" size={16} color={Colors.white} />
                  <Text style={styles.webMapButtonText}>Google Mapsで開く</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.webMapHint}>
                💡 ネイティブアプリ（iOS/Android）では、地図上で直接位置を調整できます
              </Text>
            </View>
          ) : (
            <View style={styles.mapContainer}>
              {isLoadingLocation ? (
                <View style={styles.mapLoadingContainer}>
                  <ActivityIndicator size="large" color={Colors.primary} />
                  <Text style={styles.mapLoadingText}>地図を読み込んでいます...</Text>
                </View>
              ) : (
                <>
                  <CrossPlatformMap
                    initialRegion={{
                      latitude: location.latitude,
                      longitude: location.longitude,
                      latitudeDelta: 0.01,
                      longitudeDelta: 0.01,
                    }}
                    style={styles.map}
                    onPress={mode === 'update' ? undefined : handleMapPress}
                    onMapReady={() => console.log('✅ Map ready in AddParkingScreen')}
                    showsUserLocation={mode !== 'update'}
                    showsMyLocationButton={false}
                    showsCompass={true}
                    showsScale={true}
                  >
                    <Marker
                      coordinate={{
                        latitude: location.latitude,
                        longitude: location.longitude,
                      }}
                      draggable={mode !== 'update'}
                      onDragEnd={mode === 'update' ? undefined : handleMapPress}
                      title={mode === 'update' ? parkingSpot?.name || '更新対象の駐車場' : '駐車場の位置'}
                      description={mode === 'update' ? 'この駐車場の料金を更新します' : 'マーカーをドラッグして位置を調整できます'}
                      pinColor={mode === 'update' ? Colors.primary : 'red'}
                    />
                  </CrossPlatformMap>
                  <View style={styles.mapHint}>
                    <Ionicons name="information-circle" size={16} color={Colors.info} />
                    <Text style={styles.mapHintText}>
                      {mode === 'update'
                        ? `${parkingSpot?.name || '更新対象の駐車場'}の位置（固定）`
                        : photoHasLocation
                          ? '📸 写真のGPS情報を使用しています - 地図をタップして調整可能'
                          : '地図をタップまたはマーカーをドラッグして位置を調整'
                      }
                    </Text>
                  </View>
                </>
              )}
            </View>
          )}

          {!locationPermission && (
            <Text style={styles.permissionWarning}>
              ⚠️ 位置情報の使用を許可してください。許可しない場合はデフォルト位置が使用されます。
            </Text>
          )}
        </View>

        {/* メモ（任意） */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>メモ（任意）</Text>
          <TextInput
            style={styles.notesInput}
            multiline
            numberOfLines={4}
            placeholder="駐車場の特徴や補足情報があれば入力してください"
            value={userNotes}
            onChangeText={setUserNotes}
            maxLength={500}
          />
          <Text style={styles.characterCount}>{userNotes.length}/500</Text>
        </View>

        {/* 投稿ボタン */}
        <TouchableOpacity
          style={[
            styles.submitButton,
            (!imageUri || isLoading) && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={!imageUri || isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <>
              <Ionicons name="send" size={20} color={Colors.white} />
              <Text style={styles.submitButtonText}>投稿する</Text>
            </>
          )}
        </TouchableOpacity>

        {/* 注意事項 */}
        <View style={styles.notice}>
          <Text style={styles.noticeTitle}>📌 ご注意</Text>
          <Text style={styles.noticeText}>
            • 投稿された情報は運営チームが確認後、データベースに反映されます{'\n'}
            • 看板が明確に撮影されていない場合、承認されない可能性があります{'\n'}
            • 個人情報や車のナンバープレートが写らないようご注意ください{'\n'}
            • 虚偽の情報を投稿することは禁止されています
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryLight,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  headerText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: Colors.primary,
    lineHeight: 20,
  },
  typeSelector: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 12,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
    gap: 6,
  },
  typeButtonActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  typeButtonTextActive: {
    color: Colors.white,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  useCurrentLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: Colors.primaryLight,
  },
  useCurrentLocationText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
  },
  mapContainer: {
    marginTop: 12,
    borderRadius: 8,
    overflow: 'hidden',
  },
  map: {
    width: '100%',
    height: 350,
  },
  mapLoadingContainer: {
    width: '100%',
    height: 350,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.backgroundLight,
  },
  mapLoadingText: {
    marginTop: 12,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  mapHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 8,
    backgroundColor: Colors.backgroundLight,
  },
  mapHintText: {
    fontSize: 11,
    color: Colors.textSecondary,
    flex: 1,
  },
  // Web版用のスタイル
  webMapContainer: {
    marginTop: 12,
  },
  webMapPlaceholder: {
    padding: 24,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: Colors.primary,
    borderStyle: 'dashed',
    backgroundColor: Colors.backgroundLight,
    alignItems: 'center',
    gap: 12,
  },
  webMapText: {
    fontSize: 14,
    color: Colors.text,
    textAlign: 'center',
  },
  webMapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: Colors.primary,
    borderRadius: 8,
  },
  webMapButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.white,
  },
  webMapHint: {
    marginTop: 8,
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  imageContainer: {
    position: 'relative',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 12,
  },
  image: {
    width: '100%',
    height: 300,
    resizeMode: 'contain',
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: Colors.white,
    borderRadius: 16,
  },
  imagePlaceholder: {
    height: 200,
    borderRadius: 8,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.backgroundLight,
    marginBottom: 12,
    padding: 20,
  },
  placeholderText: {
    marginTop: 12,
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 6,
  },
  cameraButton: {
    backgroundColor: Colors.primary,
  },
  galleryButton: {
    backgroundColor: Colors.secondary,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.white,
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  permissionWarningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 12,
    padding: 12,
    backgroundColor: Colors.warningLight || '#FFF3CD',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: Colors.warning,
  },
  permissionWarningText: {
    flex: 1,
    fontSize: 12,
    color: Colors.text,
    lineHeight: 18,
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: Colors.backgroundLight,
    borderRadius: 8,
    gap: 8,
  },
  locationText: {
    flex: 1,
    fontSize: 12,
    color: Colors.text,
  },
  permissionWarning: {
    marginTop: 8,
    fontSize: 12,
    color: Colors.error,
  },
  notesInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: Colors.text,
    backgroundColor: Colors.white,
    textAlignVertical: 'top',
  },
  characterCount: {
    marginTop: 4,
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'right',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.success,
    padding: 16,
    borderRadius: 8,
    gap: 8,
    marginBottom: 16,
  },
  submitButtonDisabled: {
    backgroundColor: Colors.textSecondary,
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.white,
  },
  notice: {
    backgroundColor: Colors.backgroundLight,
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: Colors.warning,
  },
  noticeTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  noticeText: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
});
