// progressiveタイプの料金計算テスト
const testCase = {
  name: "ＳＡＮパーク武蔵野吉祥寺北町３",
  rates: [
    { type: "base", price: 400, minutes: 60 },
    { type: "progressive", price: 200, minutes: 30, applyAfter: 60 },
    { type: "max", price: 1600, minutes: 720 }
  ],
  tests: [
    { duration: 30, expected: 200 },  // 30分 = base料金の半分
    { duration: 60, expected: 400 },  // 60分 = base料金1単位
    { duration: 90, expected: 600 },  // 90分 = base 400円 + progressive 200円（1単位）
    { duration: 120, expected: 800 }, // 120分 = base 400円 + progressive 400円（2単位）
    { duration: 180, expected: 1200 }, // 180分 = base 400円 + progressive 800円（4単位）
    { duration: 240, expected: 1600 }, // 240分 = base 400円 + progressive 1200円（6単位）だが最大料金適用
    { duration: 720, expected: 1600 }  // 720分 = 最大料金適用
  ]
};

console.log("Progressive料金のテストケース");
console.log("================================");
console.log("駐車場名:", testCase.name);
console.log("料金設定:");
console.log("  - 基本料金: 60分 400円");
console.log("  - 60分以降: 30分毎 200円");
console.log("  - 最大料金: 12時間 1600円");
console.log("\n期待される計算結果:");

testCase.tests.forEach(test => {
  console.log(`  ${test.duration}分駐車: ${test.expected}円`);

  // 計算式の説明
  if (test.duration <= 60) {
    const units = Math.ceil(test.duration / 60);
    console.log(`    → ${units}単位 × 400円 = ${units * 400}円`);
  } else if (test.duration <= 240) {
    const progressiveMinutes = test.duration - 60;
    const progressiveUnits = Math.ceil(progressiveMinutes / 30);
    const progressiveFee = progressiveUnits * 200;
    const totalFee = 400 + progressiveFee;
    console.log(`    → 初回60分: 400円 + 追加${progressiveMinutes}分: ${progressiveUnits}単位×200円 = ${totalFee}円`);
    if (totalFee > 1600) {
      console.log(`    → 最大料金適用: 1600円`);
    }
  } else {
    console.log(`    → 最大料金適用: 1600円`);
  }
});

console.log("\n重要な確認ポイント:");
console.log("1. progressive料金は apply_after（60分）経過後から適用");
console.log("2. 最初の60分は base料金（400円）");
console.log("3. 61分目から progressive料金（30分毎200円）");
console.log("4. 合計が最大料金（1600円）を超えない");