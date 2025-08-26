// コンビニブランドのロゴマッピング
export const CONVENIENCE_STORE_LOGOS: { [key: string]: any } = {
  'セブンイレブン': require('../../convenience_store_logos/seveneleven.png'),
  'ファミリーマート': require('../../convenience_store_logos/Famiolymart.png'),
  'ローソン': require('../../convenience_store_logos/LAWSON.png'),
  'ミニストップ': require('../../convenience_store_logos/ministop.png'),
  'デイリーヤマザキ': require('../../convenience_store_logos/Dailyyamazaki.png'),
  'セイコーマート': require('../../convenience_store_logos/Seikomart.png'),
};

// ガソリンスタンドブランドのロゴマッピング
export const GAS_STATION_LOGOS: { [key: string]: any } = {
  'ENEOS': require('../../gasolin_logo/eneos.png'),
  'エネオス': require('../../gasolin_logo/eneos.png'),
  'コスモ石油': require('../../gasolin_logo/コスモ石油.png'),
  'アポロステーション': require('../../gasolin_logo/アポロステーション.png'),
  '出光': require('../../gasolin_logo/アポロステーション.png'),
  'シェル': require('../../gasolin_logo/アポロステーション.png'),
  'SOLATO': require('../../gasolin_logo/SOLATO.png'),
  'JA-SS': require('../../gasolin_logo/JA-SS.png'),
  'ホクレン': require('../../gasolin_logo/ホクレン.png'),
  '伊藤忠': require('../../gasolin_logo/伊藤忠.png'),
  '丸紅エネルギー': require('../../gasolin_logo/丸紅エネルギー.png'),
  '三菱商事エネルギー': require('../../gasolin_logo/三菱商事エネルギー.png'),
  'ギグナス': require('../../gasolin_logo/ギグナス石油.png'),
  '国際石油': require('../../gasolin_logo/国際石油.png'),
};

// ブランド名からロゴを取得するヘルパー関数
export const getConvenienceStoreLogo = (brand: string): any => {
  // ブランド名の正規化（カタカナ・ひらがな・英数字の統一など）
  const normalizedBrand = brand
    .replace(/７/g, 'セブン')
    .replace(/１１/g, 'イレブン')
    .replace(/7/g, 'セブン')
    .replace(/11/g, 'イレブン')
    .replace(/SEVEN/gi, 'セブン')
    .replace(/ELEVEN/gi, 'イレブン');
  
  for (const key in CONVENIENCE_STORE_LOGOS) {
    if (normalizedBrand.includes(key) || key.includes(normalizedBrand)) {
      return CONVENIENCE_STORE_LOGOS[key];
    }
  }
  return null;
};

export const getGasStationLogo = (brand: string): any => {
  // ブランド名の正規化
  const normalizedBrand = brand
    .replace(/出光昭和シェル/g, 'アポロステーション')
    .replace(/昭和シェル/g, 'アポロステーション');
  
  for (const key in GAS_STATION_LOGOS) {
    if (normalizedBrand.includes(key) || key.includes(normalizedBrand)) {
      return GAS_STATION_LOGOS[key];
    }
  }
  return null;
};