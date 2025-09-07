import { 
  Spot, 
  CoinParking, 
  SearchFilter, 
  Location, 
  Region 
} from '@/types';
import { LocationService } from './location.service';
import { ParkingFeeCalculator } from './parking-fee.service';

export class SearchService {
  /**
   * スポットを検索してフィルタリング
   */
  static filterSpots(
    spots: Spot[],
    filter: SearchFilter,
    userLocation?: Location | null
  ): Spot[] {
    let filteredSpots = [...spots];

    // カテゴリーフィルター
    if (filter.selectedCategories.size > 0) {
      filteredSpots = filteredSpots.filter(spot => 
        filter.selectedCategories.has(spot.category)
      );
    }

    // 距離フィルター
    if (filter.radiusFilterEnabled && userLocation) {
      filteredSpots = filteredSpots.filter(spot => {
        const distance = LocationService.calculateDistance(userLocation, spot);
        return distance <= filter.searchRadius;
      });
    }

    // 標高フィルター
    if (filter.elevationFilterEnabled) {
      filteredSpots = filteredSpots.filter(spot => 
        spot.elevation !== undefined && spot.elevation >= filter.minElevation
      );
    }

    // 駐車場タイプフィルター（コインパーキングのみ）
    if (filter.selectedCategories.has('コインパーキング')) {
      filteredSpots = filteredSpots.filter(spot => {
        if (spot.category !== 'コインパーキング') return true;
        
        const type = spot.type?.toLowerCase() || '';
        const description = spot.description?.toLowerCase() || '';
        const combined = type + ' ' + description;

        // 平面駐車場
        if (!filter.showFlatParking) {
          if (combined.includes('平面') || combined.includes('屋外') || 
              (!combined.includes('立体') && !combined.includes('機械'))) {
            return false;
          }
        }

        // 立体駐車場
        if (!filter.showMultiStoryParking) {
          if (combined.includes('立体') || combined.includes('ビル') || 
              combined.includes('屋内')) {
            return false;
          }
        }

        // 機械式駐車場
        if (!filter.showMechanicalParking) {
          if (combined.includes('機械') || combined.includes('自動') || 
              combined.includes('タワー')) {
            return false;
          }
        }

        return true;
      });
    }

    // 営業時間フィルター（駐車時間が設定されている場合）
    if (filter.parkingTimeFilterEnabled) {
      filteredSpots = filteredSpots.filter(spot => {
        if (spot.category !== 'コインパーキング') return true;
        
        const parking = spot as CoinParking;
        return ParkingFeeCalculator.isParkingOpenForEntireDuration(
          parking,
          filter.parkingDuration
        );
      });
    }

    // 近隣施設フィルター
    if (filter.nearbyCategories.size > 0) {
      filteredSpots = filteredSpots.filter(spot => {
        if (spot.category !== 'コインパーキング') return true;
        
        const parking = spot as CoinParking;
        
        // コンビニ近くフィルター
        if (filter.nearbyCategories.has('コンビニ')) {
          if (!parking.nearestConvenienceStore || 
              parking.nearestConvenienceStore.distance > filter.convenienceStoreRadius) {
            return false;
          }
        }
        
        // 温泉近くフィルター
        if (filter.nearbyCategories.has('温泉')) {
          if (!parking.nearestHotspring || 
              parking.nearestHotspring.distance > filter.hotSpringRadius) {
            return false;
          }
        }
        
        return true;
      });
    }

    return filteredSpots;
  }

  /**
   * スポットをソート
   */
  static sortSpots(
    spots: Spot[],
    filter: SearchFilter,
    userLocation?: Location | null
  ): Spot[] {
    const sortedSpots = [...spots];

    // 駐車料金でソート（駐車時間が設定されている場合）
    if (filter.parkingTimeFilterEnabled) {
      // まず有効な料金が計算できる駐車場をフィルタリング
      const validParkingSpots = sortedSpots.filter(spot => {
        if (spot.category !== 'コインパーキング') return true;
        
        const parking = spot as CoinParking;
        const fee = ParkingFeeCalculator.calculateFee(parking, filter.parkingDuration);
        return fee >= 0; // 有効な料金のみ通す（0円の無料駐車場も含む）
      });
      
      // 有効な駐車場を料金でソート
      validParkingSpots.sort((a, b) => {
        if (a.category !== 'コインパーキング' || b.category !== 'コインパーキング') {
          return 0;
        }

        const parkingA = a as CoinParking;
        const parkingB = b as CoinParking;

        const feeA = ParkingFeeCalculator.calculateFee(parkingA, filter.parkingDuration);
        const feeB = ParkingFeeCalculator.calculateFee(parkingB, filter.parkingDuration);

        return feeA - feeB;
      });
      
      return validParkingSpots;
    } 
    // 距離でソート（ユーザー位置がある場合）
    else if (userLocation) {
      sortedSpots.sort((a, b) => {
        const distanceA = LocationService.calculateDistance(userLocation, a);
        const distanceB = LocationService.calculateDistance(userLocation, b);
        return distanceA - distanceB;
      });
    }
    // 基本料金でソート（コインパーキングの場合）
    else {
      sortedSpots.sort((a, b) => {
        if (a.category !== 'コインパーキング' || b.category !== 'コインパーキング') {
          return 0;
        }

        const parkingA = a as CoinParking;
        const parkingB = b as CoinParking;

        const priceA = parkingA.rates?.[0]?.price || Number.MAX_VALUE;
        const priceB = parkingB.rates?.[0]?.price || Number.MAX_VALUE;

        return priceA - priceB;
      });
    }

    return sortedSpots;
  }

  /**
   * 地図の範囲内のスポットを取得
   */
  static filterByMapBounds(spots: Spot[], region: Region): Spot[] {
    const minLat = region.latitude - region.latitudeDelta;
    const maxLat = region.latitude + region.latitudeDelta;
    const minLng = region.longitude - region.longitudeDelta;
    const maxLng = region.longitude + region.longitudeDelta;

    return spots.filter(spot => 
      spot.lat >= minLat && 
      spot.lat <= maxLat && 
      spot.lng >= minLng && 
      spot.lng <= maxLng
    );
  }

  /**
   * カテゴリー別に件数を制限
   */
  static applyCategoryLimits(spots: Spot[], limits: Map<string, number>): Spot[] {
    const result: Spot[] = [];
    const counts = new Map<string, number>();

    for (const spot of spots) {
      const currentCount = counts.get(spot.category) || 0;
      const limit = limits.get(spot.category) || Number.MAX_VALUE;

      if (currentCount < limit) {
        result.push(spot);
        counts.set(spot.category, currentCount + 1);
      }
    }

    return result;
  }

  /**
   * 検索結果にランキングを付与
   */
  static addRanking(spots: Spot[]): Spot[] {
    const parkingSpots = spots.filter(s => s.category === 'コインパーキング');
    const otherSpots = spots.filter(s => s.category !== 'コインパーキング');

    // コインパーキングにランキングを付与
    const rankedParkingSpots = parkingSpots.map((spot, index) => ({
      ...spot,
      rank: index + 1
    }));

    return [...rankedParkingSpots, ...otherSpots];
  }

  /**
   * 総合検索処理
   */
  static async performSearch(
    spots: Spot[],
    filter: SearchFilter,
    userLocation?: Location | null,
    region?: Region
  ): Promise<Spot[]> {
    let results = [...spots];

    // 地図範囲でフィルタリング（regionが指定されている場合）
    if (region) {
      results = this.filterByMapBounds(results, region);
    }

    // フィルタリング
    results = this.filterSpots(results, filter, userLocation);

    // ソート
    results = this.sortSpots(results, filter, userLocation);

    // カテゴリー別の制限を適用
    const limits = new Map([
      ['コインパーキング', 20],
      ['コンビニ', 10],
      ['温泉', 10],
      ['ガソリンスタンド', 10],
      ['お祭り・花火大会', 5]
    ]);
    results = this.applyCategoryLimits(results, limits);

    // ランキングを付与
    results = this.addRanking(results);

    return results;
  }
}