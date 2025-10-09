import React, { useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Leafletのデフォルトアイコンの問題を修正
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface WebMapProps {
  region: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  };
  onRegionChangeComplete?: (region: any) => void;
  children?: React.ReactNode;
  markers?: Array<{
    id: string | number;
    coordinate: {
      latitude: number;
      longitude: number;
    };
    title?: string;
    description?: string;
    pinColor?: string;
  }>;
}

export const WebMap: React.FC<WebMapProps> = ({
  region,
  onRegionChangeComplete,
  markers = [],
}) => {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const markersRef = useRef<L.Marker[]>([]);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // regionの検証とデフォルト値へのフォールバック
    const validRegion = {
      latitude: region.latitude && !isNaN(region.latitude) && region.latitude !== 0
        ? region.latitude
        : 35.6812,  // 東京駅
      longitude: region.longitude && !isNaN(region.longitude) && region.longitude !== 0
        ? region.longitude
        : 139.7671,  // 東京駅
      latitudeDelta: region.latitudeDelta && !isNaN(region.latitudeDelta) && region.latitudeDelta > 0
        ? region.latitudeDelta
        : 0.045,  // 上下約5km
    };

    console.log('🗺️ WebMap初期化:', {
      元のregion: region,
      検証後のregion: validRegion,
      計算されたzoom: calculateZoomLevel(validRegion.latitudeDelta)
    });

    // 地図を初期化
    const map = L.map(mapContainerRef.current).setView(
      [validRegion.latitude, validRegion.longitude],
      calculateZoomLevel(validRegion.latitudeDelta)
    );

    // OpenStreetMapタイルを追加
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    // 地図移動終了時のイベント
    map.on('moveend', () => {
      if (onRegionChangeComplete) {
        const center = map.getCenter();
        const bounds = map.getBounds();
        const latitudeDelta = Math.abs(bounds.getNorth() - bounds.getSouth());
        const longitudeDelta = Math.abs(bounds.getEast() - bounds.getWest());

        onRegionChangeComplete({
          latitude: center.lat,
          longitude: center.lng,
          latitudeDelta,
          longitudeDelta,
        });
      }
    });

    mapRef.current = map;

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // リージョンが変更されたら地図を移動
  useEffect(() => {
    if (mapRef.current) {
      // regionの検証
      const validLat = region.latitude && !isNaN(region.latitude) && region.latitude !== 0
        ? region.latitude
        : 35.6812;
      const validLng = region.longitude && !isNaN(region.longitude) && region.longitude !== 0
        ? region.longitude
        : 139.7671;
      const validDelta = region.latitudeDelta && !isNaN(region.latitudeDelta) && region.latitudeDelta > 0
        ? region.latitudeDelta
        : 0.045;

      console.log('🗺️ WebMap地図移動:', { lat: validLat, lng: validLng, delta: validDelta });

      mapRef.current.setView(
        [validLat, validLng],
        calculateZoomLevel(validDelta)
      );
    }
  }, [region.latitude, region.longitude, region.latitudeDelta]);

  // マーカーを更新
  useEffect(() => {
    if (!mapRef.current) return;

    // 既存のマーカーを削除
    markersRef.current.forEach(marker => {
      marker.remove();
    });
    markersRef.current = [];

    // 新しいマーカーを追加
    markers.forEach(markerData => {
      const marker = L.marker([
        markerData.coordinate.latitude,
        markerData.coordinate.longitude,
      ]);

      if (markerData.title || markerData.description) {
        marker.bindPopup(`
          ${markerData.title ? `<b>${markerData.title}</b><br>` : ''}
          ${markerData.description || ''}
        `);
      }

      // カスタムアイコンの色設定
      if (markerData.pinColor) {
        const customIcon = L.divIcon({
          html: `
            <div style="
              background-color: ${markerData.pinColor};
              width: 25px;
              height: 41px;
              position: relative;
              border-radius: 50% 50% 50% 0;
              transform: rotate(-45deg);
              border: 2px solid #fff;
              box-shadow: 0 1px 3px rgba(0,0,0,0.4);
            ">
              <div style="
                position: absolute;
                width: 8px;
                height: 8px;
                background: #fff;
                border-radius: 50%;
                top: 8px;
                left: 8px;
              "></div>
            </div>
          `,
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
          className: 'custom-div-icon',
        });
        marker.setIcon(customIcon);
      }

      marker.addTo(mapRef.current!);
      markersRef.current.push(marker);
    });
  }, [markers]);

  return (
    <View style={styles.container}>
      <div
        ref={mapContainerRef}
        style={{
          width: '100%',
          height: '100%',
          position: 'absolute',
        }}
      />
    </View>
  );
};

// latitudeDeltaからズームレベルを計算
function calculateZoomLevel(latitudeDelta: number): number {
  // 無効な値の場合はデフォルトズームレベルを返す
  if (!latitudeDelta || isNaN(latitudeDelta) || latitudeDelta <= 0) {
    console.warn('⚠️ 無効なlatitudeDelta:', latitudeDelta, 'デフォルトズーム13を使用');
    return 13;  // latitudeDelta = 0.045に相当するズームレベル
  }

  const angle = latitudeDelta;
  const zoom = Math.round(Math.log(360 / angle) / Math.LN2);

  // ズームレベルを1-19の範囲に制限
  const clampedZoom = Math.max(1, Math.min(19, zoom));

  console.log(`🔍 ズームレベル計算: latitudeDelta=${latitudeDelta} → zoom=${clampedZoom}`);

  return clampedZoom;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
});