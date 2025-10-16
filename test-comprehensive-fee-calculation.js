// 駐車料金計算の総合テスト
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://jhqnypyxrkwdrgutzttf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpocW55cHl4cmt3ZHJndXR6dHRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxNTk5MjIsImV4cCI6MjA3MDczNTkyMn0.VdbVtE_sIlCFjQd1OAgmyYVoi-uoGVbjKQvdMIgJ5qY';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function runTest(testName, rates, startTime, durationMinutes, expectedFee) {
  console.log(`\n【${testName}】`);
  console.log(`開始時刻: ${startTime.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}`);
  console.log(`駐車時間: ${durationMinutes}分 (${Math.floor(durationMinutes / 60)}時間${durationMinutes % 60}分)`);
  console.log(`期待値: ¥${expectedFee}`);

  try {
    const { data, error } = await supabase.rpc('calculate_simple_parking_fee', {
      rates: rates,
      parking_start: startTime.toISOString(),
      duration_minutes: durationMinutes
    });

    if (error) {
      console.log(`❌ エラー:`, error.message);
      return false;
    }

    const match = data === expectedFee;
    if (match) {
      console.log(`✅ 計算結果: ¥${data} - 正しい！`);
    } else {
      console.log(`❌ 計算結果: ¥${data} - 期待値と異なる（差: ¥${data - expectedFee}）`);
    }
    return match;

  } catch (err) {
    console.log(`❌ 実行エラー:`, err.message);
    return false;
  }
}

async function runAllTests() {
  console.log('=== 駐車料金計算総合テスト ===\n');

  let passed = 0;
  let total = 0;

  // テスト1: Progressive料金（基本）
  const progressiveRates = [
    { type: 'base', minutes: 30, price: 0 },
    { type: 'progressive', minutes: 30, price: 250, apply_after: 30 }
  ];

  total++;
  if (await runTest(
    'Progressive料金 - 30分',
    progressiveRates,
    new Date('2025-10-17T10:00:00+09:00'),
    30,
    0  // 最初の30分無料
  )) passed++;

  total++;
  if (await runTest(
    'Progressive料金 - 60分',
    progressiveRates,
    new Date('2025-10-17T10:00:00+09:00'),
    60,
    250  // 無料30分 + 250円×1単位
  )) passed++;

  total++;
  if (await runTest(
    'Progressive料金 - 120分',
    progressiveRates,
    new Date('2025-10-17T10:00:00+09:00'),
    120,
    750  // 無料30分 + 250円×3単位
  )) passed++;

  // テスト2: 時間帯を跨ぐ（セグメント分割）
  const timeRangeRates = [
    { type: 'base', minutes: 60, price: 100, time_range: '18:00～9:00' },
    { type: 'base', minutes: 30, price: 100, time_range: '9:00～18:00' }
  ];

  total++;
  if (await runTest(
    '時間帯跨ぎ - 18:00→10:00（16時間）',
    timeRangeRates,
    new Date('2025-10-17T18:00:00+09:00'),
    960,
    1700  // 夜間15時間（900分）¥1500 + 昼間1時間（60分）¥200
  )) passed++;

  // テスト3: 時間帯跨ぎ + 最大料金
  const timeRangeWithMaxRates = [
    { type: 'base', minutes: 60, price: 100, time_range: '18:00～9:00' },
    { type: 'max', minutes: 1440, price: 300, time_range: '18:00～9:00' },
    { type: 'base', minutes: 30, price: 100, time_range: '9:00～18:00' },
    { type: 'max', minutes: 1440, price: 400, time_range: '9:00～18:00' }
  ];

  total++;
  if (await runTest(
    '時間帯跨ぎ + 最大料金 - 18:00→10:30（16.5時間）',
    timeRangeWithMaxRates,
    new Date('2025-10-17T18:00:00+09:00'),
    990,
    600  // 夜間max¥300 + 昼間1.5時間¥300
  )) passed++;

  // テスト4: 24時間を超える駐車
  const dayRates = [
    { type: 'base', minutes: 60, price: 100 },
    { type: 'max', minutes: 1440, price: 1000 }
  ];

  total++;
  if (await runTest(
    '24時間を超える - 48時間',
    dayRates,
    new Date('2025-10-17T10:00:00+09:00'),
    2880,
    2000  // 最大料金¥1000 × 2日
  )) passed++;

  total++;
  if (await runTest(
    '24時間を超える - 50時間',
    dayRates,
    new Date('2025-10-17T10:00:00+09:00'),
    3000,
    2200  // 最大料金¥1000 × 2日 + 2時間¥200
  )) passed++;

  // テスト5: 時間帯別 + 24時間超え
  total++;
  if (await runTest(
    '時間帯跨ぎ + 24時間超え - 18:00→翌々日10:30（40.5時間）',
    timeRangeWithMaxRates,
    new Date('2025-10-17T18:00:00+09:00'),
    2430,
    900  // (夜max¥300 + 昼max¥400) + (夜間6h¥100 + 昼間1.5h¥100) ※要確認
  )) passed++;

  // 結果サマリー
  console.log('\n' + '='.repeat(50));
  console.log(`テスト結果: ${passed}/${total} 成功`);
  console.log(`成功率: ${((passed / total) * 100).toFixed(1)}%`);
  console.log('='.repeat(50));

  if (passed === total) {
    console.log('✅ すべてのテストが成功しました！');
  } else {
    console.log(`❌ ${total - passed}件のテストが失敗しました`);
  }

  process.exit(passed === total ? 0 : 1);
}

runAllTests();
