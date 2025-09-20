// 分刻み料金計算のテスト

// テストケース1: 10分100円の場合
console.log("=== 10分100円の計算テスト ===");
const rate10min = { minutes: 10, price: 100 };

const testCases10min = [
  { duration: 1, expected: 100 },   // 1分 → 1単位（切り上げ）
  { duration: 10, expected: 100 },  // 10分 → 1単位
  { duration: 11, expected: 200 },  // 11分 → 2単位（切り上げ）
  { duration: 20, expected: 200 },  // 20分 → 2単位
  { duration: 30, expected: 300 },  // 30分 → 3単位
  { duration: 60, expected: 600 },  // 60分 → 6単位
  { duration: 120, expected: 1200 }, // 120分 → 12単位
];

testCases10min.forEach(test => {
  const units = Math.ceil(test.duration / rate10min.minutes);
  const fee = units * rate10min.price;
  console.log(`${test.duration}分駐車: ${units}単位 × ${rate10min.price}円 = ${fee}円 (期待値: ${test.expected}円) ${fee === test.expected ? '✅' : '❌'}`);
});

console.log("\n=== 12分100円の計算テスト ===");
const rate12min = { minutes: 12, price: 100 };

const testCases12min = [
  { duration: 1, expected: 100 },   // 1分 → 1単位（切り上げ）
  { duration: 12, expected: 100 },  // 12分 → 1単位
  { duration: 13, expected: 200 },  // 13分 → 2単位（切り上げ）
  { duration: 24, expected: 200 },  // 24分 → 2単位
  { duration: 36, expected: 300 },  // 36分 → 3単位
  { duration: 60, expected: 500 },  // 60分 → 5単位
  { duration: 120, expected: 1000 }, // 120分 → 10単位
];

testCases12min.forEach(test => {
  const units = Math.ceil(test.duration / rate12min.minutes);
  const fee = units * rate12min.price;
  console.log(`${test.duration}分駐車: ${units}単位 × ${rate12min.price}円 = ${fee}円 (期待値: ${test.expected}円) ${fee === test.expected ? '✅' : '❌'}`);
});

console.log("\n=== 計算式の確認 ===");
console.log("Math.ceil(駐車時間 ÷ 単位時間) × 単位料金");
console.log("例: 12分100円で120分駐車");
console.log("  Math.ceil(120 ÷ 12) × 100");
console.log("  = Math.ceil(10) × 100");
console.log("  = 10 × 100");
console.log("  = 1000円");

console.log("\n重要: Math.ceilは切り上げなので、1分でも超過したら次の単位の料金が発生します");