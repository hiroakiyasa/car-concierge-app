// Base Spot interface
export interface Spot {
  id: string;
  name: string;
  lat: number;
  lng: number;
  category: string;
  type?: string;
  description?: string;
  address?: string;
  rating?: number;
  quietness?: number;
  rank?: number;
  prefecture?: string;
  elevation?: number;
}

// Parking specific interfaces
export interface ParkingRate {
  id: string;
  type: string; // "base", "max", "conditional_free"
  minutes: number;
  price: number;
  timeRange?: string;
  dayType?: string;
  applyAfter?: number;
}

export interface HoursInfo {
  hours?: string;
  is_24h?: boolean;
  holidays?: string[];
  schedules?: Schedule[];
  access_24h?: boolean;
  closed_days?: string[];
  restrictions?: string[];
  operating_days?: string[];
  original_hours?: string;
}

export interface Schedule {
  days?: string[];
  time?: string;
}

export interface VehicleDimensions {
  height?: number;
  width?: number;
  length?: number;
  weight?: number;
}

export interface NearbyFacility {
  id: string;
  name: string;
  distance: number;
}

export interface CoinParking extends Spot {
  originalFees?: string;
  rates: ParkingRate[];
  hours?: HoursInfo;
  capacity?: number;
  paymentMethods?: string;
  restrictions?: string;
  vehicleDimensions?: VehicleDimensions;
  calculatedFee?: number;
  nearestConvenienceStore?: NearbyFacility;
  nearestHotspring?: NearbyFacility;
}

// Other spot types
export interface HotSpring extends Spot {
  price?: string;
  operatingHours?: string;
  holidayInfo?: string;
  facilityType?: string;
}

export interface ConvenienceStore extends Spot {
  idString: string;
  brand?: string;
  subType?: string;
  phoneNumber?: string;
  operatingHours?: string;
}

export interface GasStation extends Spot {
  brand?: string;
  services?: string[];
  operatingHours?: string;
}

export interface Festival extends Spot {
  eventDate?: string;
  eventType?: string;
}

// Search and filter types
export interface ParkingDuration {
  startDate: Date;
  duration: number; // in seconds
  get endDate(): Date;
  get durationInMinutes(): number;
  get formattedDuration(): string;
}

export interface SearchFilter {
  selectedCategories: Set<string>;
  searchRadius: number;
  minElevation: number;
  parkingTimeFilterEnabled: boolean;
  radiusFilterEnabled: boolean;
  elevationFilterEnabled: boolean;
  nearbyCategories: Set<string>;
  convenienceStoreRadius: number;
  hotSpringRadius: number;
  showFlatParking: boolean;
  showMultiStoryParking: boolean;
  showMechanicalParking: boolean;
  parkingDuration: ParkingDuration;
  nearbyFilterEnabled?: boolean;
  nearbyRadius?: number;
  nearbyCategory?: 'convenience' | 'hotspring';
}

// Map types
export interface Region {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

export interface Location {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp?: number;
}

// UI State types
export interface MainStore {
  searchFilter: SearchFilter;
  searchResults: Spot[];
  selectedSpot: Spot | null;
  mapRegion: Region;
  showingSpotDetail: boolean;
  isLoading: boolean;
  errorMessage: string | null;
  userLocation: Location | null;
  locationPermission: 'granted' | 'denied' | 'restricted' | null;
}

// Category constants
export const CATEGORIES = {
  PARKING: 'コインパーキング',
  CONVENIENCE: 'コンビニ',
  HOT_SPRING: '温泉',
  FESTIVAL: 'お祭り・花火大会',
  GAS_STATION: 'ガソリンスタンド',
} as const;

export const CATEGORY_EMOJIS: Record<string, string> = {
  [CATEGORIES.PARKING]: '🅿️',
  [CATEGORIES.CONVENIENCE]: '🏪',
  [CATEGORIES.HOT_SPRING]: '♨️',
  [CATEGORIES.FESTIVAL]: '🎆',
  [CATEGORIES.GAS_STATION]: '⛽',
};

export const CATEGORY_COLORS: Record<string, string> = {
  [CATEGORIES.PARKING]: '#1976d2',
  [CATEGORIES.CONVENIENCE]: '#4CAF50',
  [CATEGORIES.HOT_SPRING]: '#E91E63',
  [CATEGORIES.FESTIVAL]: '#9C27B0',
  [CATEGORIES.GAS_STATION]: '#FF9800',
};