/**
 * 主要な駅・地名の座標を事前定義
 * ジオコーディングAPIの不正確さを回避するため
 */

export interface PredefinedLocation {
  names: string[]; // 検索キーワード（複数の表記に対応）
  latitude: number;
  longitude: number;
  displayName: string;
  description: string;
}

export const PREDEFINED_LOCATIONS: PredefinedLocation[] = [
  // 東京都の主要駅
  {
    names: ['東京駅', '東京', 'tokyo station', 'tokyo'],
    latitude: 35.681382,
    longitude: 139.766084,
    displayName: '東京駅',
    description: 'JR東京駅'
  },
  {
    names: ['新宿駅', '新宿', 'shinjuku station', 'shinjuku'],
    latitude: 35.689592,
    longitude: 139.700464,
    displayName: '新宿駅',
    description: 'JR新宿駅'
  },
  {
    names: ['渋谷駅', '渋谷', 'shibuya station', 'shibuya'],
    latitude: 35.658034,
    longitude: 139.701636,
    displayName: '渋谷駅',
    description: 'JR渋谷駅'
  },
  {
    names: ['池袋駅', '池袋', 'ikebukuro station', 'ikebukuro'],
    latitude: 35.728926,
    longitude: 139.710492,
    displayName: '池袋駅',
    description: 'JR池袋駅'
  },
  {
    names: ['品川駅', '品川', 'shinagawa station', 'shinagawa'],
    latitude: 35.628391,
    longitude: 139.738998,
    displayName: '品川駅',
    description: 'JR品川駅'
  },
  {
    names: ['上野駅', '上野', 'ueno station', 'ueno'],
    latitude: 35.713768,
    longitude: 139.777254,
    displayName: '上野駅',
    description: 'JR上野駅'
  },

  // 大阪府の主要駅
  {
    names: ['大阪駅', '大阪', 'osaka station', 'osaka'],
    latitude: 34.702485,
    longitude: 135.495951,
    displayName: '大阪駅',
    description: 'JR大阪駅'
  },
  {
    names: ['梅田駅', '梅田', 'umeda station', 'umeda'],
    latitude: 34.702485,
    longitude: 135.495951,
    displayName: '梅田駅',
    description: '梅田駅（大阪駅周辺）'
  },
  {
    names: ['なんば駅', 'なんば', '難波駅', '難波', 'namba station', 'namba'],
    latitude: 34.666264,
    longitude: 135.500109,
    displayName: 'なんば駅',
    description: '南海なんば駅'
  },

  // 京都府の主要駅
  {
    names: ['京都駅', '京都', 'kyoto station', 'kyoto'],
    latitude: 34.985849,
    longitude: 135.758767,
    displayName: '京都駅',
    description: 'JR京都駅'
  },

  // 神奈川県の主要駅
  {
    names: ['横浜駅', '横浜', 'yokohama station', 'yokohama'],
    latitude: 35.465942,
    longitude: 139.622064,
    displayName: '横浜駅',
    description: 'JR横浜駅'
  },

  // 愛知県の主要駅
  {
    names: ['名古屋駅', '名古屋', 'nagoya station', 'nagoya'],
    latitude: 35.170915,
    longitude: 136.881537,
    displayName: '名古屋駅',
    description: 'JR名古屋駅'
  },

  // 福岡県の主要駅
  {
    names: ['博多駅', '博多', 'hakata station', 'hakata'],
    latitude: 33.589599,
    longitude: 130.420580,
    displayName: '博多駅',
    description: 'JR博多駅'
  },

  // 北海道の主要駅
  {
    names: ['札幌駅', '札幌', 'sapporo station', 'sapporo'],
    latitude: 43.068661,
    longitude: 141.350755,
    displayName: '札幌駅',
    description: 'JR札幌駅'
  },
];

/**
 * 検索クエリに一致する事前定義の場所を検索
 */
export function searchPredefinedLocations(query: string): PredefinedLocation | null {
  const normalizedQuery = query.toLowerCase().trim();

  for (const location of PREDEFINED_LOCATIONS) {
    for (const name of location.names) {
      if (name.toLowerCase() === normalizedQuery) {
        console.log(`✅ 事前定義の場所が見つかりました: ${location.displayName} (緯度${location.latitude}, 経度${location.longitude})`);
        return location;
      }
    }
  }

  console.log(`ℹ️ 事前定義の場所なし: "${query}"`);
  return null;
}
