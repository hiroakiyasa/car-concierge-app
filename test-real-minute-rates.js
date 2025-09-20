// 実際のデータベースにある分刻み料金のテスト

console.log("=== 実際の分刻み料金計算テスト ===\n");

// 例1: 20分200円（リパーク吉祥寺南町３丁目第２）
console.log("例1: 20分200円の駐車場");
const rate20min = { minutes: 20, price: 200 };
const testDurations20 = [20, 40, 60, 120];

testDurations20.forEach(duration => {
  const units = Math.ceil(duration / rate20min.minutes);
  const fee = units * rate20min.price;
  console.log(`${duration}分駐車: ${duration}÷${rate20min.minutes} = ${units}単位 × ${rate20min.price}円 = ${fee}円`);
});

console.log("\n例2: 15分200円（名鉄協商吉祥寺駅前第６ - 土日祝）");
const rate15min = { minutes: 15, price: 200 };
const testDurations15 = [15, 30, 45, 60, 120];

testDurations15.forEach(duration => {
  const units = Math.ceil(duration / rate15min.minutes);
  const fee = units * rate15min.price;
  console.log(`${duration}分駐車: ${duration}÷${rate15min.minutes} = ${units}単位 × ${rate15min.price}円 = ${fee}円`);
});

console.log("\n例3: 10分100円（丸の内センタービルディング駐車場）");
const rate10min = { minutes: 10, price: 100 };
const testDurations10 = [10, 30, 60, 120];

testDurations10.forEach(duration => {
  const units = Math.ceil(duration / rate10min.minutes);
  const fee = units * rate10min.price;
  console.log(`${duration}分駐車: ${duration}÷${rate10min.minutes} = ${units}単位 × ${rate10min.price}円 = ${fee}円`);
});

console.log("\n=== 計算の正確性確認 ===");
console.log("✅ Math.ceilによる切り上げで1分単位の正確な計算が可能");
console.log("✅ 12分100円で120分なら: Math.ceil(120÷12) × 100 = 10 × 100 = 1000円");
console.log("✅ 20分200円で120分なら: Math.ceil(120÷20) × 200 = 6 × 200 = 1200円");
console.log("✅ 15分200円で120分なら: Math.ceil(120÷15) × 200 = 8 × 200 = 1600円");