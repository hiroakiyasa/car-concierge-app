// ジオコーディングのテスト
const fetch = require('node-fetch');

async function testGeocoding(query) {
  console.log(`\n=== ${query} の検索テスト ===\n`);

  // Expo Location APIの代わりにNominatim（OpenStreetMap）を使用してテスト
  const encodedQuery = encodeURIComponent(query);
  const url = `https://nominatim.openstreetmap.org/search?q=${encodedQuery}&format=json&limit=5`;

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'CarConciergeApp/1.0'
      }
    });
    const results = await response.json();

    console.log(`検索クエリ: ${query}`);
    console.log(`結果数: ${results.length}\n`);

    results.forEach((result, index) => {
      console.log(`【結果 ${index + 1}】`);
      console.log(`  名前: ${result.display_name}`);
      console.log(`  緯度: ${result.lat}`);
      console.log(`  経度: ${result.lon}`);
      console.log(`  タイプ: ${result.type}`);
      console.log(`  重要度: ${result.importance}`);
      console.log('');
    });

    if (results.length > 0) {
      const first = results[0];
      console.log(`✅ 最初の結果（現在のアプリが使用）:`);
      console.log(`   緯度: ${first.lat}, 経度: ${first.lon}`);
      console.log(`   場所: ${first.display_name}`);
    }

  } catch (error) {
    console.error('❌ エラー:', error.message);
  }
}

async function runTests() {
  // テストケース
  await testGeocoding('東京駅');
  await testGeocoding('東京駅、日本');
  await testGeocoding('Tokyo Station, Japan');
  await testGeocoding('渋谷');
  await testGeocoding('大阪駅');
  await testGeocoding('新宿');
}

runTests();
