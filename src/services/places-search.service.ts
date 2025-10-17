import { LocationService } from './location.service';
import { SupabaseService } from './supabase.service';
import { supabase } from '@/config/supabase';
import { searchPredefinedLocations } from '@/utils/predefined-locations';

export interface PlaceSearchResult {
  name: string;
  displayName: string;
  type: 'parking' | 'convenience' | 'hotspring' | 'gasstation' | 'festival' | 'toilet' | 'geocoded' | 'generic';
  latitude: number;
  longitude: number;
  description?: string;
  address?: string;
}

export class PlacesSearchService {
  /**
   * データベースと地図APIから場所を検索
   */
  static async searchPlaces(query: string): Promise<PlaceSearchResult[]> {
    if (!query || query.trim().length === 0) {
      return [];
    }

    const normalizedQuery = query.toLowerCase().trim();
    const results: PlaceSearchResult[] = [];
    let predefined = null;

    try {
      // 1. まず事前定義の場所を検索（最優先）
      predefined = searchPredefinedLocations(query);
      if (predefined) {
        results.push({
          name: predefined.displayName,
          displayName: predefined.displayName,
          type: 'geocoded',
          latitude: predefined.latitude,
          longitude: predefined.longitude,
          description: predefined.description
        });
        console.log(`🎯 事前定義の場所を最優先で使用: ${predefined.displayName}`);
      }

      // 2. 並列で複数のソースから検索
      const [dbResults, geocodeResults] = await Promise.all([
        this.searchFromDatabase(normalizedQuery),
        this.searchFromGeocoding(query)
      ]);

      // データベースの結果を追加
      results.push(...dbResults);

      // ジオコーディング結果を追加（重複チェック）
      for (const geocodeResult of geocodeResults) {
        const isDuplicate = results.some(r =>
          Math.abs(r.latitude - geocodeResult.latitude) < 0.001 &&
          Math.abs(r.longitude - geocodeResult.longitude) < 0.001
        );
        if (!isDuplicate) {
          results.push(geocodeResult);
        }
      }
    } catch (error) {
      console.error('Place search error:', error);
    }

    // 事前定義の場所があるかチェック
    const hasPredefined = predefined !== null;

    // スコアリングして並び替え
    const scoredResults = results.map((result, index) => {
      let score = 0;

      // 事前定義の場所（最初の結果）は最高スコア
      if (index === 0 && hasPredefined) {
        score += 100;
      }

      // 完全一致
      if (result.name.toLowerCase() === normalizedQuery) {
        score += 10;
      }
      // 前方一致
      else if (result.name.toLowerCase().startsWith(normalizedQuery)) {
        score += 5;
      }
      // 部分一致
      else if (result.name.toLowerCase().includes(normalizedQuery)) {
        score += 2;
      }

      // 施設タイプによる優先度
      if (result.type === 'parking') score += 3;
      if (result.type === 'convenience') score += 2;
      if (result.type === 'hotspring') score += 2;

      return { ...result, score };
    });

    // スコア順でソート
    scoredResults.sort((a, b) => b.score - a.score);

    // 最大10件まで返す
    return scoredResults.slice(0, 10).map(({ score, ...result }) => result);
  }

  /**
   * Supabaseデータベースから施設を検索
   */
  private static async searchFromDatabase(query: string): Promise<PlaceSearchResult[]> {
    const results: PlaceSearchResult[] = [];

    // 日本の範囲
    const JAPAN_BOUNDS = {
      minLat: 20.0,
      maxLat: 46.5,
      minLng: 122.0,
      maxLng: 154.0,
    };

    // 座標が日本国内かチェックする関数
    const isInJapan = (lat: number, lng: number): boolean => {
      return lat >= JAPAN_BOUNDS.minLat &&
        lat <= JAPAN_BOUNDS.maxLat &&
        lng >= JAPAN_BOUNDS.minLng &&
        lng <= JAPAN_BOUNDS.maxLng;
    };

    try {
      // 各テーブルから並列検索
      const [parkingData, convenienceData, hotspringData, gasstationData, festivalData, toiletData] = await Promise.all([
        // 駐車場検索
        supabase
          .from('parking_spots')
          .select('id, name, lat, lng, address')
          .or(`name.ilike.%${query}%,address.ilike.%${query}%`)
          .limit(5),

        // コンビニ検索
        supabase
          .from('convenience_stores')
          .select('id, name, lat, lng, address, brand')
          .or(`name.ilike.%${query}%,address.ilike.%${query}%,brand.ilike.%${query}%`)
          .limit(5),

        // 温泉検索
        supabase
          .from('hot_springs')
          .select('id, name, lat, lng, address')
          .or(`name.ilike.%${query}%,address.ilike.%${query}%`)
          .limit(5),

        // ガソリンスタンド検索
        supabase
          .from('gas_stations')
          .select('id, name, lat, lng, address, brand')
          .or(`name.ilike.%${query}%,address.ilike.%${query}%,brand.ilike.%${query}%`)
          .limit(5),

        // お祭り・花火大会検索
        supabase
          .from('festivals')
          .select('id, name, lat, lng, address')
          .or(`name.ilike.%${query}%,address.ilike.%${query}%`)
          .limit(5),

        // トイレ検索
        supabase
          .from('toilets')
          .select('id, name, lat, lng, address')
          .or(`name.ilike.%${query}%,address.ilike.%${query}%`)
          .limit(5),
      ]);

      // 駐車場の結果を追加
      if (parkingData.data) {
        parkingData.data.forEach(item => {
          if (item.lat && item.lng && isInJapan(item.lat, item.lng)) {
            results.push({
              name: item.name || 'コインパーキング',
              displayName: item.name || 'コインパーキング',
              type: 'parking',
              latitude: item.lat,
              longitude: item.lng,
              address: item.address,
              description: 'コインパーキング'
            });
          }
        });
      }

      // コンビニの結果を追加
      if (convenienceData.data) {
        convenienceData.data.forEach(item => {
          if (item.lat && item.lng && isInJapan(item.lat, item.lng)) {
            results.push({
              name: item.name || 'コンビニ',
              displayName: `${item.brand || ''}${item.name || 'コンビニ'}`.trim(),
              type: 'convenience',
              latitude: item.lat,
              longitude: item.lng,
              address: item.address,
              description: `コンビニ${item.brand ? ` (${item.brand})` : ''}`
            });
          }
        });
      }

      // 温泉の結果を追加
      if (hotspringData.data) {
        hotspringData.data.forEach(item => {
          if (item.lat && item.lng && isInJapan(item.lat, item.lng)) {
            results.push({
              name: item.name || '温泉',
              displayName: item.name || '温泉',
              type: 'hotspring',
              latitude: item.lat,
              longitude: item.lng,
              address: item.address,
              description: '温泉施設'
            });
          }
        });
      }

      // ガソリンスタンドの結果を追加
      if (gasstationData.data) {
        gasstationData.data.forEach(item => {
          if (item.lat && item.lng && isInJapan(item.lat, item.lng)) {
            results.push({
              name: item.name || 'ガソリンスタンド',
              displayName: `${item.brand || ''}${item.name || 'ガソリンスタンド'}`.trim(),
              type: 'gasstation',
              latitude: item.lat,
              longitude: item.lng,
              address: item.address,
              description: `ガソリンスタンド${item.brand ? ` (${item.brand})` : ''}`
            });
          }
        });
      }

      // お祭り・花火大会の結果を追加
      if (festivalData.data) {
        festivalData.data.forEach(item => {
          if (item.lat && item.lng && isInJapan(item.lat, item.lng)) {
            results.push({
              name: item.name || 'お祭り',
              displayName: item.name || 'お祭り',
              type: 'festival',
              latitude: item.lat,
              longitude: item.lng,
              address: item.address,
              description: 'お祭り・花火大会'
            });
          }
        });
      }

      // トイレの結果を追加
      if (toiletData.data) {
        toiletData.data.forEach(item => {
          if (item.lat && item.lng && isInJapan(item.lat, item.lng)) {
            results.push({
              name: item.name || 'トイレ',
              displayName: item.name || 'トイレ',
              type: 'toilet',
              latitude: item.lat,
              longitude: item.lng,
              address: item.address,
              description: '公衆トイレ'
            });
          }
        });
      }

    } catch (error) {
      console.error('Database search error:', error);
    }

    return results;
  }

  /**
   * Expo Location APIでジオコーディング検索
   */
  private static async searchFromGeocoding(query: string): Promise<PlaceSearchResult[]> {
    const results: PlaceSearchResult[] = [];

    try {
      // 複数のクエリパターンを試す（優先度順）
      const queryPatterns: { query: string; priority: number; description: string }[] = [];

      // パターン1: 都道府県 + クエリ（駅の場合は最優先）
      if (query.includes('駅')) {
        queryPatterns.push({
          query: `東京都 ${query}`,
          priority: 10,
          description: query
        });
      }

      // パターン2: クエリ + 日本
      queryPatterns.push({
        query: query.includes('日本') ? query : `${query}、日本`,
        priority: 5,
        description: query
      });

      // パターン3: 英語 + Japan（有名な駅の場合）
      if (query === '東京駅') {
        queryPatterns.push({
          query: 'Tokyo Station, Japan',
          priority: 8,
          description: '東京駅'
        });
      }

      // パターン4: 駅として検索（駅が含まれていない場合のみ）
      if (!query.includes('駅')) {
        queryPatterns.push({
          query: `${query}駅、日本`,
          priority: 6,
          description: `${query}駅`
        });
      }

      // パターン5: 大学として検索（駅や大学が含まれていない場合のみ）
      if (!query.includes('大学') && !query.includes('駅')) {
        queryPatterns.push({
          query: `${query}大学、日本`,
          priority: 3,
          description: `${query}大学`
        });
      }

      // すべてのパターンで検索
      for (const pattern of queryPatterns) {
        const geocodeResult = await LocationService.geocode(pattern.query);

        if (geocodeResult) {
          console.log(`✅ ジオコーディング成功: "${pattern.query}" → 緯度${geocodeResult.latitude}, 経度${geocodeResult.longitude}`);

          results.push({
            name: pattern.description,
            displayName: pattern.description,
            type: 'geocoded',
            latitude: geocodeResult.latitude,
            longitude: geocodeResult.longitude,
            description: '地名・住所',
            // @ts-ignore - 内部的に優先度を保持
            _priority: pattern.priority
          });
        } else {
          console.log(`⚠️ ジオコーディング失敗: "${pattern.query}"`);
        }
      }

      // 優先度でソート（高い方が先）
      results.sort((a: any, b: any) => (b._priority || 0) - (a._priority || 0));

    } catch (error) {
      console.error('Geocoding search error:', error);
    }

    return results;
  }

  /**
   * 場所のタイプに応じたアイコン名を取得
   */
  static getIconForPlaceType(type: PlaceSearchResult['type']): string {
    switch (type) {
      case 'parking':
        return 'local-parking';
      case 'convenience':
        return 'store';
      case 'hotspring':
        return 'hot-tub';
      case 'gasstation':
        return 'local-gas-station';
      case 'festival':
        return 'festival';
      case 'toilet':
        return 'wc';
      case 'geocoded':
        return 'place';
      case 'generic':
      default:
        return 'search';
    }
  }
}