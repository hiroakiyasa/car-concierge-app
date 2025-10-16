// セグメント分割のデバッグ
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://jhqnypyxrkwdrgutzttf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpocW55cHl4cmt3ZHJndXR6dHRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxNTk5MjIsImV4cCI6MjA3MDczNTkyMn0.VdbVtE_sIlCFjQd1OAgmyYVoi-uoGVbjKQvdMIgJ5qY';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testSegments() {
  console.log('=== セグメント分割デバッグ ===\n');

  // より単純なテストケース
  const simpleRates = [
    { type: 'base', minutes: 60, price: 100, time_range: '18:00～9:00' },
    { type: 'base', minutes: 30, price: 100, time_range: '9:00～18:00' }
  ];

  console.log('シンプルな料金体系（最大料金なし）:');
  console.log('  夜間（18:00～9:00）: 60分¥100');
  console.log('  昼間（9:00～18:00）: 30分¥100\n');

  // 18:00～10:00（16時間 = 960分）
  console.log('【テスト】18:00～10:00（16時間）');
  const startTime = new Date('2025-10-17T18:00:00+09:00');
  const durationMinutes = 960;

  console.log('期待値:');
  console.log('  - 18:00～9:00（15時間 = 900分）: 900÷60=15単位 × ¥100 = ¥1,500');
  console.log('  - 9:00～10:00（1時間 = 60分）: 60÷30=2単位 × ¥100 = ¥200');
  console.log('  - 合計: ¥1,700\n');

  try {
    const { data, error } = await supabase.rpc('calculate_simple_parking_fee', {
      rates: simpleRates,
      parking_start: startTime.toISOString(),
      duration_minutes: durationMinutes
    });

    if (error) {
      console.log('エラー:', error);
      return;
    }

    console.log(`計算結果: ¥${data}`);

    if (data === 1700) {
      console.log('✅ セグメント分割が正しく動作している！');
    } else if (data === 1600) {
      console.log('❌ 夜間のみ計算されている（960÷60=16単位 × ¥100 = ¥1,600）');
    } else {
      console.log(`❓ 予期しない結果: ¥${data}`);
    }
  } catch (err) {
    console.error('テスト実行エラー:', err);
  }

  process.exit(0);
}

testSegments();
