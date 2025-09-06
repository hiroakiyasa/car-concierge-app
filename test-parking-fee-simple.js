// 駐車料金計算のバグを調査するシンプルなテスト

// 計算ロジックを簡略化して直接実装
function calculateFee(rates, durationMinutes) {
  console.log(`  入力: ${durationMinutes}分`);
  
  const baseRate = rates.find(r => r.type === 'base');
  const maxRate = rates.find(r => r.type === 'max');
  
  if (!baseRate) {
    console.log('  エラー: 基本料金が見つかりません');
    return 0;
  }
  
  // 基本料金で計算
  const units = Math.ceil(durationMinutes / baseRate.minutes);
  let fee = units * baseRate.price;
  
  console.log(`  基本料金計算: ${durationMinutes}分 ÷ ${baseRate.minutes}分 = ${durationMinutes / baseRate.minutes} → 切り上げ ${units}単位`);
  console.log(`  基本料金: ${units} × ${baseRate.price}円 = ${fee}円`);
  
  // 最大料金の適用
  if (maxRate && fee > maxRate.price) {
    console.log(`  最大料金適用: ${fee}円 → ${maxRate.price}円`);
    fee = maxRate.price;
  }
  
  return fee;
}

console.log('=== 駐車料金計算バグ調査 ===\n');

// テスト1: 30分400円の駐車場
console.log('【テスト1】リパーク三崎町3丁目第2');
console.log('料金体系: 30分 400円');
const rates1 = [
  { type: 'base', minutes: 30, price: 400 }
];
const fee1 = calculateFee(rates1, 60);
console.log(`結果: ${fee1}円`);
console.log(`期待値: 800円`);
console.log(`判定: ${fee1 === 800 ? '✅ 正しい' : `❌ 間違い (差額: ${800 - fee1}円)`}\n`);

// テスト2: 15分200円、最大500円の駐車場
console.log('【テスト2】リパーク水道橋駅前');
console.log('料金体系: 15分 200円 / 最大 500円');
const rates2 = [
  { type: 'base', minutes: 15, price: 200 },
  { type: 'max', minutes: 1440, price: 500 }
];
const fee2 = calculateFee(rates2, 60);
console.log(`結果: ${fee2}円`);
console.log(`期待値: 500円（最大料金適用）`);
console.log(`判定: ${fee2 === 500 ? '✅ 正しい' : `❌ 間違い (差額: ${500 - fee2}円)`}\n`);

// テスト3: 実際のMapScreenで計算される値をシミュレーション
console.log('=== MapScreenでの計算シミュレーション ===\n');

// MapScreen.tsxの料金計算部分を再現
function simulateMapScreenCalculation(parking, durationMinutes) {
  // MapScreenでParkingFeeCalculator.calculateFeeが呼ばれる
  // ここでは簡略化したロジックで再現
  
  // もし料金データがない場合
  if (!parking.rates || parking.rates.length === 0) {
    console.log('  料金データなし → 0円');
    return 0;
  }
  
  // セグメント分割（時間帯別料金）のチェック
  const hasTimeSpecificRates = parking.rates.some(r => r.timeRange);
  if (hasTimeSpecificRates) {
    console.log('  時間帯別料金あり（複雑な計算）');
  } else {
    console.log('  時間帯別料金なし（単純計算）');
  }
  
  return calculateFee(parking.rates, durationMinutes);
}

const parking1 = {
  name: 'リパーク三崎町3丁目第2',
  rates: rates1
};

const parking2 = {
  name: 'リパーク水道橋駅前',
  rates: rates2
};

console.log('【駐車場1】' + parking1.name);
const mapFee1 = simulateMapScreenCalculation(parking1, 60);
console.log(`MapScreen計算結果: ${mapFee1}円\n`);

console.log('【駐車場2】' + parking2.name);
const mapFee2 = simulateMapScreenCalculation(parking2, 60);
console.log(`MapScreen計算結果: ${mapFee2}円\n`);

// 問題の可能性がある箇所
console.log('=== 問題の可能性 ===');
console.log('1. rates配列が正しく渡されていない');
console.log('2. durationInMinutesが正しく計算されていない');
console.log('3. 時間帯別料金の処理で基本料金が無視される');
console.log('4. calculateSegmentFeeメソッドにバグがある');