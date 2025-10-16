// すべての修正の最終確認テスト
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://jhqnypyxrkwdrgutzttf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpocW55cHl4cmt3ZHJndXR6dHRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxNTk5MjIsImV4cCI6MjA3MDczNTkyMn0.VdbVtE_sIlCFjQd1OAgmyYVoi-uoGVbjKQvdMIgJ5qY';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function runTest(testName, rates, startTime, durationMinutes, expectedFee) {
  try {
    const { data, error } = await supabase.rpc('calculate_simple_parking_fee', {
      rates: rates,
      parking_start: startTime.toISOString(),
      duration_minutes: durationMinutes
    });

    if (error) {
      console.log(`❌ ${testName}: エラー - ${error.message}`);
      return false;
    }

    const match = data === expectedFee;
    if (match) {
      console.log(`✅ ${testName}: ¥${data}`);
    } else {
      console.log(`❌ ${testName}: ¥${data} (期待: ¥${expectedFee})`);
    }
    return match;

  } catch (err) {
    console.log(`❌ ${testName}: 実行エラー - ${err.message}`);
    return false;
  }
}

async function runAllTests() {
  console.log('=== 駐車料金計算の最終確認テスト ===\n');

  let passed = 0;
  let total = 0;

  // 1. Progressive料金
  console.log('【1. Progressive料金】');
  const progressiveRates = [
    { type: 'base', minutes: 30, price: 0 },
    { type: 'progressive', minutes: 30, price: 250, apply_after: 30 }
  ];

  total++; if (await runTest('Progressive 60分', progressiveRates, new Date('2025-10-17T10:00:00+09:00'), 60, 250)) passed++;
  total++; if (await runTest('Progressive 120分', progressiveRates, new Date('2025-10-17T10:00:00+09:00'), 120, 750)) passed++;

  // 2. 時間帯跨ぎ
  console.log('\n【2. 時間帯を跨ぐ計算】');
  const timeRangeRates = [
    { type: 'base', minutes: 60, price: 100, time_range: '18:00～9:00' },
    { type: 'max', minutes: 1440, price: 300, time_range: '18:00～9:00' },
    { type: 'base', minutes: 30, price: 100, time_range: '9:00～18:00' }
  ];

  total++; if (await runTest('18:00→10:30（16.5時間）', timeRangeRates, new Date('2025-10-17T18:00:00+09:00'), 990, 600)) passed++;

  // 3. 最大料金のみ
  console.log('\n【3. 最大料金のみの駐車場】');
  const maxOnlyRates = [
    { type: 'max', minutes: 1440, price: 1000 }
  ];

  total++; if (await runTest('最大料金のみ 2時間', maxOnlyRates, new Date('2025-10-17T10:00:00+09:00'), 120, 1000)) passed++;

  // 4. 終日最大料金の優先適用
  console.log('\n【4. 終日最大料金の優先適用】');
  const allDayMaxRates = [
    { type: 'base', minutes: 40, price: 200, time_range: '8:00～20:00' },
    { type: 'base', minutes: 60, price: 100, time_range: '20:00～8:00' },
    { type: 'max', minutes: 1440, price: 300, time_range: '20:00～8:00' },
    { type: 'max', minutes: 1440, price: 900 }  // 終日最大
  ];

  total++; if (await runTest('22:00→10:40（終日max優先）', allDayMaxRates, new Date('2025-10-17T22:00:00+09:00'), 760, 900)) passed++;
  total++; if (await runTest('22:00→24:00（通常料金）', allDayMaxRates, new Date('2025-10-17T22:00:00+09:00'), 120, 200)) passed++;
  total++; if (await runTest('22:00→3:00（夜間max）', allDayMaxRates, new Date('2025-10-17T22:00:00+09:00'), 300, 300)) passed++;

  // 5. セグメント分割
  console.log('\n【5. セグメント分割（最大料金なし）】');
  const segmentRates = [
    { type: 'base', minutes: 60, price: 100, time_range: '18:00～9:00' },
    { type: 'base', minutes: 30, price: 100, time_range: '9:00～18:00' }
  ];

  total++; if (await runTest('18:00→10:00（16時間）', segmentRates, new Date('2025-10-17T18:00:00+09:00'), 960, 1700)) passed++;

  // 結果
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
