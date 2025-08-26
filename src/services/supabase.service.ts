import { supabase } from '@/config/supabase';
import { Spot, CoinParking, HotSpring, ConvenienceStore, GasStation, Festival, Region } from '@/types';

export class SupabaseService {
  // Fetch parking spots within a region
  static async fetchParkingSpots(region: Region): Promise<CoinParking[]> {
    const { latitude, longitude, latitudeDelta, longitudeDelta } = region;
    
    // latitudeDelta と longitudeDelta は表示範囲全体の幅なので、半分にして中心から加減算
    const minLat = latitude - (latitudeDelta / 2);
    const maxLat = latitude + (latitudeDelta / 2);
    const minLng = longitude - (longitudeDelta / 2);
    const maxLng = longitude + (longitudeDelta / 2);
    
    const { data, error } = await supabase
      .from('parking_spots')
      .select('*')
      .gte('lat', minLat)
      .lte('lat', maxLat)
      .gte('lng', minLng)
      .lte('lng', maxLng)
      .limit(100);
    
    if (error) {
      console.error('Error fetching parking spots:', error);
      return [];
    }
    
    return (data || []).map(spot => ({
      ...spot,
      category: 'コインパーキング',
      rates: spot.rates || [],
    })) as CoinParking[];
  }
  
  // Fetch convenience stores
  static async fetchConvenienceStores(region: Region): Promise<ConvenienceStore[]> {
    const { latitude, longitude, latitudeDelta, longitudeDelta } = region;
    
    const minLat = latitude - (latitudeDelta / 2);
    const maxLat = latitude + (latitudeDelta / 2);
    const minLng = longitude - (longitudeDelta / 2);
    const maxLng = longitude + (longitudeDelta / 2);
    
    const { data, error } = await supabase
      .from('convenience_stores')
      .select('*')
      .gte('lat', minLat)
      .lte('lat', maxLat)
      .gte('lng', minLng)
      .lte('lng', maxLng)
      .limit(50);
    
    if (error) {
      console.error('Error fetching convenience stores:', error);
      return [];
    }
    
    return (data || []).map(store => ({
      ...store,
      idString: store.id,
      category: 'コンビニ',
    })) as ConvenienceStore[];
  }
  
  // Fetch hot springs
  static async fetchHotSprings(region: Region): Promise<HotSpring[]> {
    const { latitude, longitude, latitudeDelta, longitudeDelta } = region;
    
    const minLat = latitude - (latitudeDelta / 2);
    const maxLat = latitude + (latitudeDelta / 2);
    const minLng = longitude - (longitudeDelta / 2);
    const maxLng = longitude + (longitudeDelta / 2);
    
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
    
    return (data || []).map(spring => ({
      ...spring,
      category: '温泉',
    })) as HotSpring[];
  }
  
  // Fetch gas stations
  static async fetchGasStations(region: Region): Promise<GasStation[]> {
    const { latitude, longitude, latitudeDelta, longitudeDelta } = region;
    
    const minLat = latitude - (latitudeDelta / 2);
    const maxLat = latitude + (latitudeDelta / 2);
    const minLng = longitude - (longitudeDelta / 2);
    const maxLng = longitude + (longitudeDelta / 2);
    
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
    
    return (data || []).map(station => ({
      ...station,
      category: 'ガソリンスタンド',
    })) as GasStation[];
  }
  
  // Fetch festivals
  static async fetchFestivals(region: Region): Promise<Festival[]> {
    const { latitude, longitude, latitudeDelta, longitudeDelta } = region;
    
    const minLat = latitude - (latitudeDelta / 2);
    const maxLat = latitude + (latitudeDelta / 2);
    const minLng = longitude - (longitudeDelta / 2);
    const maxLng = longitude + (longitudeDelta / 2);
    
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
    
    return (data || []).map(festival => ({
      ...festival,
      category: 'お祭り・花火大会',
    })) as Festival[];
  }
  
  // Fetch all spots by category
  static async fetchSpotsByCategories(
    region: Region,
    categories: Set<string>
  ): Promise<Spot[]> {
    const results: Spot[] = [];
    
    if (categories.has('コインパーキング')) {
      const parkingSpots = await this.fetchParkingSpots(region);
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
}