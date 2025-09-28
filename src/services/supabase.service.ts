import { supabase } from '@/config/supabase';
import { Spot, CoinParking, HotSpring, ConvenienceStore, GasStation, Festival, Toilet, Region } from '@/types';
import { ParkingHoursService } from './parking-hours.service';

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
      .select('*, nearest_convenience_store, nearest_hotspring, nearest_toilet')
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
      console.error('Error fetching parking spots:', JSON.stringify(error));
      return [];
    }
    
    const results = (data || []).map(spot => {
      // hoursフィールドをJSONパース（データベースでは小文字のhours）
      let hoursData = null;
      if (spot.hours) {
        try {
          hoursData = typeof spot.hours === 'string' ? JSON.parse(spot.hours) : spot.hours;
          // デバッグ: 最初の駐車場の営業時間データを確認
          if (data && data.indexOf(spot) === 0) {
            console.log('🕐 営業時間データサンプル:', {
              raw_hours: spot.hours,
              parsed_hours: hoursData,
              operating_hours: spot.operating_hours,
              is_24h: spot.is_24h,
            });
          }
        } catch (error) {
          console.log('hours JSON parse error:', error);
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

      // トイレ情報（iOS/Android差異対策: string JSON or object 両対応）
      let nearestToilet = null as any;
      if ((spot as any).nearest_toilet) {
        try {
          nearestToilet = typeof (spot as any).nearest_toilet === 'string'
            ? JSON.parse((spot as any).nearest_toilet)
            : (spot as any).nearest_toilet;
        } catch (error) {
          console.error('Nearest toilet JSON parse error:', error);
          console.error('Raw data:', (spot as any).nearest_toilet);
        }
      }
      
      return {
        ...spot,
        category: 'コインパーキング',
        rates: spot.rates || [],
        hours: hoursData || spot.hours, // パース済みまたは元のデータ
        operatingHours: spot.operating_hours || spot.operatingHours || spot.hours,
        operating_hours: spot.operating_hours, // 元のフィールドも保持
        is_24h: spot.is_24h, // is_24hフィールドも保持
        parkingType: spot.type, // 駐車場タイプ（平面駐車場、立体駐車場、機械式など）
        nearestConvenienceStore,
        nearestHotspring,
        // 両表記をサポート: nearest_toilet は元データ互換、nearestToilet はJS側互換
        nearest_toilet: nearestToilet,
        nearestToilet,
      };
    }) as CoinParking[];
    
    console.log(`🔎 Supabaseから${results.length}件の駐車場を取得`);
    
    // 近隣施設データの詳細確認
    const withConvenience = results.filter(p => p.nearestConvenienceStore).length;
    const withHotspring = results.filter(p => p.nearestHotspring).length;
    const withToilet = results.filter(p => (p as any).nearestToilet).length;
    console.log(`📊 近隣施設データ: コンビニ付き ${withConvenience}件, 温泉付き ${withHotspring}件, トイレ付き ${withToilet}件`);
    
    // さらに詳細なデバッグ
    if (results && results.length > 0) {
      const sample = results[0];
      console.log('🔍 サンプルデータ構造:', {
        name: sample.name,
        hasNearestConvenience: !!sample.nearestConvenienceStore,
        nearestConvenience: sample.nearestConvenienceStore,
        hasNearestHotspring: !!sample.nearestHotspring,
        nearestHotspring: sample.nearestHotspring,
        rawData: {
          nearest_convenience_store: (data && data[0]) ? (data as any)[0].nearest_convenience_store : null,
          nearest_hotspring: (data && data[0]) ? (data as any)[0].nearest_hotspring : null,
          nearest_toilet: (data && data[0]) ? (data as any)[0].nearest_toilet : null,
        }
      });
      
      // 距離の分布を確認
      const convenienceDistances = results
        .filter(p => p.nearestConvenienceStore && 
                 ((p.nearestConvenienceStore as any).distance_m || (p.nearestConvenienceStore as any).distance))
        .map(p => (p.nearestConvenienceStore as any).distance_m || (p.nearestConvenienceStore as any).distance)
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
      phone: store.phone_number || store.phone,
      hours: store.operating_hours || store.hours,
      operatingHours: store.operating_hours || store.Hours || store.operatingHours,
    })) as ConvenienceStore[];
  }
  
  // Fetch hot springs (exclude hotels with price > 5000)
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
    
    // 温泉データを取得（全データを一旦取得）
    const { data, error } = await supabase
      .from('hot_springs')
      .select('*')
      .gte('lat', minLat)
      .lte('lat', maxLat)
      .gte('lng', minLng)
      .lte('lng', maxLng)
      .limit(100);
    
    if (error) {
      console.error('Error fetching hot springs:', error);
      return [];
    }
    
    console.log(`♨️ Supabaseから${data?.length || 0}件の温泉を取得`);
    
    // 価格でフィルタリング（5000円以下のみ、ホテルを除外）
    const filteredData = (data || []).filter(spring => {
      // priceフィールドから数値を抽出
      if (!spring.price) return true; // 価格情報がない場合は表示
      
      // 価格文字列から数値を抽出（例: "大人 1,200円" → 1200）
      const priceMatch = spring.price.match(/[\d,]+/);
      if (!priceMatch) return true; // 数値が見つからない場合は表示
      
      const priceNum = parseInt(priceMatch[0].replace(/,/g, ''), 10);
      
      // 5000円以下のみ表示（ホテルの温泉を除外）
      const isAffordable = priceNum <= 5000;
      
      if (!isAffordable) {
        console.log(`🚫 高額温泉を除外: ${spring.name} (${spring.price})`);
      }
      
      return isAffordable;
    });
    
    console.log(`♨️ フィルタリング後: ${filteredData.length}件（5000円以下）`);
    
    return filteredData.map(spring => ({
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

  // Fetch toilets
  static async fetchToilets(region: Region): Promise<Toilet[]> {
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

    console.log('🚻 トイレ検索範囲:', {
      北端緯度: maxLat.toFixed(6),
      南端緯度: minLat.toFixed(6),
      東端経度: maxLng.toFixed(6),
      西端経度: minLng.toFixed(6),
    });

    const { data, error } = await supabase
      .from('toilets')
      .select('*')
      .gte('lat', minLat)
      .lte('lat', maxLat)
      .gte('lng', minLng)
      .lte('lng', maxLng)
      .limit(100);

    if (error) {
      console.error('Error fetching toilets:', error);
      return [];
    }

    console.log(`🚻 Supabaseから${data?.length || 0}件のトイレを取得`);

    return (data || []).map(toilet => ({
      id: `toilet_${toilet.id}`,
      idNumber: toilet.id,
      name: toilet.name,
      lat: toilet.lat,
      lng: toilet.lng,
      address: toilet.address,
      category: 'トイレ',
    })) as Toilet[];
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

    if (categories.has('トイレ')) {
      const toilets = await this.fetchToilets(region);
      results.push(...toilets);
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
  
  // Fetch convenience stores by IDs
  static async fetchConvenienceStoresByIds(ids: string[]): Promise<ConvenienceStore[]> {
    if (!ids || ids.length === 0) return [];

    const { data, error } = await supabase
      .from('convenience_stores')
      .select('*')
      .in('id', ids);

    if (error) {
      console.error('Error fetching convenience stores by IDs:', error);
      return [];
    }

    return (data || []).map(store => ({
      ...store,
      category: 'コンビニ' as const,
      lat: store.lat || store.latitude,
      lng: store.lng || store.longitude,
    }));
  }

  // Fetch toilets by IDs
  static async fetchToiletsByIds(ids: string[]): Promise<Toilet[]> {
    if (!ids || ids.length === 0) return [];

    const { data, error } = await supabase
      .from('toilets')
      .select('*')
      .in('id', ids);

    if (error) {
      console.error('Error fetching toilets by IDs:', error);
      return [];
    }

    return (data || []).map(toilet => ({
      ...toilet,
      category: 'トイレ' as const,
      lat: toilet.lat || toilet.latitude,
      lng: toilet.lng || toilet.longitude,
    }));
  }

  // Fetch single toilet by ID
  static async fetchToiletById(id: string): Promise<Toilet | null> {
    if (!id) return null;

    // IDから数値部分を抽出（例: "toilet_7462" → 7462）
    const numericId = id.replace(/^toilet_/, '');

    const { data, error } = await supabase
      .from('toilets')
      .select('*')
      .eq('id', numericId)
      .single();

    if (error) {
      console.error('Error fetching toilet by ID:', error);
      return null;
    }

    if (!data) return null;

    return {
      ...data,
      category: 'トイレ' as const,
      lat: data.lat || data.latitude,
      lng: data.lng || data.longitude,
    };
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

  // 周辺検索付き駐車場検索（バックエンドで完結）
  static async fetchParkingSpotsByNearbyFilter(
    region: Region,
    durationMinutes: number,
    convenienceRadius?: number,
    toiletRadius?: number,
    minElevation?: number
  ): Promise<CoinParking[]> {
    const { latitude, longitude, latitudeDelta, longitudeDelta } = region;
    
    const minLat = latitude - (latitudeDelta / 2);
    const maxLat = latitude + (latitudeDelta / 2);
    const minLng = longitude - (longitudeDelta / 2);
    const maxLng = longitude + (longitudeDelta / 2);
    
    console.log('🎯 周辺検索付き駐車場検索（バックエンド処理）:', {
      地図範囲: `${minLat.toFixed(4)}-${maxLat.toFixed(4)}, ${minLng.toFixed(4)}-${maxLng.toFixed(4)}`,
      駐車時間: `${durationMinutes}分`,
      コンビニ: convenienceRadius ? `${convenienceRadius}m以内` : '指定なし',
      トイレ: toiletRadius ? `${toiletRadius}m以内` : '指定なし',
      最低標高: minElevation ? `${minElevation}m` : '制限なし',
    });

    try {
      // まず地図範囲内の駐車場を取得（関連施設の詳細情報も含む）
      let query = supabase
        .from('parking_spots')
        .select(`
          *,
          nearest_convenience_store,
          nearest_toilet
        `)
        .gte('lat', minLat)
        .lte('lat', maxLat)
        .gte('lng', minLng)
        .lte('lng', maxLng);
      
      // 標高フィルター
      if (minElevation !== undefined && minElevation > 0) {
        query = query.gte('elevation', minElevation);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('❌ 駐車場取得エラー:', error);
        return [];
      }
      
      if (!data || data.length === 0) {
        console.log('📍 該当する駐車場が見つかりません');
        return [];
      }
      
      console.log(`📍 地図範囲内の駐車場: ${data.length}件`);
      
      // フィルタリング処理 (OR検索: コンビニまたはトイレのいずれかが範囲内)
      let filteredData = data;

      // コンビニとトイレのOR検索
      if ((convenienceRadius && convenienceRadius > 0) || (toiletRadius && toiletRadius > 0)) {
        filteredData = filteredData.filter(spot => {
          let isNearConvenience = false;
          let isNearToilet = false;

          // コンビニ距離チェック
          if (convenienceRadius && convenienceRadius > 0 && spot.nearest_convenience_store) {
            try {
              const nearestStore = typeof spot.nearest_convenience_store === 'string'
                ? JSON.parse(spot.nearest_convenience_store)
                : spot.nearest_convenience_store;
              const distance = nearestStore.distance_m || nearestStore.distance || 999999;
              isNearConvenience = distance <= convenienceRadius;
            } catch {
              isNearConvenience = false;
            }
          }

          // トイレ距離チェック
          if (toiletRadius && toiletRadius > 0 && spot.nearest_toilet) {
            try {
              const nearestToilet = typeof spot.nearest_toilet === 'string'
                ? JSON.parse(spot.nearest_toilet)
                : spot.nearest_toilet;
              const distance = nearestToilet.distance_m || nearestToilet.distance || 999999;
              isNearToilet = distance <= toiletRadius;
            } catch {
              isNearToilet = false;
            }
          }

          // OR条件: いずれかが範囲内ならtrue
          return isNearConvenience || isNearToilet;
        });
        console.log(`🏪🚻 コンビニ(${convenienceRadius}m)またはトイレ(${toiletRadius}m)フィルター適用後: ${filteredData.length}件`);
      }
      
      // 料金計算とソート（フロントエンドの料金計算ロジックを簡易実装）
      const parkingSpotsWithFee = filteredData.map(spot => {
        let calculatedFee = -1; // デフォルトは料金計算不可
        
        if (spot.rates && Array.isArray(spot.rates)) {
          try {
            const baseRate = spot.rates.find((r: any) => r.type === 'base');
            const progressiveRate = spot.rates.find((r: any) => r.type === 'progressive');
            const maxRate = spot.rates.find((r: any) => r.type === 'max' && (!r.time_range && !r.timeRange));

            if (progressiveRate && (progressiveRate.apply_after !== undefined || progressiveRate.applyAfter !== undefined)) {
              const applyAfter = (progressiveRate.apply_after ?? progressiveRate.applyAfter) as number;
              if (durationMinutes <= applyAfter) {
                // apply_after以内はbaseのみ
                if (baseRate && baseRate.minutes > 0) {
                  const periods = Math.ceil(durationMinutes / baseRate.minutes);
                  calculatedFee = periods * (baseRate.price || 0);
                } else {
                  calculatedFee = 0;
                }
              } else {
                // 初回（apply_after まで）
                let fee = 0;
                if (baseRate && baseRate.minutes > 0) {
                  const basePeriods = Math.ceil(applyAfter / baseRate.minutes);
                  fee += basePeriods * (baseRate.price || 0);
                }
                // 以降 progressive
                const progMinutes = Math.max(0, durationMinutes - applyAfter);
                const progPeriods = Math.ceil(progMinutes / (progressiveRate.minutes || 1));
                fee += progPeriods * (progressiveRate.price || 0);
                calculatedFee = fee;
              }
            } else if (baseRate) {
              // progressiveがなければbaseのみ
              const periods = Math.ceil(durationMinutes / Math.max(1, baseRate.minutes));
              calculatedFee = periods * (baseRate.price || 0);
            }

            // 最大料金（全体）
            if (maxRate && calculatedFee >= 0 && maxRate.price < calculatedFee) {
              calculatedFee = maxRate.price;
            }
          } catch (error) {
            console.error('料金計算エラー:', error);
          }
        }
        
        return {
          ...spot,
          calculatedFee
        };
      });
      
      // 料金でソート（-1は最後に）
      const sortedSpots = parkingSpotsWithFee.sort((a, b) => {
        if (a.calculatedFee === -1 && b.calculatedFee === -1) return 0;
        if (a.calculatedFee === -1) return 1;
        if (b.calculatedFee === -1) return -1;
        return a.calculatedFee - b.calculatedFee;
      });
      
      // 上位20件を取得
      const top20Spots = sortedSpots.slice(0, 20);
      
      // データ形式を整形
      const results = top20Spots.map((spot, index) => {
        let nearestConvenienceStore = null;
        let nearestHotspring = null;
        
        if (spot.nearest_convenience_store) {
          try {
            nearestConvenienceStore = typeof spot.nearest_convenience_store === 'string' 
              ? JSON.parse(spot.nearest_convenience_store) 
              : spot.nearest_convenience_store;
          } catch {}
        }
        
        if (spot.nearest_hotspring) {
          try {
            nearestHotspring = typeof spot.nearest_hotspring === 'string' 
              ? JSON.parse(spot.nearest_hotspring) 
              : spot.nearest_hotspring;
          } catch {}
        }
        
        // hoursフィールドをJSONパース
        let hoursData = null;
        if (spot.hours) {
          try {
            hoursData = typeof spot.hours === 'string' ? JSON.parse(spot.hours) : spot.hours;
          } catch {}
        }
        
        return {
          ...spot,
          category: 'コインパーキング',
          rates: spot.rates || [],
          hours: hoursData || spot.hours,
          operatingHours: spot.operating_hours || spot.operatingHours || spot.hours,
          operating_hours: spot.operating_hours,
          is_24h: spot.is_24h,
          parkingType: spot.type, // 駐車場タイプを追加
          nearestConvenienceStore,
          nearestHotspring,
          calculatedFee: spot.calculatedFee,
          rank: index + 1
        };
      }) as CoinParking[];
      
      console.log(`✅ 周辺検索結果: ${results.length}件（料金順上位20件）`);

      // 関連施設のIDを収集
      const convenienceIds = new Set<string>();
      const hotspringIds = new Set<string>();

      results.forEach(spot => {
        if (spot.nearestConvenienceStore) {
          // idフィールドまたはstore_idフィールドを確認
          const id = spot.nearestConvenienceStore.id || spot.nearestConvenienceStore.store_id;
          if (id) {
            convenienceIds.add(String(id));
          }
        }
        if (spot.nearestHotspring) {
          // idフィールドまたはspring_idフィールドを確認
          const id = spot.nearestHotspring.id || spot.nearestHotspring.spring_id;
          if (id) {
            hotspringIds.add(String(id));
          }
        }
      });

      // 関連施設の詳細情報を取得
      const facilitiesPromises = [];

      if (convenienceIds.size > 0) {
        const convenienceQuery = supabase
          .from('convenience_stores')
          .select('*')
          .in('id', Array.from(convenienceIds));
        facilitiesPromises.push(convenienceQuery);
      }

      if (hotspringIds.size > 0) {
        const hotspringQuery = supabase
          .from('hot_springs')
          .select('*')
          .in('id', Array.from(hotspringIds));
        facilitiesPromises.push(hotspringQuery);
      }

      // 関連施設を取得して結果に追加
      const facilitiesResults = await Promise.all(facilitiesPromises);
      const convenienceStores = convenienceIds.size > 0 && facilitiesResults[0]?.data ? facilitiesResults[0].data : [];
      const hotSprings = hotspringIds.size > 0 ?
        (convenienceIds.size > 0 ? facilitiesResults[1]?.data : facilitiesResults[0]?.data) || [] : [];

      // nearestConvenienceStoreとnearestHotspringに座標情報を追加
      results.forEach(spot => {
        if (spot.nearestConvenienceStore) {
          // idフィールドまたはstore_idフィールドで検索
          const targetId = spot.nearestConvenienceStore.id || spot.nearestConvenienceStore.store_id;
          if (targetId) {
            const store = convenienceStores.find((s: any) => s.id === targetId);
            if (store) {
              // 元のdistance_mを保持しつつ、追加情報を付与
              spot.nearestConvenienceStore = {
                ...spot.nearestConvenienceStore,
                id: store.id,
                store_id: store.id,
                lat: store.lat || store.latitude,
                lng: store.lng || store.longitude,
                latitude: store.lat || store.latitude,
                longitude: store.lng || store.longitude,
                name: store.name,
                brand: store.brand,
                address: store.address
              };
            }
          }
        }

        if (spot.nearestHotspring) {
          // idフィールドまたはspring_idフィールドで検索
          const targetId = spot.nearestHotspring.id || spot.nearestHotspring.spring_id;
          if (targetId) {
            const spring = hotSprings.find((s: any) => s.id === targetId);
            if (spring) {
              // 元のdistance_mを保持しつつ、追加情報を付与
              spot.nearestHotspring = {
                ...spot.nearestHotspring,
                id: spring.id,
                spring_id: spring.id,
                lat: spring.lat || spring.latitude,
                lng: spring.lng || spring.longitude,
                latitude: spring.lat || spring.latitude,
                longitude: spring.lng || spring.longitude,
                name: spring.name,
                address: spring.address
              };
            }
          }
        }
      });

      // 上位5件の詳細をログ出力
      if (results.length > 0) {
        console.log('💰 上位5件の詳細:');
        results.slice(0, 5).forEach((spot, idx) => {
          const convenienceInfo = spot.nearestConvenienceStore
            ? `🏪${spot.nearestConvenienceStore.distance_m || spot.nearestConvenienceStore.distance}m`
            : '❌';
          const hotspringInfo = spot.nearestHotspring
            ? `♨️${spot.nearestHotspring.distance_m || spot.nearestHotspring.distance}m`
            : '❌';
          console.log(`  ${idx + 1}. ${spot.name}: ¥${spot.calculatedFee} (${convenienceInfo}, ${hotspringInfo})`);
        });
      }

      return results;
    } catch (error) {
      console.error('❌ 周辺検索エラー:', error);
      return [];
    }
  }

  // Fetch parking spots sorted by calculated fee (backend calculation)
  static async fetchParkingSpotsSortedByFee(
    region: Region,
    durationMinutes: number,
    minElevation?: number,
    entryAt?: Date // 追加: 入庫日時（ユーザー指定）
  ): Promise<{ spots: CoinParking[], totalCount: number }> {
    const { latitude, longitude, latitudeDelta, longitudeDelta } = region;
    
    const minLat = latitude - (latitudeDelta / 2);
    const maxLat = latitude + (latitudeDelta / 2);
    const minLng = longitude - (longitudeDelta / 2);
    const maxLng = longitude + (longitudeDelta / 2);
    
    console.log('💰 料金計算付き駐車場検索:', {
      範囲: `${minLat.toFixed(6)}-${maxLat.toFixed(6)}, ${minLng.toFixed(6)}-${maxLng.toFixed(6)}`,
      駐車時間: `${durationMinutes}分`,
      最低標高: minElevation ? `${minElevation}m` : '制限なし',
    });

    // Supabase RPC functionを呼び出し（料金計算とソートをバックエンドで実行）
    let rpcParams: any = {
      min_lat: minLat,
      max_lat: maxLat,
      min_lng: minLng,
      max_lng: maxLng,
      duration_minutes: durationMinutes
    };

    // バックエンドが min_elevation を受け付ける場合は渡す（候補を前段で絞る）
    if (minElevation !== undefined && minElevation > 0) {
      rpcParams.min_elevation = minElevation;
    }

    // 入庫時間が指定されていればRPCに渡す（DB側にパラメータが定義されている場合のみ有効）
    if (entryAt instanceof Date) {
      rpcParams.parking_start = entryAt.toISOString();
    }

    console.log('🚀 RPC呼び出し実行:', { function: 'get_parking_spots_sorted_by_fee', params: rpcParams });

    const { data, error } = await supabase.rpc('get_parking_spots_sorted_by_fee', rpcParams);

    console.log('📡 RPC呼び出し結果:', {
      dataCount: data?.length || 0,
      hasError: !!error,
      errorDetails: error ? { message: error.message, details: error.details, hint: error.hint } : null
    });

    // 生データを詳細に確認
    if (data && data.length > 0) {
      console.log('🔍🔍 RPC生データ詳細チェック:', {
        firstItem: data[0],
        allKeys: Object.keys(data[0]),
        hasNearest: {
          convenience: 'nearest_convenience_store' in data[0],
          hotspring: 'nearest_hotspring' in data[0],
          toilet: 'nearest_toilet' in data[0]
        },
        values: {
          convenience: data[0].nearest_convenience_store,
          hotspring: data[0].nearest_hotspring,
          toilet: data[0].nearest_toilet
        }
      });
    }

    // より詳細なデバッグログ
    if (data && data.length > 0) {
      console.log('🔍 RPC結果の詳細確認 - 最初のスポット:', {
        name: data[0].name,
        has_nearest_toilet: 'nearest_toilet' in data[0],
        nearest_toilet_value: data[0].nearest_toilet,
        has_nearest_convenience: 'nearest_convenience_store' in data[0],
        nearest_convenience_value: data[0].nearest_convenience_store,
        has_nearest_hotspring: 'nearest_hotspring' in data[0],
        nearest_hotspring_value: data[0].nearest_hotspring,
        全データ: JSON.stringify(data[0])
      });
    }

    // 最初のデータのtypeフィールドを確認
    if (data && data.length > 0) {
      console.log('🔍 RPC結果の最初のデータ（typeフィールド確認）:', {
        name: data[0].name,
        type: data[0].type,
        has_type: 'type' in data[0],
        全フィールド: Object.keys(data[0])
      });
    }

    if (error) {
      console.error('❌ Error fetching sorted parking spots:', error);
      // フォールバックせず、呼び出し側でズーム制御を行うため合図を返す
      return { spots: [], totalCount: -1, error: error.message } as any;
    }

    console.log(`💰 料金ソート済み駐車場を${data?.length || 0}件取得`);

    // Extract total count from the first item (all items have the same total count)
    const totalCount = data && data.length > 0 && data[0].total_spots_in_region ? data[0].total_spots_in_region : data?.length || 0;
    console.log(`📊 地域内の駐車場総数: ${totalCount}件`);

    const mapped = (data || []).map((spot, index) => {
      // デバッグ用に最初の3件のデータ構造をログ出力
      if (index < 3) {
        console.log(`🔍 スポット[${index}] データ詳細:`, {
          name: spot.name,
          calculated_fee: spot.calculated_fee,
          rank: spot.rank,
          raw_spot: spot
        });
      }

      let hoursData = null;
      if (spot.hours) {
        try {
          hoursData = typeof spot.hours === 'string' ? JSON.parse(spot.hours) : spot.hours;
        } catch (e) {
          console.warn(`営業時間パース失敗 for ${spot.name}:`, e);
        }
      }

      let ratesData = null;
      if (spot.rates) {
        try {
          ratesData = typeof spot.rates === 'string' ? JSON.parse(spot.rates) : spot.rates;
        } catch (e) {
          console.warn(`料金データパース失敗 for ${spot.name}:`, e);
        }
      }

      // nearest_convenience_storeとnearest_hotspringをパース
      let nearestConvenienceStore = null;
      if (spot.nearest_convenience_store) {
        try {
          nearestConvenienceStore = typeof spot.nearest_convenience_store === 'string'
            ? JSON.parse(spot.nearest_convenience_store)
            : spot.nearest_convenience_store;
        } catch (e) {
          console.warn(`コンビニデータパース失敗 for ${spot.name}:`, e);
        }
      }

      let nearestHotspring = null;
      if (spot.nearest_hotspring) {
        try {
          nearestHotspring = typeof spot.nearest_hotspring === 'string'
            ? JSON.parse(spot.nearest_hotspring)
            : spot.nearest_hotspring;
        } catch (e) {
          console.warn(`温泉データパース失敗 for ${spot.name}:`, e);
        }
      }

      let nearestToilet = null;
      if (spot.nearest_toilet) {
        try {
          nearestToilet = typeof spot.nearest_toilet === 'string'
            ? JSON.parse(spot.nearest_toilet)
            : spot.nearest_toilet;
        } catch (e) {
          console.warn(`トイレデータパース失敗 for ${spot.name}:`, e);
        }
      }

      // 営業時間チェック
      const parkingStartTime = entryAt || new Date();
      const isOpenDuringParking = ParkingHoursService.isOpenDuringParkingTime(
        hoursData,
        parkingStartTime,
        durationMinutes
      );

      const result = {
        id: spot.id,
        name: spot.name,
        lat: spot.latitude || spot.lat,  // RPCからはlatitude、通常のクエリからはlat
        lng: spot.longitude || spot.lng,  // RPCからはlongitude、通常のクエリからはlng
        category: 'コインパーキング' as const,
        address: spot.address,
        capacity: spot.capacity,
        rates: ratesData,
        hours: hoursData,
        elevation: spot.elevation,
        parkingType: spot.type, // 駐車場タイプ
        nearestConvenienceStore: nearestConvenienceStore,
        nearestHotspring: nearestHotspring,
        nearest_toilet: nearestToilet,
        calculatedFee: spot.calculated_fee, // バックエンドで計算された料金
        rank: spot.rank, // バックエンドで付与されたランキング
        isOpenDuringParking, // 営業時間内かのフラグ
        operatingStatus: ParkingHoursService.getOperatingStatus(
          hoursData,
          parkingStartTime,
          durationMinutes
        ) // 営業状態の文字列
      } as CoinParking;

      // デバッグ用に最初の3件の結果をログ出力
      if (index < 3) {
        console.log(`✅ 変換後スポット[${index}]:`, {
          name: result.name,
          calculatedFee: result.calculatedFee,
          rank: result.rank,
          isOpenDuringParking: result.isOpenDuringParking,
          operatingStatus: result.operatingStatus,
          parkingType: result.parkingType,
          type: spot.type,
          元データtype: spot.type
        });
      }

      return result;
    });

    // クライアント側でフィルターを適用
    let results = mapped;

    // 標高フィルター（elevationが未取得のスポットは除外しない＝温存）
    if (minElevation !== undefined && minElevation > 0) {
      results = results.filter(s => (s as any).elevation == null || (s as any).elevation >= minElevation);
    }

    // 営業時間外の駐車場を除外
    const openSpots = results.filter(spot => spot.isOpenDuringParking);
    const closedSpots = results.filter(spot => !spot.isOpenDuringParking);

    if (closedSpots.length > 0) {
      console.log(`⏰ 営業時間外の駐車場を${closedSpots.length}件除外しました:`,
        closedSpots.slice(0, 3).map(s => `${s.name} (${s.operatingStatus})`));
    }

    // 営業時間内の駐車場のみを返す
    results = openSpots;

    return { spots: results, totalCount };
  }
  
  // Fetch convenience store details by ID
  static async fetchConvenienceStoreById(id: string): Promise<ConvenienceStore | null> {
    if (!id) return null;
    console.log(`🏪 コンビニ詳細取得: ID=${id}`);

    // いくつかの列名を試して解決（id, idString, code, external_id）
    const tryFetch = async () => {
      // 1) id で一致
      let q = supabase.from('convenience_stores').select('*').eq('id', id).limit(1);
      let { data, error } = await q;
      if (!error && data && data[0]) return data[0];

      // 2) or 条件で別名列を試す
      const { data: alt, error: err2 } = await supabase
        .from('convenience_stores')
        .select('*')
        // idString/code/external_id など存在する場合にヒットさせる
        .or(`idString.eq.${id},code.eq.${id},external_id.eq.${id}`)
        .limit(1);
      if (!err2 && alt && alt[0]) return alt[0];
      return null;
    };

    const raw = await tryFetch();
    if (!raw) {
      console.warn(`🏪 コンビニID解決失敗: ${id}`);
      return null;
    }

    const lat = Number((raw as any).lat ?? (raw as any).latitude);
    const lng = Number((raw as any).lng ?? (raw as any).longitude);

    return {
      ...raw,
      lat,
      lng,
      idString: (raw as any).idString || (raw as any).id,
      category: 'コンビニ',
      brand: (raw as any).brand || (raw as any).name,
      phone: (raw as any).phone_number || (raw as any).phone,
      hours: (raw as any).operating_hours || (raw as any).hours,
      operatingHours: (raw as any).operating_hours || (raw as any).Hours || (raw as any).operatingHours,
    } as ConvenienceStore;
  }
  
  // Fetch hot spring details by ID
  static async fetchHotSpringById(id: string): Promise<HotSpring | null> {
    if (!id) return null;
    console.log(`♨️ 温泉詳細取得: ID=${id}`);

    const tryFetch = async () => {
      let { data, error } = await supabase.from('hot_springs').select('*').eq('id', id).limit(1);
      if (!error && data && data[0]) return data[0];
      const { data: alt, error: err2 } = await supabase
        .from('hot_springs')
        .select('*')
        .or(`idString.eq.${id},code.eq.${id},external_id.eq.${id}`)
        .limit(1);
      if (!err2 && alt && alt[0]) return alt[0];
      return null;
    };

    const raw = await tryFetch();
    if (!raw) {
      console.warn(`♨️ 温泉ID解決失敗: ${id}`);
      return null;
    }

    const lat = Number((raw as any).lat ?? (raw as any).latitude);
    const lng = Number((raw as any).lng ?? (raw as any).longitude);

    return {
      ...raw,
      lat,
      lng,
      category: '温泉',
      operatingHours: (raw as any).Hours || (raw as any).operating_hours || (raw as any).operatingHours,
    } as HotSpring;
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
          id: store.id,
          idString: store.id,
          category: 'コンビニ' as const,
          lat: store.lat || store.latitude,
          lng: store.lng || store.longitude,
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
          id: spring.id,
          category: '温泉' as const,
          lat: spring.lat || spring.latitude,
          lng: spring.lng || spring.longitude,
          operatingHours: spring.Hours || spring.operating_hours || spring.operatingHours,
        })) as HotSpring[];

        console.log(`♨️ ${results.hotsprings.length}件の温泉詳細を取得`);
      }
    }
    
    return results;
  }

  // Fetch nearby convenience stores around a lat/lng within radius (meters)
  static async fetchNearbyConvenienceStoresAround(
    lat: number,
    lng: number,
    radiusMeters: number,
    limit: number = 1
  ): Promise<ConvenienceStore[]> {
    if (!lat || !lng || !radiusMeters || radiusMeters <= 0) return [];

    const latDelta = radiusMeters / 111000; // approx meters to degrees
    const lngDelta = radiusMeters / (111000 * Math.cos((lat * Math.PI) / 180));

    const minLat = lat - latDelta;
    const maxLat = lat + latDelta;
    const minLng = lng - lngDelta;
    const maxLng = lng + lngDelta;

    const { data, error } = await supabase
      .from('convenience_stores')
      .select('*')
      .gte('lat', minLat)
      .lte('lat', maxLat)
      .gte('lng', minLng)
      .lte('lng', maxLng)
      .limit(200);

    if (error || !data) return [];

    // Compute distance and return nearest
    const withDist = data.map((s: any) => ({
      ...s,
      _dist: Math.hypot((s.lat - lat) * 111000, (s.lng - lng) * 111000 * Math.cos((lat * Math.PI) / 180))
    }))
      .filter(s => s._dist <= radiusMeters)
      .sort((a, b) => a._dist - b._dist)
      .slice(0, limit)
      .map(store => ({
        ...store,
        idString: store.id,
        category: 'コンビニ',
        brand: store.brand || store.name,
        operatingHours: store.Hours || store.operating_hours || store.operatingHours,
      } as ConvenienceStore));

    return withDist;
  }

  // Fetch nearby hot springs around a lat/lng within radius (meters)
  static async fetchNearbyHotSpringsAround(
    lat: number,
    lng: number,
    radiusMeters: number,
    limit: number = 1
  ): Promise<HotSpring[]> {
    if (!lat || !lng || !radiusMeters || radiusMeters <= 0) return [];

    const latDelta = radiusMeters / 111000;
    const lngDelta = radiusMeters / (111000 * Math.cos((lat * Math.PI) / 180));

    const minLat = lat - latDelta;
    const maxLat = lat + latDelta;
    const minLng = lng - lngDelta;
    const maxLng = lng + lngDelta;

    const { data, error } = await supabase
      .from('hot_springs')
      .select('*')
      .gte('lat', minLat)
      .lte('lat', maxLat)
      .gte('lng', minLng)
      .lte('lng', maxLng)
      .limit(200);

    if (error || !data) return [];

    const withDist = data.map((s: any) => ({
      ...s,
      _dist: Math.hypot((s.lat - lat) * 111000, (s.lng - lng) * 111000 * Math.cos((lat * Math.PI) / 180))
    }))
      .filter(s => s._dist <= radiusMeters)
      .sort((a, b) => a._dist - b._dist)
      .slice(0, limit)
      .map(spring => ({
        ...spring,
        category: '温泉',
        operatingHours: spring.Hours || spring.operating_hours || spring.operatingHours,
      } as HotSpring));

    return withDist;
  }

  // Fetch nearby toilets around a lat/lng within radius (meters)
  static async fetchNearbyToiletsAround(
    lat: number,
    lng: number,
    radiusMeters: number,
    limit: number = 1
  ): Promise<Toilet[]> {
    if (!lat || !lng || !radiusMeters || radiusMeters <= 0) return [];

    const latDelta = radiusMeters / 111000;
    const lngDelta = radiusMeters / (111000 * Math.cos((lat * Math.PI) / 180));

    const minLat = lat - latDelta;
    const maxLat = lat + latDelta;
    const minLng = lng - lngDelta;
    const maxLng = lng + lngDelta;

    const { data, error } = await supabase
      .from('toilets')
      .select('*')
      .gte('lat', minLat)
      .lte('lat', maxLat)
      .gte('lng', minLng)
      .lte('lng', maxLng)
      .limit(200);

    if (error || !data) return [];

    const withDist = data.map((s: any) => ({
      ...s,
      _dist: Math.hypot((s.lat - lat) * 111000, (s.lng - lng) * 111000 * Math.cos((lat * Math.PI) / 180))
    }))
      .filter(s => s._dist <= radiusMeters)
      .sort((a, b) => a._dist - b._dist)
      .slice(0, limit)
      .map(t => ({
        ...t,
        id: `toilet_${t.id}`,
        idNumber: t.id,
        category: 'トイレ',
      } as Toilet));

    return withDist;
  }
}
