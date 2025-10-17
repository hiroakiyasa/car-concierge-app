import * as Location from 'expo-location';
import { Location as LocationType } from '@/types';

export class LocationService {
  static async requestPermission(): Promise<'granted' | 'denied' | 'restricted'> {
    const { status } = await Location.requestForegroundPermissionsAsync();
    
    switch (status) {
      case Location.PermissionStatus.GRANTED:
        return 'granted';
      case Location.PermissionStatus.DENIED:
      case Location.PermissionStatus.UNDETERMINED:
        return 'denied';
      default:
        return 'restricted';
    }
  }

  static async geocode(query: string): Promise<{ latitude: number; longitude: number } | null> {
    try {
      const results = await Location.geocodeAsync(query);

      // デバッグログ：すべての結果を表示
      console.log(`🔍 ジオコーディング結果 (クエリ: ${query}):`, results.length, '件');
      results.forEach((r, i) => {
        console.log(`  [${i}] 緯度: ${r.latitude}, 経度: ${r.longitude}`);
      });

      if (!results || results.length === 0) {
        console.log('⚠️ ジオコーディング結果なし');
        return null;
      }

      // 日本の範囲
      const JAPAN_BOUNDS = {
        minLat: 20.0,
        maxLat: 46.5,
        minLng: 122.0,
        maxLng: 154.0,
      };

      // 日本国内の結果のみをフィルタリング
      const japanResults = results.filter(r =>
        r.latitude >= JAPAN_BOUNDS.minLat &&
        r.latitude <= JAPAN_BOUNDS.maxLat &&
        r.longitude >= JAPAN_BOUNDS.minLng &&
        r.longitude <= JAPAN_BOUNDS.maxLng
      );

      console.log(`📍 日本国内の結果: ${japanResults.length}件`);

      // 日本国内の結果があればそれを使用、なければ全結果から選択
      const filteredResults = japanResults.length > 0 ? japanResults : results;

      // 最初の有効な結果を使用
      const first = filteredResults[0];
      if (first && typeof first.latitude === 'number' && typeof first.longitude === 'number') {
        console.log(`✅ 選択された座標: 緯度 ${first.latitude}, 経度 ${first.longitude}`);
        return { latitude: first.latitude, longitude: first.longitude };
      }

      console.log('⚠️ 有効なジオコーディング結果なし');
      return null;
    } catch (e) {
      console.log('❌ ジオコーディングエラー:', e);
      return null;
    }
  }
  
  static async getCurrentLocation(): Promise<LocationType | null> {
    try {
      console.log('📍 位置情報の取得を開始...');

      const permission = await this.requestPermission();
      console.log('📍 位置情報の権限:', permission);

      if (permission !== 'granted') {
        console.warn('⚠️ 位置情報の権限が許可されていません');
        return null; // 権限がない場合はnullを返す
      }

      console.log('📍 GPS位置を取得中...');
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High, // より高精度に変更
        maximumAge: 10000, // 10秒以内のキャッシュを使用
        timeout: 15000, // 15秒でタイムアウト
      });

      console.log('✅ GPS位置を取得成功:', {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
      });

      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy ?? undefined,
        timestamp: location.timestamp,
      };
    } catch (error) {
      console.log('⚠️ 位置情報の取得に失敗しました（エラーは無視されます）');
      return null; // エラー時はnullを返す
    }
  }
  
  static async watchLocation(
    callback: (location: LocationType) => void,
    options?: Location.LocationTaskOptions
  ) {
    const subscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 5000,
        distanceInterval: 10,
        ...options,
      },
      (location) => {
        callback({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          accuracy: location.coords.accuracy ?? undefined,
          timestamp: location.timestamp,
        });
      }
    );
    
    return subscription;
  }
  
  static calculateDistance(
    from: LocationType,
    to: { lat: number; lng: number }
  ): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (from.latitude * Math.PI) / 180;
    const φ2 = (to.lat * Math.PI) / 180;
    const Δφ = ((to.lat - from.latitude) * Math.PI) / 180;
    const Δλ = ((to.lng - from.longitude) * Math.PI) / 180;
    
    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    
    return R * c; // Distance in meters
  }
  
  static formatDistance(meters: number): string {
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    }
    return `${(meters / 1000).toFixed(1)}km`;
  }
}
