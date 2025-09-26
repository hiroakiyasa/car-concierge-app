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
  'コスモ石油': require('../../gasolin_logo/cosmo.png'),
  'アポロステーション': require('../../gasolin_logo/apollo_station.png'),
  '出光': require('../../gasolin_logo/apollo_station.png'),
  'シェル': require('../../gasolin_logo/apollo_station.png'),
  'SOLATO': require('../../gasolin_logo/SOLATO.png'),
  'JA-SS': require('../../gasolin_logo/JA-SS.png'),
  'ホクレン': require('../../gasolin_logo/hokuren.png'),
  '伊藤忠': require('../../gasolin_logo/itochu.png'),
  '丸紅エネルギー': require('../../gasolin_logo/marubeni.png'),
  '三菱商事エネルギー': require('../../gasolin_logo/mitsubishi.png'),
  'ギグナス': require('../../gasolin_logo/gygnus.png'),
  '国際石油': require('../../gasolin_logo/kokusai.png'),
};

// ブランド名からロゴを取得するヘルパー関数
export const getConvenienceStoreLogo = (input: string): any => {
  if (!input) return null;
  const brand = String(input).trim();

  // 大文字小文字を無視するための英字版
  const lower = brand.toLowerCase();
  // ハイフン・長音などを取り除いた日本語版
  const jp = brand
    .replace(/-/g, '')
    .replace(/[‐－ー]/g, '')
    .replace(/７/g, '7')
    .replace(/１１/g, '11');

  // セブン-イレブン（7-Eleven, SEVEN ELEVEN, セブン‐イレブン など）
  if (
    /7\s*-?\s*11/.test(lower) ||
    (jp.includes('セブン') && jp.includes('イレブン')) ||
    (lower.includes('seven') && lower.includes('eleven'))
  ) {
    return CONVENIENCE_STORE_LOGOS['セブンイレブン'];
  }

  // ファミリーマート（FamilyMart, ﾌｧﾐﾘｰﾏｰﾄ, ファミマ など）
  if (
    jp.includes('ファミリ') || jp.includes('ﾌｧﾐﾘ') || jp.includes('ファミマ') ||
    lower.includes('familymart') || lower.includes('famima') || lower.includes('family mart')
  ) {
    return CONVENIENCE_STORE_LOGOS['ファミリーマート'];
  }

  // ローソン（LAWSON）
  if (jp.includes('ローソン') || lower.includes('lawson')) {
    return CONVENIENCE_STORE_LOGOS['ローソン'];
  }

  // ミニストップ（MINISTOP）
  if (jp.includes('ミニストップ') || lower.includes('ministop')) {
    return CONVENIENCE_STORE_LOGOS['ミニストップ'];
  }

  // デイリーヤマザキ（DAILY YAMAZAKI / daily-yamazaki）
  if (
    jp.includes('デイリ') || jp.includes('ﾃﾞｲﾘ') ||
    lower.includes('daily') || lower.includes('yamazaki')
  ) {
    return CONVENIENCE_STORE_LOGOS['デイリーヤマザキ'];
  }

  // セイコーマート（SEICOMART）
  if (jp.includes('セイコーマート') || lower.includes('seicomart')) {
    return CONVENIENCE_STORE_LOGOS['セイコーマート'];
  }

  // 直接一致も一応試す
  for (const key in CONVENIENCE_STORE_LOGOS) {
    if (brand.includes(key) || key.includes(brand)) {
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
