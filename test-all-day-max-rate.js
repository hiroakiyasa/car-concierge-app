// 終日最大料金の適用テスト
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://jhqnypyxrkwdrgutzttf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpocW55cHl4cmt3ZHJndXR6dHRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxNTk5MjIsImV4cCI6MjA3MDczNTkyMn0.VdbVtE_sIlCFjQd1OAgmyYVoi-uoGVbjKQvdMIgJ5qY';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testAllDayMaxRate() {
  console.log('=== 終日最大料金の優先適用テスト ===\n');

  // スクリーンショットの駐車場の料金体系
  const parkingRates = [
    // 通常料金
    { type: 'base', minutes: 40, price: 200, time_range: '8:00～20:00' },
    { type: 'base', minutes: 60, price: 100, time_range: '20:00～8:00' },

    // 時間帯別最大料金
    { type: 'max', minutes: 1440, price: 300, time_range: '20:00～8:00' },

    // 終日最大料金
    { type: 'max', minutes: 1440, price: 900 }  // time_rangeなし
  ];

  console.log('料金体系:');
  console.log('  通常料金:');
  console.log('    - 40分毎¥200 (8:00～20:00)');
  console.log('    - 60分毎¥100 (20:00～8:00)');
  console.log('  最大料金:');
  console.log('    - 最大¥300 (20:00～8:00)');
  console.log('    - 最大¥900 (終日)\n');

  // テストケース1: 22:00～10:40（12時間40分）
  console.log('【テスト1】22:00～10:40（12時間40分 = 760分）');
  console.log('期待値: ¥900（終日最大料金を適用）');
  console.log('セグメント計算だと:');
  console.log('  - 22:00～8:00（10時間）: 夜間最大¥300');
  console.log('  - 8:00～10:40（2時間40分）: 40分×4単位 = ¥800');
  console.log('  - 合計: ¥1,100');
  console.log('  → 終日最大¥900の方が安いので¥900を適用\n');

  const startTime = new Date('2025-10-17T22:00:00+09:00');
  const durationMinutes = 760;

  try {
    const { data, error } = await supabase.rpc('calculate_simple_parking_fee', {
      rates: parkingRates,
      parking_start: startTime.toISOString(),
      duration_minutes: durationMinutes
    });

    if (error) {
      console.log('❌ エラー:', error);
      return;
    }

    console.log(`計算結果: ¥${data}`);

    if (data === 900) {
      console.log('✅ 正しい！終日最大料金¥900が適用されました！');
    } else if (data >= 1100) {
      console.log('❌ バグ再現：セグメント合計（¥1,100以上）が計算されており、終日最大料金が適用されていない');
    } else {
      console.log(`❓ 予期しない結果: ¥${data}`);
    }

  } catch (err) {
    console.error('テスト実行エラー:', err);
  }

  // テストケース2: 短時間（2時間）
  console.log('\n【テスト2】22:00～24:00（2時間 = 120分）');
  console.log('期待値: ¥200（夜間通常料金）');
  console.log('  - 2時間 = 120分: 60分×2単位 = ¥200');
  console.log('  - 夜間最大¥300、終日最大¥900より安い\n');

  try {
    const { data, error } = await supabase.rpc('calculate_simple_parking_fee', {
      rates: parkingRates,
      parking_start: startTime.toISOString(),
      duration_minutes: 120
    });

    if (error) {
      console.log('❌ エラー:', error);
      return;
    }

    console.log(`計算結果: ¥${data}`);

    if (data === 200) {
      console.log('✅ 正しい！通常料金が適用されました');
    } else {
      console.log(`❓ 期待値と異なる（期待: ¥200）`);
    }

  } catch (err) {
    console.error('テスト実行エラー:', err);
  }

  // テストケース3: 夜間のみ（5時間）
  console.log('\n【テスト3】22:00～3:00（5時間 = 300分）');
  console.log('期待値: ¥300（夜間最大料金）');
  console.log('  - 5時間 = 300分: 60分×5単位 = ¥500');
  console.log('  - 夜間最大¥300が適用される\n');

  try {
    const { data, error } = await supabase.rpc('calculate_simple_parking_fee', {
      rates: parkingRates,
      parking_start: startTime.toISOString(),
      duration_minutes: 300
    });

    if (error) {
      console.log('❌ エラー:', error);
      return;
    }

    console.log(`計算結果: ¥${data}`);

    if (data === 300) {
      console.log('✅ 正しい！夜間最大料金が適用されました');
    } else {
      console.log(`❓ 期待値と異なる（期待: ¥300）`);
    }

  } catch (err) {
    console.error('テスト実行エラー:', err);
  }

  console.log('\n=== テスト完了 ===');
  process.exit(0);
}

testAllDayMaxRate();
