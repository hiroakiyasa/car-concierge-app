const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

(async () => {
  // トラストパーク京橋を検索
  const { data, error } = await supabase
    .from('parking_spots')
    .select('id, name, type, elevation')
    .ilike('name', '%トラストパーク%京橋%')
    .limit(10);

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('トラストパーク京橋の検索結果:');
    if (data && data.length > 0) {
      data.forEach(spot => {
        console.log(`ID: ${spot.id}, 名前: ${spot.name}`);
        console.log(`  タイプ: ${spot.type || 'null'}, 標高: ${spot.elevation}m`);
      });
    } else {
      console.log('見つかりませんでした');
    }
  }

  // 別のパターンも試す
  const { data: data2, error: error2 } = await supabase
    .from('parking_spots')
    .select('id, name, type, elevation')
    .or('name.ilike.%トラストパーク京橋%,name.ilike.%京橋%')
    .limit(20);

  if (!error2 && data2 && data2.length > 0) {
    console.log('\n京橋を含む駐車場:');
    data2.forEach(spot => {
      if (spot.name.includes('トラストパーク')) {
        console.log(`ID: ${spot.id}, 名前: ${spot.name}`);
        console.log(`  タイプ: ${spot.type || 'null'}, 標高: ${spot.elevation}m`);
      }
    });
  }
})();