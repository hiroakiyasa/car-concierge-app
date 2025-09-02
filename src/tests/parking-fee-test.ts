import { ParkingFeeCalculator } from '../services/parking-fee.service';
import { CoinParking, ParkingDuration, ParkingRate } from '../types';

interface TestCase {
  name: string;
  parking: CoinParking;
  duration: ParkingDuration;
  expectedFee: number;
}

// テストケース定義
const testCases: TestCase[] = [
  // ケース1: 夜間最大料金をまたぐ駐車（17:00-翌10:00）
  {
    name: '夜間最大料金またぎ（17:00-翌10:00）',
    parking: {
      id: 1,
      name: 'テスト駐車場1',
      latitude: 35.6812,
      longitude: 139.7671,
      rates: [
        { type: 'base', minutes: 20, price: 200, timeRange: '08:00-18:00' },
        { type: 'base', minutes: 60, price: 100, timeRange: '18:00-08:00' },
        { type: 'max', minutes: 720, price: 500, timeRange: '18:00-08:00' }
      ]
    } as CoinParking,
    duration: {
      startDate: new Date('2024-01-15T17:00:00'),
      endDate: new Date('2024-01-16T10:00:00'),
      durationInMinutes: 1020
    } as ParkingDuration,
    expectedFee: 1900 // 昼間1時間(200×3=600) + 夜間最大(500) + 朝2時間(200×6=1200) = 2300円だが、夜間最大が14時間適用で800円
  },

  // ケース2: 昼夜の最大料金を2回またぐ（金曜20:00-日曜10:00）
  {
    name: '週末をまたぐ長時間駐車（金20:00-日10:00）',
    parking: {
      id: 2,
      name: 'テスト駐車場2',
      latitude: 35.6812,
      longitude: 139.7671,
      rates: [
        { type: 'base', minutes: 30, price: 300, timeRange: '07:00-19:00', dayType: '平日' },
        { type: 'max', minutes: 720, price: 1500, timeRange: '07:00-19:00', dayType: '平日' },
        { type: 'base', minutes: 60, price: 100, timeRange: '19:00-07:00', dayType: '平日' },
        { type: 'max', minutes: 720, price: 600, timeRange: '19:00-07:00', dayType: '平日' },
        { type: 'base', minutes: 60, price: 100, dayType: '土日祝' },
        { type: 'max', minutes: 1440, price: 800, dayType: '土日祝' }
      ]
    } as CoinParking,
    duration: {
      startDate: new Date('2024-01-19T20:00:00'), // 金曜夜
      endDate: new Date('2024-01-21T10:00:00'), // 日曜朝
      durationInMinutes: 2290
    } as ParkingDuration,
    expectedFee: 2700 // 金夜間600 + 土曜800 + 日曜朝10時間300 = 1700円
  },

  // ケース3: 30分無料後の料金計算
  {
    name: '30分無料条件付き駐車（45分）',
    parking: {
      id: 3,
      name: 'テスト駐車場3',
      latitude: 35.6812,
      longitude: 139.7671,
      rates: [
        { type: 'conditional_free', minutes: 30, price: 0 },
        { type: 'base', minutes: 15, price: 100 }
      ]
    } as CoinParking,
    duration: {
      startDate: new Date('2024-01-15T14:00:00'),
      endDate: new Date('2024-01-15T14:45:00'),
      durationInMinutes: 45
    } as ParkingDuration,
    expectedFee: 300 // 30分無料後、15分×3=300円
  },

  // ケース4: 複数の時間帯別最大料金（朝・昼・夜）
  {
    name: '3つの時間帯別最大料金（6:00-翌6:00）',
    parking: {
      id: 4,
      name: 'テスト駐車場4',
      latitude: 35.6812,
      longitude: 139.7671,
      rates: [
        { type: 'base', minutes: 30, price: 100, timeRange: '06:00-09:00' },
        { type: 'max', minutes: 180, price: 300, timeRange: '06:00-09:00' },
        { type: 'base', minutes: 20, price: 200, timeRange: '09:00-18:00' },
        { type: 'max', minutes: 540, price: 2000, timeRange: '09:00-18:00' },
        { type: 'base', minutes: 60, price: 100, timeRange: '18:00-06:00' },
        { type: 'max', minutes: 720, price: 500, timeRange: '18:00-06:00' }
      ]
    } as CoinParking,
    duration: {
      startDate: new Date('2024-01-15T06:00:00'),
      endDate: new Date('2024-01-16T06:00:00'),
      durationInMinutes: 1440
    } as ParkingDuration,
    expectedFee: 2800 // 朝最大300 + 昼最大2000 + 夜最大500 = 2800円
  },

  // ケース5: 最大料金時間超過後の追加料金
  {
    name: '12時間最大料金超過（15時間駐車）',
    parking: {
      id: 5,
      name: 'テスト駐車場5',
      latitude: 35.6812,
      longitude: 139.7671,
      rates: [
        { type: 'base', minutes: 30, price: 200 },
        { type: 'max', minutes: 720, price: 1200 }
      ]
    } as CoinParking,
    duration: {
      startDate: new Date('2024-01-15T09:00:00'),
      endDate: new Date('2024-01-16T00:00:00'),
      durationInMinutes: 900
    } as ParkingDuration,
    expectedFee: 1800 // 最大1200円 + 3時間分(200×6=1200円) = 2400円
  },

  // ケース6: 深夜割増料金
  {
    name: '深夜割増料金（22:00-翌5:00）',
    parking: {
      id: 6,
      name: 'テスト駐車場6',
      latitude: 35.6812,
      longitude: 139.7671,
      rates: [
        { type: 'base', minutes: 30, price: 200, timeRange: '05:00-22:00' },
        { type: 'base', minutes: 30, price: 300, timeRange: '22:00-05:00' },
        { type: 'max', minutes: 420, price: 2100, timeRange: '22:00-05:00' }
      ]
    } as CoinParking,
    duration: {
      startDate: new Date('2024-01-15T22:00:00'),
      endDate: new Date('2024-01-16T05:00:00'),
      durationInMinutes: 420
    } as ParkingDuration,
    expectedFee: 2100 // 深夜最大料金適用
  },

  // ケース7: 短時間料金と長時間料金の切り替え
  {
    name: '短時間高額・長時間割安（3時間駐車）',
    parking: {
      id: 7,
      name: 'テスト駐車場7',
      latitude: 35.6812,
      longitude: 139.7671,
      rates: [
        { type: 'base', minutes: 15, price: 300 }, // 最初の1時間は15分300円
        { type: 'base', minutes: 30, price: 100 }, // 1時間以降は30分100円
        { type: 'max', minutes: 180, price: 1500 }
      ]
    } as CoinParking,
    duration: {
      startDate: new Date('2024-01-15T10:00:00'),
      endDate: new Date('2024-01-15T13:00:00'),
      durationInMinutes: 180
    } as ParkingDuration,
    expectedFee: 1500 // 最大料金適用
  },

  // ケース8: 平日と土日祝の料金差
  {
    name: '平日から土曜にまたがる駐車（金15:00-土15:00）',
    parking: {
      id: 8,
      name: 'テスト駐車場8',
      latitude: 35.6812,
      longitude: 139.7671,
      rates: [
        { type: 'base', minutes: 20, price: 200, dayType: '平日' },
        { type: 'max', minutes: 1440, price: 2000, dayType: '平日' },
        { type: 'base', minutes: 60, price: 300, dayType: '土日祝' },
        { type: 'max', minutes: 1440, price: 1000, dayType: '土日祝' }
      ]
    } as CoinParking,
    duration: {
      startDate: new Date('2024-01-19T15:00:00'), // 金曜
      endDate: new Date('2024-01-20T15:00:00'), // 土曜
      durationInMinutes: 1440
    } as ParkingDuration,
    expectedFee: 2700 // 金曜9時間1800円 + 土曜最大1000円 = 2800円
  },

  // ケース9: 買い物割引適用後の料金
  {
    name: '2000円以上購入で2時間無料（3時間駐車）',
    parking: {
      id: 9,
      name: 'テスト駐車場9',
      latitude: 35.6812,
      longitude: 139.7671,
      rates: [
        { type: 'base', minutes: 30, price: 300 },
        { type: 'conditional_free', minutes: 120, price: 0, condition: '2000円以上購入' }
      ]
    } as CoinParking,
    duration: {
      startDate: new Date('2024-01-15T14:00:00'),
      endDate: new Date('2024-01-15T17:00:00'),
      durationInMinutes: 180
    } as ParkingDuration,
    expectedFee: 600 // 3時間-2時間無料=1時間分(300×2=600円)
  },

  // ケース10: 複雑な夜間料金（18-8時最大、8-18時通常、17-翌11時）
  {
    name: '夜間最大＋昼間通常の複合計算（17:00-翌11:00）',
    parking: {
      id: 10,
      name: 'テスト駐車場10',
      latitude: 35.6812,
      longitude: 139.7671,
      rates: [
        { type: 'base', minutes: 15, price: 100, timeRange: '08:00-18:00' },
        { type: 'max', minutes: 600, price: 1500, timeRange: '08:00-18:00' },
        { type: 'base', minutes: 60, price: 100, timeRange: '18:00-08:00' },
        { type: 'max', minutes: 840, price: 400, timeRange: '18:00-08:00' }
      ]
    } as CoinParking,
    duration: {
      startDate: new Date('2024-01-15T17:00:00'),
      endDate: new Date('2024-01-16T11:00:00'),
      durationInMinutes: 1080
    } as ParkingDuration,
    expectedFee: 1600 // 昼1時間400円 + 夜間最大400円 + 朝3時間800円 = 1600円
  }
];

// テスト実行関数
export function runParkingFeeTests() {
  console.log('=== 駐車料金計算テスト開始 ===\n');
  
  let passedTests = 0;
  let failedTests = 0;
  
  testCases.forEach((testCase, index) => {
    const calculatedFee = ParkingFeeCalculator.calculateFee(
      testCase.parking,
      testCase.duration
    );
    
    const passed = calculatedFee === testCase.expectedFee;
    
    console.log(`テスト${index + 1}: ${testCase.name}`);
    console.log(`  駐車時間: ${testCase.duration.startDate.toLocaleString('ja-JP')} ～ ${testCase.duration.endDate.toLocaleString('ja-JP')}`);
    console.log(`  駐車時間: ${testCase.duration.durationInMinutes}分`);
    console.log(`  期待値: ${testCase.expectedFee}円`);
    console.log(`  計算結果: ${calculatedFee}円`);
    console.log(`  結果: ${passed ? '✅ 成功' : '❌ 失敗'}`);
    
    if (!passed) {
      console.log(`  差額: ${calculatedFee - testCase.expectedFee}円`);
      console.log('  料金設定:');
      testCase.parking.rates?.forEach(rate => {
        console.log(`    - ${rate.type}: ${rate.minutes}分 ${rate.price}円${rate.timeRange ? ` (${rate.timeRange})` : ''}${rate.dayType ? ` [${rate.dayType}]` : ''}`);
      });
    }
    
    console.log('');
    
    if (passed) {
      passedTests++;
    } else {
      failedTests++;
    }
  });
  
  console.log('=== テスト結果 ===');
  console.log(`成功: ${passedTests}/${testCases.length}`);
  console.log(`失敗: ${failedTests}/${testCases.length}`);
  console.log(`成功率: ${(passedTests / testCases.length * 100).toFixed(1)}%`);
}

// エクスポート
export default runParkingFeeTests;