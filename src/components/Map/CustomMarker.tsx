import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, Platform } from 'react-native';
import Svg, { Circle as SvgCircle } from 'react-native-svg';
import { Marker, Callout } from './CrossPlatformMap';
import { Spot, ConvenienceStore, GasStation, CoinParking, HotSpring } from '@/types';
import { getConvenienceStoreLogo, getGasStationLogo } from '@/utils/brandLogos';
import { Colors } from '@/utils/constants';
import { getGasStationMarkerColor, NATIONAL_AVERAGE_PRICES, formatPriceDifference } from '@/utils/fuelPrices';

interface CustomMarkerProps {
  spot: Spot;
  rank?: number | null;
  onPress?: () => void;
  calculatedFee?: number;
  isSelected?: boolean;
  isNearbyFacility?: boolean;
}

const getMarkerColor = (category: string): string => {
  switch (category) {
    case 'コインパーキング': return '#007AFF';
    case 'コンビニ': return '#FF9500';
    case '温泉': return '#FFD700';
    case 'ガソリンスタンド': return '#FF3B30';
    case 'お祭り・花火大会': return '#AF52DE';
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

export const CustomMarker: React.FC<CustomMarkerProps> = ({
  spot,
  rank,
  onPress,
  calculatedFee,
  isSelected,
  isNearbyFacility
}) => {
  // スポットのデータ検証
  if (!spot || typeof spot.lat !== 'number' || typeof spot.lng !== 'number' || isNaN(spot.lat) || isNaN(spot.lng)) {
    console.error('CustomMarker: Invalid spot data', spot);
    return null;
  }

  // Androidの場合はデバッグログを追加
  if (Platform.OS === 'android' && spot.category === 'コインパーキング' && rank && rank <= 3) {
    console.log(`🤖 Android Marker: ${spot.name}, rank: ${rank}, lat: ${spot.lat}, lng: ${spot.lng}`);
  }

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

  // ANDROID専用の円描画（右下欠け対策: SVGで縁取り+塗りつぶしを描画）
  const AndroidCircle: React.FC<{
    size: number;
    fill: string;
    stroke?: string;
    strokeWidth?: number;
    children?: React.ReactNode;
  }> = ({ size, fill, stroke = '#FFFFFF', strokeWidth = 2, children }) => {
    // 余白は過度に広げず+6pxで解像度差によるブラーを最小化
    const total = size + strokeWidth * 2 + 6;
    const rOuter = (size / 2) + strokeWidth;
    const rInner = size / 2;
    return (
      <View
        style={{ width: total, height: total, alignItems: 'center', justifyContent: 'center' }}
        renderToHardwareTextureAndroid
        collapsable={false}
        needsOffscreenAlphaCompositing
        // レイアウトは特にフックしない（tracks常時true運用）
      >
        <Svg width={total} height={total}>
          {/* 外側: ストローク分を塗る（ボーダーの代替） */}
          <SvgCircle cx={total / 2} cy={total / 2} r={rOuter} fill={stroke} />
          {/* 内側: 実際の塗り */}
          <SvgCircle cx={total / 2} cy={total / 2} r={rInner} fill={fill} />
        </Svg>
        {children ? (
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              {children}
            </View>
          </View>
        ) : null}
      </View>
    );
  };

  // 料金をフォーマット（駐車場用）
  const formatPrice = () => {
    if (calculatedFee !== undefined && calculatedFee !== null && calculatedFee >= 0) {
      return calculatedFee === 0 ? '無料' : `¥${calculatedFee.toLocaleString()}`;
    }

    const parking = spot as CoinParking;
    if (parking.calculatedFee !== undefined && parking.calculatedFee !== null && parking.calculatedFee >= 0) {
      return parking.calculatedFee === 0 ? '無料' : `¥${parking.calculatedFee.toLocaleString()}`;
    }

    // 料金ラベル（簡易版）
    if (parking.rates && parking.rates.length > 0) {
      const baseRates = parking.rates.filter(r => r.type === 'base');
      const progressiveRates = parking.rates.filter(r => r.type === 'progressive');

      // 最初の無料時間 + 以降プログレッシブのパターンを優先表示
      if (baseRates.length > 0 && progressiveRates.length > 0) {
        const firstBase = [...baseRates].sort((a, b) => a.minutes - b.minutes)[0];
        // 適用開始がbase無料時間と一致するprogressiveを選ぶ
        const sortedProgs = [...progressiveRates].sort((a: any, b: any) => (
          (a.apply_after ?? a.applyAfter ?? 0) - (b.apply_after ?? b.applyAfter ?? 0)
        ));
        const matchedProg = sortedProgs.find((p: any) => (p.apply_after ?? p.applyAfter ?? 0) === firstBase.minutes) || sortedProgs[0];

        if (firstBase.price === 0 && matchedProg) {
          // マーカーは短く表記
          return `最初${firstBase.minutes}分無料/以降${matchedProg.minutes}分¥${matchedProg.price}`;
        }
      }

      // 通常の基本料金（無料でない）
      const paidBase = baseRates.find(r => r.price > 0);
      if (paidBase) {
        return `${paidBase.minutes}分 ¥${paidBase.price}`;
      }

      // 基本料金が0円のみの場合は無料時間として表記
      const freeBase = baseRates.find(r => r.price === 0);
      if (freeBase) {
        return `最初${freeBase.minutes}分無料`;
      }
    }

    return '料金情報なし';
  };

  // マーカーのスタイルを取得（駐車場用）
  const getMarkerStyle = () => {
    if (spot.category !== 'コインパーキング' || !rank || rank > 20) {
      return styles.parkingMarker;
    }

    const baseStyle = (() => {
      switch(rank) {
        case 1: return styles.goldMarker;
        case 2: return styles.silverMarker;
        case 3: return styles.bronzeMarker;
        default: return styles.parkingMarker;
      }
    })();

    if (isSelected) {
      return [baseStyle, styles.selectedMarker];
    }
    return baseStyle;
  };

  // ガソリンスタンドの情報取得
  const getGasStationInfo = () => {
    if (spot.category !== 'ガソリンスタンド') return null;
    const gasStation = spot as GasStation;
    const markerColor = getGasStationMarkerColor(gasStation.services);
    const priceDiff = formatPriceDifference(gasStation.services?.regular_price, NATIONAL_AVERAGE_PRICES.regular);
    return { markerColor, priceDiff, isWhite: markerColor === '#FFFFFF' };
  };

  const gasInfo = getGasStationInfo();

  // Androidでのカスタムビューの問題を回避するため、シンプルな実装にする
  const renderMarkerContent = () => {
    // Androidの場合はマーカーをラップするコンテナを追加
    const wrapInContainer = (content: React.ReactNode) => {
      if (Platform.OS === 'android') {
        return (
          <View
            style={styles.androidMarkerContainer}
            // Androidでのビットマップ化時の端欠けを防止
            renderToHardwareTextureAndroid
            collapsable={false}
          >
            {content}
          </View>
        );
      }
      return content;
    };
    // ガソリンスタンドでロゴがある場合
    if (spot.category === 'ガソリンスタンド' && logo && gasInfo) {
      // Androidではシンプルな円形マーカーを使用
      if (Platform.OS === 'android') {
        return (
          <AndroidCircle size={32} fill={gasInfo.markerColor} stroke="#FFFFFF" strokeWidth={2}>
            <Text style={styles.simpleMarkerText}>⛽</Text>
          </AndroidCircle>
        );
      }

      // iOSでは詳細なデザインを使用
      return (
        <View style={[
          styles.gasStationLogoMarker,
          {
            backgroundColor: gasInfo.markerColor,
            borderColor: gasInfo.isWhite ? '#CCCCCC' : '#FFFFFF'
          },
          isNearbyFacility && styles.nearbyFacilityGasLogoMarker
        ]}>
          <View style={styles.gasLogoInnerContainer}>
            <Image source={logo} style={styles.gasLogoImage} resizeMode="contain" />
          </View>
        </View>
      );
    }

    // コンビニでロゴがある場合
    if (spot.category === 'コンビニ' && logo) {
      // Androidではシンプルな円形マーカーを使用
      if (Platform.OS === 'android') {
        return (
          <AndroidCircle size={32} fill={'#FF9500'} stroke="#FFFFFF" strokeWidth={2}>
            <Text style={styles.simpleMarkerText}>🏪</Text>
          </AndroidCircle>
        );
      }

      // iOSでは詳細なデザインを使用
      return (
        <View style={[
          styles.logoMarker,
          isNearbyFacility && styles.nearbyFacilityLogoMarker
        ]}>
          <Image source={logo} style={styles.logoImage} resizeMode="contain" />
        </View>
      );
    }

    // 駐車場（ランキング表示）
    if (spot.category === 'コインパーキング' && rank && rank <= 20) {
      if (Platform.OS === 'android') {
        // 色は順位に応じて切替
        let fill = '#007AFF';
        if (rank === 1) fill = '#FFD700';
        else if (rank === 2) fill = '#C0C0C0';
        else if (rank === 3) fill = '#CD7F32';
        const stroke = isSelected ? '#FF0000' : '#FFFFFF';
        return (
          <AndroidCircle size={36} fill={fill} stroke={stroke} strokeWidth={3}>
            <Text style={styles.parkingMarkerText}>{rank}</Text>
          </AndroidCircle>
        );
      }
      return (
        <View style={getMarkerStyle()}>
          <Text style={styles.parkingMarkerText}>{rank}</Text>
        </View>
      );
    }

    // ガソリンスタンド（ロゴなし）
    if (spot.category === 'ガソリンスタンド' && gasInfo) {
      // Androidではシンプルな円形マーカーを使用
      if (Platform.OS === 'android') {
        return (
          <AndroidCircle size={32} fill={gasInfo.markerColor} stroke="#FFFFFF" strokeWidth={2}>
            <Text style={styles.simpleMarkerText}>⛽</Text>
          </AndroidCircle>
        );
      }

      // iOSでは詳細なデザインを使用
      return (
        <View style={[
          styles.gasStationMarker,
          {
            backgroundColor: gasInfo.markerColor,
            borderColor: gasInfo.isWhite ? '#CCCCCC' : '#FFFFFF'
          },
          isNearbyFacility && styles.nearbyFacilityGasMarker
        ]}>
          <Text style={styles.gasStationMarkerIcon}>⛽</Text>
        </View>
      );
    }

    // その他のカテゴリー
    if (Platform.OS === 'android') {
      return (
        <AndroidCircle
          size={32}
          fill={getMarkerColor(spot.category)}
          stroke={isNearbyFacility ? '#007AFF' : '#FFFFFF'}
          strokeWidth={isNearbyFacility ? 3 : 2}
        >
          <Text style={styles.categoryMarkerIcon}>{getMarkerIcon(spot.category)}</Text>
        </AndroidCircle>
      );
    }
    return (
      <View style={[
        styles.categoryMarker,
        { backgroundColor: getMarkerColor(spot.category) },
        isNearbyFacility && styles.nearbyFacilityMarker
      ]}>
        <Text style={styles.categoryMarkerIcon}>{getMarkerIcon(spot.category)}</Text>
      </View>
    );
  };

  // Calloutのコンテンツを生成
  const renderCalloutContent = () => {
    // 駐車場用のCallout
    if (spot.category === 'コインパーキング' && rank && rank <= 20) {
      return (
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
      );
    }

    // ガソリンスタンド用のCallout
    if (spot.category === 'ガソリンスタンド' && gasInfo) {
      const gasStation = spot as GasStation;
      return (
        <View style={styles.gasStationCallout}>
          <Text style={styles.gasStationCalloutName} numberOfLines={2}>
            {spot.name}
          </Text>
          {gasStation.services?.regular_price && (
            <View style={styles.gasCalloutPriceRow}>
              <Text style={styles.gasCalloutPriceLabel}>レギュラー</Text>
              <Text style={[
                styles.gasCalloutPriceDiff,
                { color: gasInfo.markerColor }
              ]}>
                {gasInfo.priceDiff}
              </Text>
            </View>
          )}
        </View>
      );
    }

    // その他のカテゴリー用のCallout
    return (
      <View style={styles.calloutContainer}>
        <Text style={styles.calloutName}>{spot.name}</Text>
        {spot.category === '温泉' && (spot as HotSpring).price && (
          <Text style={styles.calloutPrice}>{(spot as HotSpring).price}</Text>
        )}
      </View>
    );
  };

  // マーカータイトルと説明の生成
  const getMarkerTitle = () => spot.name;
  const getMarkerDescription = () => {
    if (spot.category === 'コインパーキング' && rank) {
      return formatPrice();
    }
    if (spot.category === 'ガソリンスタンド' && gasInfo) {
      const gasStation = spot as GasStation;
      return gasStation.services?.regular_price ? `レギュラー: ${gasInfo.priceDiff}` : '';
    }
    if (spot.category === '温泉') {
      return (spot as HotSpring).price || '';
    }
    return '';
  };

  // Android: 初回だけtracksViewChangesを有効にし、安定後にfalseへ
  const [tracks, setTracks] = useState(Platform.OS === 'android');
  useEffect(() => {
    if (Platform.OS === 'android') {
      const t = setTimeout(() => setTracks(false), 500);
      return () => clearTimeout(t);
    }
  }, [spot?.id, rank]);

  return (
    <Marker
      coordinate={{
        latitude: spot.lat,
        longitude: spot.lng,
      }}
      onPress={onPress}
      // 初回のみtrue、以降falseにしてスナップショット安定
      tracksViewChanges={Platform.OS === 'android' ? tracks : undefined}
      // 円は中心アンカーでクリッピングを抑制
      anchor={Platform.OS === 'android' ? { x: 0.5, y: 0.5 } : { x: 0.5, y: 1 }}
      // 重なり順を制御（ランク1が最前面、2、3と順番に後ろへ）
      zIndex={(() => {
        if (isSelected) return 1000;
        if (rank) {
          if (rank === 1) return 999;
          if (rank === 2) return 998;
          if (rank === 3) return 997;
          // その他のランク (4位以降)
          return 500 - rank;
        }
        // ランクなしの施設
        return isNearbyFacility ? 300 : 400;
      })()}
      title={getMarkerTitle()}
      description={getMarkerDescription()}
    >
      {renderMarkerContent()}
      <Callout>
        {renderCalloutContent()}
      </Callout>
    </Marker>
  );
};

const styles = StyleSheet.create({
  // Androidマーカーコンテナ
  androidMarkerContainer: {
    // Androidのビットマップ化で右下が欠ける問題への対策
    // マーカーより大きめのコンテナで余裕を持たせる
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    padding: 5, // 周囲に余白を追加して切れを防ぐ
  },
  // シンプルなマーカー（Android用）
  simpleMarker: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    // elevation削除（Androidのマーカーで問題を起こす）
  },
  simpleMarkerText: {
    fontSize: 16,
    lineHeight: 16,
    color: '#FFFFFF',
    textAlign: 'center',
    textAlignVertical: 'center', // Android
    includeFontPadding: false as any, // Android専用
  },
  // 駐車場マーカー
  parkingMarker: {
    width: Platform.OS === 'android' ? 28 : 32,
    height: Platform.OS === 'android' ? 28 : 32,
    borderRadius: Platform.OS === 'android' ? 14 : 16,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
      },
      android: {
        // elevationなし - Androidのマーカー切れ問題を防ぐ
      },
    }),
  },
  goldMarker: {
    width: Platform.OS === 'android' ? 32 : 36,
    height: Platform.OS === 'android' ? 32 : 36,
    borderRadius: Platform.OS === 'android' ? 16 : 18,
    backgroundColor: '#FFD700',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    ...Platform.select({
      ios: {
        shadowColor: '#FFD700',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.3,
        shadowRadius: 2,
      },
      android: {
        // elevationなし
      },
    }),
  },
  silverMarker: {
    width: Platform.OS === 'android' ? 32 : 36,
    height: Platform.OS === 'android' ? 32 : 36,
    borderRadius: Platform.OS === 'android' ? 16 : 18,
    backgroundColor: '#C0C0C0',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.25,
        shadowRadius: 2,
      },
      android: {
        // elevationなし
      },
    }),
  },
  bronzeMarker: {
    width: Platform.OS === 'android' ? 32 : 36,
    height: Platform.OS === 'android' ? 32 : 36,
    borderRadius: Platform.OS === 'android' ? 16 : 18,
    backgroundColor: '#CD7F32',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    ...Platform.select({
      ios: {
        shadowColor: '#CD7F32',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.25,
        shadowRadius: 2,
      },
      android: {
        // elevationなし
      },
    }),
  },
  selectedMarker: {
    // transform削除 - Androidでの切れを防ぐ
    borderColor: '#FF0000',
    borderWidth: 4,
    ...Platform.select({
      ios: {
        transform: [{ scale: 1.2 }],
        shadowOpacity: 0.5,
        shadowRadius: 6,
      },
      android: {
        // elevationとtransformなし
      },
    }),
  },
  parkingMarkerText: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    textAlignVertical: 'center', // Android
    includeFontPadding: false as any,
  },
  categoryMarker: {
    width: Platform.OS === 'android' ? 28 : 32,
    height: Platform.OS === 'android' ? 28 : 32,
    borderRadius: Platform.OS === 'android' ? 14 : 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
      },
      android: {
        // elevationなし - マーカー切れを防ぐ
      },
    }),
  },
  categoryMarkerIcon: {
    fontSize: 18,
    lineHeight: 18,
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false as any,
  },
  nearbyFacilityMarker: {
    borderWidth: 3,
    borderColor: '#007AFF',
    ...Platform.select({
      ios: {
        shadowColor: '#007AFF',
        shadowOpacity: 0.4,
        shadowRadius: 6,
      },
      android: {
        // elevationなし
      },
    }),
    // transform削除 - Androidで切れを防ぐ
  },
  logoMarker: {
    width: 36,
    height: 36,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 3,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
      },
      android: {
        // elevationなし
      },
    }),
  },
  nearbyFacilityLogoMarker: {
    borderWidth: 3,
    borderColor: '#007AFF',
    width: 40,
    height: 40,
    borderRadius: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#007AFF',
        shadowOpacity: 0.4,
        shadowRadius: 6,
      },
      android: {
        // elevationとtransformなし
      },
    }),
  },
  logoImage: {
    width: 32,
    height: 32,
  },
  // 駐車場用のCallout
  parkingCalloutContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    minWidth: Platform.OS === 'android' ? 160 : 180,
    maxWidth: Platform.OS === 'android' ? 260 : 280,
  },
  parkingCalloutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 6,
  },
  calloutRankBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
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
    fontSize: 12,
    fontWeight: '700',
  },
  parkingCalloutPrice: {
    fontSize: Platform.OS === 'android' ? 16 : 18,
    fontWeight: '700',
    color: Colors.primary,
    flex: 1,
  },
  parkingCalloutName: {
    fontSize: Platform.OS === 'android' ? 13 : 14,
    color: '#333',
    lineHeight: Platform.OS === 'android' ? 16 : 18,
    flexWrap: 'wrap',
  },
  // その他のCallout
  calloutContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: Platform.OS === 'android' ? 10 : 12,
    minWidth: Platform.OS === 'android' ? 140 : 160,
    maxWidth: Platform.OS === 'android' ? 240 : 260,
  },
  calloutName: {
    fontSize: Platform.OS === 'android' ? 14 : 16,
    fontWeight: '600',
    color: '#333',
    flexWrap: 'wrap',
    lineHeight: Platform.OS === 'android' ? 18 : 20,
  },
  calloutPrice: {
    fontSize: Platform.OS === 'android' ? 13 : 14,
    fontWeight: '500',
    color: Colors.primary,
    marginTop: 4,
  },
  // ガソリンスタンドマーカー
  gasStationMarker: {
    width: 32,
    height: 32,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {
        // elevationなし
      },
    }),
  },
  nearbyFacilityGasMarker: {
    borderWidth: 3,
    borderColor: '#007AFF',
    ...Platform.select({
      ios: {
        shadowColor: '#007AFF',
        shadowOpacity: 0.4,
        shadowRadius: 6,
      },
      android: {
        // elevationとtransformなし
      },
    }),
  },
  gasStationMarkerIcon: {
    fontSize: 20,
  },
  gasStationCallout: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: Platform.OS === 'android' ? 10 : 12,
    minWidth: Platform.OS === 'android' ? 160 : 180,
    maxWidth: Platform.OS === 'android' ? 260 : 280,
  },
  gasStationCalloutName: {
    fontSize: Platform.OS === 'android' ? 14 : 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: Platform.OS === 'android' ? 6 : 8,
    lineHeight: Platform.OS === 'android' ? 18 : 20,
  },
  gasCalloutPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
  },
  gasCalloutPriceLabel: {
    fontSize: Platform.OS === 'android' ? 11 : 12,
    color: '#666',
    fontWeight: '500',
  },
  gasCalloutPriceDiff: {
    fontSize: Platform.OS === 'android' ? 14 : 16,
    fontWeight: '700',
  },
  // ガソリンスタンドロゴマーカー
  gasStationLogoMarker: {
    width: 38,
    height: 38,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    padding: 3,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {
        // elevationなし
      },
    }),
  },
  nearbyFacilityGasLogoMarker: {
    borderWidth: 3,
    borderColor: '#007AFF',
    width: 42,
    height: 42,
    ...Platform.select({
      ios: {
        shadowColor: '#007AFF',
        shadowOpacity: 0.4,
        shadowRadius: 6,
      },
      android: {
        // elevationとtransformなし
      },
    }),
  },
  gasLogoInnerContainer: {
    width: '100%',
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
  },
  gasLogoImage: {
    width: 28,
    height: 28,
  },
});
