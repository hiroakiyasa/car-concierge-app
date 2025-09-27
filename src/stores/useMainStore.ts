import { create } from 'zustand';
import { Spot, SearchFilter, Location, Region, ParkingDuration } from '@/types';
import { DEFAULT_REGION } from '@/utils/constants';

interface MainStore {
  // State
  searchFilter: SearchFilter;
  searchResults: Spot[];
  selectedSpot: Spot | null;
  mapRegion: Region;
  showingSpotDetail: boolean;
  isLoading: boolean;
  errorMessage: string | null;
  userLocation: Location | null;
  locationPermission: 'granted' | 'denied' | 'restricted' | null;
  
  // Actions
  setSearchFilter: (filter: Partial<SearchFilter>) => void;
  setSearchResults: (results: Spot[]) => void;
  selectSpot: (spot: Spot | null) => void;
  setMapRegion: (region: Region) => void;
  setShowingSpotDetail: (showing: boolean) => void;
  setIsLoading: (loading: boolean) => void;
  setErrorMessage: (message: string | null) => void;
  setUserLocation: (location: Location | null) => void;
  setLocationPermission: (permission: 'granted' | 'denied' | 'restricted' | null) => void;
  toggleCategory: (category: string) => void;
  resetState: () => void;
}

const createDefaultSearchFilter = (): SearchFilter => ({
  selectedCategories: new Set(['コインパーキング']),
  searchRadius: 500,
  minElevation: 0,
  // デフォルトで「駐車料金」チェックをON
  parkingTimeFilterEnabled: true,
  radiusFilterEnabled: false,
  elevationFilterEnabled: false,
  nearbyCategories: new Set(['コンビニ']),
  convenienceStoreRadius: 30,
  hotSpringRadius: 0,
  showFlatParking: true,
  showMultiStoryParking: true,
  showMechanicalParking: true,
  parkingDuration: {
    startDate: new Date(),
    duration: 3600, // デフォルトを1時間に戻す
    get endDate() {
      return new Date(this.startDate.getTime() + this.duration * 1000);
    },
    get durationInMinutes() {
      return Math.round(this.duration / 60);
    },
    get formattedDuration() {
      const hours = Math.floor(this.duration / 3600);
      const minutes = Math.floor((this.duration % 3600) / 60);
      if (hours > 0) {
        return `${hours}時間${minutes > 0 ? `${minutes}分` : ''}`;
      }
      return `${minutes}分`;
    },
  } as ParkingDuration,
});

export const useMainStore = create<MainStore>((set, get) => ({
  // Initial State
  searchFilter: createDefaultSearchFilter(),
  searchResults: [],
  selectedSpot: null,
  mapRegion: DEFAULT_REGION,
  showingSpotDetail: false,
  isLoading: false,
  errorMessage: null,
  userLocation: null,
  locationPermission: null,
  
  // Actions
  setSearchFilter: (filter) => set((state) => ({
    searchFilter: { ...state.searchFilter, ...filter }
  })),
  
  setSearchResults: (results) => set({ searchResults: results }),
  
  selectSpot: (spot) => set({ selectedSpot: spot }),
  
  setMapRegion: (region) => set({ mapRegion: region }),
  
  setShowingSpotDetail: (showing) => set({ showingSpotDetail: showing }),
  
  setIsLoading: (loading) => set({ isLoading: loading }),
  
  setErrorMessage: (message) => set({ errorMessage: message }),
  
  setUserLocation: (location) => set({ userLocation: location }),
  
  setLocationPermission: (permission) => set({ locationPermission: permission }),
  
  toggleCategory: (category) => set((state) => {
    const newCategories = new Set(state.searchFilter.selectedCategories);
    if (newCategories.has(category)) {
      newCategories.delete(category);
    } else {
      newCategories.add(category);
    }
    return {
      searchFilter: {
        ...state.searchFilter,
        selectedCategories: newCategories,
      },
    };
  }),
  
  resetState: () => set({
    searchFilter: createDefaultSearchFilter(),
    searchResults: [],
    selectedSpot: null,
    mapRegion: DEFAULT_REGION,
    showingSpotDetail: false,
    isLoading: false,
    errorMessage: null,
  }),
}));
