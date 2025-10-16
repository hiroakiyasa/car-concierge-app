// 時間帯を跨ぐ駐車料金計算のテスト
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://jhqnypyxrkwdrgutzttf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpocW55cHl4cmt3ZHJndXR6dHRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxNTk5MjIsImV4cCI6MjA3MDczNTkyMn0.VdbVtE_sIlCFjQd1OAgmyYVoi-uoGVbjKQvdMIgJ5qY';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testTimeRangeCrossing() {
  console.log('=== 時間帯を跨ぐ駐車料金計算のテスト ===\n');

  // スクリーンショットの駐車場の料金体系
  const testRates = [
    // 夜間料金（18:00～9:00）
    { type: 'base', minutes: 60, price: 100, time_range: '18:00～9:00' },
    { type: 'max', minutes: 1440, price: 300, time_range: '18:00～9:00' },

    // 昼間料金（9:00～18:00）
    { type: 'base', minutes: 30, price: 100, time_range: '9:00～18:00' },
    { type: 'max', minutes: 1440, price: 400, time_range: '9:00～18:00', day_type: '月～金' },
    { type: 'max', minutes: 1440, price: 400, time_range: '9:00～18:00', day_type: '土日祝' }
  ];

  console.log('料金体系:');
  console.log('  夜間（18:00～9:00）: 60分¥100、最大¥300');
  console.log('  昼間（9:00～18:00）: 30分¥100、最大¥400\n');

  // テストケース1: 18:00～10:30（16.5時間 = 990分）
  console.log('【テスト1】18:00～10:30（16.5時間）');
  console.log('期待値: ¥600');
  console.log('  - 18:00～9:00（15時間 = 900分）: 最大料金¥300');
  console.log('  - 9:00～10:30（1.5時間 = 90分）: 30分¥100×3単位 = ¥300');
  console.log('  - 合計: ¥600\n');

  // 2025年10月17日（金曜日）18:00から開始
  const startTime = new Date('2025-10-17T18:00:00+09:00');
  const durationMinutes = 990; // 16.5時間 (18:00→10:30 next day)

  try {
    const { data, error } = await supabase.rpc('calculate_simple_parking_fee', {
      rates: testRates,
      parking_start: startTime.toISOString(),
      duration_minutes: durationMinutes
    });

    if (error) {
      console.log('エラー:', error);
      return;
    }

    console.log(`計算結果: ¥${data}`);

    if (data === 600) {
      console.log('✅ 正しい！');
    } else if (data === 300) {
      console.log('❌ バグ再現：夜間最大料金のみで、昼間の1.5時間分が加算されていない');
    } else {
      console.log(`❓ 予期しない結果: ¥${data}`);
    }
  } catch (err) {
    console.error('テスト実行エラー:', err);
  }

  console.log('\n=== テスト完了 ===');
  process.exit(0);
}

testTimeRangeCrossing();
