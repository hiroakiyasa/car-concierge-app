import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Region } from '@/types';

interface MapScaleProps {
  region: Region;
}

export const MapScale: React.FC<MapScaleProps> = ({ region }) => {
  // 地図の縮尺を計算
  const calculateScale = () => {
    // 緯度1度 = 約111km
    const latitudeDeltaInMeters = region.latitudeDelta * 111000;
    
    // 画面幅を基準にスケールバーの長さを計算
    // React Native の画面幅は約375px（iPhone標準）として、最大幅75pxのスケールバーに対応
    const maxScaleBarWidth = 75; // 最大幅75px（元の半分）
    const screenWidthEstimate = 375;
    const scaleBarRatio = maxScaleBarWidth / screenWidthEstimate; // 画面幅の約20%
    const scaleInMeters = latitudeDeltaInMeters * scaleBarRatio;
    
    // きりの良い数値を選択
    const scales = [
      1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500,
      1000, 2000, 5000, 10000, 20000, 50000, 100000
    ];
    
    // scaleInMeters以下で最大のきりの良い数値を選択
    let selectedScale = scales[0];
    for (const scale of scales) {
      if (scale <= scaleInMeters) {
        selectedScale = scale;
      } else {
        break;
      }
    }
    
    // 単位の決定
    let scaleValue: number;
    let unit: string;
    
    if (selectedScale < 1000) {
      scaleValue = selectedScale;
      unit = 'm';
    } else {
      scaleValue = selectedScale / 1000;
      unit = 'km';
    }
    
    // スケールバーの正確な幅を計算
    const actualScaleInMeters = selectedScale;
    const exactWidth = (actualScaleInMeters / latitudeDeltaInMeters) * screenWidthEstimate;
    const finalWidth = Math.min(exactWidth, maxScaleBarWidth);
    
    return {
      value: scaleValue,
      unit: unit,
      width: finalWidth,
    };
  };
  
  const scale = calculateScale();
  
  return (
    <View style={styles.container}>
      <View style={styles.scaleBar}>
        <View style={[styles.scaleLine, { width: scale.width }]} />
        <View style={styles.scaleEnds}>
          <View style={styles.scaleEndLeft} />
          <View style={styles.scaleEndRight} />
        </View>
      </View>
      <Text style={styles.scaleText}>
        {scale.value} {scale.unit}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60, // 左上に配置（検索結果表示の下）
    left: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  scaleBar: {
    marginBottom: 2,
  },
  scaleLine: {
    height: 1,
    backgroundColor: '#333',
  },
  scaleEnds: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  scaleEndLeft: {
    width: 1,
    height: 5,
    backgroundColor: '#333',
    marginTop: -2,
  },
  scaleEndRight: {
    width: 1,
    height: 5,
    backgroundColor: '#333',
    marginTop: -2,
  },
  scaleText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#333',
    textAlign: 'center',
  },
});