import React from 'react';
import { View, Text, StyleSheet, Image, Platform } from 'react-native';

// プラットフォームに応じてマップコンポーネントを条件付きインポート
let Marker: any;
let Callout: any;

if (Platform.OS === 'web') {
  const { WebMarker: WebMarkerComp, WebCallout: WebCalloutComp } = require('./WebMapView');
  Marker = WebMarkerComp;
  Callout = WebCalloutComp;
} else {
  const ReactNativeMaps = require('react-native-maps');
  Marker = ReactNativeMaps.Marker;
  Callout = ReactNativeMaps.Callout;
}
import { Spot, ConvenienceStore, GasStation, CoinParking } from '@/types';
import { getConvenienceStoreLogo, getGasStationLogo } from '@/utils/brandLogos';
import { Colors } from '@/utils/constants';

interface CustomMarkerProps {
  spot: Spot;
  rank?: number | null;
  onPress?: () => void;
  calculatedFee?: number;
  isSelected?: boolean;
  isNearbyFacility?: boolean; // 最寄り施設フラグを追加
}

const getMarkerColor = (category: string): string => {
  switch (category) {
    case 'コインパーキング': return '#007AFF'; // iOSブルー
    case 'コンビニ': return '#FF9500'; // オレンジ
    case '温泉': return '#FFD700'; // 黄色（ゴールド）
    case 'ガソリンスタンド': return '#FF3B30'; // 赤
    case 'お祭り・花火大会': return '#AF52DE'; // 紫
    default: return '#8E8E93';
  }
};

const getMarkerIcon = (category: string): string => {
  switch (category) {
    case 'コインパーキング': return 'P';
    case 'コンビニ': return '🏪';
    case '温泉': return '♨️';
    case 'ガソリンスタンド': return '⛽';
    case 'お祭り・花火大会': return '🎆';
    default: return '📍';
  }
};

export const CustomMarker: React.FC<CustomMarkerProps> = ({ spot, rank, onPress, calculatedFee, isSelected, isNearbyFacility }) => {
  const [calloutVisible, setCalloutVisible] = React.useState(false);
  
  // 選択されたマーカーは自動的に吹き出しを表示
  React.useEffect(() => {
    if (isSelected) {
      setCalloutVisible(true);
    }
  }, [isSelected]);

  // マーカータップ時の処理
  const handleMarkerPress = () => {
    if (!calloutVisible) {
      // 初回タップ：吹き出しを表示
      setCalloutVisible(true);
    } else {
      // 2回目タップ：詳細画面を表示
      if (onPress) onPress();
    }
  };

  // 吹き出しタップ時の処理
  const handleCalloutPress = () => {
    if (onPress) onPress();
  };
  
  // コンビニとガソリンスタンドのロゴを取得
  const getLogoForSpot = () => {
    if (spot.category === 'コンビニ') {
      const store = spot as ConvenienceStore;
      if (store.brand || store.name) {
        return getConvenienceStoreLogo(store.brand || store.name);
      }
    } else if (spot.category === 'ガソリンスタンド') {
      const station = spot as GasStation;
      if (station.brand || station.name) {
        return getGasStationLogo(station.brand || station.name);
      }
    }
    return null;
  };
  
  const logo = getLogoForSpot();
  
  // コンビニやガソリンスタンドでロゴがある場合
  if (logo) {
    return (
      <Marker
        coordinate={{
          latitude: spot.lat,
          longitude: spot.lng,
        }}
        onPress={handleMarkerPress}
        tracksViewChanges={false}
        anchor={{ x: 0.5, y: 0.5 }}
      >
        <View style={[
          styles.logoMarker,
          isNearbyFacility && styles.nearbyFacilityLogoMarker // 最寄り施設の場合は青い枠を追加
        ]}>
          <Image source={logo} style={styles.logoImage} resizeMode="contain" />
        </View>
        <Callout tooltip onPress={handleCalloutPress}>
          <View style={styles.calloutContainer}>
            <Text style={styles.calloutName} numberOfLines={1}>{spot.name}</Text>
          </View>
        </Callout>
      </Marker>
    );
  }
  
  // For parking spots with ranking, show custom marker with rank-based color
  if (spot.category === 'コインパーキング' && rank && rank <= 20) {
    // 1位=ゴールド、2位=シルバー、3位=ブロンズ、その他=ブルー
    const getMarkerStyle = () => {
      const baseStyle = (() => {
        switch(rank) {
          case 1: return styles.goldMarker;
          case 2: return styles.silverMarker;
          case 3: return styles.bronzeMarker;
          default: return styles.parkingMarker;
        }
      })();
      
      // 選択されている場合は強調表示
      if (isSelected) {
        return [baseStyle, styles.selectedMarker];
      }
      return baseStyle;
    };
    
    // 料金をフォーマット
    const formatPrice = () => {
      // calculatedFeeが渡されている場合（ランキング表示時）
      if (calculatedFee !== undefined && calculatedFee !== null && calculatedFee >= 0) {
        return calculatedFee === 0 ? '無料' : `¥${calculatedFee.toLocaleString()}`;
      }
      
      // spotにcalculatedFeeが含まれている場合
      const parking = spot as CoinParking;
      if (parking.calculatedFee !== undefined && parking.calculatedFee !== null && parking.calculatedFee >= 0) {
        return parking.calculatedFee === 0 ? '無料' : `¥${parking.calculatedFee.toLocaleString()}`;
      }
      
      // hourly_priceがある場合（レガシーフィールド）
      if (parking.hourly_price) {
        return `¥${parking.hourly_price}/時間`;
      }
      
      // rates配列から基本料金を取得
      if (parking.rates && parking.rates.length > 0) {
        const baseRate = parking.rates.find(r => r.type === 'base');
        if (baseRate) {
          return `${baseRate.minutes}分 ¥${baseRate.price}`;
        }
      }
      
      return '料金情報なし';
    };
    
    return (
      <Marker
        coordinate={{
          latitude: spot.lat,
          longitude: spot.lng,
        }}
        onPress={handleMarkerPress}
        tracksViewChanges={false}
        anchor={{ x: 0.5, y: 1 }}
      >
        <View style={getMarkerStyle()}>
          <Text style={styles.parkingMarkerText}>{rank}</Text>
        </View>
        <Callout tooltip onPress={handleCalloutPress}>
          <View style={styles.parkingCalloutContainer}>
            <View style={styles.parkingCalloutHeader}>
              <View style={[styles.calloutRankBadge, 
                rank === 1 && styles.goldBadge,
                rank === 2 && styles.silverBadge,
                rank === 3 && styles.bronzeBadge
              ]}>
                <Text style={styles.calloutRankText}>{rank}</Text>
              </View>
              <Text style={styles.parkingCalloutPrice}>{formatPrice()}</Text>
            </View>
            <Text style={styles.parkingCalloutName}>{spot.name}</Text>
          </View>
        </Callout>
      </Marker>
    );
  }

  // For other categories, show colored marker with icon
  return (
    <Marker
      coordinate={{
        latitude: spot.lat,
        longitude: spot.lng,
      }}
      onPress={handleMarkerPress}
      tracksViewChanges={false}
      anchor={{ x: 0.5, y: 1 }}
    >
      <View style={[
        styles.categoryMarker, 
        { backgroundColor: getMarkerColor(spot.category) },
        isNearbyFacility && styles.nearbyFacilityMarker // 最寄り施設の場合は目立つ枠を追加
      ]}>
        <Text style={styles.categoryMarkerIcon}>{getMarkerIcon(spot.category)}</Text>
      </View>
      <Callout tooltip onPress={handleCalloutPress}>
        <View style={styles.calloutContainer}>
          <Text style={styles.calloutName}>{spot.name}</Text>
        </View>
      </Callout>
    </Marker>
  );
};

const styles = StyleSheet.create({
  parkingMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  goldMarker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFD700',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 6,
  },
  silverMarker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#C0C0C0',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
  bronzeMarker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#CD7F32',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#CD7F32',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
  selectedMarker: {
    transform: [{ scale: 1.3 }],
    borderColor: '#FF0000',
    borderWidth: 4,
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 10,
  },
  parkingMarkerText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  categoryMarker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  categoryMarkerIcon: {
    fontSize: 18,
  },
  nearbyFacilityMarker: {
    borderWidth: 4,
    borderColor: '#007AFF', // 青色の太い枠
    shadowColor: '#007AFF',
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 8,
    transform: [{ scale: 1.1 }], // 少し大きく表示
  },
  logoMarker: {
    width: 40,
    height: 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nearbyFacilityLogoMarker: {
    borderWidth: 4,
    borderColor: '#007AFF', // 青色の太い枠
    shadowColor: '#007AFF',
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 8,
    transform: [{ scale: 1.1 }], // 少し大きく表示
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  logoImage: {
    width: 32,
    height: 32,
  },
  // 駐車場用の吹き出しスタイル
  parkingCalloutContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 10,
    minWidth: 150,
    maxWidth: 280,  // 最大幅を広げて長い名前に対応
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  parkingCalloutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 6,
  },
  calloutRankBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goldBadge: {
    backgroundColor: '#FFD700',
  },
  silverBadge: {
    backgroundColor: '#C0C0C0',
  },
  bronzeBadge: {
    backgroundColor: '#CD7F32',
  },
  calloutRankText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  parkingCalloutPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary,
    flex: 1,
  },
  parkingCalloutName: {
    fontSize: 12,
    color: '#333',
    lineHeight: 16,
    flexWrap: 'wrap',  // 長い名前を折り返し表示
  },
  calloutTapHint: {
    fontSize: 11,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 4,
  },
  // その他のカテゴリー用の吹き出しスタイル
  calloutContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 10,
    minWidth: 120,
    maxWidth: 280,  // 最大幅を広げて長い名前に対応
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  calloutName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    flexWrap: 'wrap',  // 長い名前を折り返し表示
    lineHeight: 18,    // 読みやすい行間
  },
});