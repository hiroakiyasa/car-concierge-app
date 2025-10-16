// Supabase バックエンド SQL 関数のバグを再現するテスト
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://jhqnypyxrkwdrgutzttf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpocW55cHl4cmt3ZHJndXR6dHRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxNTk5MjIsImV4cCI6MjA3MDczNTkyMn0.VdbVtE_sIlCFjQd1OAgmyYVoi-uoGVbjKQvdMIgJ5qY';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testBackendCalculation() {
  console.log('=== Supabase バックエンド SQL 関数のテスト ===\n');

  // テストケース1: Progressive料金の駐車場を検索
  console.log('【テスト1】Progressive料金の駐車場を検索');
  console.log('東京駅周辺で検索（Progressive料金がある駐車場が多い）\n');

  const testRegion = {
    latitude: 35.6812,
    longitude: 139.7671,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01
  };

  const minLat = testRegion.latitude - (testRegion.latitudeDelta / 2);
  const maxLat = testRegion.latitude + (testRegion.latitudeDelta / 2);
  const minLng = testRegion.longitude - (testRegion.longitudeDelta / 2);
  const maxLng = testRegion.longitude + (testRegion.longitudeDelta / 2);

  // 60分、120分、180分で計算
  const durations = [60, 120, 180];

  for (const duration of durations) {
    console.log(`\n--- ${duration}分駐車の場合 ---`);

    try {
      const { data, error } = await supabase.rpc('get_parking_spots_sorted_by_fee', {
        min_lat: minLat,
        max_lat: maxLat,
        min_lng: minLng,
        max_lng: maxLng,
        duration_minutes: duration
      });

      if (error) {
        console.error('❌ RPC エラー:', error);
        continue;
      }

      if (!data || data.length === 0) {
        console.log('駐車場が見つかりませんでした');
        continue;
      }

      console.log(`取得件数: ${data.length}件`);

      // Progressive料金を持つ駐車場を探す
      const progressiveSpots = data.filter(spot => {
        if (!spot.rates) return false;
        const rates = typeof spot.rates === 'string' ? JSON.parse(spot.rates) : spot.rates;
        return rates.some(r => r.type === 'progressive');
      });

      if (progressiveSpots.length > 0) {
        const spot = progressiveSpots[0];
        const rates = typeof spot.rates === 'string' ? JSON.parse(spot.rates) : spot.rates;

        console.log(`\nProgressive料金の駐車場: ${spot.name}`);
        console.log(`料金体系:`, JSON.stringify(rates, null, 2));
        console.log(`計算料金: ${spot.calculated_fee}円`);
        console.log(`ランク: ${spot.rank}`);
      } else {
        console.log('Progressive料金の駐車場が見つかりませんでした');
      }

      // 上位3件の料金を表示
      console.log('\n上位3件の料金:');
      data.slice(0, 3).forEach((spot, idx) => {
        console.log(`  ${idx + 1}. ${spot.name}: ¥${spot.calculated_fee}`);
      });

    } catch (err) {
      console.error('❌ テスト実行エラー:', err);
    }
  }

  // テストケース2: 特定のProgressive料金駐車場でテスト
  console.log('\n\n【テスト2】特定のProgressive料金駐車場で直接計算');
  console.log('30分無料、30分以降30分毎250円の駐車場を想定\n');

  // 直接 calculate_parking_fee 関数を呼び出してテスト
  const testRates = [
    { type: 'base', minutes: 30, price: 0 },
    { type: 'progressive', minutes: 30, price: 250, apply_after: 30 }
  ];

  for (const duration of [60, 120, 180]) {
    try {
      // Supabase の calculate_parking_fee 関数を直接呼び出す
      const { data, error } = await supabase.rpc('calculate_parking_fee', {
        rates: testRates,
        duration_minutes: duration,
        parking_start: new Date().toISOString()
      });

      console.log(`${duration}分: ${data}円 (期待値: ${duration === 60 ? 250 : duration === 120 ? 750 : 1250}円)`);

      if (error) {
        console.error('  エラー:', error);
      }
    } catch (err) {
      console.log(`  ${duration}分: 関数呼び出しエラー -`, err.message);
    }
  }

  console.log('\n=== テスト完了 ===');
  process.exit(0);
}

testBackendCalculation();
