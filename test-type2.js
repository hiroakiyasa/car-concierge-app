const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

(async () => {
  console.log('1. ID 58513の駐車場を確認（先ほどのサンプル）:');
  const { data: sample, error: sampleErr } = await supabase
    .from('parking_spots')
    .select('id, name, type, elevation')
    .eq('id', 58513)
    .single();

  if (!sampleErr) {
    console.log(`ID: ${sample.id}, 名前: ${sample.name}`);
    console.log(`  タイプ: ${sample.type || 'null'}, 標高: ${sample.elevation}m\n`);
  }

  console.log('2. トラストパーク京橋1丁目第2を検索:');
  const { data, error } = await supabase
    .from('parking_spots')
    .select('id, name, type, elevation')
    .eq('name', 'トラストパーク京橋１丁目第２')
    .single();

  if (error) {
    // 完全一致がない場合は部分一致で検索
    const { data: partial, error: partialErr } = await supabase
      .from('parking_spots')
      .select('id, name, type, elevation')
      .ilike('name', '%トラストパーク%')
      .limit(5);

    if (!partialErr && partial) {
      console.log('完全一致なし。トラストパークを含む駐車場:');
      partial.forEach(spot => {
        console.log(`ID: ${spot.id}, 名前: ${spot.name}`);
        console.log(`  タイプ: ${spot.type || 'null'}, 標高: ${spot.elevation}m`);
      });
    }
  } else {
    console.log(`ID: ${data.id}, 名前: ${data.name}`);
    console.log(`  タイプ: ${data.type || 'null'}, 標高: ${data.elevation}m`);
  }

  console.log('\n3. typeが設定されている駐車場の統計:');
  const { data: stats, error: statsErr } = await supabase
    .from('parking_spots')
    .select('type', { count: 'exact', head: true })
    .not('type', 'is', null);

  if (!statsErr) {
    console.log(`typeフィールドが設定されている駐車場数: ${stats}件`);
  }

  const { data: total, error: totalErr } = await supabase
    .from('parking_spots')
    .select('*', { count: 'exact', head: true });

  if (!totalErr) {
    console.log(`駐車場総数: ${total}件`);
  }
})();