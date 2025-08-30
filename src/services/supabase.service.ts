import { supabase } from '@/config/supabase';
import { Spot, CoinParking, HotSpring, ConvenienceStore, GasStation, Festival, Region } from '@/types';

export class SupabaseService {
  // Fetch parking spots within a region
  static async fetchParkingSpots(region: Region, minElevation?: number): Promise<CoinParking[]> {
    const { latitude, longitude, latitudeDelta, longitudeDelta } = region;
    
    // latitudeDelta と longitudeDelta は表示範囲全体の幅なので、半分にして中心から加減算
    const minLat = latitude - (latitudeDelta / 2);
    const maxLat = latitude + (latitudeDelta / 2);
    const minLng = longitude - (longitudeDelta / 2);
    const maxLng = longitude + (longitudeDelta / 2);
    
    console.log('📍 Supabase検索範囲:', {
      北端緯度: maxLat.toFixed(6),
      南端緯度: minLat.toFixed(6),
      東端経度: maxLng.toFixed(6),
      西端経度: minLng.toFixed(6),
      中心: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
      最低標高: minElevation ? `${minElevation}m` : '制限なし',
    });
    
    // クエリビルダーを作成
    let query = supabase
      .from('parking_spots')
      .select('*')
      .gte('lat', minLat)
      .lte('lat', maxLat)
      .gte('lng', minLng)
      .lte('lng', maxLng);
    
    // 標高フィルターが指定されている場合は追加
    if (minElevation !== undefined && minElevation > 0) {
      query = query.gte('elevation', minElevation);
      console.log(`🏔️ 標高${minElevation}m以上でフィルタリング`);
    }
    
    // 最大300件まで取得
    const { data, error } = await query.limit(300);
    
    if (error) {
      console.error('Error fetching parking spots:', error);
      return [];
    }
    
    const results = (data || []).map(spot => {
      // HoursフィールドをJSONパース
      let hoursData = null;
      if (spot.Hours) {
        try {
          hoursData = typeof spot.Hours === 'string' ? JSON.parse(spot.Hours) : spot.Hours;
          // デバッグ: 最初の駐車場の営業時間データを確認
          if (data && data.indexOf(spot) === 0) {
            console.log('🕐 営業時間データサンプル:', {
              raw_Hours: spot.Hours,
              parsed_hours: hoursData,
              operating_hours: spot.operating_hours,
              is_24h: spot.is_24h,
            });
          }
        } catch (error) {
          console.log('Hours JSON parse error:', error);
        }
      }
      
      // 近隣施設データをパース
      let nearestConvenienceStore = null;
      if (spot.nearest_convenience_store) {
        try {
          nearestConvenienceStore = typeof spot.nearest_convenience_store === 'string' 
            ? JSON.parse(spot.nearest_convenience_store) 
            : spot.nearest_convenience_store;
          
          // データ構造のデバッグ（最初の1件のみ）
          if (data && data.indexOf(spot) === 0 && nearestConvenienceStore) {
            console.log('📍 コンビニデータ構造サンプル:', nearestConvenienceStore);
          }
        } catch (error) {
          console.error('Nearest convenience store JSON parse error:', error);
          console.error('Raw data:', spot.nearest_convenience_store);
        }
      }
      
      let nearestHotspring = null;
      if (spot.nearest_hotspring) {
        try {
          nearestHotspring = typeof spot.nearest_hotspring === 'string' 
            ? JSON.parse(spot.nearest_hotspring) 
            : spot.nearest_hotspring;
            
          // データ構造のデバッグ（最初の1件のみ）
          if (data && data.indexOf(spot) === 0 && nearestHotspring) {
            console.log('♨️ 温泉データ構造サンプル:', nearestHotspring);
          }
        } catch (error) {
          console.error('Nearest hotspring JSON parse error:', error);
          console.error('Raw data:', spot.nearest_hotspring);
        }
      }
      
      return {
        ...spot,
        category: 'コインパーキング',
        rates: spot.rates || [],
        hours: hoursData,
        operatingHours: spot.operating_hours || spot.operatingHours || spot.Hours,
        operating_hours: spot.operating_hours, // 元のフィールドも保持
        Hours: spot.Hours, // 元のJSONも保持
        nearestConvenienceStore,
        nearestHotspring,
      };
    }) as CoinParking[];
    
    console.log(`🔎 Supabaseから${results.length}件の駐車場を取得`);
    
    // 近隣施設データの詳細確認
    const withConvenience = results.filter(p => p.nearestConvenienceStore).length;
    const withHotspring = results.filter(p => p.nearestHotspring).length;
    console.log(`📊 近隣施設データ: コンビニ付き ${withConvenience}件, 温泉付き ${withHotspring}件`);
    
    // さらに詳細なデバッグ
    if (results.length > 0) {
      const sample = results[0];
      console.log('🔍 サンプルデータ構造:', {
        name: sample.name,
        hasNearestConvenience: !!sample.nearestConvenienceStore,
        nearestConvenience: sample.nearestConvenienceStore,
        hasNearestHotspring: !!sample.nearestHotspring,
        nearestHotspring: sample.nearestHotspring,
        rawData: {
          nearest_convenience_store: (data && data[0]) ? data[0].nearest_convenience_store : null,
          nearest_hotspring: (data && data[0]) ? data[0].nearest_hotspring : null
        }
      });
      
      // 距離の分布を確認
      const convenienceDistances = results
        .filter(p => p.nearestConvenienceStore && 
                 ((p.nearestConvenienceStore as any).distance_m || p.nearestConvenienceStore.distance))
        .map(p => (p.nearestConvenienceStore as any).distance_m || p.nearestConvenienceStore!.distance)
        .sort((a, b) => a - b);
        
      if (convenienceDistances.length > 0) {
        console.log(`📏 コンビニ距離分布: 最小=${convenienceDistances[0]}m, 中央値=${convenienceDistances[Math.floor(convenienceDistances.length/2)]}m, 最大=${convenienceDistances[convenienceDistances.length-1]}m`);
        const within800m = convenienceDistances.filter(d => d <= 800).length;
        console.log(`✅ 800m以内にコンビニがある駐車場: ${within800m}件`);
      } else {
        console.log('❌ コンビニ距離データが見つかりません');
      }
    }
    
    if (minElevation !== undefined && minElevation > 0) {
      console.log(`🏔️ 標高フィルター適用: ${minElevation}m以上の駐車場${results.length}件`);
    }
    return results;
  }
  
  // Fetch convenience stores
  static async fetchConvenienceStores(region: Region): Promise<ConvenienceStore[]> {
    const { latitude, longitude, latitudeDelta, longitudeDelta } = region;
    
    // NaNチェック
    if (isNaN(latitude) || isNaN(longitude) || isNaN(latitudeDelta) || isNaN(longitudeDelta)) {
      console.error('無効な座標値:', { latitude, longitude, latitudeDelta, longitudeDelta });
      return [];
    }
    
    const minLat = latitude - (latitudeDelta / 2);
    const maxLat = latitude + (latitudeDelta / 2);
    const minLng = longitude - (longitudeDelta / 2);
    const maxLng = longitude + (longitudeDelta / 2);
    
    console.log('🏂 コンビニ検索範囲:', {
      北端緯度: maxLat.toFixed(6),
      南端緯度: minLat.toFixed(6),
      東端経度: maxLng.toFixed(6),
      西端経度: minLng.toFixed(6),
    });
    
    const { data, error } = await supabase
      .from('convenience_stores')
      .select('*')
      .gte('lat', minLat)
      .lte('lat', maxLat)
      .gte('lng', minLng)
      .lte('lng', maxLng)
      .limit(100);
    
    if (error) {
      console.error('Error fetching convenience stores:', error);
      return [];
    }
    
    console.log(`🏂 Supabaseから${data?.length || 0}件のコンビニを取得`);
    
    return (data || []).map(store => ({
      ...store,
      idString: store.id,
      category: 'コンビニ',
      brand: store.brand || store.name,
      operatingHours: store.Hours || store.operating_hours || store.operatingHours,
    })) as ConvenienceStore[];
  }
  
  // Fetch hot springs
  static async fetchHotSprings(region: Region): Promise<HotSpring[]> {
    const { latitude, longitude, latitudeDelta, longitudeDelta } = region;
    
    // NaNチェック
    if (isNaN(latitude) || isNaN(longitude) || isNaN(latitudeDelta) || isNaN(longitudeDelta)) {
      console.error('無効な座標値:', { latitude, longitude, latitudeDelta, longitudeDelta });
      return [];
    }
    
    const minLat = latitude - (latitudeDelta / 2);
    const maxLat = latitude + (latitudeDelta / 2);
    const minLng = longitude - (longitudeDelta / 2);
    const maxLng = longitude + (longitudeDelta / 2);
    
    console.log('♨️ 温泉検索範囲:', {
      北端緯度: maxLat.toFixed(6),
      南端緯度: minLat.toFixed(6),
      東端経度: maxLng.toFixed(6),
      西端経度: minLng.toFixed(6),
    });
    
    const { data, error } = await supabase
      .from('hot_springs')
      .select('*')
      .gte('lat', minLat)
      .lte('lat', maxLat)
      .gte('lng', minLng)
      .lte('lng', maxLng)
      .limit(50);
    
    if (error) {
      console.error('Error fetching hot springs:', error);
      return [];
    }
    
    console.log(`♨️ Supabaseから${data?.length || 0}件の温泉を取得`);
    
    return (data || []).map(spring => ({
      ...spring,
      category: '温泉',
      operatingHours: spring.Hours || spring.operating_hours || spring.operatingHours,
    })) as HotSpring[];
  }
  
  // Fetch gas stations
  static async fetchGasStations(region: Region): Promise<GasStation[]> {
    const { latitude, longitude, latitudeDelta, longitudeDelta } = region;
    
    // NaNチェック
    if (isNaN(latitude) || isNaN(longitude) || isNaN(latitudeDelta) || isNaN(longitudeDelta)) {
      console.error('無効な座標値:', { latitude, longitude, latitudeDelta, longitudeDelta });
      return [];
    }
    
    const minLat = latitude - (latitudeDelta / 2);
    const maxLat = latitude + (latitudeDelta / 2);
    const minLng = longitude - (longitudeDelta / 2);
    const maxLng = longitude + (longitudeDelta / 2);
    
    console.log('⛽ ガソリンスタンド検索範囲:', {
      北端緯度: maxLat.toFixed(6),
      南端緯度: minLat.toFixed(6),
      東端経度: maxLng.toFixed(6),
      西端経度: minLng.toFixed(6),
    });
    
    const { data, error } = await supabase
      .from('gas_stations')
      .select('*')
      .gte('lat', minLat)
      .lte('lat', maxLat)
      .gte('lng', minLng)
      .lte('lng', maxLng)
      .limit(50);
    
    if (error) {
      console.error('Error fetching gas stations:', error);
      return [];
    }
    
    console.log(`⛽ Supabaseから${data?.length || 0}件のガソリンスタンドを取得`);
    
    return (data || []).map(station => ({
      ...station,
      category: 'ガソリンスタンド',
      brand: station.brand || station.name,
      operatingHours: station.Hours || station.operating_hours || station.operatingHours,
    })) as GasStation[];
  }
  
  // Fetch festivals
  static async fetchFestivals(region: Region): Promise<Festival[]> {
    const { latitude, longitude, latitudeDelta, longitudeDelta } = region;
    
    // NaNチェック
    if (isNaN(latitude) || isNaN(longitude) || isNaN(latitudeDelta) || isNaN(longitudeDelta)) {
      console.error('無効な座標値:', { latitude, longitude, latitudeDelta, longitudeDelta });
      return [];
    }
    
    const minLat = latitude - (latitudeDelta / 2);
    const maxLat = latitude + (latitudeDelta / 2);
    const minLng = longitude - (longitudeDelta / 2);
    const maxLng = longitude + (longitudeDelta / 2);
    
    console.log('🎆 お祭り・花火大会検索範囲:', {
      北端緯度: maxLat.toFixed(6),
      南端緯度: minLat.toFixed(6),
      東端経度: maxLng.toFixed(6),
      西端経度: minLng.toFixed(6),
    });
    
    const { data, error } = await supabase
      .from('festivals')
      .select('*')
      .gte('lat', minLat)
      .lte('lat', maxLat)
      .gte('lng', minLng)
      .lte('lng', maxLng)
      .limit(30);
    
    if (error) {
      console.error('Error fetching festivals:', error);
      return [];
    }
    
    console.log(`🎆 Supabaseから${data?.length || 0}件のお祭り・花火大会を取得`);
    
    return (data || []).map(festival => ({
      ...festival,
      category: 'お祭り・花火大会',
      operatingHours: festival.Hours || festival.operating_hours || festival.operatingHours,
    })) as Festival[];
  }
  
  // Fetch all spots by category
  static async fetchSpotsByCategories(
    region: Region,
    categories: Set<string>,
    minElevation?: number
  ): Promise<Spot[]> {
    const results: Spot[] = [];
    
    if (categories.has('コインパーキング')) {
      const parkingSpots = await this.fetchParkingSpots(region, minElevation);
      results.push(...parkingSpots);
    }
    
    if (categories.has('コンビニ')) {
      const stores = await this.fetchConvenienceStores(region);
      results.push(...stores);
    }
    
    if (categories.has('温泉')) {
      const springs = await this.fetchHotSprings(region);
      results.push(...springs);
    }
    
    if (categories.has('ガソリンスタンド')) {
      const stations = await this.fetchGasStations(region);
      results.push(...stations);
    }
    
    if (categories.has('お祭り・花火大会')) {
      const festivals = await this.fetchFestivals(region);
      results.push(...festivals);
    }
    
    return results;
  }
  
  // Subscribe to realtime updates
  static subscribeToUpdates(
    tableName: string,
    callback: (payload: any) => void
  ) {
    const subscription = supabase
      .channel(`${tableName}_changes`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: tableName },
        callback
      )
      .subscribe();
    
    return subscription;
  }
  
  // Unsubscribe from updates
  static unsubscribe(subscription: any) {
    supabase.removeChannel(subscription);
  }
  
  // Fetch convenience store details by ID
  static async fetchConvenienceStoreById(id: string): Promise<ConvenienceStore | null> {
    if (!id) return null;
    
    console.log(`🏪 コンビニ詳細取得: ID=${id}`);
    
    const { data, error } = await supabase
      .from('convenience_stores')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error('Error fetching convenience store:', error);
      return null;
    }
    
    if (data) {
      return {
        ...data,
        idString: data.id,
        category: 'コンビニ',
        brand: data.brand || data.name,
        operatingHours: data.Hours || data.operating_hours || data.operatingHours,
      } as ConvenienceStore;
    }
    
    return null;
  }
  
  // Fetch hot spring details by ID
  static async fetchHotSpringById(id: string): Promise<HotSpring | null> {
    if (!id) return null;
    
    console.log(`♨️ 温泉詳細取得: ID=${id}`);
    
    const { data, error } = await supabase
      .from('hot_springs')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error('Error fetching hot spring:', error);
      return null;
    }
    
    if (data) {
      return {
        ...data,
        category: '温泉',
        operatingHours: data.Hours || data.operating_hours || data.operatingHours,
      } as HotSpring;
    }
    
    return null;
  }
  
  // Batch fetch facilities by IDs
  static async fetchFacilitiesByIds(
    convenienceIds: string[] = [],
    hotspringIds: string[] = []
  ): Promise<{ conveniences: ConvenienceStore[], hotsprings: HotSpring[] }> {
    const results = {
      conveniences: [] as ConvenienceStore[],
      hotsprings: [] as HotSpring[]
    };
    
    // Fetch convenience stores
    if (convenienceIds.length > 0) {
      const { data, error } = await supabase
        .from('convenience_stores')
        .select('*')
        .in('id', convenienceIds);
      
      if (!error && data) {
        results.conveniences = data.map(store => ({
          ...store,
          idString: store.id,
          category: 'コンビニ',
          brand: store.brand || store.name,
          operatingHours: store.Hours || store.operating_hours || store.operatingHours,
        })) as ConvenienceStore[];
        
        console.log(`🏪 ${results.conveniences.length}件のコンビニ詳細を取得`);
      }
    }
    
    // Fetch hot springs
    if (hotspringIds.length > 0) {
      const { data, error } = await supabase
        .from('hot_springs')
        .select('*')
        .in('id', hotspringIds);
      
      if (!error && data) {
        results.hotsprings = data.map(spring => ({
          ...spring,
          category: '温泉',
          operatingHours: spring.Hours || spring.operating_hours || spring.operatingHours,
        })) as HotSpring[];
        
        console.log(`♨️ ${results.hotsprings.length}件の温泉詳細を取得`);
      }
    }
    
    return results;
  }
}