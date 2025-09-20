// 正規化ルールに基づいたテストケース
const testCases = [
  {
    name: "Progressive料金のテスト",
    rates: [
      { type: "base", price: 360, minutes: 60 },
      { type: "progressive", price: 120, minutes: 20, applyAfter: 60 }
    ],
    duration: 90, // 90分駐車
    expected: 540 // 360円（初回60分） + 180円（30分分 = 2単位×120円）
  },
  {
    name: "時間帯別料金のテスト（8:00～18:00）",
    rates: [
      { type: "base", price: 200, minutes: 60, timeRange: "8:00～18:00" },
      { type: "base", price: 100, minutes: 60, timeRange: "18:00～8:00" },
      { type: "max", price: 600, minutes: 1440 },
      { type: "max", price: 400, minutes: 840, timeRange: "18:00～8:00" }
    ],
    startTime: new Date("2024-01-15T10:00:00"), // 10:00開始
    duration: 120, // 2時間
    expected: 400 // 200円×2時間
  },
  {
    name: "曜日別料金のテスト（月～金）",
    rates: [
      { type: "base", price: 200, minutes: 30, dayType: "月～金", timeRange: "8:00～20:00" },
      { type: "base", price: 300, minutes: 30, dayType: "土日祝", timeRange: "8:00～20:00" },
      { type: "base", price: 100, minutes: 60, timeRange: "20:00～8:00" },
      { type: "max", price: 1000, minutes: 720, dayType: "月～金" },
      { type: "max", price: 1500, minutes: 720, dayType: "土日祝" },
      { type: "max", price: 300, minutes: 720, timeRange: "20:00～8:00" }
    ],
    startTime: new Date("2024-01-15T10:00:00"), // 月曜日 10:00
    duration: 180, // 3時間
    expected: 1000 // 最大料金適用（月～金の720分1000円）
  },
  {
    name: "日またぎ時間帯のテスト（20:00～8:00）",
    rates: [
      { type: "base", price: 200, minutes: 60, timeRange: "8:00～20:00" },
      { type: "base", price: 100, minutes: 60, timeRange: "20:00～8:00" },
      { type: "max", price: 500, minutes: 720, timeRange: "20:00～8:00" }
    ],
    startTime: new Date("2024-01-15T21:00:00"), // 21:00開始
    duration: 240, // 4時間（21:00～1:00）
    expected: 400 // 100円×4時間
  },
  {
    name: "最大料金（入庫後6時間）のテスト",
    rates: [
      { type: "base", price: 100, minutes: 30 },
      { type: "progressive", price: 200, minutes: 30, applyAfter: 30 },
      { type: "max", price: 1100, minutes: 360 },
      { type: "max", price: 1500, minutes: 1440 }
    ],
    duration: 420, // 7時間
    expected: 1100 // 6時間最大料金適用
  }
];

// 実際のcalculateFeeメソッドをテストする場合はここにインポート
// const { ParkingFeeCalculator } = require('./src/services/parking-fee-fixed.service');

console.log("正規化ルールに基づいた料金計算テストケース");
console.log("==========================================\n");

testCases.forEach((testCase, index) => {
  console.log(`テストケース${index + 1}: ${testCase.name}`);
  console.log("料金設定:", JSON.stringify(testCase.rates, null, 2));
  console.log(`駐車時間: ${testCase.duration}分`);
  if (testCase.startTime) {
    console.log(`開始時刻: ${testCase.startTime.toLocaleString('ja-JP')}`);
  }
  console.log(`期待値: ${testCase.expected}円`);
  console.log("---");
});

console.log("\n重要な確認ポイント：");
console.log("1. progressiveタイプにはapply_afterフィールドが必須");
console.log("2. 曜日タイプは「月～金」「土日祝」「土」「日祝」を使用");
console.log("3. 時間帯は「HH:MM～HH:MM」形式で記録");
console.log("4. 最大料金のminutesフィールドで適用時間を制御");
console.log("5. 日またぎの時間帯（20:00～8:00など）も正しく処理");