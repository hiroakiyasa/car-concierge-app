const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Import Supabase
const { createClient } = require('@supabase/supabase-js');

// Supabase client setup
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase環境変数が設定されていません');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateNearestFacilities() {
  console.log('📚 JSONファイルを読み込み中...');

  // Read the JSON file
  const jsonData = JSON.parse(fs.readFileSync('/Users/user/React/Car_concierge_react2/coinparking_corrected_elevations.json', 'utf8'));
  const spots = jsonData.parking_spots;

  console.log(`✅ ${spots.length}件の駐車場データを読み込みました`);

  // Filter spots that have nearest facilities
  const spotsWithFacilities = spots.filter(spot =>
    spot.nearest_convenience_store || spot.nearest_hotspring
  );

  console.log(`🔍 周辺施設データがある駐車場: ${spotsWithFacilities.length}件`);

  // Process in smaller batches for better performance
  const BATCH_SIZE = 50;
  let successCount = 0;
  let errorCount = 0;
  let skipCount = 0;
  const startTime = Date.now();

  for (let i = 0; i < spotsWithFacilities.length; i += BATCH_SIZE) {
    const batch = spotsWithFacilities.slice(i, i + BATCH_SIZE);
    const endIndex = Math.min(i + BATCH_SIZE, spotsWithFacilities.length);

    // Show progress
    const progress = ((i / spotsWithFacilities.length) * 100).toFixed(1);
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
    const rate = successCount / (elapsed || 1);
    const eta = ((spotsWithFacilities.length - i) / (rate || 1) / 60).toFixed(1);

    console.log(`\n📦 進捗: ${progress}% (${i}/${spotsWithFacilities.length}) | 成功: ${successCount} | 速度: ${rate.toFixed(1)}/秒 | 残り時間: ${eta}分`);

    // Process each spot in the batch in parallel
    const updatePromises = batch.map(async (spot) => {
      try {
        // Prepare update data
        const updateData = {};

        // Add nearest_convenience_store if exists
        if (spot.nearest_convenience_store) {
          updateData.nearest_convenience_store = spot.nearest_convenience_store;
        }

        // Add nearest_hotspring if exists
        if (spot.nearest_hotspring) {
          updateData.nearest_hotspring = spot.nearest_hotspring;
        }

        // Skip if no facilities to update
        if (Object.keys(updateData).length === 0) {
          skipCount++;
          return { success: false, skipped: true };
        }

        // Update the parking spot
        const { error } = await supabase
          .from('parking_spots')
          .update(updateData)
          .eq('id', spot.id);

        if (error) {
          if (!error.message.includes('No rows')) {
            console.error(`❌ ID ${spot.id} の更新失敗:`, error.message);
          }
          errorCount++;
          return { success: false, error };
        }

        successCount++;
        return { success: true, id: spot.id };
      } catch (error) {
        console.error(`❌ ID ${spot.id} の処理エラー:`, error.message);
        errorCount++;
        return { success: false, error };
      }
    });

    // Wait for batch to complete
    await Promise.all(updatePromises);

    // Add a small delay between batches to avoid rate limiting
    if (i + BATCH_SIZE < spotsWithFacilities.length) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }

  const totalTime = ((Date.now() - startTime) / 1000 / 60).toFixed(2);

  console.log('\n\n✅ 更新完了！');
  console.log(`📊 処理結果:`);
  console.log(`  成功: ${successCount}件`);
  console.log(`  失敗: ${errorCount}件`);
  console.log(`  スキップ: ${skipCount}件`);
  console.log(`  合計: ${spotsWithFacilities.length}件`);
  console.log(`  処理時間: ${totalTime}分`);

  // Verify specific updates
  console.log('\n🔍 サンプル確認中...');

  // Check OX飯田橋パーキング (ID: 22728)
  const { data: sampleData1 } = await supabase
    .from('parking_spots')
    .select('id, name, nearest_convenience_store, nearest_hotspring')
    .eq('id', 22728)
    .single();

  if (sampleData1) {
    console.log('\n📍 OX飯田橋パーキング (ID: 22728):');
    console.log(`  コンビニ: ${JSON.stringify(sampleData1.nearest_convenience_store)}`);
    console.log(`  温泉: ${JSON.stringify(sampleData1.nearest_hotspring)}`);
  }

  // Check a random sample
  const randomId = spotsWithFacilities[Math.floor(Math.random() * spotsWithFacilities.length)].id;
  const { data: sampleData2 } = await supabase
    .from('parking_spots')
    .select('id, name, nearest_convenience_store, nearest_hotspring')
    .eq('id', randomId)
    .single();

  if (sampleData2) {
    console.log(`\n📍 ランダムサンプル - ${sampleData2.name} (ID: ${sampleData2.id}):`);
    console.log(`  コンビニ: ${JSON.stringify(sampleData2.nearest_convenience_store)}`);
    console.log(`  温泉: ${JSON.stringify(sampleData2.nearest_hotspring)}`);
  }
}

// Run the update
console.log('🚀 Supabaseバックエンド更新を開始します...\n');

updateNearestFacilities()
  .then(() => {
    console.log('\n✨ 処理が正常に完了しました');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ エラーが発生しました:', error);
    process.exit(1);
  });