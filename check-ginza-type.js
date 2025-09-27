const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

(async () => {
  // 銀座一丁目駐車場を検索
  const { data, error } = await supabase
    .from('parking_spots')
    .select('id, name, type, elevation, lat, lng')
    .ilike('name', '%銀座一丁目駐車場%')
    .limit(5);

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('銀座一丁目駐車場の検索結果:');
    if (data && data.length > 0) {
      data.forEach(spot => {
        console.log(`ID: ${spot.id}, 名前: ${spot.name}`);
        console.log(`  タイプ: ${spot.type || 'null'}, 標高: ${spot.elevation}m`);
        console.log(`  座標: ${spot.lat}, ${spot.lng}`);
      });
    } else {
      console.log('見つかりませんでした');
    }
  }

  // 別パターンで検索
  const { data: data2, error: error2 } = await supabase
    .from('parking_spots')
    .select('id, name, type, elevation')
    .ilike('name', '%白魚橋%')
    .limit(5);

  if (!error2 && data2) {
    console.log('\n白魚橋駐車場の検索結果:');
    data2.forEach(spot => {
      console.log(`ID: ${spot.id}, 名前: ${spot.name}`);
      console.log(`  タイプ: ${spot.type || 'null'}, 標高: ${spot.elevation}m`);
    });
  }
})();