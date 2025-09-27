const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Supabase環境変数が設定されていません');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function uploadParkingData() {
  try {
    // JSONファイルを読み込み
    const filePath = path.join(__dirname, '..', 'coinparking_corrected_elevations.json');
    console.log('📁 データファイルを読み込み中:', filePath);

    const rawData = fs.readFileSync(filePath, 'utf8');
    const jsonData = JSON.parse(rawData);

    // データ構造を確認
    const parkingSpots = jsonData.parking_spots || jsonData.spots || jsonData;

    if (!Array.isArray(parkingSpots)) {
      console.error('❌ 予期しないデータ構造:', Object.keys(jsonData));
      return;
    }

    console.log(`📊 読み込んだ駐車場データ: ${parkingSpots.length}件`);

    // 最初のデータのサンプルを確認
    if (parkingSpots.length > 0) {
      console.log('\n📝 データサンプル（最初の1件）:');
      console.log(JSON.stringify(parkingSpots[0], null, 2));
    }

    // バッチサイズ
    const BATCH_SIZE = 500;
    let totalInserted = 0;
    let totalFailed = 0;

    // データをバッチで処理
    for (let i = 0; i < parkingSpots.length; i += BATCH_SIZE) {
      const batch = parkingSpots.slice(i, i + BATCH_SIZE);
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(parkingSpots.length / BATCH_SIZE);

      console.log(`\n🔄 バッチ ${batchNumber}/${totalBatches} を処理中...`);

      // データを整形（フィールド名は変更しない）
      const formattedBatch = batch.map(spot => ({
        id: spot.id,
        name: spot.name || spot.名前,
        lat: spot.lat || spot.latitude || spot.緯度,
        lng: spot.lng || spot.longitude || spot.経度,
        address: spot.address || spot.住所,
        capacity: spot.capacity || spot.収容台数,
        type: spot.type || spot.駐車場タイプ || null,
        elevation: spot.elevation || spot.標高 || null,
        rates: spot.rates || spot.料金 || [],
        hours: spot.hours || spot.営業時間 || null,
        nearest_convenience_store: spot.nearest_convenience_store || spot.最寄りコンビニ || null,
        nearest_hotspring: spot.nearest_hotspring || spot.最寄り温泉 || null,
      }));

      // Supabaseに挿入
      const { data, error } = await supabase
        .from('parking_spots')
        .insert(formattedBatch)
        .select('id');

      if (error) {
        console.error(`❌ バッチ ${batchNumber} エラー:`, error.message);
        console.error('詳細:', error);
        totalFailed += batch.length;
      } else {
        const insertedCount = data ? data.length : 0;
        totalInserted += insertedCount;
        console.log(`✅ バッチ ${batchNumber} 完了: ${insertedCount}件挿入`);
      }

      // 進捗表示
      const progress = Math.min(100, Math.round(((i + BATCH_SIZE) / parkingSpots.length) * 100));
      console.log(`📊 進捗: ${progress}% (${Math.min(i + BATCH_SIZE, parkingSpots.length)}/${parkingSpots.length}件)`);
    }

    console.log('\n========================================');
    console.log('🎉 データ投入完了！');
    console.log(`✅ 成功: ${totalInserted}件`);
    console.log(`❌ 失敗: ${totalFailed}件`);
    console.log('========================================\n');

    // 投入後のデータ件数を確認
    const { count, error: countError } = await supabase
      .from('parking_spots')
      .select('*', { count: 'exact', head: true });

    if (!countError) {
      console.log(`📊 現在のparking_spotsテーブルの総件数: ${count}件`);
    }

    // typeフィールドの統計を確認
    const { data: typeStats, error: typeError } = await supabase
      .from('parking_spots')
      .select('type')
      .not('type', 'is', null)
      .limit(1000);

    if (!typeError && typeStats) {
      const typeCounts = {};
      typeStats.forEach(item => {
        const type = item.type || 'null';
        typeCounts[type] = (typeCounts[type] || 0) + 1;
      });

      console.log('\n📊 駐車場タイプの分布（サンプル1000件）:');
      Object.entries(typeCounts).forEach(([type, count]) => {
        console.log(`  ${type}: ${count}件`);
      });
    }

  } catch (error) {
    console.error('❌ エラー:', error);
  }
}

// スクリプトを実行
uploadParkingData();