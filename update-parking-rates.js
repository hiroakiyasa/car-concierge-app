// JSONファイルからSupabaseの駐車場データにratesを更新するスクリプト
const fs = require('fs');
const path = require('path');

// JSONファイルの読み込み
const jsonFilePath = '/Users/user/React/Car_concierge_react2/coinparking_corrected_elevations.json';

console.log('🚀 駐車場rates更新スクリプト開始');
console.log('📂 JSONファイル読み込み中...');

// JSONファイルの存在確認
if (!fs.existsSync(jsonFilePath)) {
  console.error('❌ JSONファイルが見つかりません:', jsonFilePath);
  process.exit(1);
}

// JSONファイルの読み込み
let jsonData;
try {
  const fileContent = fs.readFileSync(jsonFilePath, 'utf8');
  jsonData = JSON.parse(fileContent);
} catch (error) {
  console.error('❌ JSONファイルの読み込みエラー:', error);
  process.exit(1);
}

console.log('✅ JSONファイル読み込み完了');
console.log('📊 JSONデータ統計:');
console.log(`  - 総データ数: ${jsonData.parking_spots?.length || 0}`);
console.log(`  - メタデータ: ${jsonData.metadata?.description || 'なし'}`);

// データの前処理とバリデーション
function preprocessData() {
  if (!jsonData.parking_spots || !Array.isArray(jsonData.parking_spots)) {
    throw new Error('parking_spotsが見つからないか、配列ではありません');
  }

  const validSpots = [];
  const errors = [];

  jsonData.parking_spots.forEach((spot, index) => {
    try {
      // 必須フィールドの確認
      if (!spot.id || typeof spot.id !== 'number') {
        throw new Error(`Invalid ID: ${spot.id}`);
      }

      if (!spot.name || typeof spot.name !== 'string') {
        throw new Error(`Invalid name: ${spot.name}`);
      }

      if (!spot.rates || !Array.isArray(spot.rates)) {
        throw new Error(`Invalid rates: ${JSON.stringify(spot.rates)}`);
      }

      // ratesの形式チェック
      const validRates = spot.rates.map(rate => {
        if (!rate.type || !rate.price || !rate.minutes) {
          throw new Error(`Invalid rate structure: ${JSON.stringify(rate)}`);
        }

        // timeRangeをtimeRange形式に変換（互換性のため）
        const convertedRate = {
          type: rate.type,
          price: parseInt(rate.price),
          minutes: parseInt(rate.minutes)
        };

        if (rate.time_range) {
          convertedRate.timeRange = rate.time_range;
        }
        if (rate.day_type) {
          convertedRate.dayType = rate.day_type;
        }
        if (rate.apply_after !== undefined) {
          convertedRate.applyAfter = parseInt(rate.apply_after);
        }

        return convertedRate;
      });

      validSpots.push({
        id: spot.id,
        name: spot.name,
        rates: validRates
      });

    } catch (error) {
      errors.push({
        index,
        id: spot.id,
        name: spot.name,
        error: error.message
      });
    }
  });

  console.log('📋 データ前処理結果:');
  console.log(`  - 有効なスポット: ${validSpots.length}`);
  console.log(`  - エラー: ${errors.length}`);

  if (errors.length > 0) {
    console.log('⚠️  エラーの詳細（最初の10件）:');
    errors.slice(0, 10).forEach(err => {
      console.log(`    ID ${err.id}: ${err.error}`);
    });
  }

  return validSpots;
}

// SQLクエリ生成関数
function generateUpdateQueries(spots, batchSize = 100) {
  const queries = [];

  for (let i = 0; i < spots.length; i += batchSize) {
    const batch = spots.slice(i, i + batchSize);

    const updates = batch.map(spot => {
      const ratesJson = JSON.stringify(spot.rates);
      // SQLインジェクション対策：シングルクォートをエスケープ
      const escapedRates = ratesJson.replace(/'/g, "''");
      return `(${spot.id}, '${escapedRates}'::jsonb)`;
    }).join(',\n    ');

    const query = `
UPDATE parking_spots
SET rates = v.rates
FROM (VALUES
    ${updates}
) AS v(id, rates)
WHERE parking_spots.id = v.id;`;

    queries.push({
      query,
      batchNumber: Math.floor(i / batchSize) + 1,
      recordCount: batch.length,
      ids: batch.map(s => s.id)
    });
  }

  return queries;
}

// メイン処理
async function main() {
  try {
    console.log('🔄 データ前処理開始...');
    const validSpots = preprocessData();

    console.log('📝 SQLクエリ生成中...');
    const updateQueries = generateUpdateQueries(validSpots, 50); // バッチサイズを50に設定

    console.log('📊 更新計画:');
    console.log(`  - 更新対象スポット数: ${validSpots.length}`);
    console.log(`  - バッチ数: ${updateQueries.length}`);
    console.log(`  - 各バッチサイズ: 50`);

    // ID範囲の確認
    const ids = validSpots.map(s => s.id);
    const minId = Math.min(...ids);
    const maxId = Math.max(...ids);
    console.log(`  - ID範囲: ${minId} - ${maxId}`);

    // サンプルデータの表示
    console.log('📋 サンプルデータ（最初の3件）:');
    validSpots.slice(0, 3).forEach(spot => {
      console.log(`  ID ${spot.id}: ${spot.name}`);
      console.log(`    Rates: ${JSON.stringify(spot.rates, null, 2)}`);
    });

    // SQLファイルの出力
    const sqlOutputPath = '/Users/user/React/Car_concierge_react2/car-concierge-app/update-rates-queries.sql';
    const allQueries = updateQueries.map((q, index) =>
      `-- Batch ${q.batchNumber} (${q.recordCount} records)\n-- IDs: ${q.ids.slice(0, 5).join(', ')}${q.ids.length > 5 ? '...' : ''}\n${q.query}`
    ).join('\n\n');

    fs.writeFileSync(sqlOutputPath, allQueries, 'utf8');
    console.log(`📄 SQLファイル出力完了: ${sqlOutputPath}`);

    // 更新統計の出力
    const statsOutputPath = '/Users/user/React/Car_concierge_react2/car-concierge-app/update-rates-stats.json';
    const stats = {
      timestamp: new Date().toISOString(),
      totalSpots: validSpots.length,
      batchCount: updateQueries.length,
      batchSize: 50,
      idRange: { min: minId, max: maxId },
      sampleData: validSpots.slice(0, 5)
    };

    fs.writeFileSync(statsOutputPath, JSON.stringify(stats, null, 2), 'utf8');
    console.log(`📊 統計ファイル出力完了: ${statsOutputPath}`);

    console.log('✅ 準備完了！次のステップ:');
    console.log('1. SQLファイルの内容を確認');
    console.log('2. Supabaseでテスト実行');
    console.log('3. バッチ実行でrates更新');

  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
    process.exit(1);
  }
}

// スクリプト実行
main();