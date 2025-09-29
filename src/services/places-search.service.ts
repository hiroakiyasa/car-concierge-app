import { LocationService } from './location.service';
import { SupabaseService } from './supabase.service';
import { supabase } from '@/config/supabase';

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

    try {
      // 並列で複数のソースから検索
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

    // スコアリングして並び替え
    const scoredResults = results.map(result => {
      let score = 0;

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
          if (item.lat && item.lng) {
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
          if (item.lat && item.lng) {
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
          if (item.lat && item.lng) {
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
          if (item.lat && item.lng) {
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
          if (item.lat && item.lng) {
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
          if (item.lat && item.lng) {
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
      // 日本の地名として検索するため「〜、日本」を追加
      const japanQuery = query.includes('日本') ? query : `${query}、日本`;

      // Expo Location APIでジオコーディング
      const geocodeResult = await LocationService.geocode(japanQuery);

      if (geocodeResult) {
        results.push({
          name: query,
          displayName: query,
          type: 'geocoded',
          latitude: geocodeResult.latitude,
          longitude: geocodeResult.longitude,
          description: '地名・住所'
        });
      }

      // 駅として検索
      if (!query.includes('駅')) {
        const stationQuery = `${query}駅、日本`;
        const stationResult = await LocationService.geocode(stationQuery);
        if (stationResult) {
          results.push({
            name: `${query}駅`,
            displayName: `${query}駅`,
            type: 'geocoded',
            latitude: stationResult.latitude,
            longitude: stationResult.longitude,
            description: '駅'
          });
        }
      }

      // 大学として検索
      if (!query.includes('大学')) {
        const universityQuery = `${query}大学、日本`;
        const universityResult = await LocationService.geocode(universityQuery);
        if (universityResult) {
          results.push({
            name: `${query}大学`,
            displayName: `${query}大学`,
            type: 'geocoded',
            latitude: universityResult.latitude,
            longitude: universityResult.longitude,
            description: '大学'
          });
        }
      }

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