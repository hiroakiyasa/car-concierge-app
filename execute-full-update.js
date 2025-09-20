// 全データの大規模バッチ更新実行スクリプト
const fs = require('fs');

console.log('🚀 大規模rates更新実行開始');
console.log('📊 予定: 62,350件のデータを1,248バッチで更新');

// SQLファイルの読み込み
const sqlFilePath = '/Users/user/React/Car_concierge_react2/car-concierge-app/update-rates-queries.sql';

if (!fs.existsSync(sqlFilePath)) {
  console.error('❌ SQLファイルが見つかりません:', sqlFilePath);
  process.exit(1);
}

const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

// バッチごとにクエリを分割
const batches = sqlContent.split('\n\n-- Batch').filter(batch => batch.trim().length > 0);

console.log(`📋 実行準備完了:`);
console.log(`  - 総バッチ数: ${batches.length}`);
console.log(`  - 各バッチサイズ: 50レコード`);
console.log(`  - 総更新予定レコード数: ${batches.length * 50}`);
console.log(`  - 推定実行時間: ${Math.ceil(batches.length * 0.3 / 60)}分`);

// バッチを10個ずつのグループに分割
const batchGroups = [];
for (let i = 0; i < batches.length; i += 10) {
  batchGroups.push({
    groupNumber: Math.floor(i / 10) + 1,
    startBatch: i + 1,
    endBatch: Math.min(i + 10, batches.length),
    batches: batches.slice(i, i + 10)
  });
}

console.log(`\n📦 グループ分割完了:`);
console.log(`  - 総グループ数: ${batchGroups.length}`);
console.log(`  - 各グループ: 10バッチ (500レコード)`);

// 各グループのSQLファイルを生成
batchGroups.slice(0, 20).forEach((group, index) => { // 最初の20グループ（10,000レコード）
  const groupSql = group.batches.map((batch, batchIndex) => {
    const cleanBatch = batch.replace(/^-- Batch \d+.*\n/, '').trim();
    return `-- Group ${group.groupNumber}, Batch ${group.startBatch + batchIndex}\n${cleanBatch}`;
  }).join('\n\n');

  const groupFilePath = `/Users/user/React/Car_concierge_react2/car-concierge-app/batch-group-${String(group.groupNumber).padStart(3, '0')}.sql`;
  fs.writeFileSync(groupFilePath, groupSql, 'utf8');

  console.log(`📄 グループ${group.groupNumber}ファイル生成: batch-group-${String(group.groupNumber).padStart(3, '0')}.sql`);
});

console.log(`\n✅ 準備完了！最初の20グループ（10,000レコード）のSQLファイルを生成しました。`);
console.log(`\n🔄 実行手順:`);
console.log(`1. batch-group-001.sql から順次実行`);
console.log(`2. 各グループ実行後、結果を確認`);
console.log(`3. エラーがなければ次のグループを実行`);
console.log(`4. 10グループ（5,000レコード）ごとに進捗確認を推奨`);

// 実行ログ用のファイルを作成
const executionLog = {
  startTime: new Date().toISOString(),
  totalBatches: batches.length,
  totalRecords: batches.length * 50,
  groupsGenerated: Math.min(20, batchGroups.length),
  executionPlan: {
    phase1: "Groups 1-10 (5,000 records)",
    phase2: "Groups 11-20 (5,000 records)",
    phase3: "Groups 21+ (remaining records)"
  },
  status: "ready_for_execution"
};

fs.writeFileSync('/Users/user/React/Car_concierge_react2/car-concierge-app/execution-log.json', JSON.stringify(executionLog, null, 2), 'utf8');

console.log(`\n📊 実行ログ: execution-log.json`);
console.log(`\n⚠️  実行前の注意事項:`);
console.log(`- Supabaseの接続状況を確認`);
console.log(`- データベースのバックアップを推奨`);
console.log(`- 実行中は他の更新処理を停止`);
console.log(`- エラー発生時は即座に停止して原因調査`);