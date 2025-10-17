// 東京駅の詳細テスト
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://jhqnypyxrkwdrgutzttf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpocW55cHl4cmt3ZHJndXR6dHRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxNTk5MjIsImV4cCI6MjA3MDczNTkyMn0.VdbVtE_sIlCFjQd1OAgmyYVoi-uoGVbjKQvdMIgJ5qY';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testDatabaseSearch() {
  console.log('=== データベース検索テスト ===\n');

  const query = '東京駅';

  // データベースから検索
  const { data, error } = await supabase
    .from('parking_spots')
    .select('id, name, lat, lng, address')
    .or(`name.ilike.%${query}%,address.ilike.%${query}%`)
    .limit(5);

  if (error) {
    console.error('エラー:', error);
    return;
  }

  console.log(`データベース検索結果（${query}）: ${data?.length || 0}件\n`);

  if (data) {
    data.forEach((item, i) => {
      console.log(`【${i + 1}】${item.name}`);
      console.log(`  緯度: ${item.lat}, 経度: ${item.lng}`);
      console.log(`  住所: ${item.address || 'なし'}`);

      // 日本の範囲チェック
      const JAPAN_BOUNDS = {
        minLat: 20.0,
        maxLat: 46.5,
        minLng: 122.0,
        maxLng: 154.0,
      };

      const isInJapan = item.lat >= JAPAN_BOUNDS.minLat &&
        item.lat <= JAPAN_BOUNDS.maxLat &&
        item.lng >= JAPAN_BOUNDS.minLng &&
        item.lng <= JAPAN_BOUNDS.maxLng;

      if (!isInJapan) {
        console.log(`  ⚠️ 警告: 日本国外の座標です！`);
      } else {
        console.log(`  ✅ 日本国内`);
      }
      console.log('');
    });
  }
}

async function checkSpecificCoordinates() {
  console.log('\n=== 座標の確認 ===\n');

  const locations = [
    { name: '東京駅（正しい）', lat: 35.681382, lng: 139.766084 },
    { name: '岐阜の山（問題の座標例）', lat: 35.5, lng: 136.5 },
  ];

  locations.forEach(loc => {
    console.log(`${loc.name}:`);
    console.log(`  緯度: ${loc.lat}, 経度: ${loc.lng}`);
    console.log(`  Google Maps: https://www.google.com/maps?q=${loc.lat},${loc.lng}`);
    console.log('');
  });
}

async function testExpoLocationAPI() {
  console.log('\n=== Expo Location API テスト（シミュレーション） ===\n');

  // Expo Location APIは Node.js では動作しないため、
  // 実際のアプリで以下のログを確認する必要がある

  console.log('実際のアプリで以下のログを確認してください：');
  console.log('  🔍 ジオコーディング結果 (クエリ: 東京駅): X件');
  console.log('  [0] 緯度: XX.XXXX, 経度: XXX.XXXX');
  console.log('  📍 日本国内の結果: X件');
  console.log('  ✅ 選択された座標: 緯度 XX.XXXX, 経度 XXX.XXXX');
  console.log('');
  console.log('もし岐阜の山（緯度35.5, 経度136.5付近）が選択されている場合、');
  console.log('Expo Location APIが間違った結果を返している可能性があります。');
}

async function runTests() {
  await testDatabaseSearch();
  await checkSpecificCoordinates();
  await testExpoLocationAPI();

  console.log('\n=== 推奨される確認方法 ===\n');
  console.log('1. アプリを起動してReact Native Debuggerを開く');
  console.log('2. "東京駅"で検索');
  console.log('3. コンソールログで以下を確認：');
  console.log('   - ジオコーディング結果の座標リスト');
  console.log('   - 日本国内フィルタリング後の件数');
  console.log('   - 最終的に選択された座標');
  console.log('4. 地図が移動した座標をメモ');
  console.log('5. その座標をGoogle Mapsで確認');
  console.log('');
  console.log('問題が続く場合は、ログ出力をお知らせください。');

  process.exit(0);
}

runTests();
