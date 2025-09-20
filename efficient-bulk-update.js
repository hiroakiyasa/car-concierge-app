// 効率的な大規模バッチ更新スクリプト
const fs = require('fs');

console.log('🚀 効率的な大規模rates更新開始');

// JSONファイルの読み込み
const jsonFilePath = '/Users/user/React/Car_concierge_react2/coinparking_corrected_elevations.json';
const jsonData = JSON.parse(fs.readFileSync(jsonFilePath, 'utf8'));
const data = jsonData.parking_spots;

console.log(`📊 総レコード数: ${data.length}`);

// price=0のレコードを除外し、有効なレコードのみを処理
const validRecords = data.filter(record => {
  return record.rates && record.rates.length > 0 &&
         record.rates.some(rate => rate.price > 0);
});

console.log(`✅ 有効レコード数: ${validRecords.length}`);

// 1000件ずつの大きなバッチに分割
const batchSize = 1000;
const batches = [];

for (let i = 0; i < validRecords.length; i += batchSize) {
  batches.push(validRecords.slice(i, i + batchSize));
}

console.log(`📦 ${batches.length}バッチに分割（各バッチ${batchSize}件）`);

// 各バッチのSQLを生成
batches.forEach((batch, batchIndex) => {
  const batchNum = String(batchIndex + 1).padStart(3, '0');
  const sqlCommands = [];

  batch.forEach(record => {
    const ratesJson = JSON.stringify(record.rates).replace(/'/g, "''");
    sqlCommands.push(`UPDATE parking_spots SET rates = '${ratesJson}'::jsonb WHERE id = ${record.id};`);
  });

  const batchSql = sqlCommands.join('\n');
  const fileName = `bulk-update-batch-${batchNum}.sql`;

  fs.writeFileSync(`/Users/user/React/Car_concierge_react2/car-concierge-app/${fileName}`, batchSql, 'utf8');
  console.log(`📄 ${fileName} 生成完了 (${batch.length}レコード)`);
});

// 統合実行スクリプトを作成
const executionScript = `-- 全バッチ統合実行スクリプト
-- 総更新予定レコード数: ${validRecords.length}
-- バッチ数: ${batches.length}

BEGIN;

${batches.map((_, index) => {
  const batchNum = String(index + 1).padStart(3, '0');
  return `-- バッチ ${batchNum} (${index * batchSize + 1} - ${Math.min((index + 1) * batchSize, validRecords.length)})`;
}).join('\n')}

-- 実行完了後にCOMMIT;
-- 問題発生時にROLLBACK;

COMMIT;
`;

fs.writeFileSync('/Users/user/React/Car_concierge_react2/car-concierge-app/execute-all-batches.sql', executionScript, 'utf8');

console.log(`✅ 準備完了！`);
console.log(`📋 実行方法:`);
console.log(`1. 各 bulk-update-batch-XXX.sql を順次実行`);
console.log(`2. または execute-all-batches.sql で一括実行`);
console.log(`⚠️  データベースのバックアップを事前に取得することを強く推奨`);