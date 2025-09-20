// Supabase rates大規模バッチ更新スクリプト
const fs = require('fs');

// SQLファイルを読み込み、バッチごとに実行するスクリプト
async function executeBatchUpdate() {
  console.log('🚀 大規模rates更新開始');

  // SQLファイルの読み込み
  const sqlFilePath = '/Users/user/React/Car_concierge_react2/car-concierge-app/update-rates-queries.sql';

  if (!fs.existsSync(sqlFilePath)) {
    console.error('❌ SQLファイルが見つかりません:', sqlFilePath);
    return;
  }

  const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

  // バッチごとにクエリを分割
  const batches = sqlContent.split('\n\n-- Batch').filter(batch => batch.trim().length > 0);

  console.log(`📊 処理統計:`);
  console.log(`  - 総バッチ数: ${batches.length}`);
  console.log(`  - 推定更新レコード数: ${batches.length * 50}`);

  // 各バッチの実行計画を表示
  console.log('\n📋 実行計画:');
  console.log('バッチサイズ: 50レコード/バッチ');
  console.log('実行間隔: 200ms（レート制限対策）');
  console.log(`推定実行時間: ${Math.ceil(batches.length * 0.2 / 60)}分`);

  // 実行準備完了を確認
  console.log('\n⚠️  重要:');
  console.log('1. バックアップの確認を推奨');
  console.log('2. 処理中はSupabaseダッシュボードで監視');
  console.log('3. エラーが発生した場合は即座に停止');

  // 実行用のJavaScriptコードを生成
  const executionScript = `
// 各バッチを順次実行するためのコード
const batches = ${JSON.stringify(batches.slice(0, 5))}; // 最初の5バッチのみ（テスト用）

async function executeBatch(batchSql, batchNumber) {
  console.log(\`🔄 バッチ \${batchNumber} 実行中...\`);

  try {
    // ここでSupabaseクエリを実行
    // await supabase.rpc('execute_sql', { query: batchSql });
    console.log(\`✅ バッチ \${batchNumber} 完了\`);
    return { success: true, batch: batchNumber };
  } catch (error) {
    console.error(\`❌ バッチ \${batchNumber} エラー:, error\`);
    return { success: false, batch: batchNumber, error };
  }
}

async function runAllBatches() {
  const results = [];

  for (let i = 0; i < batches.length; i++) {
    const result = await executeBatch(batches[i], i + 1);
    results.push(result);

    // レート制限対策：200ms待機
    if (i < batches.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  // 結果サマリー
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  console.log(\`\\n📊 実行結果サマリー:\`);
  console.log(\`  ✅ 成功: \${successful}/\${results.length}\`);
  console.log(\`  ❌ 失敗: \${failed}/\${results.length}\`);

  return results;
}

// runAllBatches(); // 実行時にコメントアウト解除
`;

  // 実行スクリプトファイルの保存
  const scriptPath = '/Users/user/React/Car_concierge_react2/car-concierge-app/batch-execution-plan.js';
  fs.writeFileSync(scriptPath, executionScript, 'utf8');

  console.log(`\n📄 実行スクリプト生成完了: ${scriptPath}`);

  // 手動実行用のクエリファイルを生成（小バッチ）
  const firstBatches = batches.slice(0, 10); // 最初の10バッチ（500レコード）
  const manualQueries = firstBatches.map((batch, index) => {
    const cleanBatch = batch.replace(/^-- Batch \d+.*\n/, '').trim();
    return `-- Manual Batch ${index + 1}\n${cleanBatch}`;
  }).join('\n\n');

  const manualPath = '/Users/user/React/Car_concierge_react2/car-concierge-app/manual-update-first-10-batches.sql';
  fs.writeFileSync(manualPath, manualQueries, 'utf8');

  console.log(`📝 手動実行用SQLファイル生成: ${manualPath}`);
  console.log('   (最初の10バッチ = 500レコード)');

  // 統計情報の更新
  const stats = {
    timestamp: new Date().toISOString(),
    totalBatches: batches.length,
    estimatedRecords: batches.length * 50,
    firstBatchesGenerated: 10,
    testRecords: 10 * 50,
    executionFiles: {
      fullSql: sqlFilePath,
      manual10Batches: manualPath,
      executionPlan: scriptPath
    }
  };

  const statsPath = '/Users/user/React/Car_concierge_react2/car-concierge-app/batch-update-stats.json';
  fs.writeFileSync(statsPath, JSON.stringify(stats, null, 2), 'utf8');

  console.log(`\n✅ 準備完了！`);
  console.log(`📊 統計: ${statsPath}`);
  console.log(`\n🔄 次のステップ:`);
  console.log('1. manual-update-first-10-batches.sql で小規模テスト');
  console.log('2. 結果確認後、全バッチ実行を検討');
  console.log('3. 必要に応じてバッチサイズの調整');
}

// スクリプト実行
executeBatchUpdate().catch(console.error);