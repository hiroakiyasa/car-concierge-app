import { ParkingFeeCalculator } from '../services/parking-fee.service.js';
import { CoinParking, ParkingDuration } from '../types/index.js';

// テストケース1: 30分400円の駐車場
const parking1: CoinParking = {
  id: '1',
  name: 'リパーク三崎町3丁目第2',
  lat: 35.7,
  lng: 139.7,
  rates: [
    { id: '1', type: 'base', minutes: 30, price: 400 }
  ],
  capacity: 0,
  hours: undefined,
  address: '',
  category: 'coin_parking'
};

// テストケース2: 15分200円、最大500円の駐車場
const parking2: CoinParking = {
  id: '2',
  name: 'リパーク水道橋駅前',
  lat: 35.7,
  lng: 139.7,
  rates: [
    { id: '1', type: 'base', minutes: 15, price: 200 },
    { id: '2', type: 'max', minutes: 1440, price: 500 }
  ],
  capacity: 0,
  hours: undefined,
  address: '',
  category: 'coin_parking'
};

// 1時間の駐車
const now = new Date();
const duration: ParkingDuration = {
  startDate: now,
  endDate: new Date(now.getTime() + 60 * 60 * 1000), // 1時間後
  duration: 3600,
  durationInMinutes: 60,
  formattedDuration: '1時間'
};

console.log('=== 駐車料金計算テスト ===\n');

// テスト1: 30分400円の場合
console.log('ケース1: リパーク三崎町3丁目第2');
console.log('料金体系: 30分 400円');
console.log('駐車時間: 1時間（60分）');

const fee1 = ParkingFeeCalculator.calculateFee(parking1, duration);
console.log(`計算結果: ${fee1}円`);
console.log(`期待値: 800円 (30分×2 = 400円×2)`);
console.log(`正しい？: ${fee1 === 800 ? '✅ 正しい' : '❌ 間違い'}\n`);

// テスト2: 15分200円、最大500円の場合
console.log('ケース2: リパーク水道橋駅前');
console.log('料金体系: 15分 200円 / 最大 500円');
console.log('駐車時間: 1時間（60分）');

const fee2 = ParkingFeeCalculator.calculateFee(parking2, duration);
console.log(`計算結果: ${fee2}円`);
console.log(`期待値（最大なし）: 800円 (15分×4 = 200円×4)`);
console.log(`期待値（最大あり）: 500円 (最大料金適用)`);
console.log(`正しい？: ${fee2 === 500 ? '✅ 正しい（最大料金適用）' : fee2 === 800 ? '⚠️ 最大料金未適用' : '❌ 間違い'}\n`);

// デバッグ: 計算の詳細を確認
console.log('=== デバッグ情報 ===');

// セグメント分割を確認
const segments = (ParkingFeeCalculator as any).splitIntoTimeSegments(parking1.rates, duration.startDate, duration.endDate);
console.log('\nセグメント数:', segments.length);
segments.forEach((seg: any, i: number) => {
  const durationMinutes = Math.round((seg.end.getTime() - seg.start.getTime()) / (1000 * 60));
  console.log(`セグメント${i + 1}: ${durationMinutes}分`);
  console.log('  適用料金:', seg.rates);
});

// 基本料金計算のシミュレーション
console.log('\n基本料金計算シミュレーション:');
const baseRate1 = parking1.rates[0];
const units1 = Math.ceil(60 / baseRate1.minutes);
console.log(`ケース1: 60分 ÷ ${baseRate1.minutes}分 = ${60 / baseRate1.minutes} → 切り上げ ${units1} 単位`);
console.log(`        ${units1} × ${baseRate1.price}円 = ${units1 * baseRate1.price}円`);

const baseRate2 = parking2.rates[0];
const units2 = Math.ceil(60 / baseRate2.minutes);
console.log(`ケース2: 60分 ÷ ${baseRate2.minutes}分 = ${60 / baseRate2.minutes} → 切り上げ ${units2} 単位`);
console.log(`        ${units2} × ${baseRate2.price}円 = ${units2 * baseRate2.price}円 → 最大料金適用で500円`);

export { parking1, parking2, duration };