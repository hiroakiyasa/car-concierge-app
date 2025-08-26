# CAR_Concierge（車旅・コンシェルジュ）React Native 完全要件定義書

## 1. アプリケーション概要

### 1.1 アプリケーション名
**CAR_Concierge（車旅・コンシェルジュ）**

### 1.2 アプリケーション目的
キャンピングカーや車中泊利用者向けの総合駐車場検索・旅行支援クロスプラットフォームアプリケーション。全国103,286箇所の駐車場および関連施設データを活用し、ユーザーの現在地や指定エリアから最適な駐車場とその周辺施設を検索・提案する。

### 1.3 対象ユーザー
- キャンピングカー・RV利用者
- 車中泊愛好家
- 長距離ドライブ旅行者
- 観光地巡り・温泉巡り利用者
- 車でのレジャー活動参加者

### 1.4 プラットフォーム仕様
- **対象OS**: iOS 16.0以上、Android 8.0 (API Level 26)以上
- **対象デバイス**: スマートフォン専用（タブレット対応は将来予定）
- **画面方向**: 縦向き固定

## 2. 技術仕様

### 2.1 開発技術スタック
- **Framework**: React Native 0.73.x
- **Language**: TypeScript 5.x
- **State Management**: Zustand + React Query
- **Navigation**: React Navigation 6.x
- **地図表示**: react-native-maps (iOS: MapKit, Android: Google Maps)
- **位置情報**: @react-native-async-storage/async-storage + Geolocation API
- **アニメーション**: react-native-reanimated 3.x
- **UI Components**: react-native-elements + custom components
- **Bundler**: Metro
- **Development**: Flipper + React Native Debugger

### 2.2 アーキテクチャ構成
- **Models**: TypeScript interface定義（Spot, SearchFilter, Category等）
- **Stores**: Zustand based状態管理（useMainStore, useSearchStore）
- **Screens**: React Native画面コンポーネント
- **Services**: 共有サービス（LocationService, SearchService, DataService）
- **Components**: 再利用可能UIコンポーネント
- **Utils**: ヘルパー関数・定数定義

### 2.3 データソース
- **コインパーキング**: 73,542件（coinparking_corrected_elevations.json）
- **温泉**: 14,832件（hotspring.json）
- **コンビニエンスストア**: 数万件（convenience_stores.json）
- **お祭り・花火大会**: イベント情報（festivals_and_fireworks.json）
- **ガソリンスタンド**: 全国データ（gas_stations_perfect.json）
- **全施設総合データ**: 103,286件（all_japan_facilities_merged_*.json）

### 2.4 バックエンド統合
- **Supabase**: PostgreSQL + Real-time subscriptions
- **Database**: 74,571件の駐車場データ（営業時間・タイプ・収容台数完全移行済み）
- **Authentication**: Supabase Auth（将来機能）
- **API**: Supabase JavaScript Client

## 3. 画面構成・UI仕様

### 3.1 スプラッシュ画面（SplashScreen.tsx）
- **動画スプラッシュ**: react-native-video使用でcopy_27365707-8E38-4AA0-B063-1CAE57038456.MOV再生
- **自動遷移**: 動画終了後、自動的にメイン画面に遷移
- **フォールバック**: 動画ファイルが存在しない場合、即座にメイン画面に遷移
- **ロード画面**: Animated.Viewを使用したフェードイン/アウト

### 3.2 メイン画面構成（MainScreen.tsx）

#### 3.2.1 レイアウト構成
- **画面分割**: 上部2/3がマップエリア、下部1/3がフィルターパネル
- **Flex Layout**: flex: 2（マップ）、flex: 1（フィルター）のレスポンシブデザイン
- **SafeAreaView**: ノッチ・ステータスバー対応

#### 3.2.2 マップエリア（上部2/3）
- **地図表示**: react-native-mapsのMapView
- **ユーザー位置表示**: showsUserLocation={true}、青い円で現在地表示
- **右側カテゴリーボタン**: 5つの絵文字ボタン（Animated.View使用）
- **下部コントロール**: 左側に駐車場タイプフィルター、中央に検索ボタン、右側に現在地ボタン

#### 3.2.3 フィルターパネル（下部1/3）
- **CompactFilterPanel**: react-native-reanimatedによる展開可能パネル
- **影効果**: elevation(Android) + shadowOffset(iOS)でマップエリアとの境界を明確化

### 3.3 カテゴリー選択UI（右側縦配置）

#### 3.3.1 CategoryEmojiButton仕様
- **サイズ**: 48×48ピクセルの円形TouchableOpacity
- **配置**: 右側に縦並び、marginRight: 20、marginVertical: 6
- **背景色**: 選択時は各カテゴリー固有色、非選択時は白色
- **影効果**: iOS shadowOffset、Android elevation: 4
- **アニメーション**: Animated.timing 200ms easeInOut

#### 3.3.2 カテゴリー一覧と色仕様
1. **🅿️ コインパーキング**: Colors.primary (#1976d2)
2. **🏪 コンビニ**: Colors.green (#4CAF50)
3. **🎆 お祭り・花火大会**: Colors.purple (#9C27B0)
4. **♨️ 温泉**: Colors.yellow（選択時は黒文字）
5. **⛽ ガソリンスタンド**: Colors.orange

### 3.4 下部コントロールエリア

#### 3.4.1 左側: 駐車場タイプフィルター
- **平面ボタン**: showFlatParkingフラグ制御
- **立体ボタン**: showMultiStoryParkingフラグ制御
- **機械ボタン**: showMechanicalParkingフラグ制御
- **デザイン**: fontSize: 11、borderRadius: 3、Primary color border

#### 3.4.2 中央: 検索ボタン
- **PrimaryButton**: TouchableOpacity + Animated.scale
- **テキスト**: 「この範囲を検索」
- **幅**: width: 140
- **機能**: searchInCurrentMapRegion()実行

#### 3.4.3 右側: 現在地ボタン
- **円形ボタン**: 36×36px、白背景TouchableOpacity
- **アイコン**: Ionicons 'location' icon
- **機能**: requestCurrentLocation()実行、地図領域更新

### 3.5 オーバーレイ表示

#### 3.5.1 検索結果過多警告
- **表示条件**: searchResults.length > 100の場合
- **Positioned Absolute**: top: 60%、alignSelf: 'center'
- **メッセージ**: 
  - "スポットが多すぎます"（Colors.warning、fontWeight: 'bold'）
  - "地図を拡大してください"（Colors.textSecondary）
  - "(\(count)件中100件表示)"（Colors.textSecondary、fontSize: 12）
- **Background**: rgba(255,255,255,0.95) + borderRadius: 8

#### 3.5.2 ローディング表示
- **位置**: マップエリア中央、ActivityIndicator
- **スタイル**: size="large"、color=Colors.primary
- **Background**: Semi-transparent overlay

## 4. 地図表示機能（MapView）

### 4.1 基本機能
- **地図エンジン**: react-native-maps MapView
- **Provider**: iOS: 'apple'、Android: 'google'
- **初期位置**: 東京駅（latitude: 35.6812, longitude: 139.7671）
- **初期縮尺**: latitudeDelta: 0.02, longitudeDelta: 0.02

### 4.2 マーカー表示

#### 4.2.1 表示制限
- **最大表示数**: 100件（spots.length > 100の場合は先頭100件のみ）
- **ランキング表示**: コインパーキングの上位20件にランキングバッジ表示

#### 4.2.2 CustomMarker仕様
- **データ**: Spot interface とrank（number | null）を保持
- **カテゴリー別表示**: 各カテゴリーに対応した絵文字アイコン
- **ランキングバッジ**: RankingBadgeコンポーネント使用（Animated.View）

### 4.3 領域変更処理
- **onRegionChangeComplete**: region State更新、onRegionChangeコールバック実行
- **無限ループ防止**: isUpdatingRegionフラグでプログラム実行の領域変更を検出

## 5. 検索機能・フィルタリング（SearchService）

### 5.1 検索処理フロー

#### 5.1.1 データソース統合
- **parkingSpots**: CoinParking interface配列
- **hotSprings**: HotSpring interface配列
- **convenienceStores**: ConvenienceStore interface配列
- **festivals**: Festival interface配列
- **gasStations**: GasStation interface配列
- **allSpots**: その他全施設データ

#### 5.1.2 重複除去
- **ID基準**: lodash.keyByを使用してID重複を除去
- **優先順**: 専用interface > 汎用Spot interface

### 5.2 フィルタリング機能

#### 5.2.1 カテゴリーフィルター
- **AND検索**: 複数カテゴリー選択時、すべての条件を満たすスポットを検索
- **選択カテゴリー**: searchFilter.selectedCategories Set使用

#### 5.2.2 距離フィルター（radiusFilterEnabled）
- **基準**: filter.searchRadius（メートル単位）
- **計算**: geolib.getDistance()使用
- **デフォルト**: 500m

#### 5.2.3 営業時間フィルター（parkingTimeFilterEnabled）
- **適用対象**: CoinParking interfaceのみ
- **判定**: isParkingOpenForEntireDuration()関数使用
- **24時間駐車場**: 自動的に通過

#### 5.2.4 標高フィルター（elevationFilterEnabled）
- **最小標高**: filter.minElevation（メートル単位）
- **適用**: spot.elevation >= minElevationの条件

#### 5.2.5 駐車場タイプフィルター
- **平面駐車場**: 「平面」「屋外」キーワード、または明確な分類がない場合
- **立体駐車場**: 「立体」「ビル」「屋内」キーワード
- **機械式駐車場**: 「機械」「自動」「タワー」キーワード

### 5.3 近隣施設検索（Nearby Search）

#### 5.3.1 ID基準検索
- **対象**: コンビニと温泉のみサポート
- **データソース**: CoinParkingの nearestConvenienceStore/nearestHotspring
- **検索半径**: convenienceStoreRadius(500m) / hotSpringRadius(500m)

#### 5.3.2 AND検索ロジック
- **両方選択時**: 駐車場が両施設の検索半径内に存在することを要求
- **単独選択時**: 該当施設の検索半径内に存在することを要求

#### 5.3.3 結果構成
- **駐車場**: 条件を満たす駐車場上位20件
- **連携施設**: 選択された駐車場に関連する施設のみ
- **独立施設**: 選択カテゴリーの独立施設も含める

### 5.4 ソート機能

#### 5.4.1 料金順ソート（駐車時間指定時）
- **対象**: CoinParking interface
- **基準**: calculatedFee（昇順）
- **無限値処理**: 計算不能な料金はNumber.POSITIVE_INFINITYに設定

#### 5.4.2 基本料金順ソート
- **基準**: rates[0]?.price（最初の料金設定）
- **同料金時**: 距離順に二次ソート

#### 5.4.3 距離順ソート
- **基準**: geolib.getDistance(userLocation, spot)
- **適用**: 非駐車場スポットや混在時

### 5.5 表示制限処理

#### 5.5.1 カテゴリー別制限（applyCategoryBasedLimits）
- **駐車場**: 上位20件（価格順またはベース料金順）
- **その他**: 地図範囲内すべて表示
- **分散アルゴリズム**: naturalDistribution使用

#### 5.5.2 地図範囲検索
- **bounds計算**: 地図の緯度経度範囲内スポット検索
- **特別処理**: 駐車時間フィルター有効時は駐車場のみ上位20件返却

## 6. データ構造（TypeScript Interfaces）

### 6.1 基底インターフェース（Spot）

```typescript
interface Spot {
  id: string;
  name: string;
  lat: number;
  lng: number;
  category: string;
  type?: string;
  description?: string;
  address?: string;
  rating?: number;
  quietness?: number;
  rank?: string;
  prefecture?: string;
  elevation?: number;
}
```

### 6.2 コインパーキング（CoinParking）

#### 6.2.1 基本プロパティ
```typescript
interface CoinParking extends Spot {
  originalFees?: string;
  rates: ParkingRate[];
  hours?: HoursInfo;
  capacity?: number;
  paymentMethods?: string;
  restrictions?: string;
  vehicleDimensions?: VehicleDimensions;
  calculatedFee?: number;
  nearestConvenienceStore?: NearbyFacility;
  nearestHotspring?: NearbyFacility;
}
```

#### 6.2.2 料金構造（ParkingRate）
```typescript
interface ParkingRate {
  id: string;
  type: string;        // "base", "max", "conditional_free"等
  minutes: number;     // 時間単位（分）
  price: number;      // 料金（円）
  timeRange?: string; // 時間帯（"8:00～20:00"等）
  dayType?: string;   // 曜日タイプ（"平日"等）
  applyAfter?: number; // 適用開始時刻
}
```

#### 6.2.3 営業時間構造（HoursInfo）
```typescript
interface HoursInfo {
  originalHours?: string;    // 元の営業時間文字列
  is24h?: boolean;          // 24時間営業フラグ
  schedules?: Schedule[];    // 詳細スケジュール
  access24h?: boolean;       // 24時間アクセス可能
}

interface Schedule {
  days?: string[];
  time?: string;
}
```

### 6.3 その他スポットインターフェース

#### 6.3.1 温泉（HotSpring）
```typescript
interface HotSpring extends Spot {
  price?: string;
  operatingHours?: string;
  holidayInfo?: string;
  facilityType?: string;
}
```

#### 6.3.2 コンビニエンスストア（ConvenienceStore）
```typescript
interface ConvenienceStore extends Spot {
  idString: string;
  subType?: string;
  phoneNumber?: string;
  operatingHours?: string;
}
```

### 6.4 検索フィルター（SearchFilter）

#### 6.4.1 基本フィルター
```typescript
interface SearchFilter {
  selectedCategories: Set<string>;
  searchRadius: number;        // デフォルト500m
  minElevation: number;        // デフォルト0m
  parkingTimeFilterEnabled: boolean;
  radiusFilterEnabled: boolean;
  elevationFilterEnabled: boolean;
  nearbyCategories: Set<string>;
  convenienceStoreRadius: number; // 500m
  hotSpringRadius: number;        // 500m
  showFlatParking: boolean;       // デフォルトtrue
  showMultiStoryParking: boolean; // デフォルトtrue
  showMechanicalParking: boolean; // デフォルトtrue
  parkingDuration: ParkingDuration;
}
```

#### 6.4.2 駐車時間設定（ParkingDuration）
```typescript
interface ParkingDuration {
  startDate: Date;              // 開始時刻（デフォルト現在時刻）
  duration: number;             // 駐車時間（秒、デフォルト3600）
  endDate: Date;                // 計算プロパティ：終了時刻
  durationInMinutes: number;    // 計算プロパティ：分単位
  formattedDuration: string;    // 計算プロパティ：表示文字列
}
```

## 7. 状態管理（Zustand Stores）

### 7.1 メインストア（useMainStore）

#### 7.1.1 State Properties
```typescript
interface MainStore {
  searchFilter: SearchFilter;
  searchResults: Spot[];
  selectedSpot: Spot | null;
  mapRegion: Region;
  showingSpotDetail: boolean;
  isLoading: boolean;
  errorMessage: string | null;
  userLocation: Location | null;
  locationPermission: 'granted' | 'denied' | 'restricted' | null;
}
```

#### 7.1.2 Actions
```typescript
interface MainStoreActions {
  performSearch: () => Promise<void>;
  searchInCurrentMapRegion: () => Promise<void>;
  selectSpot: (spot: Spot) => void;
  requestCurrentLocation: () => Promise<void>;
  toggleCategory: (category: string) => void;
  setupDefaultCategories: () => void;
  setMapRegion: (region: Region) => void;
  setErrorMessage: (message: string | null) => void;
  dismissError: () => void;
}
```

### 7.2 検索ストア（useSearchStore）

#### 7.2.1 State Properties
```typescript
interface SearchStore {
  isSearching: boolean;
  lastSearchQuery: SearchQuery | null;
  searchHistory: SearchQuery[];
  recentSpots: Spot[];
}
```

#### 7.2.2 Actions
```typescript
interface SearchStoreActions {
  searchSpots: (filter: SearchFilter, userLocation?: Location) => Promise<Spot[]>;
  searchAllSpotsInMapRegion: (region: Region, filter: SearchFilter) => Promise<Spot[]>;
  addToHistory: (query: SearchQuery) => void;
  addToRecent: (spot: Spot) => void;
  clearHistory: () => void;
}
```

## 8. サービス層

### 8.1 位置情報サービス（LocationService）

#### 8.1.1 基本設定
```typescript
class LocationService {
  private static instance: LocationService;
  
  static getInstance(): LocationService;
  
  async requestPermission(): Promise<PermissionStatus>;
  async getCurrentPosition(): Promise<Location>;
  watchPosition(callback: (location: Location) => void): number;
  clearWatch(watchId: number): void;
  async reverseGeocode(location: Location): Promise<Address>;
}
```

#### 8.1.2 設定項目
- **精度**: enableHighAccuracy: true
- **タイムアウト**: timeout: 10000
- **最大経過時間**: maximumAge: 300000
- **距離フィルター**: distanceFilter: 10m

### 8.2 データサービス（DataService）

#### 8.2.1 データソース管理
```typescript
class DataService {
  private static instance: DataService;
  
  static getInstance(): DataService;
  
  async loadAllData(): Promise<{
    parkingSpots: CoinParking[];
    hotSprings: HotSpring[];
    convenienceStores: ConvenienceStore[];
    festivals: Festival[];
    gasStations: GasStation[];
    allSpots: Spot[];
  }>;
  
  async loadFromSupabase(): Promise<void>;
  getCachedData<T>(key: string): T | null;
  setCachedData<T>(key: string, data: T): void;
}
```

#### 8.2.2 キャッシュ戦略
- **AsyncStorage**: 永続化キャッシュ
- **Memory Cache**: セッション内高速アクセス
- **TTL**: 24時間でキャッシュ無効化

### 8.3 料金計算サービス（ParkingFeeCalculator）

#### 8.3.1 料金計算ロジック
```typescript
class ParkingFeeCalculator {
  static calculateFee(parking: CoinParking, duration: ParkingDuration): number;
  static isParkingOpenForEntireDuration(parking: CoinParking, duration: ParkingDuration): boolean;
  static detectAndFixAbnormalRates(rates: ParkingRate[]): ParkingRate[];
  private static applyTimeBasedRates(rates: ParkingRate[], startTime: Date): ParkingRate[];
}
```

#### 8.3.2 営業時間判定
- **24時間営業判定**: is24h、access24h、文字列パターンマッチ
- **曜日判定**: 日本語曜日表記対応（月-日、平日、土日祝等）
- **時間範囲判定**: "8:00～20:00"形式の時間範囲パース
- **連続営業判定**: 駐車開始から終了まで営業時間内かチェック

## 9. フィルターパネル（BottomFilterPanel.tsx）

### 9.1 パネル構造

#### 9.1.1 基本レイアウト
```typescript
const BottomFilterPanel: React.FC = () => {
  const [expanded, setExpanded] = useState(false);
  const animatedHeight = useSharedValue(80);
  
  // Reanimated animation setup
  const animatedStyle = useAnimatedStyle(() => ({
    height: withSpring(expanded ? 200 : 80, {
      damping: 15,
      stiffness: 150,
    }),
  }));
};
```

#### 9.1.2 タブ構成（FilterTab enum）
```typescript
enum FilterTab {
  PARKING_TIME = 'parkingTime',
  SEARCH_RADIUS = 'searchRadius',
  ELEVATION = 'elevation',
}

const tabConfig = {
  [FilterTab.PARKING_TIME]: {
    icon: 'time-outline',
    label: '駐車料金',
  },
  [FilterTab.SEARCH_RADIUS]: {
    icon: 'radio-button-on-outline', 
    label: '検索半径',
  },
  [FilterTab.ELEVATION]: {
    icon: 'triangle-outline',
    label: '標高',
  },
};
```

#### 9.1.3 タブボタン設計（TabButton.tsx）
```typescript
interface TabButtonProps {
  tab: FilterTab;
  isSelected: boolean;
  onPress: (tab: FilterTab) => void;
}

const TabButton: React.FC<TabButtonProps> = ({ tab, isSelected, onPress }) => {
  const animatedScale = useSharedValue(1);
  
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: animatedScale.value }],
    backgroundColor: isSelected ? Colors.primaryLight : 'transparent',
  }));
};
```

### 9.2 駐車料金タブ内容（ParkingTabContent.tsx）

#### 9.2.1 駐車時間設定
```typescript
const ParkingTabContent: React.FC = () => {
  const { searchFilter, updateSearchFilter } = useMainStore();
  
  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View style={styles.section}>
        <Switch
          value={searchFilter.parkingTimeFilterEnabled}
          onValueChange={(value) => 
            updateSearchFilter({ parkingTimeFilterEnabled: value })
          }
          trackColor={{ false: Colors.disabled, true: Colors.primaryLight }}
          thumbColor={Colors.primary}
        />
        <Text style={styles.sectionTitle}>駐車時間フィルター</Text>
      </View>
      
      <ParkingDurationPicker
        duration={searchFilter.parkingDuration}
        onDurationChange={(duration) =>
          updateSearchFilter({ parkingDuration: duration })
        }
      />
    </ScrollView>
  );
};
```

#### 9.2.2 駐車場タイプフィルター
```typescript
const ParkingTypeFilters: React.FC = () => {
  const { searchFilter, updateSearchFilter } = useMainStore();
  
  const parkingTypes = [
    { key: 'showFlatParking', label: '平面駐車場' },
    { key: 'showMultiStoryParking', label: '立体駐車場' },
    { key: 'showMechanicalParking', label: '機械式駐車場' },
  ];
  
  return (
    <View style={styles.typeFilters}>
      {parkingTypes.map((type) => (
        <TouchableOpacity
          key={type.key}
          style={[
            styles.typeButton,
            searchFilter[type.key] && styles.typeButtonSelected
          ]}
          onPress={() => 
            updateSearchFilter({ [type.key]: !searchFilter[type.key] })
          }
        >
          <Text style={[
            styles.typeButtonText,
            searchFilter[type.key] && styles.typeButtonTextSelected
          ]}>
            {type.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};
```

#### 9.2.3 近隣施設検索
```typescript
const NearbyFacilityFilters: React.FC = () => {
  const { searchFilter, updateSearchFilter } = useMainStore();
  
  const facilities = [
    { category: 'コンビニ', icon: '🏪', radius: 500 },
    { category: '温泉', icon: '♨️', radius: 500 },
  ];
  
  return (
    <View style={styles.facilityFilters}>
      {facilities.map((facility) => (
        <TouchableOpacity
          key={facility.category}
          style={[
            styles.facilityButton,
            searchFilter.nearbyCategories.has(facility.category) && 
            styles.facilityButtonSelected
          ]}
          onPress={() => {
            const newCategories = new Set(searchFilter.nearbyCategories);
            if (newCategories.has(facility.category)) {
              newCategories.delete(facility.category);
            } else {
              newCategories.add(facility.category);
            }
            updateSearchFilter({ nearbyCategories: newCategories });
          }}
        >
          <Text style={styles.facilityIcon}>{facility.icon}</Text>
          <Text style={styles.facilityLabel}>{facility.category}近く</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};
```

### 9.3 検索半径タブ内容（RadiusTabContent.tsx）

#### 9.3.1 距離スライダー
```typescript
import Slider from '@react-native-community/slider';

const RadiusTabContent: React.FC = () => {
  const { searchFilter, updateSearchFilter } = useMainStore();
  
  const formatRadius = (radius: number): string => {
    return radius >= 1000 ? `${(radius / 1000).toFixed(1)}km` : `${radius}m`;
  };
  
  return (
    <View style={styles.content}>
      <View style={styles.sliderSection}>
        <Switch
          value={searchFilter.radiusFilterEnabled}
          onValueChange={(value) => 
            updateSearchFilter({ radiusFilterEnabled: value })
          }
        />
        <Text style={styles.sectionTitle}>検索半径フィルター</Text>
      </View>
      
      <View style={styles.sliderContainer}>
        <Slider
          style={styles.slider}
          minimumValue={10}
          maximumValue={2000}
          value={searchFilter.searchRadius}
          onValueChange={(value) => 
            updateSearchFilter({ searchRadius: Math.round(value) })
          }
          minimumTrackTintColor={Colors.primary}
          maximumTrackTintColor={Colors.disabled}
          thumbStyle={{ backgroundColor: Colors.primary }}
          trackStyle={{ height: 4, borderRadius: 2 }}
        />
        <Text style={styles.radiusValue}>
          {formatRadius(searchFilter.searchRadius)}
        </Text>
      </View>
    </View>
  );
};
```

#### 9.3.2 クイック選択ボタン
```typescript
const QuickRadiusButtons: React.FC = () => {
  const { updateSearchFilter } = useMainStore();
  
  const quickOptions = [
    { label: '100m', value: 100 },
    { label: '500m', value: 500 },
    { label: '1km', value: 1000 },
    { label: '2km', value: 2000 },
  ];
  
  return (
    <View style={styles.quickButtons}>
      {quickOptions.map((option) => (
        <TouchableOpacity
          key={option.value}
          style={styles.quickButton}
          onPress={() => updateSearchFilter({ 
            searchRadius: option.value,
            radiusFilterEnabled: true 
          })}
        >
          <Text style={styles.quickButtonText}>{option.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};
```

### 9.4 標高タブ内容（ElevationTabContent.tsx）

#### 9.4.1 標高スライダー
```typescript
const ElevationTabContent: React.FC = () => {
  const { searchFilter, updateSearchFilter } = useMainStore();
  
  const getTemperatureDifference = (elevation: number): number => {
    return elevation * -0.6 / 100; // 100m毎に-0.6度
  };
  
  const getTsunamiSafetyLevel = (elevation: number): 'safe' | 'recommended' | 'warning' => {
    if (elevation >= 30) return 'safe';
    if (elevation >= 10) return 'recommended';
    return 'warning';
  };
  
  return (
    <View style={styles.content}>
      <View style={styles.sliderSection}>
        <Switch
          value={searchFilter.elevationFilterEnabled}
          onValueChange={(value) => 
            updateSearchFilter({ elevationFilterEnabled: value })
          }
        />
        <Text style={styles.sectionTitle}>標高フィルター</Text>
      </View>
      
      <View style={styles.sliderContainer}>
        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={2000}
          step={10}
          value={searchFilter.minElevation}
          onValueChange={(value) => 
            updateSearchFilter({ minElevation: value })
          }
        />
        <Text style={styles.elevationValue}>{searchFilter.minElevation}m</Text>
      </View>
      
      <View style={styles.infoSection}>
        <Text style={styles.infoText}>
          気温差: 平地より{Math.abs(getTemperatureDifference(searchFilter.minElevation)).toFixed(1)}度低い
        </Text>
        
        {getTsunamiSafetyLevel(searchFilter.minElevation) === 'safe' && (
          <Text style={[styles.infoText, { color: Colors.success }]}>
            ✓ 推奨標高以上
          </Text>
        )}
        
        {getTsunamiSafetyLevel(searchFilter.minElevation) === 'warning' && (
          <Text style={[styles.infoText, { color: Colors.warning }]}>
            ⚠ 沿岸部では30m以上推奨
          </Text>
        )}
      </View>
    </View>
  );
};
```

## 10. 詳細画面（SpotDetailScreen.tsx）

### 10.1 画面構造

#### 10.1.1 基本レイアウト
```typescript
const SpotDetailScreen: React.FC<{ route: RouteProp<any, any> }> = ({ route }) => {
  const { spot } = route.params;
  const navigation = useNavigation();
  const [region, setRegion] = useState<Region>();
  
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="close" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          
          <Text style={styles.title}>{spot.name}</Text>
          
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.actionButton}>
              <Ionicons name="heart-outline" size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <Ionicons name="search" size={16} color={Colors.primary} />
              <Text style={styles.actionText}>検索</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <Ionicons name="map" size={16} color={Colors.primary} />
              <Text style={styles.actionText}>地図</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        <SpotDetailContent spot={spot} />
      </ScrollView>
    </SafeAreaView>
  );
};
```

#### 10.1.2 コンテンツ構成
```typescript
const SpotDetailContent: React.FC<{ spot: Spot }> = ({ spot }) => {
  return (
    <View style={styles.content}>
      <SpotDetailTitleHeader spot={spot} />
      <CategorySpecificSection spot={spot} />
      <BasicInfoSection spot={spot} />
      <SpotDetailMapSection spot={spot} />
    </View>
  );
};
```

### 10.2 地図表示機能
```typescript
const SpotDetailMapSection: React.FC<{ spot: Spot }> = ({ spot }) => {
  const [region, setRegion] = useState<Region>({
    latitude: spot.lat,
    longitude: spot.lng,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });
  
  const nearbySpots = useMemo(() => {
    // 近隣施設の計算ロジック
    return calculateNearbySpots(spot);
  }, [spot]);
  
  return (
    <InfoSectionContainer title="地図" icon="map">
      <View style={styles.mapContainer}>
        <MapView
          style={styles.map}
          region={region}
          scrollEnabled={false}
          zoomEnabled={false}
          rotateEnabled={false}
        >
          <Marker
            coordinate={{ latitude: spot.lat, longitude: spot.lng }}
            title={spot.name}
          >
            <CustomMarker spot={spot} />
          </Marker>
          
          {nearbySpots.map((nearbySpot) => (
            <Marker
              key={nearbySpot.id}
              coordinate={{ latitude: nearbySpot.lat, longitude: nearbySpot.lng }}
              title={nearbySpot.name}
            >
              <CustomMarker spot={nearbySpot} />
            </Marker>
          ))}
        </MapView>
        
        {spot.address && (
          <Text style={styles.addressText}>{spot.address}</Text>
        )}
      </View>
    </InfoSectionContainer>
  );
};
```

## 11. コンポーネント仕様

### 11.1 カスタムボタン（CustomButton.tsx）

#### 11.1.1 PrimaryButton
```typescript
interface PrimaryButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
}

const PrimaryButton: React.FC<PrimaryButtonProps> = ({
  title,
  onPress,
  disabled = false,
  loading = false,
  style,
}) => {
  const animatedScale = useSharedValue(1);
  
  const handlePressIn = () => {
    animatedScale.value = withSpring(0.95, { damping: 15, stiffness: 150 });
  };
  
  const handlePressOut = () => {
    animatedScale.value = withSpring(1, { damping: 15, stiffness: 150 });
  };
  
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: animatedScale.value }],
  }));
  
  return (
    <Animated.View style={[animatedStyle, style]}>
      <TouchableOpacity
        style={[
          styles.primaryButton,
          disabled && styles.primaryButtonDisabled,
        ]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        activeOpacity={0.8}
      >
        {loading ? (
          <ActivityIndicator color={Colors.white} size="small" />
        ) : (
          <Text style={styles.primaryButtonText}>{title}</Text>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};
```

#### 11.1.2 SecondaryButton  
```typescript
const SecondaryButton: React.FC<PrimaryButtonProps> = (props) => {
  return (
    <TouchableOpacity
      style={[styles.secondaryButton, props.style]}
      onPress={props.onPress}
      disabled={props.disabled}
    >
      <Text style={styles.secondaryButtonText}>{props.title}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  secondaryButton: {
    backgroundColor: Colors.white,
    borderColor: Colors.primary,
    borderWidth: 1,
    borderRadius: Spacing.cornerRadius,
    paddingVertical: Spacing.medium,
    paddingHorizontal: Spacing.large,
    alignItems: 'center',
    ...DefaultShadow,
  },
  secondaryButtonText: {
    color: Colors.primary,
    fontSize: Typography.body,
    fontWeight: '600',
  },
});
```

### 11.2 ランキングバッジ（RankingBadge.tsx）

#### 11.2.1 表示ルール
```typescript
interface RankingBadgeProps {
  rank: number;
  size?: number;
}

const RankingBadge: React.FC<RankingBadgeProps> = ({ 
  rank, 
  size = 20 
}) => {
  const getMedalEmoji = (rank: number): string => {
    switch (rank) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return '';
    }
  };
  
  const getBadgeStyle = (rank: number): ViewStyle => {
    if (rank <= 3) {
      return {
        backgroundColor: 'transparent',
      };
    }
    return {
      backgroundColor: Colors.success,
      borderRadius: size / 2,
    };
  };
  
  const getTextStyle = (rank: number): TextStyle => {
    if (rank <= 3) {
      return {
        fontSize: size * 0.8,
      };
    }
    return {
      fontSize: size * 0.6,
      fontWeight: 'bold',
      color: Colors.white,
    };
  };
  
  return (
    <View style={[
      styles.badge,
      { width: size, height: size },
      getBadgeStyle(rank),
    ]}>
      <Text style={getTextStyle(rank)}>
        {rank <= 3 ? getMedalEmoji(rank) : rank.toString()}
      </Text>
    </View>
  );
};
```

#### 11.2.2 デザイン仕様
```typescript
const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    zIndex: 1000,
  },
});
```

### 11.3 カテゴリーアイコン（CategoryIcon.tsx）
```typescript
interface CategoryIconProps {
  category: string;
  size?: number;
  selected?: boolean;
}

const CategoryIcon: React.FC<CategoryIconProps> = ({ 
  category, 
  size = 24,
  selected = false 
}) => {
  const getCategoryEmoji = (category: string): string => {
    const emojiMap: Record<string, string> = {
      'コインパーキング': '🅿️',
      'コンビニ': '🏪',
      'お祭り・花火大会': '🎆',
      '温泉': '♨️',
      'ガソリンスタンド': '⛽',
      '道の駅': '🚗',
    };
    return emojiMap[category] || '📍';
  };
  
  return (
    <View style={[
      styles.iconContainer,
      { width: size, height: size },
      selected && styles.iconContainerSelected,
    ]}>
      <Text style={[styles.iconText, { fontSize: size * 0.7 }]}>
        {getCategoryEmoji(category)}
      </Text>
    </View>
  );
};
```

## 12. テーマ・デザインシステム（Colors.ts, Typography.ts）

### 12.1 カラーパレット
```typescript
export const Colors = {
  // Primary Colors
  primary: '#1976d2',      // Material Design Blue
  primaryLight: '#63a4ff',
  primaryDark: '#004ba0',
  
  // Secondary Colors
  secondary: '#dc004e',     // 赤系アクセント
  secondaryLight: '#ff5983',
  secondaryDark: '#9a0036',
  
  // Background Colors
  background: '#fafafa',    // 薄グレー背景
  surface: '#ffffff',      // カード・パネル背景
  
  // Status Colors
  error: '#f44336',
  errorLight: '#ff7961',
  errorDark: '#ba000d',
  
  success: '#4caf50',
  successLight: '#80e27e',
  successDark: '#087f23',
  
  warning: '#ff9800',
  warningLight: '#ffc947',
  warningDark: '#c66900',
  
  info: '#2196f3',
  infoLight: '#6ec6ff',
  infoDark: '#0069c0',
  
  // Text Colors
  textPrimary: 'rgba(0, 0, 0, 0.87)',
  textSecondary: 'rgba(0, 0, 0, 0.6)',
  textDisabled: 'rgba(0, 0, 0, 0.38)',
  textWhite: '#ffffff',
  
  // Category Colors
  categoryParking: '#1976d2',      // 青
  categoryConvenience: '#4CAF50',  // 緑
  categoryHotSpring: '#E91E63',    // ピンク
  categoryFestival: '#9C27B0',     // 紫
  categoryGasStation: '#FF9800',   // オレンジ
  categoryRoadStation: '#FF9800',  // オレンジ
  
  // UI Colors
  disabled: '#e0e0e0',
  divider: '#e0e0e0',
  overlay: 'rgba(0, 0, 0, 0.5)',
  white: '#ffffff',
  black: '#000000',
  transparent: 'transparent',
} as const;
```

### 12.2 タイポグラフィ
```typescript
export const Typography = {
  // Font Sizes
  h1: 28,
  h2: 24,
  h3: 20,
  h4: 18,
  h5: 16,
  h6: 14,
  
  body: 16,
  bodySmall: 14,
  caption: 12,
  overline: 10,
  
  // Font Weights
  light: '300' as const,
  regular: '400' as const,
  medium: '500' as const,
  semiBold: '600' as const,
  bold: '700' as const,
  
  // Line Heights
  lineHeightTight: 1.2,
  lineHeightNormal: 1.4,
  lineHeightRelaxed: 1.6,
} as const;
```

### 12.3 スペーシング・レイアウト
```typescript
export const Spacing = {
  // Base spacing unit (8px)
  unit: 8,
  
  // Padding/Margin sizes
  xs: 4,      // 0.5 * unit
  small: 8,   // 1 * unit
  medium: 16, // 2 * unit
  large: 24,  // 3 * unit
  xl: 32,     // 4 * unit
  xxl: 48,    // 6 * unit
  
  // Border radius
  cornerRadius: 8,
  cornerRadiusSmall: 4,
  cornerRadiusLarge: 12,
  
  // Elevations (Android)
  elevation1: 1,
  elevation2: 2,
  elevation3: 4,
  elevation4: 6,
  elevation5: 8,
} as const;

export const DefaultShadow = {
  // iOS Shadow
  shadowColor: Colors.black,
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 4,
  
  // Android Elevation
  elevation: Spacing.elevation2,
} as const;
```

### 12.4 UI要素定義
```typescript
export const UIElements = {
  // Animation Durations
  animationFast: 200,
  animationNormal: 350,
  animationSlow: 500,
  
  // Animation Easing
  easeInOut: 'ease-in-out',
  easeIn: 'ease-in',
  easeOut: 'ease-out',
  
  // Layout Constants
  headerHeight: 56,
  tabBarHeight: 60,
  buttonHeight: 48,
  inputHeight: 48,
  
  // Icon Sizes
  iconSmall: 16,
  iconMedium: 24,
  iconLarge: 32,
  iconXLarge: 48,
} as const;
```

## 13. データフロー・状態管理（Zustand + React Query）

### 13.1 React Query 設定

#### 13.1.1 Query Client 設定
```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,    // 5分
      cacheTime: 10 * 60 * 1000,   // 10分
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 1,
      retryDelay: 1000,
    },
  },
});
```

#### 13.1.2 Query Keys
```typescript
export const queryKeys = {
  all: ['carConcierge'] as const,
  spots: () => [...queryKeys.all, 'spots'] as const,
  spotsInRegion: (region: Region) => [...queryKeys.spots(), 'region', region] as const,
  spotDetail: (id: string) => [...queryKeys.spots(), 'detail', id] as const,
  userLocation: () => [...queryKeys.all, 'userLocation'] as const,
  searchResults: (filter: SearchFilter) => [...queryKeys.all, 'search', filter] as const,
} as const;
```

### 13.2 カスタムフック

#### 13.2.1 検索結果フック
```typescript
export const useSearchResults = (filter: SearchFilter, userLocation?: Location) => {
  return useQuery({
    queryKey: queryKeys.searchResults(filter),
    queryFn: async () => {
      const searchService = SearchService.getInstance();
      return await searchService.searchSpots(filter, userLocation);
    },
    enabled: !!filter.selectedCategories.size,
    staleTime: 2 * 60 * 1000, // 2分
    select: (data) => {
      // データ変換・フィルタリング
      return data.slice(0, 100); // 100件制限
    },
  });
};
```

#### 13.2.2 位置情報フック
```typescript
export const useUserLocation = () => {
  const [locationPermission, setLocationPermission] = 
    useState<PermissionStatus>('undetermined');
  
  return useQuery({
    queryKey: queryKeys.userLocation(),
    queryFn: async () => {
      const locationService = LocationService.getInstance();
      const permission = await locationService.requestPermission();
      setLocationPermission(permission);
      
      if (permission === 'granted') {
        return await locationService.getCurrentPosition();
      }
      
      // デフォルト位置（東京駅）を返す
      return {
        latitude: 35.6812,
        longitude: 139.7671,
        accuracy: 0,
        timestamp: Date.now(),
      };
    },
    staleTime: 5 * 60 * 1000, // 5分
    refetchInterval: 30 * 1000, // 30秒毎に更新
    enabled: true,
    retry: (failureCount, error) => {
      // 位置情報エラーの場合はリトライしない
      if (error.message.includes('location')) return false;
      return failureCount < 2;
    },
  });
};
```

#### 13.2.3 スポット詳細フック
```typescript
export const useSpotDetail = (spotId: string) => {
  return useQuery({
    queryKey: queryKeys.spotDetail(spotId),
    queryFn: async () => {
      // Supabase からの詳細情報取得
      const supabaseService = SupabaseService.getInstance();
      return await supabaseService.fetchSpotDetail(spotId);
    },
    enabled: !!spotId,
    staleTime: 10 * 60 * 1000, // 10分
  });
};
```

### 13.3 Zustand Store Integration

#### 13.3.1 メインストアとReact Query連携
```typescript
interface MainStore {
  // ... other state
  
  // React Query integration
  searchQuery: UseQueryResult<Spot[], Error> | null;
  locationQuery: UseQueryResult<Location, Error> | null;
  
  // Actions
  setSearchQuery: (query: UseQueryResult<Spot[], Error>) => void;
  setLocationQuery: (query: UseQueryResult<Location, Error>) => void;
  
  // Computed properties
  isLoading: boolean;
  searchResults: Spot[];
  userLocation: Location | null;
  error: Error | null;
}

export const useMainStore = create<MainStore>((set, get) => ({
  searchFilter: createDefaultSearchFilter(),
  selectedSpot: null,
  mapRegion: createDefaultRegion(),
  showingSpotDetail: false,
  
  searchQuery: null,
  locationQuery: null,
  
  get isLoading() {
    const { searchQuery, locationQuery } = get();
    return searchQuery?.isLoading || locationQuery?.isLoading || false;
  },
  
  get searchResults() {
    return get().searchQuery?.data || [];
  },
  
  get userLocation() {
    return get().locationQuery?.data || null;
  },
  
  get error() {
    const { searchQuery, locationQuery } = get();
    return searchQuery?.error || locationQuery?.error || null;
  },
  
  setSearchQuery: (query) => set({ searchQuery: query }),
  setLocationQuery: (query) => set({ locationQuery: query }),
  
  // ... other actions
}));
```

### 13.4 実際の使用例

#### 13.4.1 コンポーネントでの使用
```typescript
const MainScreen: React.FC = () => {
  const { searchFilter, mapRegion } = useMainStore();
  
  // React Query hooks
  const locationQuery = useUserLocation();
  const searchQuery = useSearchResults(searchFilter, locationQuery.data);
  
  // Store に Query 結果を設定
  useEffect(() => {
    useMainStore.getState().setLocationQuery(locationQuery);
  }, [locationQuery]);
  
  useEffect(() => {
    useMainStore.getState().setSearchQuery(searchQuery);
  }, [searchQuery]);
  
  // Store から計算されたプロパティを使用
  const isLoading = useMainStore((state) => state.isLoading);
  const searchResults = useMainStore((state) => state.searchResults);
  const userLocation = useMainStore((state) => state.userLocation);
  const error = useMainStore((state) => state.error);
  
  return (
    <SafeAreaView style={styles.container}>
      {isLoading && <LoadingOverlay />}
      {error && <ErrorAlert error={error} />}
      
      <MapView
        region={mapRegion}
        spots={searchResults}
        userLocation={userLocation}
      />
      
      <BottomFilterPanel />
    </SafeAreaView>
  );
};
```

## 14. パフォーマンス・最適化

### 14.1 React Native最適化

#### 14.1.1 メモ化・最適化
```typescript
// React.memo for expensive components
const ExpensiveMapMarker = React.memo<MarkerProps>(({ spot, rank }) => {
  return (
    <Marker coordinate={{ latitude: spot.lat, longitude: spot.lng }}>
      <CustomMarkerView spot={spot} rank={rank} />
    </Marker>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for performance
  return (
    prevProps.spot.id === nextProps.spot.id &&
    prevProps.rank === nextProps.rank
  );
});

// useMemo for expensive calculations
const ProcessedSearchResults = ({ spots, userLocation }) => {
  const processedSpots = useMemo(() => {
    if (!userLocation) return spots;
    
    return spots
      .map(spot => ({
        ...spot,
        distance: calculateDistance(userLocation, spot),
      }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 100);
  }, [spots, userLocation]);
  
  return <SpotList spots={processedSpots} />;
};

// useCallback for stable function references
const SearchContainer: React.FC = () => {
  const { searchFilter, updateSearchFilter } = useMainStore();
  
  const handleCategoryToggle = useCallback((category: string) => {
    const newCategories = new Set(searchFilter.selectedCategories);
    if (newCategories.has(category)) {
      newCategories.delete(category);
    } else {
      newCategories.add(category);
    }
    updateSearchFilter({ selectedCategories: newCategories });
  }, [searchFilter.selectedCategories, updateSearchFilter]);
  
  return (
    <CategoryButtons 
      selectedCategories={searchFilter.selectedCategories}
      onToggle={handleCategoryToggle}
    />
  );
};
```

#### 14.1.2 FlatList最適化
```typescript
const SpotList: React.FC<{ spots: Spot[] }> = ({ spots }) => {
  const renderSpot = useCallback(({ item }: { item: Spot }) => (
    <SpotListItem spot={item} />
  ), []);
  
  const getItemLayout = useCallback((data: any, index: number) => ({
    length: ITEM_HEIGHT,
    offset: ITEM_HEIGHT * index,
    index,
  }), []);
  
  const keyExtractor = useCallback((item: Spot) => item.id, []);
  
  return (
    <FlatList
      data={spots}
      renderItem={renderSpot}
      keyExtractor={keyExtractor}
      getItemLayout={getItemLayout}
      removeClippedSubviews={true}
      maxToRenderPerBatch={10}
      windowSize={10}
      initialNumToRender={10}
      updateCellsBatchingPeriod={50}
      onEndReachedThreshold={0.5}
    />
  );
};
```

### 14.2 地図パフォーマンス最適化

#### 14.2.1 マーカー表示最適化
```typescript
const OptimizedMapView: React.FC = () => {
  const { searchResults, mapRegion } = useMainStore();
  
  // マーカー表示制限と最適化
  const visibleMarkers = useMemo(() => {
    const bounds = calculateMapBounds(mapRegion);
    
    return searchResults
      .filter(spot => isInBounds(spot, bounds))
      .slice(0, 100) // 最大100件
      .map(spot => ({
        id: spot.id,
        coordinate: { latitude: spot.lat, longitude: spot.lng },
        spot,
      }));
  }, [searchResults, mapRegion]);
  
  // バッチ処理でマーカー更新
  const [displayedMarkers, setDisplayedMarkers] = useState<MarkerData[]>([]);
  
  useEffect(() => {
    const batchSize = 20;
    let currentIndex = 0;
    
    const addMarkersBatch = () => {
      const batch = visibleMarkers.slice(currentIndex, currentIndex + batchSize);
      setDisplayedMarkers(prev => [...prev, ...batch]);
      currentIndex += batchSize;
      
      if (currentIndex < visibleMarkers.length) {
        requestAnimationFrame(addMarkersBatch);
      }
    };
    
    setDisplayedMarkers([]); // Clear previous markers
    addMarkersBatch();
  }, [visibleMarkers]);
  
  return (
    <MapView
      region={mapRegion}
      onRegionChangeComplete={handleRegionChange}
      moveOnMarkerPress={false}
      loadingEnabled={true}
      loadingIndicatorColor={Colors.primary}
    >
      {displayedMarkers.map(marker => (
        <OptimizedMarker
          key={marker.id}
          coordinate={marker.coordinate}
          spot={marker.spot}
        />
      ))}
    </MapView>
  );
};
```

#### 14.2.2 地図操作応答性
```typescript
const useMapInteraction = () => {
  const [isInteracting, setIsInteracting] = useState(false);
  const interactionTimer = useRef<NodeJS.Timeout>();
  
  const handleRegionChangeStart = useCallback(() => {
    setIsInteracting(true);
    if (interactionTimer.current) {
      clearTimeout(interactionTimer.current);
    }
  }, []);
  
  const handleRegionChangeComplete = useCallback((region: Region) => {
    // 地図操作終了後、少し遅延してから検索実行
    interactionTimer.current = setTimeout(() => {
      setIsInteracting(false);
      // 新しい領域での検索実行
      useMainStore.getState().searchInCurrentMapRegion(region);
    }, 500);
  }, []);
  
  return {
    isInteracting,
    handleRegionChangeStart,
    handleRegionChangeComplete,
  };
};
```

### 14.3 メモリ管理

#### 14.3.1 画像・リソース最適化
```typescript
// 画像キャッシュ管理
import FastImage from 'react-native-fast-image';

const CachedImage: React.FC<{ uri: string; style: ViewStyle }> = ({ uri, style }) => (
  <FastImage
    style={style}
    source={{
      uri,
      priority: FastImage.priority.normal,
      cache: FastImage.cacheControl.immutable,
    }}
    resizeMode={FastImage.resizeMode.cover}
  />
);

// メモリ使用量監視
const useMemoryMonitor = () => {
  useEffect(() => {
    const checkMemory = async () => {
      if (__DEV__) {
        const memoryInfo = await performance.memory;
        console.log('Memory Usage:', {
          used: Math.round(memoryInfo.usedJSHeapSize / 1024 / 1024),
          total: Math.round(memoryInfo.totalJSHeapSize / 1024 / 1024),
          limit: Math.round(memoryInfo.jsHeapSizeLimit / 1024 / 1024),
        });
      }
    };
    
    const interval = setInterval(checkMemory, 10000); // 10秒毎
    return () => clearInterval(interval);
  }, []);
};
```

#### 14.3.2 大量データ処理最適化
```typescript
// Web Worker風のバックグラウンド処理（React Nativeでは別スレッド使用）
const useBackgroundProcessing = () => {
  const processLargeDataset = useCallback(async (data: any[]) => {
    return new Promise((resolve) => {
      // 大きなデータセットを小さなチャンクに分割
      const chunkSize = 1000;
      const chunks = [];
      
      for (let i = 0; i < data.length; i += chunkSize) {
        chunks.push(data.slice(i, i + chunkSize));
      }
      
      let processedData: any[] = [];
      let currentChunk = 0;
      
      const processChunk = () => {
        if (currentChunk >= chunks.length) {
          resolve(processedData);
          return;
        }
        
        // チャンク処理
        const processed = chunks[currentChunk].map(processItem);
        processedData = [...processedData, ...processed];
        currentChunk++;
        
        // 次のフレームで続行
        requestAnimationFrame(processChunk);
      };
      
      processChunk();
    });
  }, []);
  
  return { processLargeDataset };
};
```

## 15. エラーハンドリング

### 15.1 エラー種別・対応

#### 15.1.1 React Query Error Boundary
```typescript
import { ErrorBoundary } from 'react-error-boundary';

const ErrorFallback: React.FC<{ error: Error; resetErrorBoundary: () => void }> = ({
  error,
  resetErrorBoundary,
}) => (
  <View style={styles.errorContainer}>
    <Text style={styles.errorTitle}>アプリケーションエラー</Text>
    <Text style={styles.errorMessage}>{error.message}</Text>
    <PrimaryButton
      title="再試行"
      onPress={resetErrorBoundary}
      style={styles.retryButton}
    />
  </View>
);

export const App: React.FC = () => (
  <ErrorBoundary
    FallbackComponent={ErrorFallback}
    onError={(error, errorInfo) => {
      console.error('App Error:', error, errorInfo);
      // エラー報告サービスに送信
      // crashlytics().recordError(error);
    }}
    onReset={() => {
      // 状態リセット
      useMainStore.getState().resetState();
      queryClient.clear();
    }}
  >
    <QueryClientProvider client={queryClient}>
      <NavigationContainer>
        <MainNavigator />
      </NavigationContainer>
    </QueryClientProvider>
  </ErrorBoundary>
);
```

#### 15.1.2 位置情報エラー
```typescript
export const LocationErrorHandler = {
  handleLocationError: (error: LocationError): Location => {
    switch (error.code) {
      case 1: // PERMISSION_DENIED
        Alert.alert(
          '位置情報の許可が必要です',
          '設定から位置情報の使用を許可してください',
          [
            { text: 'キャンセル', style: 'cancel' },
            { 
              text: '設定を開く', 
              onPress: () => Linking.openSettings() 
            },
          ]
        );
        break;
        
      case 2: // POSITION_UNAVAILABLE
        Alert.alert(
          '位置情報を取得できません',
          'GPS信号が弱いか、位置情報サービスが利用できません'
        );
        break;
        
      case 3: // TIMEOUT
        Alert.alert(
          'タイムアウト',
          '位置情報の取得に時間がかかりすぎました'
        );
        break;
        
      default:
        Alert.alert('位置情報エラー', error.message);
    }
    
    // デフォルト位置（東京駅）を返す
    return {
      latitude: 35.6812,
      longitude: 139.7671,
      accuracy: 0,
      timestamp: Date.now(),
    };
  },
};
```

#### 15.1.3 検索・データエラー
```typescript
export const SearchErrorHandler = {
  handleSearchError: (error: Error): void => {
    if (error.message.includes('network')) {
      Toast.show({
        type: 'error',
        text1: 'ネットワークエラー',
        text2: 'インターネット接続を確認してください',
      });
      return;
    }
    
    if (error.message.includes('timeout')) {
      Toast.show({
        type: 'error',
        text1: '検索タイムアウト',
        text2: '検索条件を変更して再試行してください',
      });
      return;
    }
    
    // 一般的なエラー
    Toast.show({
      type: 'error',
      text1: '検索エラー',
      text2: error.message,
    });
  },
  
  handleDataLoadError: async (error: Error): Promise<void> => {
    console.error('Data Load Error:', error);
    
    // キャッシュクリア
    await AsyncStorage.removeItem('@carConcierge/cachedData');
    
    Alert.alert(
      'データ読み込みエラー',
      'データの再取得を試行しますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        { 
          text: '再試行', 
          onPress: () => {
            queryClient.invalidateQueries();
          }
        },
      ]
    );
  },
};
```

### 15.2 グローバルエラーハンドリング

#### 15.2.1 未処理エラーキャッチ
```typescript
import { setJSExceptionHandler, setNativeExceptionHandler } from 'react-native-exception-handler';

// JavaScript エラーハンドラー
setJSExceptionHandler((error, isFatal) => {
  console.error('Global JS Error:', error, 'isFatal:', isFatal);
  
  if (__DEV__) {
    // 開発時は詳細表示
    Alert.alert(
      'JavaScript Error',
      `${error.name}: ${error.message}\n\nStack: ${error.stack}`,
      [{ text: 'OK' }]
    );
  } else {
    // 本番では簡潔なメッセージ
    Alert.alert(
      'アプリケーションエラー',
      '予期しないエラーが発生しました。アプリを再起動してください。',
      [{ text: 'OK' }]
    );
  }
}, true);

// Native エラーハンドラー
setNativeExceptionHandler((exceptionString) => {
  console.error('Global Native Error:', exceptionString);
  
  if (!__DEV__) {
    // 本番では自動的にアプリを再起動
    RNRestart.Restart();
  }
});
```

#### 15.2.2 ネットワークエラー監視
```typescript
import NetInfo from '@react-native-community/netinfo';

export const useNetworkMonitoring = () => {
  const [isConnected, setIsConnected] = useState(true);
  const [connectionType, setConnectionType] = useState<string>('unknown');
  
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsConnected(state.isConnected ?? false);
      setConnectionType(state.type);
      
      if (!state.isConnected) {
        Toast.show({
          type: 'error',
          text1: 'ネットワーク接続なし',
          text2: 'オフラインモードで動作中',
          visibilityTime: 5000,
        });
      } else if (state.isConnected && !isConnected) {
        Toast.show({
          type: 'success',
          text1: 'ネットワーク接続復旧',
          text2: 'データを同期中...',
          visibilityTime: 3000,
        });
        
        // 接続復旧時にクエリを再実行
        queryClient.refetchQueries();
      }
    });
    
    return unsubscribe;
  }, [isConnected]);
  
  return { isConnected, connectionType };
};
```

## 16. セキュリティ・プライバシー

### 16.1 位置情報保護
```typescript
// Info.plist (iOS)
<key>NSLocationWhenInUseUsageDescription</key>
<string>周辺の駐車場や施設を検索するために位置情報を使用します</string>

// AndroidManifest.xml (Android)
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />

// 位置情報の適切な管理
export const LocationPrivacyManager = {
  requestMinimalPermission: async (): Promise<PermissionStatus> => {
    // 最小限の権限のみを要求
    return await Geolocation.requestAuthorization('whenInUse');
  },
  
  clearLocationData: () => {
    // アプリ終了時に位置情報をクリア
    useMainStore.getState().setUserLocation(null);
    AsyncStorage.removeItem('@carConcierge/lastLocation');
  },
  
  anonymizeLocation: (location: Location): Location => {
    // 位置情報の精度を意図的に下げる（プライバシー保護）
    const precision = 0.001; // 約100m精度
    return {
      ...location,
      latitude: Math.round(location.latitude / precision) * precision,
      longitude: Math.round(location.longitude / precision) * precision,
    };
  },
};
```

### 16.2 データ保護
```typescript
// データ暗号化（機密データがある場合）
import CryptoJS from 'crypto-js';

export const DataEncryption = {
  encrypt: (data: string, key: string): string => {
    return CryptoJS.AES.encrypt(data, key).toString();
  },
  
  decrypt: (encryptedData: string, key: string): string => {
    const bytes = CryptoJS.AES.decrypt(encryptedData, key);
    return bytes.toString(CryptoJS.enc.Utf8);
  },
};

// 安全なローカルストレージ
export const SecureStorage = {
  setItem: async (key: string, value: string): Promise<void> => {
    if (__DEV__) {
      // 開発時は暗号化なし
      await AsyncStorage.setItem(key, value);
    } else {
      // 本番時は暗号化
      const encryptedValue = DataEncryption.encrypt(value, APP_SECRET_KEY);
      await AsyncStorage.setItem(key, encryptedValue);
    }
  },
  
  getItem: async (key: string): Promise<string | null> => {
    const value = await AsyncStorage.getItem(key);
    if (!value) return null;
    
    if (__DEV__) {
      return value;
    } else {
      try {
        return DataEncryption.decrypt(value, APP_SECRET_KEY);
      } catch (error) {
        console.error('Decryption failed:', error);
        return null;
      }
    }
  },
};
```

## 17. 将来拡張仕様

### 17.1 追加予定機能

#### 17.1.1 プッシュ通知
```typescript
// React Native Firebase設定
import messaging from '@react-native-firebase/messaging';

export const PushNotificationService = {
  initialize: async () => {
    const authorizationStatus = await messaging().requestPermission();
    
    if (authorizationStatus === messaging.AuthorizationStatus.AUTHORIZED) {
      console.log('User has notification permissions enabled.');
    }
    
    // FCM token取得
    const fcmToken = await messaging().getToken();
    console.log('FCM Token:', fcmToken);
    
    // バックグラウンドメッセージハンドラー
    messaging().setBackgroundMessageHandler(async (remoteMessage) => {
      console.log('Message handled in the background!', remoteMessage);
    });
  },
  
  scheduleLocalNotification: (title: string, body: string, scheduleDate: Date) => {
    // react-native-push-notificationを使用したローカル通知
    PushNotification.localNotificationSchedule({
      title,
      message: body,
      date: scheduleDate,
      playSound: true,
      soundName: 'default',
    });
  },
};
```

#### 17.1.2 オフライン対応
```typescript
// React Query Persist
import { persistQueryClient } from '@tanstack/react-query-persist-client-core';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';

const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'carConcierge-cache',
});

// キャッシュ永続化
persistQueryClient({
  queryClient,
  persister: asyncStoragePersister,
  maxAge: 24 * 60 * 60 * 1000, // 24時間
});

// オフライン検索
export const OfflineSearchService = {
  searchCachedSpots: async (filter: SearchFilter): Promise<Spot[]> => {
    const cachedData = await AsyncStorage.getItem('@carConcierge/offlineData');
    if (!cachedData) return [];
    
    const spots: Spot[] = JSON.parse(cachedData);
    return spots.filter(spot => 
      filter.selectedCategories.has(spot.category)
    );
  },
  
  syncWhenOnline: async () => {
    const { isConnected } = await NetInfo.fetch();
    if (isConnected) {
      // オンライン復帰時にデータ同期
      queryClient.invalidateQueries();
    }
  },
};
```

#### 17.1.3 多言語対応
```typescript
// react-native-localize + i18next
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'react-native-localize';

const resources = {
  en: {
    translation: {
      search: 'Search',
      parking: 'Parking',
      convenience_store: 'Convenience Store',
      hot_spring: 'Hot Spring',
      gas_station: 'Gas Station',
      festival: 'Festival',
    },
  },
  ja: {
    translation: {
      search: '検索',
      parking: 'コインパーキング',
      convenience_store: 'コンビニ',
      hot_spring: '温泉',
      gas_station: 'ガソリンスタンド',
      festival: 'お祭り・花火大会',
    },
  },
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: getLocales()[0].languageCode,
    fallbackLng: 'ja',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;

// 使用例
import { useTranslation } from 'react-i18next';

const CategoryButton: React.FC = () => {
  const { t } = useTranslation();
  
  return (
    <Text>{t('parking')}</Text>
  );
};
```

### 17.2 WhipSpot対応計画

#### 17.2.1 WhipSpot Integration
```typescript
// WhipSpot SDK統合（仮想API）
import WhipSpotSDK from 'whip-spot-react-native';

export const WhipSpotService = {
  initialize: async (apiKey: string) => {
    await WhipSpotSDK.initialize({
      apiKey,
      environment: __DEV__ ? 'development' : 'production',
    });
  },
  
  uploadSpotData: async (spots: Spot[]): Promise<void> => {
    try {
      await WhipSpotSDK.bulkUpload(spots);
    } catch (error) {
      console.error('WhipSpot upload failed:', error);
    }
  },
  
  syncSpotUpdates: async (): Promise<Spot[]> => {
    try {
      return await WhipSpotSDK.fetchUpdates();
    } catch (error) {
      console.error('WhipSpot sync failed:', error);
      return [];
    }
  },
  
  reportSpotIssue: async (spotId: string, issue: string): Promise<void> => {
    try {
      await WhipSpotSDK.reportIssue({ spotId, issue });
    } catch (error) {
      console.error('WhipSpot issue report failed:', error);
    }
  },
};

// WhipSpot Hooks
export const useWhipSpotSync = () => {
  return useMutation({
    mutationFn: WhipSpotService.syncSpotUpdates,
    onSuccess: (updatedSpots) => {
      // ローカルキャッシュを更新
      queryClient.setQueryData(queryKeys.spots(), updatedSpots);
    },
    onError: (error) => {
      console.error('WhipSpot sync error:', error);
    },
  });
};
```

#### 17.2.2 リアルタイム更新
```typescript
// WebSocket接続でリアルタイム更新
export const RealtimeService = {
  connect: (onUpdate: (spot: Spot) => void) => {
    const ws = new WebSocket('wss://whipspot.com/realtime');
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'spot_update') {
        onUpdate(data.spot);
      }
    };
    
    return ws;
  },
  
  subscribeToRegion: (bounds: MapBounds, ws: WebSocket) => {
    ws.send(JSON.stringify({
      type: 'subscribe_region',
      bounds,
    }));
  },
};

// リアルタイム更新Hook
export const useRealtimeSpotUpdates = (region: Region) => {
  useEffect(() => {
    const ws = RealtimeService.connect((updatedSpot) => {
      // キャッシュ更新
      queryClient.setQueryData(
        queryKeys.spotDetail(updatedSpot.id),
        updatedSpot
      );
      
      // 検索結果更新
      queryClient.invalidateQueries(queryKeys.searchResults);
    });
    
    const bounds = calculateMapBounds(region);
    RealtimeService.subscribeToRegion(bounds, ws);
    
    return () => {
      ws.close();
    };
  }, [region]);
};
```

## 18. ビルド・デプロイ設定

### 18.1 React Native Config

#### 18.1.1 Metro設定（metro.config.js）
```javascript
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

const defaultConfig = getDefaultConfig(__dirname);

const config = {
  transformer: {
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true,
      },
    }),
  },
  resolver: {
    alias: {
      '@': './src',
      '@components': './src/components',
      '@screens': './src/screens',
      '@services': './src/services',
      '@stores': './src/stores',
      '@utils': './src/utils',
      '@types': './src/types',
    },
  },
};

module.exports = mergeConfig(defaultConfig, config);
```

#### 18.1.2 TypeScript設定（tsconfig.json）
```json
{
  "compilerOptions": {
    "target": "esnext",
    "lib": ["es2017", "es2019", "es2020"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-native",
    "baseUrl": "./",
    "paths": {
      "@/*": ["src/*"],
      "@components/*": ["src/components/*"],
      "@screens/*": ["src/screens/*"],
      "@services/*": ["src/services/*"],
      "@stores/*": ["src/stores/*"],
      "@utils/*": ["src/utils/*"],
      "@types/*": ["src/types/*"]
    }
  },
  "include": [
    "src/**/*",
    "index.js"
  ],
  "exclude": [
    "node_modules",
    "babel.config.js",
    "metro.config.js",
    "jest.config.js"
  ]
}
```

### 18.2 環境設定

#### 18.2.1 React Native Config
```javascript
// react-native-config用設定
// .env.development
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
WHIP_SPOT_API_KEY=your-whip-spot-key
ENVIRONMENT=development
DEBUG=true

// .env.production
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
WHIP_SPOT_API_KEY=your-whip-spot-key
ENVIRONMENT=production
DEBUG=false

// config使用
import Config from 'react-native-config';

export const AppConfig = {
  supabaseUrl: Config.SUPABASE_URL,
  supabaseAnonKey: Config.SUPABASE_ANON_KEY,
  whipSpotApiKey: Config.WHIP_SPOT_API_KEY,
  isDebug: Config.DEBUG === 'true',
};
```

#### 18.2.2 CodePush設定
```javascript
// CodePush for OTA updates
import codePush from 'react-native-code-push';

const codePushOptions = {
  checkFrequency: codePush.CheckFrequency.ON_APP_RESUME,
  installMode: codePush.InstallMode.ON_NEXT_RESTART,
  updateDialog: {
    title: 'アップデート利用可能',
    optionalUpdateMessage: 'アップデートが利用可能です。今すぐインストールしますか？',
    optionalIgnoreButtonLabel: '後で',
    optionalInstallButtonLabel: 'インストール',
  },
};

export default codePush(codePushOptions)(App);
```

この要件定義書は、現在のCAR_ConciergeのSwiftUI実装を完全にReact Nativeに移植するための包括的な仕様書です。すべての機能、UI、データ構造、パフォーマンス最適化を網羅し、WhipSpot統合とクロスプラットフォーム対応も含んでいます。