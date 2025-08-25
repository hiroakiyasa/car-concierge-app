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
  
  static async getCurrentLocation(): Promise<LocationType | null> {
    try {
      const permission = await this.requestPermission();
      
      if (permission !== 'granted') {
        console.log('Location permission not granted');
        // Return Tokyo Station as default
        return {
          latitude: 35.6812,
          longitude: 139.7671,
          accuracy: 0,
          timestamp: Date.now(),
        };
      }
      
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      
      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy ?? undefined,
        timestamp: location.timestamp,
      };
    } catch (error) {
      console.log('Location error (using default):', error);
      // Return Tokyo Station as default when error occurs
      return {
        latitude: 35.6812,
        longitude: 139.7671,
        accuracy: 0,
        timestamp: Date.now(),
      };
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