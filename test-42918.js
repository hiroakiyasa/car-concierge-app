const { ParkingFeeCalculator } = require('./src/services/parking-fee.service');

// ID 42918: 名鉄協商マックスバリュ太閤店駐車場のデータ
const parking = {
  id: 42918,
  name: "名鉄協商マックスバリュ太閤店駐車場",
  rates: [
    { type: "base", price: 0, minutes: 60 },
    { type: "progressive", price: 200, minutes: 30, apply_after: 60 },
    { type: "max", price: 1400, minutes: 1440 },
    { type: "max", price: 400, minutes: 720, time_range: "20:00～8:00" }
  ]
};

// テストケース
const testCases = [
  { minutes: 30, expected: 0, description: "30分: 最初の60分無料" },
  { minutes: 60, expected: 0, description: "60分: ちょうど無料時間内" },
  { minutes: 90, expected: 200, description: "90分: 60分超過、30分200円" },
  { minutes: 120, expected: 400, description: "120分: 60分超過、60分(2×30分)400円" },
  { minutes: 150, expected: 600, description: "150分: 60分超過、90分(3×30分)600円" },
  { minutes: 180, expected: 800, description: "180分: 60分超過、120分(4×30分)800円" },
  { minutes: 720, expected: 1400, description: "720分(12時間): 最大料金1,400円" }
];

console.log("🧪 ID 42918 料金計算テスト");
console.log("========================");
console.log(`駐車場: ${parking.name}`);
console.log(`料金体系:`);
console.log(`  - 最初60分無料`);
console.log(`  - 60分以降: 30分毎 ¥200`);
console.log(`  - 最大料金: ¥1,400（12時間）`);
console.log(`  - 夜間最大: ¥400（20:00～8:00）`);
console.log("");

const now = new Date('2024-01-15T10:00:00'); // 月曜日の午前10時

testCases.forEach(test => {
  const duration = {
    startDate: now,
    endDate: new Date(now.getTime() + test.minutes * 60000),
    durationInMinutes: test.minutes
  };

  const fee = ParkingFeeCalculator.calculateFee(parking, duration);
  const pass = fee === test.expected;

  console.log(`${pass ? '✅' : '❌'} ${test.description}`);
  console.log(`   期待値: ¥${test.expected}, 実際: ¥${fee}`);

  if (!pass) {
    console.log(`   ⚠️  計算が正しくありません！`);
  }
});