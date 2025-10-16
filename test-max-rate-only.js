// 最大料金のみの駐車場テスト
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://jhqnypyxrkwdrgutzttf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpocW55cHl4cmt3ZHJndXR6dHRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxNTk5MjIsImV4cCI6MjA3MDczNTkyMn0.VdbVtE_sIlCFjQd1OAgmyYVoi-uoGVbjKQvdMIgJ5qY';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testMaxRateOnly() {
  console.log('=== 最大料金のみの駐車場テスト ===\n');

  // テストケース1: 最大料金のみ（24時間1000円）
  const maxRateOnly = [
    { type: 'max', minutes: 1440, price: 1000 }
  ];

  console.log('料金体系: 最大料金のみ（24時間¥1,000）\n');

  const testCases = [
    { duration: 60, expected: 1000 },
    { duration: 120, expected: 1000 },
    { duration: 720, expected: 1000 },  // 12時間
    { duration: 1440, expected: 1000 }, // 24時間
  ];

  let passed = 0;
  const startTime = new Date('2025-10-17T10:00:00+09:00');

  for (const testCase of testCases) {
    const hours = Math.floor(testCase.duration / 60);
    const minutes = testCase.duration % 60;
    console.log(`【テスト】${hours}時間${minutes > 0 ? minutes + '分' : ''} (${testCase.duration}分)`);
    console.log(`期待値: ¥${testCase.expected}`);

    try {
      const { data, error } = await supabase.rpc('calculate_simple_parking_fee', {
        rates: maxRateOnly,
        parking_start: startTime.toISOString(),
        duration_minutes: testCase.duration
      });

      if (error) {
        console.log(`❌ エラー:`, error);
        continue;
      }

      if (data === testCase.expected) {
        console.log(`✅ 計算結果: ¥${data} - 正しい！\n`);
        passed++;
      } else {
        console.log(`❌ 計算結果: ¥${data} - 期待値と異なる\n`);
      }
    } catch (err) {
      console.error('テスト実行エラー:', err);
    }
  }

  console.log('='.repeat(50));
  console.log(`テスト結果: ${passed}/${testCases.length} 成功`);
  console.log('='.repeat(50));

  // テストケース2: 実際の駐車場データを取得してテスト
  console.log('\n【実際の駐車場データでテスト】\n');

  try {
    const { data: parkingSpots, error } = await supabase
      .from('parking_spots')
      .select('id, name, rates')
      .limit(100);

    if (error) {
      console.log('駐車場データ取得エラー:', error);
      return;
    }

    // 最大料金のみの駐車場を探す
    const maxOnlySpots = parkingSpots.filter(spot => {
      if (!spot.rates || !Array.isArray(spot.rates)) return false;
      const hasBase = spot.rates.some(r => r.type === 'base');
      const hasProgressive = spot.rates.some(r => r.type === 'progressive');
      const hasMax = spot.rates.some(r => r.type === 'max');
      return hasMax && !hasBase && !hasProgressive;
    });

    console.log(`最大料金のみの駐車場: ${maxOnlySpots.length}件\n`);

    if (maxOnlySpots.length > 0) {
      const spot = maxOnlySpots[0];
      console.log(`駐車場名: ${spot.name}`);
      console.log(`料金体系:`, JSON.stringify(spot.rates, null, 2));

      const { data: fee, error: feeError } = await supabase.rpc('calculate_simple_parking_fee', {
        rates: spot.rates,
        parking_start: startTime.toISOString(),
        duration_minutes: 120
      });

      if (feeError) {
        console.log('料金計算エラー:', feeError);
      } else {
        console.log(`\n2時間駐車の計算料金: ¥${fee}`);
        if (fee > 0) {
          console.log('✅ 最大料金が正しく適用されています！');
        } else {
          console.log('❌ まだ無料になってしまっています');
        }
      }
    } else {
      console.log('最大料金のみの駐車場が見つかりませんでした');
    }

  } catch (err) {
    console.error('実データテストエラー:', err);
  }

  process.exit(0);
}

testMaxRateOnly();
