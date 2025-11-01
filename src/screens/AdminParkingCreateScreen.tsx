/**
 * 管理者専用駐車場作成画面
 * 管理者が駐車場を直接追加・編集できる統合インターフェース
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
import * as FileSystem from 'expo-file-system/legacy';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/utils/constants';
import { supabase } from '@/config/supabase';
import { useNavigation } from '@react-navigation/native';
import { CrossPlatformMap, Marker } from '@/components/Map/CrossPlatformMap';
import { decode } from 'base64-arraybuffer';
import { parkingSubmissionService } from '@/services/parking-submission.service';

// 管理者メールアドレス
const ADMIN_EMAILS = ['hiroakiyasa@yahoo.co.jp', 'hiroakiyasa@gmail.com'];

/**
 * ハーバーサイン公式で2地点間の距離を計算（メートル単位）
 */
const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371e3; // 地球の半径（メートル）
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // メートル単位で返す
};

interface ParkingData {
  name: string;
  latitude: number;
  longitude: number;
  rates: any[];
  capacity?: string;
  hours?: any;
  address?: string;
  phone?: string;
  [key: string]: any;
}

export const AdminParkingCreateScreen: React.FC = () => {
  const navigation = useNavigation();

  // 管理者認証状態
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  // 画像関連
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageStoragePath, setImageStoragePath] = useState<string | null>(null);

  // 位置情報関連
  const [location, setLocation] = useState<{
    latitude: number;
    longitude: number;
  }>({
    latitude: 35.6812, // 東京駅
    longitude: 139.7671,
  });
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);

  // 駐車場データ（JSON編集用）
  const [parkingData, setParkingData] = useState<ParkingData>({
    name: '',
    latitude: 35.6812,
    longitude: 139.7671,
    rates: [
      { type: 'base', minutes: 1440, price: 0 }, // 24時間無料
    ],
    capacity: '',
    hours: {
      is_24h: true,
      hours: '24時間営業',
      original_hours: '24時間営業',
    },
    address: '',
    phone: '',
  });

  // JSON編集エラー
  const [jsonEditError, setJsonEditError] = useState<string | null>(null);

  // OCR処理状態
  const [isProcessingOCR, setIsProcessingOCR] = useState(false);

  // 保存状態
  const [isSaving, setIsSaving] = useState(false);

  // 周辺施設検索状態
  const [isSearchingFacilities, setIsSearchingFacilities] = useState(false);

  // 権限状態
  const [cameraPermission, setCameraPermission] = useState(false);
  const [mediaLibraryPermission, setMediaLibraryPermission] = useState(false);
  const [locationPermission, setLocationPermission] = useState(false);

  // マップ準備完了フラグ
  const [isMapReady, setIsMapReady] = useState(false);

  // 地図のRef
  const mapRef = React.useRef<any>(null);

  useEffect(() => {
    checkAdminAuth();
    requestPermissions();

    // クリーンアップ: 画面を閉じるときにマップをリセット
    return () => {
      setIsMapReady(false);
    };
  }, []);

  // locationが変更されたら地図の中心を移動
  useEffect(() => {
    if (isMapReady && mapRef.current && Platform.OS !== 'web') {
      mapRef.current.animateToRegion(
        {
          latitude: location.latitude,
          longitude: location.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        },
        300 // アニメーション時間（ミリ秒）
      );
    }
  }, [location.latitude, location.longitude, isMapReady]);

  // 位置情報が変更されたらparkingDataにも反映
  useEffect(() => {
    setParkingData(prev => ({
      ...prev,
      latitude: location.latitude,
      longitude: location.longitude,
    }));
  }, [location]);

  /**
   * 管理者認証チェック
   */
  const checkAdminAuth = async () => {
    try {
      // セッションを取得（TestFlight対応）
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        console.log('❌ セッションエラー:', sessionError);
        setIsAdmin(false);
        setIsLoadingAuth(false);
        Alert.alert('認証エラー', 'ログインが必要です', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
        return;
      }

      const userEmail = session.user.email?.toLowerCase();
      const isAdminUser = ADMIN_EMAILS.some(email => email.toLowerCase() === userEmail);

      console.log('👤 ユーザーメール:', userEmail);
      console.log('🔐 管理者権限:', isAdminUser);

      setIsAdmin(isAdminUser);
      setIsLoadingAuth(false);

      if (!isAdminUser) {
        Alert.alert('アクセス拒否', 'この機能は管理者のみ利用可能です', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      }
    } catch (error) {
      console.error('認証チェックエラー:', error);
      setIsAdmin(false);
      setIsLoadingAuth(false);
    }
  };

  /**
   * 権限をリクエスト
   */
  const requestPermissions = async () => {
    const cameraStatus = await ImagePicker.requestCameraPermissionsAsync();
    setCameraPermission(cameraStatus.status === 'granted');

    const mediaLibraryStatus = await ImagePicker.requestMediaLibraryPermissionsAsync();
    setMediaLibraryPermission(mediaLibraryStatus.status === 'granted');

    const locationStatus = await Location.requestForegroundPermissionsAsync();
    setLocationPermission(locationStatus.status === 'granted');

    if (locationStatus.status === 'granted') {
      getCurrentLocation();
    }
  };

  /**
   * 現在地を取得
   */
  const getCurrentLocation = async () => {
    setIsLoadingLocation(true);
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const newLocation = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };

      setLocation(newLocation);
      setParkingData(prev => ({
        ...prev,
        latitude: newLocation.latitude,
        longitude: newLocation.longitude,
      }));

      setIsLoadingLocation(false);
    } catch (error) {
      console.error('位置情報取得エラー:', error);
      setIsLoadingLocation(false);
    }
  };

  /**
   * 画像を1MB以下に圧縮
   */
  const compressImageTo1MB = async (uri: string): Promise<string> => {
    try {
      const fileInfo = await FileSystem.getInfoAsync(uri);
      if (!fileInfo.exists || !fileInfo.size) {
        return uri;
      }

      const originalSizeMB = fileInfo.size / 1024 / 1024;

      if (originalSizeMB <= 1) {
        return uri;
      }

      const qualityLevels = [0.8, 0.7, 0.6, 0.5, 0.4, 0.3];

      for (const quality of qualityLevels) {
        const manipResult = await ImageManipulator.manipulateAsync(
          uri,
          [],
          {
            compress: quality,
            format: ImageManipulator.SaveFormat.JPEG,
          }
        );

        const compressedFileInfo = await FileSystem.getInfoAsync(manipResult.uri);
        if (compressedFileInfo.exists && compressedFileInfo.size) {
          const compressedSizeMB = compressedFileInfo.size / 1024 / 1024;

          if (compressedSizeMB <= 1) {
            return manipResult.uri;
          }
        }
      }

      return uri;
    } catch (error) {
      console.error('画像圧縮エラー:', error);
      return uri;
    }
  };

  /**
   * カメラで撮影
   */
  const takePhoto = async () => {
    if (!cameraPermission) {
      Alert.alert('権限エラー', 'カメラの使用を許可してください', [
        { text: 'キャンセル', style: 'cancel' },
        { text: '設定を開く', onPress: () => Linking.openURL('app-settings:') },
      ]);
      return;
    }

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: 'images',
        allowsEditing: false,
        quality: 0.8,
        exif: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const compressedUri = await compressImageTo1MB(result.assets[0].uri);
        setImageUri(compressedUri);
      }
    } catch (error) {
      console.error('カメラエラー:', error);
      Alert.alert('エラー', 'カメラの起動に失敗しました');
    }
  };

  /**
   * ギャラリーから選択
   */
  const pickImage = async () => {
    if (!mediaLibraryPermission) {
      Alert.alert('権限エラー', 'ギャラリーへのアクセスを許可してください', [
        { text: 'キャンセル', style: 'cancel' },
        { text: '設定を開く', onPress: () => Linking.openURL('app-settings:') },
      ]);
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: false,
        quality: 0.8,
        exif: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        const compressedUri = await compressImageTo1MB(asset.uri);
        setImageUri(compressedUri);

        // EXIF GPS情報を抽出
        if (asset.exif) {
          const latitude = asset.exif.GPSLatitude;
          const latitudeRef = asset.exif.GPSLatitudeRef;
          const longitude = asset.exif.GPSLongitude;
          const longitudeRef = asset.exif.GPSLongitudeRef;

          if (latitude && longitude) {
            // GPS座標をデジタル形式に変換
            const lat = convertGPSToDecimal(latitude, latitudeRef);
            const lng = convertGPSToDecimal(longitude, longitudeRef);

            if (lat && lng) {
              const newLocation = { latitude: lat, longitude: lng };
              setLocation(newLocation);
              setParkingData(prev => ({
                ...prev,
                latitude: lat,
                longitude: lng,
              }));

              Alert.alert('位置情報取得', '写真のGPS情報から位置を設定しました');
            }
          }
        }
      }
    } catch (error) {
      console.error('ギャラリーエラー:', error);
      Alert.alert('エラー', 'ギャラリーの起動に失敗しました');
    }
  };

  /**
   * GPS座標を10進数形式に変換
   */
  const convertGPSToDecimal = (
    gpsArray: number[],
    ref: string
  ): number | null => {
    if (!gpsArray || gpsArray.length !== 3) return null;

    const degrees = gpsArray[0];
    const minutes = gpsArray[1];
    const seconds = gpsArray[2];

    let decimal = degrees + minutes / 60 + seconds / 3600;

    if (ref === 'S' || ref === 'W') {
      decimal = -decimal;
    }

    return decimal;
  };

  /**
   * 地図タップで位置を設定
   */
  const handleMapPress = (event: any) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    const newLocation = { latitude, longitude };
    setLocation(newLocation);
    setParkingData(prev => ({
      ...prev,
      latitude,
      longitude,
    }));
  };

  /**
   * 周辺施設を検索してJSONデータに追加
   */
  const searchNearbyFacilities = async () => {
    setIsSearchingFacilities(true);

    try {
      const lat = location.latitude;
      const lng = location.longitude;

      console.log('🔍 周辺施設検索開始:', { lat, lng });

      // 1. 最寄りのコンビニを検索（半径5km以内）
      // 正規化ルール: {"id": "xxx", "distance_m": 123} (nameなし)
      const searchRadius = 5000; // 5km in meters

      const { data: convenienceStores, error: convError } = await supabase
        .from('convenience_stores')
        .select('id, name, lat, lng')
        .gte('lat', lat - 0.05) // 緯度±約5.5km
        .lte('lat', lat + 0.05)
        .gte('lng', lng - 0.05) // 経度±約5.5km
        .lte('lng', lng + 0.05)
        .limit(50);

      let nearestConvenienceName = '';

      if (convError) {
        console.error('コンビニ検索エラー:', convError);
      } else if (convenienceStores && convenienceStores.length > 0) {
        // 距離を計算して最も近いものを選択
        const storesWithDistance = convenienceStores.map(store => {
          const distance = calculateDistance(lat, lng, store.lat, store.lng);
          return { ...store, distance };
        }).filter(store => store.distance <= searchRadius)
          .sort((a, b) => a.distance - b.distance);

        if (storesWithDistance.length > 0) {
          const conv = storesWithDistance[0];
          // 正規化ルールに従った形式（nameなし、distance_m使用）
          const convenienceData = {
            id: conv.id,
            distance_m: Math.round(conv.distance),
          };
          nearestConvenienceName = conv.name;
          console.log('✅ 最寄りコンビニ:', convenienceData, '名前:', nearestConvenienceName);

          setParkingData(prev => ({
            ...prev,
            nearest_convenience_store: JSON.stringify(convenienceData),
          }));
        } else {
          console.log('⚠️ 半径5km以内にコンビニが見つかりません');
        }
      } else {
        console.log('⚠️ 半径5km以内にコンビニが見つかりません');
      }

      // 2. 最寄りの温泉を検索（半径10km以内）
      // 正規化ルール: {"id": "xxx", "name": "xxx", "distance": 123} (distance_mではなくdistance)
      const hotspringRadius = 10000; // 10km in meters

      const { data: hotSprings, error: hotError } = await supabase
        .from('hot_springs')
        .select('id, name, lat, lng')
        .gte('lat', lat - 0.1) // 緯度±約11km
        .lte('lat', lat + 0.1)
        .gte('lng', lng - 0.1) // 経度±約11km
        .lte('lng', lng + 0.1)
        .limit(50);

      let nearestHotspringName = '';

      if (hotError) {
        console.error('温泉検索エラー:', hotError);
      } else if (hotSprings && hotSprings.length > 0) {
        // 距離を計算して最も近いものを選択
        const springsWithDistance = hotSprings.map(spring => {
          const distance = calculateDistance(lat, lng, spring.lat, spring.lng);
          return { ...spring, distance };
        }).filter(spring => spring.distance <= hotspringRadius)
          .sort((a, b) => a.distance - b.distance);

        if (springsWithDistance.length > 0) {
          const hot = springsWithDistance[0];
          // 正規化ルールに従った形式（distance使用、distance_mではない）
          const hotspringData = {
            id: hot.id,
            name: hot.name,
            distance: Math.round(hot.distance),
          };
          nearestHotspringName = hot.name;
          console.log('✅ 最寄り温泉:', hotspringData);

          setParkingData(prev => ({
            ...prev,
            nearest_hotspring: JSON.stringify(hotspringData),
          }));
        } else {
          console.log('⚠️ 半径10km以内に温泉が見つかりません');
        }
      } else {
        console.log('⚠️ 半径10km以内に温泉が見つかりません');
      }

      // 3. 最寄りのトイレを検索（半径2km以内）
      // 正規化ルール: {"id": "xxx", "name": "xxx", "distance_m": 123} (jsonbオブジェクト)
      const toiletRadius = 2000; // 2km in meters

      const { data: toilets, error: toiletError } = await supabase
        .from('toilets')
        .select('id, name, lat, lng')
        .gte('lat', lat - 0.02) // 緯度±約2.2km
        .lte('lat', lat + 0.02)
        .gte('lng', lng - 0.02) // 経度±約2.2km
        .lte('lng', lng + 0.02)
        .limit(50);

      let nearestToiletName = '';

      if (toiletError) {
        console.error('トイレ検索エラー:', toiletError);
      } else if (toilets && toilets.length > 0) {
        // 距離を計算して最も近いものを選択
        const toiletsWithDistance = toilets.map(toilet => {
          const distance = calculateDistance(lat, lng, toilet.lat, toilet.lng);
          return { ...toilet, distance };
        }).filter(toilet => toilet.distance <= toiletRadius)
          .sort((a, b) => a.distance - b.distance);

        if (toiletsWithDistance.length > 0) {
          const toilet = toiletsWithDistance[0];
          // 正規化ルールに従った形式（jsonbオブジェクト、distance_m使用）
          const toiletData = {
            id: `toilet_${toilet.id}`,
            name: toilet.name,
            distance_m: Math.round(toilet.distance),
          };
          nearestToiletName = toilet.name;
          console.log('✅ 最寄りトイレ:', toiletData);

          setParkingData(prev => ({
            ...prev,
            nearest_toilet: toiletData, // jsonbオブジェクトとして保存
          }));
        } else {
          console.log('⚠️ 半径2km以内にトイレが見つかりません');
        }
      } else {
        console.log('⚠️ 半径2km以内にトイレが見つかりません');
      }

      // 4. 標高を計算（-0.6°C per 100m）
      const elevation = 0; // デフォルト値（実際のAPIがあれば使用）
      setParkingData(prev => ({
        ...prev,
        elevation,
      }));

      // 5. 結果を集計
      const facilitiesFound = [];

      if (nearestConvenienceName) {
        const conv = convenienceStores!.map(store => {
          const distance = calculateDistance(lat, lng, store.lat, store.lng);
          return { ...store, distance };
        }).filter(store => store.distance <= searchRadius)
          .sort((a, b) => a.distance - b.distance)[0];
        facilitiesFound.push(`コンビニ: ${nearestConvenienceName}（${Math.round(conv.distance)}m）`);
      }

      if (nearestHotspringName) {
        const hot = hotSprings!.map(spring => {
          const distance = calculateDistance(lat, lng, spring.lat, spring.lng);
          return { ...spring, distance };
        }).filter(spring => spring.distance <= hotspringRadius)
          .sort((a, b) => a.distance - b.distance)[0];
        facilitiesFound.push(`温泉: ${nearestHotspringName}（${Math.round(hot.distance)}m）`);
      }

      if (nearestToiletName) {
        const toilet = toilets!.map(t => {
          const distance = calculateDistance(lat, lng, t.lat, t.lng);
          return { ...t, distance };
        }).filter(t => t.distance <= toiletRadius)
          .sort((a, b) => a.distance - b.distance)[0];
        facilitiesFound.push(`トイレ: ${nearestToiletName}（${Math.round(toilet.distance)}m）`);
      }

      if (facilitiesFound.length > 0) {
        Alert.alert(
          '周辺施設を検索しました',
          facilitiesFound.join('\n'),
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          '周辺施設が見つかりません',
          '指定した範囲内に周辺施設がありませんでした',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('周辺施設検索エラー:', error);
      Alert.alert('エラー', '周辺施設の検索に失敗しました');
    } finally {
      setIsSearchingFacilities(false);
    }
  };

  /**
   * OCR処理を実行（画像がない場合は位置情報から正規化）
   */
  const executeOCR = async () => {
    setIsProcessingOCR(true);

    try {
      // 画像がない場合: 位置情報から周辺施設を検索して正規化データを作成
      if (!imageUri) {
        console.log('📍 画像なし: 位置情報から正規化データを作成');

        // 周辺施設を検索
        await searchNearbyFacilities();

        Alert.alert(
          '正規化完了',
          '位置情報から周辺施設データを取得しました。駐車場名と料金情報を入力してください。',
          [{ text: 'OK' }]
        );

        setIsProcessingOCR(false);
        return;
      }

      // 画像がある場合: OCR処理を実行
      console.log('📸 画像あり: OCR処理を実行');

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        throw new Error('認証エラー');
      }
      const user = session.user;

      const base64 = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const timestamp = Date.now();
      const fileName = `${timestamp}_admin_temp.jpg`;
      const filePath = `${user.id}/admin-temp/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('parking-submissions')
        .upload(filePath, decode(base64), {
          contentType: 'image/jpeg',
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // 2. 一時投稿レコードを作成
      const { data: submissionData, error: submissionError } = await supabase
        .from('parking_submissions')
        .insert({
          user_id: user.id,
          submission_type: 'new_parking',
          latitude: location.latitude,
          longitude: location.longitude,
          image_url: supabase.storage.from('parking-submissions').getPublicUrl(filePath).data.publicUrl,
          image_path: filePath,
          status: 'processing',
          user_notes: '管理者による直接OCR実行',
        })
        .select()
        .single();

      if (submissionError) throw submissionError;

      // 3. OCR処理をトリガー
      const result = await parkingSubmissionService.triggerImageProcessing(submissionData.id);

      if (!result.success) {
        throw new Error(result.error || 'OCR処理に失敗しました');
      }

      // 4. 処理完了を待つ（5秒間ポーリング）
      let attempts = 0;
      const maxAttempts = 10;

      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000));

        const { data: updatedSubmission } = await supabase
          .from('parking_submissions')
          .select('*')
          .eq('id', submissionData.id)
          .single();

        if (updatedSubmission?.extracted_data) {
          // OCR結果をparkingDataに反映（周辺施設情報を含む）
          const extracted = updatedSubmission.extracted_data;

          console.log('📊 OCR抽出データ:', JSON.stringify(extracted, null, 2));
          console.log('🏪 コンビニ:', extracted.nearest_convenience_store);
          console.log('♨️ 温泉:', extracted.nearest_hotspring || extracted.nearest_hot_spring);
          console.log('🚻 トイレ:', extracted.nearest_toilet);
          console.log('⛰️ 標高:', extracted.elevation);

          setParkingData(prev => ({
            ...prev,
            name: extracted.name || prev.name,
            rates: extracted.rates || prev.rates,
            capacity: extracted.capacity || prev.capacity,
            hours: extracted.hours || prev.hours,
            address: extracted.address || prev.address,
            phone: extracted.phone || prev.phone,
            // 周辺施設情報を追加
            nearest_convenience_store: extracted.nearest_convenience_store || prev.nearest_convenience_store,
            nearest_hotspring: extracted.nearest_hotspring || extracted.nearest_hot_spring || prev.nearest_hotspring,
            nearest_toilet: extracted.nearest_toilet || prev.nearest_toilet,
            elevation: extracted.elevation || prev.elevation,
          }));

          setImageStoragePath(filePath);

          // 一時投稿を削除
          await supabase
            .from('parking_submissions')
            .delete()
            .eq('id', submissionData.id);

          Alert.alert('OCR完了', 'データが抽出されました。必要に応じて編集してください。');
          break;
        }

        attempts++;
      }

      if (attempts >= maxAttempts) {
        Alert.alert('OCR処理中', 'OCR処理に時間がかかっています。しばらくお待ちください。');
      }

    } catch (error) {
      console.error('OCRエラー:', error);
      Alert.alert('エラー', 'OCR処理に失敗しました');
    } finally {
      setIsProcessingOCR(false);
    }
  };

  /**
   * 駐車場を保存
   */
  const saveParkingSpot = async () => {
    // バリデーション
    if (!parkingData.name || parkingData.name.trim() === '') {
      Alert.alert('入力エラー', '駐車場名を入力してください');
      return;
    }

    if (!parkingData.rates || parkingData.rates.length === 0) {
      Alert.alert('入力エラー', '料金情報を入力してください');
      return;
    }

    setIsSaving(true);

    try {
      // 1. 画像をspot-photosバケットにアップロード（画像が存在する場合）
      let finalImagePath = null;
      if (imageUri) {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) throw new Error('認証エラー');
        const user = session.user;

        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(2, 10);
        const fileName = `parking_${timestamp}_${randomStr}.jpg`; // 日本語を含まないファイル名
        const spotPhotoPath = `${user.id}/admin-created/${fileName}`;

        try {
          // 常にローカルの画像をBase64でアップロード（OCRの有無に関わらず）
          console.log('📤 画像アップロード開始:', spotPhotoPath);

          const base64 = await FileSystem.readAsStringAsync(imageUri, {
            encoding: FileSystem.EncodingType.Base64,
          });

          const { error: uploadError } = await supabase.storage
            .from('spot-photos')
            .upload(spotPhotoPath, decode(base64), {
              contentType: 'image/jpeg',
              cacheControl: '3600',
              upsert: false,
            });

          if (uploadError) {
            console.error('❌ 画像アップロードエラー:', uploadError);
            throw uploadError;
          }

          finalImagePath = spotPhotoPath;
          console.log('✅ 画像アップロード成功:', spotPhotoPath);

          // OCRを実行していた場合は、一時画像を削除
          if (imageStoragePath) {
            console.log('🗑️ 一時画像を削除:', imageStoragePath);
            await supabase.storage
              .from('parking-submissions')
              .remove([imageStoragePath]);
          }
        } catch (uploadErr) {
          console.error('❌ 画像アップロード失敗:', uploadErr);
          throw uploadErr;
        }
      }

      // 2. parking_spotsテーブルに挿入
      const insertData: any = {
        name: parkingData.name,
        lat: parkingData.latitude,  // データベースではlatカラム
        lng: parkingData.longitude, // データベースではlngカラム
        rates: parkingData.rates,
        capacity: parkingData.capacity || null,
        hours: parkingData.hours || { is_24h: true, hours: '24時間営業', original_hours: '24時間営業' },
        address: parkingData.address || null,
        phone_number: parkingData.phone || null, // データベースではphone_numberカラム
        is_user_submitted: false, // 管理者が追加したフラグ
      };

      // 画像パスが存在する場合は追加（imagesはjsonb配列型）
      if (finalImagePath) {
        const imageUrl = supabase.storage.from('spot-photos').getPublicUrl(finalImagePath).data.publicUrl;
        insertData.images = [imageUrl]; // 配列として保存
        console.log('✅ 画像URL保存 (駐車場詳細で表示可能):', imageUrl);
        console.log('📸 保存先バケット: spot-photos');
        console.log('🔗 詳細パネルでこの画像が閲覧できます');
      } else {
        insertData.images = []; // 画像がない場合は空配列
        console.log('📷 画像なし: 駐車場詳細には写真が表示されません');
      }

      // 周辺施設情報を追加（OCR結果に含まれる場合）
      if (parkingData.elevation !== undefined) {
        insertData.elevation = parkingData.elevation;
      }

      if (parkingData.nearest_toilet) {
        insertData.nearest_toilet = parkingData.nearest_toilet;
      }

      // nearest_convenience_storeはtext型なので文字列として保存
      if (parkingData.nearest_convenience_store) {
        insertData.nearest_convenience_store = typeof parkingData.nearest_convenience_store === 'string'
          ? parkingData.nearest_convenience_store
          : JSON.stringify(parkingData.nearest_convenience_store);
        console.log('✅ コンビニデータ保存:', insertData.nearest_convenience_store);
      }

      // nearest_hotspringはtext型なので文字列として保存
      if (parkingData.nearest_hotspring) {
        insertData.nearest_hotspring = typeof parkingData.nearest_hotspring === 'string'
          ? parkingData.nearest_hotspring
          : JSON.stringify(parkingData.nearest_hotspring);
        console.log('✅ 温泉データ保存:', insertData.nearest_hotspring);
      }

      const { data: insertedData, error: insertError } = await supabase
        .from('parking_spots')
        .insert(insertData)
        .select()
        .single();

      if (insertError) {
        console.error('挿入エラー:', insertError);
        throw new Error('駐車場の保存に失敗しました');
      }

      Alert.alert(
        '保存完了',
        `駐車場「${parkingData.name}」が正常に追加されました`,
        [
          {
            text: 'OK',
            onPress: () => {
              navigation.goBack();
            },
          },
        ]
      );

    } catch (error) {
      console.error('保存エラー:', error);
      Alert.alert('エラー', error instanceof Error ? error.message : '保存に失敗しました');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoadingAuth) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>認証確認中...</Text>
      </View>
    );
  }

  if (!isAdmin) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="lock-closed" size={64} color={Colors.error} />
        <Text style={styles.errorText}>管理者のみアクセス可能です</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* ヘッダー */}
        <View style={styles.header}>
          <Ionicons name="add-circle" size={24} color={Colors.primary} />
          <Text style={styles.headerText}>
            管理者専用: 駐車場を直接追加
          </Text>
        </View>

        {/* 画像セクション */}
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
              style={[styles.actionButton, styles.cameraButton]}
              onPress={takePhoto}
              disabled={!cameraPermission}
            >
              <Ionicons name="camera" size={20} color={Colors.white} />
              <Text style={styles.actionButtonText}>カメラで撮影</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.galleryButton]}
              onPress={pickImage}
              disabled={!mediaLibraryPermission}
            >
              <Ionicons name="images" size={20} color={Colors.white} />
              <Text style={styles.actionButtonText}>ギャラリーから選択</Text>
            </TouchableOpacity>
          </View>

          {/* OCR実行ボタン（画像がない場合は位置情報から正規化） */}
          <TouchableOpacity
            style={[
              styles.ocrButton,
              isProcessingOCR && styles.ocrButtonDisabled,
            ]}
            onPress={executeOCR}
            disabled={isProcessingOCR}
          >
            {isProcessingOCR ? (
              <>
                <ActivityIndicator color={Colors.white} />
                <Text style={styles.ocrButtonText}>
                  {imageUri ? 'OCR処理中...' : '正規化中...'}
                </Text>
              </>
            ) : (
              <>
                <Ionicons
                  name={imageUri ? "scan" : "location"}
                  size={20}
                  color={Colors.white}
                />
                <Text style={styles.ocrButtonText}>
                  {imageUri ? 'OCRで自動抽出' : '位置情報から正規化'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* JSON編集セクション */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>駐車場データ（JSON編集）</Text>

          <TextInput
            style={[
              styles.jsonInput,
              jsonEditError && { borderColor: Colors.error, borderWidth: 2 },
            ]}
            multiline
            value={JSON.stringify(parkingData, null, 2)}
            onChangeText={(text) => {
              try {
                const parsed = JSON.parse(text);
                setParkingData(parsed);
                setJsonEditError(null);

                // 位置情報も更新
                if (parsed.latitude && parsed.longitude) {
                  setLocation({
                    latitude: parsed.latitude,
                    longitude: parsed.longitude,
                  });
                }
              } catch (e) {
                setJsonEditError((e as Error).message);
              }
            }}
          />

          {jsonEditError && (
            <View style={styles.jsonError}>
              <Ionicons name="warning" size={16} color={Colors.error} />
              <Text style={styles.jsonErrorText}>{jsonEditError}</Text>
            </View>
          )}
        </View>

        {/* 位置情報セクション */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>位置情報</Text>
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
          </View>

          <View style={styles.locationInfo}>
            <Ionicons name="location" size={20} color={Colors.success} />
            <Text style={styles.locationText}>
              緯度: {location.latitude.toFixed(6)}, 経度: {location.longitude.toFixed(6)}
            </Text>
          </View>

          {Platform.OS !== 'web' && (
            <View style={styles.mapContainer}>
              <CrossPlatformMap
                ref={mapRef}
                initialRegion={{
                  latitude: location.latitude,
                  longitude: location.longitude,
                  latitudeDelta: 0.01,
                  longitudeDelta: 0.01,
                }}
                style={styles.map}
                onPress={handleMapPress}
                onMapReady={() => {
                  console.log('✅ AdminParkingCreate: Map is ready');
                  setIsMapReady(true);
                }}
                showsUserLocation={true}
                showsMyLocationButton={false}
              >
                {isMapReady && (
                  <Marker
                    key={`marker-${location.latitude}-${location.longitude}`}
                    coordinate={location}
                    draggable={true}
                    onDragEnd={handleMapPress}
                    title="駐車場の位置"
                    description="マーカーをドラッグして位置を調整"
                    pinColor="red"
                    tracksViewChanges={false}
                  />
                )}
              </CrossPlatformMap>
              <View style={styles.mapHint}>
                <Ionicons name="information-circle" size={16} color={Colors.info} />
                <Text style={styles.mapHintText}>
                  {isMapReady
                    ? '地図をタップまたはマーカーをドラッグして位置を調整'
                    : '地図を読み込んでいます...'
                  }
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* 周辺施設を追加ボタン */}
        <TouchableOpacity
          style={[
            styles.searchFacilitiesButton,
            isSearchingFacilities && styles.searchFacilitiesButtonDisabled,
          ]}
          onPress={searchNearbyFacilities}
          disabled={isSearchingFacilities}
        >
          {isSearchingFacilities ? (
            <ActivityIndicator color={Colors.primary} />
          ) : (
            <>
              <Ionicons name="business" size={20} color={Colors.primary} />
              <Text style={styles.searchFacilitiesButtonText}>周辺施設を追加</Text>
            </>
          )}
        </TouchableOpacity>

        {/* 保存ボタン */}
        <TouchableOpacity
          style={[
            styles.saveButton,
            isSaving && styles.saveButtonDisabled,
          ]}
          onPress={saveParkingSpot}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color={Colors.white} />
              <Text style={styles.saveButtonText}>データベースに保存</Text>
            </>
          )}
        </TouchableOpacity>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
    padding: 20,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.error,
    textAlign: 'center',
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
    fontWeight: '600',
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
    marginBottom: 12,
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
  ocrButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 8,
    backgroundColor: Colors.info,
    gap: 8,
  },
  ocrButtonDisabled: {
    backgroundColor: Colors.textSecondary,
    opacity: 0.5,
  },
  ocrButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.white,
  },
  jsonInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 12,
    fontFamily: 'Courier',
    color: Colors.text,
    backgroundColor: Colors.white,
    minHeight: 250,
    textAlignVertical: 'top',
  },
  jsonError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    padding: 8,
    backgroundColor: '#FFEBEE',
    borderRadius: 4,
  },
  jsonErrorText: {
    flex: 1,
    fontSize: 12,
    color: Colors.error,
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
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: Colors.backgroundLight,
    borderRadius: 8,
    gap: 8,
    marginBottom: 12,
  },
  locationText: {
    flex: 1,
    fontSize: 12,
    color: Colors.text,
  },
  mapContainer: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  map: {
    width: '100%',
    height: 350,
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
  searchFacilitiesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
    borderWidth: 2,
    borderColor: Colors.primary,
    padding: 14,
    borderRadius: 8,
    gap: 8,
    marginBottom: 12,
  },
  searchFacilitiesButtonDisabled: {
    borderColor: Colors.textSecondary,
    opacity: 0.5,
  },
  searchFacilitiesButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.primary,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.success,
    padding: 16,
    borderRadius: 8,
    gap: 8,
    marginBottom: 16,
  },
  saveButtonDisabled: {
    backgroundColor: Colors.textSecondary,
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.white,
  },
});
