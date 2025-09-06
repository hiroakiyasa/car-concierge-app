// Supabaseから実際のデータを取得して確認

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function testRatesData() {
  console.log('=== Supabaseデータ取得テスト ===\n');
  
  // 特定の駐車場を検索（名前から）
  const parkingNames = ['リパーク三崎町', 'リパーク水道橋'];
  
  for (const searchName of parkingNames) {
    console.log(`\n検索: "${searchName}" を含む駐車場`);
    
    const { data, error } = await supabase
      .from('parking_spots')
      .select('id, name, rates, capacity, lat, lng')
      .ilike('name', `%${searchName}%`)
      .limit(5);
    
    if (error) {
      console.error('エラー:', error);
      continue;
    }
    
    if (!data || data.length === 0) {
      console.log('  見つかりませんでした');
      continue;
    }
    
    data.forEach(spot => {
      console.log(`\n【${spot.name}】`);
      console.log(`  ID: ${spot.id}`);
      console.log(`  位置: ${spot.lat}, ${spot.lng}`);
      console.log(`  収容台数: ${spot.capacity}`);
      console.log(`  ratesフィールド:`, spot.rates);
      
      if (spot.rates) {
        console.log('  rates型:', typeof spot.rates);
        console.log('  rates配列?:', Array.isArray(spot.rates));
        
        if (Array.isArray(spot.rates)) {
          spot.rates.forEach((rate, i) => {
            console.log(`    料金${i + 1}:`, rate);
          });
        } else if (typeof spot.rates === 'string') {
          try {
            const parsed = JSON.parse(spot.rates);
            console.log('  JSONパース後:', parsed);
          } catch (e) {
            console.log('  JSONパースエラー:', e.message);
          }
        }
      } else {
        console.log('  ⚠️ ratesフィールドがnullまたはundefined');
      }
    });
  }
  
  // 全体的な統計
  console.log('\n=== 統計情報 ===');
  const { data: allSpots, error: allError } = await supabase
    .from('parking_spots')
    .select('id, rates')
    .limit(1000);
  
  if (!allError && allSpots) {
    const withRates = allSpots.filter(s => s.rates !== null && s.rates !== undefined);
    const withValidRates = allSpots.filter(s => {
      if (!s.rates) return false;
      if (Array.isArray(s.rates) && s.rates.length > 0) return true;
      if (typeof s.rates === 'string') {
        try {
          const parsed = JSON.parse(s.rates);
          return Array.isArray(parsed) && parsed.length > 0;
        } catch {
          return false;
        }
      }
      return false;
    });
    
    console.log(`全駐車場数: ${allSpots.length}`);
    console.log(`ratesフィールドがある: ${withRates.length} (${(withRates.length / allSpots.length * 100).toFixed(1)}%)`);
    console.log(`有効なratesデータがある: ${withValidRates.length} (${(withValidRates.length / allSpots.length * 100).toFixed(1)}%)`);
  }
}

testRatesData().catch(console.error);