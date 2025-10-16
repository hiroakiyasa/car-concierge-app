// Progressive料金のバグを再現するテスト

console.log('=== Progressive料金バグ再現テスト ===\n');

// 現在のEdge Functionのロジックを再現（バグあり）
function calculateFeeBuggy(rates, minutes) {
  const progressiveRates = rates.filter(r => r.type === 'progressive').sort((a, b) => (a.apply_after || 0) - (b.apply_after || 0));

  console.log(`  入力: ${minutes}分`);

  // 現在のバグのあるコード
  if (progressiveRates.length > 0) {
    for (const rate of progressiveRates) {
      const threshold = rate.apply_after || 0;
      if (minutes > threshold) {
        console.log(`  ❌ バグのある計算: threshold ${threshold}分を超えたので ${rate.price}円を返す`);
        return rate.price;  // ← ここがバグ！時間に関係なく固定料金
      }
    }
  }

  return 0;
}

// 正しい計算ロジック
function calculateFeeCorrect(rates, minutes) {
  const baseRates = rates.filter(r => r.type === 'base');
  const progressiveRates = rates.filter(r => r.type === 'progressive').sort((a, b) => (a.apply_after || 0) - (b.apply_after || 0));
  const maxRates = rates.filter(r => r.type === 'max');

  console.log(`  入力: ${minutes}分`);

  let totalFee = 0;
  let remainingMinutes = minutes;

  // Base料金の処理（apply_afterまで）
  if (progressiveRates.length > 0 && baseRates.length > 0) {
    const firstProgressive = progressiveRates[0];
    const threshold = firstProgressive.apply_after || 0;
    const baseRate = baseRates[0];

    if (minutes > threshold) {
      // apply_afterまでの料金
      const baseMinutes = threshold;
      const baseUnits = Math.ceil(baseMinutes / baseRate.minutes);
      const baseFee = baseUnits * baseRate.price;
      console.log(`  ✅ 基本料金: ${baseMinutes}分（${baseUnits}単位 × ${baseRate.price}円）= ${baseFee}円`);
      totalFee += baseFee;
      remainingMinutes -= threshold;

      // apply_after以降の料金
      const progUnits = Math.ceil(remainingMinutes / firstProgressive.minutes);
      const progFee = progUnits * firstProgressive.price;
      console.log(`  ✅ Progressive料金: ${remainingMinutes}分（${progUnits}単位 × ${firstProgressive.price}円）= ${progFee}円`);
      totalFee += progFee;
    } else {
      // threshold未満は基本料金のみ
      const baseUnits = Math.ceil(minutes / baseRate.minutes);
      totalFee = baseUnits * baseRate.price;
      console.log(`  ✅ 基本料金のみ: ${minutes}分（${baseUnits}単位 × ${baseRate.price}円）= ${totalFee}円`);
    }
  }

  // 最大料金の適用
  if (maxRates.length > 0) {
    const maxRate = maxRates[0];
    if (totalFee > maxRate.price) {
      console.log(`  ✅ 最大料金適用: ${totalFee}円 → ${maxRate.price}円`);
      totalFee = maxRate.price;
    }
  }

  return totalFee;
}

// テストケース: 30分無料、30分以降30分毎250円
console.log('【テストケース】30分無料、30分以降30分毎250円');
const rates = [
  { type: 'base', minutes: 30, price: 0 },
  { type: 'progressive', minutes: 30, price: 250, apply_after: 30 }
];

console.log('\n--- 60分駐車の場合 ---');
const buggy60 = calculateFeeBuggy(rates, 60);
console.log(`バグのある計算結果: ${buggy60}円\n`);

const correct60 = calculateFeeCorrect(rates, 60);
console.log(`正しい計算結果: ${correct60}円`);
console.log(`期待値: 250円（30分無料 + 30分250円）`);
console.log(`判定: ${correct60 === 250 ? '✅ 正しい' : '❌ 間違い'}\n`);

console.log('\n--- 120分駐車の場合 ---');
const buggy120 = calculateFeeBuggy(rates, 120);
console.log(`バグのある計算結果: ${buggy120}円\n`);

const correct120 = calculateFeeCorrect(rates, 120);
console.log(`正しい計算結果: ${correct120}円`);
console.log(`期待値: 750円（30分無料 + 90分3単位×250円）`);
console.log(`判定: ${correct120 === 750 ? '✅ 正しい' : '❌ 間違い'}\n`);

console.log('\n--- 180分駐車の場合 ---');
const buggy180 = calculateFeeBuggy(rates, 180);
console.log(`バグのある計算結果: ${buggy180}円\n`);

const correct180 = calculateFeeCorrect(rates, 180);
console.log(`正しい計算結果: ${correct180}円`);
console.log(`期待値: 1250円（30分無料 + 150分5単位×250円）`);
console.log(`判定: ${correct180 === 1250 ? '✅ 正しい' : '❌ 間違い'}\n`);

console.log('\n=== 結論 ===');
console.log('❌ Edge Functionのバグ:');
console.log('   Progressive料金で rate.price をそのまま返している');
console.log('   → 何時間駐車しても同じ料金（250円）になる');
console.log('\n✅ 正しい計算:');
console.log('   apply_after以降の時間を progressive rate で単位計算する必要がある');
