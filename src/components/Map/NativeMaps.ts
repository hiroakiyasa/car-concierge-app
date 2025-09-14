// Native-only exports for react-native-maps
// This file should only be imported on native platforms
import { Platform } from 'react-native';

let MapView: any;
let Marker: any;
let PROVIDER_GOOGLE: any;
let Callout: any;

// Only load react-native-maps on native platforms
if (Platform.OS !== 'web') {
  try {
    const ReactNativeMaps = require('react-native-maps');
    MapView = ReactNativeMaps.default || ReactNativeMaps.MapView;
    Marker = ReactNativeMaps.Marker;
    PROVIDER_GOOGLE = ReactNativeMaps.PROVIDER_GOOGLE;
    Callout = ReactNativeMaps.Callout;
  } catch (e) {
    console.warn('Failed to load react-native-maps:', e);
    // Fallback for environments where react-native-maps is not available
    MapView = () => null;
    Marker = () => null;
    PROVIDER_GOOGLE = undefined;
    Callout = () => null;
  }
} else {
  // Web fallback
  MapView = () => null;
  Marker = () => null;
  PROVIDER_GOOGLE = undefined;
  Callout = () => null;
}

export { MapView, Marker, PROVIDER_GOOGLE, Callout };