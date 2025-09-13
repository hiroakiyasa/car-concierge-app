// 全国平均燃料価格（2025年時点の参考値）
// これらの値は定期的に更新する必要があります
export const NATIONAL_AVERAGE_PRICES = {
  regular: 170,  // レギュラーガソリン全国平均
  premium: 181,  // ハイオク全国平均
  diesel: 150,   // 軽油全国平均
  lastUpdated: '2025-09-01'
};

// 価格差を計算してフォーマット
export const formatPriceDifference = (actualPrice: number | undefined, averagePrice: number): string => {
  if (!actualPrice) return '---';
  
  const difference = actualPrice - averagePrice;
  const sign = difference >= 0 ? '+' : '';
  
  return `${sign}${difference}円`;
};

// 価格差に基づいて色を決定
export const getPriceDifferenceColor = (actualPrice: number | undefined, averagePrice: number): string => {
  if (!actualPrice) return '#666';
  
  const difference = actualPrice - averagePrice;
  
  if (difference < -5) return '#4CAF50'; // 緑（お得）
  if (difference > 5) return '#FF5252';  // 赤（高い）
  return '#666'; // グレー（平均的）
};

// ガソリンスタンドマーカーの色を決定（グラデーション）
export const getGasStationMarkerColor = (services: any): string => {
  if (!services || !services.regular_price) return '#FFFFFF'; // 料金データなしは白色
  
  const regularDiff = services.regular_price - NATIONAL_AVERAGE_PRICES.regular;
  
  // 価格差に基づいてグラデーション色を返す
  if (regularDiff <= -10) return '#00C853'; // 濃い緑（とてもお得）
  if (regularDiff <= -5) return '#4CAF50';  // 緑（お得）
  if (regularDiff <= 0) return '#8BC34A';   // 薄緑（少しお得）
  if (regularDiff <= 5) return '#FFC107';   // 黄色（平均的）
  if (regularDiff <= 10) return '#FF9800';  // オレンジ（少し高い）
  return '#FF5252'; // 赤（高い）
};