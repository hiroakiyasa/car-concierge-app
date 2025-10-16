// price > 0の最大料金のみの駐車場を探す
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://jhqnypyxrkwdrgutzttf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpocW55cHl4cmt3ZHJndXR6dHRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxNTk5MjIsImV4cCI6MjA3MDczNTkyMn0.VdbVtE_sIlCFjQd1OAgmyYVoi-uoGVbjKQvdMIgJ5qY';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function findMaxOnlyPaid() {
  console.log('=== 有料の最大料金のみ駐車場を探す ===\n');

  try {
    const { data: parkingSpots, error } = await supabase
      .from('parking_spots')
      .select('id, name, rates')
      .limit(500);

    if (error) {
      console.log('駐車場データ取得エラー:', error);
      return;
    }

    // 最大料金のみで、price > 0の駐車場を探す
    const maxOnlyPaidSpots = parkingSpots.filter(spot => {
      if (!spot.rates || !Array.isArray(spot.rates)) return false;
      const hasBase = spot.rates.some(r => r.type === 'base');
      const hasProgressive = spot.rates.some(r => r.type === 'progressive');
      const maxRates = spot.rates.filter(r => r.type === 'max');
      const hasPaidMax = maxRates.some(r => r.price > 0);
      return !hasBase && !hasProgressive && hasPaidMax;
    });

    console.log(`有料の最大料金のみの駐車場: ${maxOnlyPaidSpots.length}件\n`);

    if (maxOnlyPaidSpots.length > 0) {
      // 最初の3件をテスト
      for (let i = 0; i < Math.min(3, maxOnlyPaidSpots.length); i++) {
        const spot = maxOnlyPaidSpots[i];
        console.log(`\n【駐車場 ${i + 1}】`);
        console.log(`ID: ${spot.id}`);
        console.log(`名前: ${spot.name}`);
        console.log(`料金体系:`, JSON.stringify(spot.rates, null, 2));

        const startTime = new Date('2025-10-17T10:00:00+09:00');

        // 2時間でテスト
        const { data: fee, error: feeError } = await supabase.rpc('calculate_simple_parking_fee', {
          rates: spot.rates,
          parking_start: startTime.toISOString(),
          duration_minutes: 120
        });

        if (feeError) {
          console.log('料金計算エラー:', feeError);
        } else {
          console.log(`\n2時間駐車の計算料金: ¥${fee}`);
          const expectedMax = Math.max(...spot.rates.map(r => r.price));
          if (fee > 0) {
            console.log(`✅ 最大料金が適用されています（期待: ¥${expectedMax}）`);
          } else {
            console.log(`❌ 無料になっています（期待: ¥${expectedMax}）`);
          }
        }
      }
    } else {
      console.log('有料の最大料金のみの駐車場が見つかりませんでした');
      console.log('\n最大料金を持つ駐車場の分析:');

      const maxRateSpots = parkingSpots.filter(spot => {
        if (!spot.rates || !Array.isArray(spot.rates)) return false;
        return spot.rates.some(r => r.type === 'max');
      });

      console.log(`最大料金を持つ駐車場: ${maxRateSpots.length}件`);

      const maxOnlyAll = maxRateSpots.filter(spot => {
        const hasBase = spot.rates.some(r => r.type === 'base');
        const hasProgressive = spot.rates.some(r => r.type === 'progressive');
        return !hasBase && !hasProgressive;
      });

      console.log(`最大料金のみ（有料・無料含む）: ${maxOnlyAll.length}件`);

      if (maxOnlyAll.length > 0) {
        console.log('\n例:');
        const sample = maxOnlyAll[0];
        console.log(`- ${sample.name}`);
        console.log(`  料金:`, JSON.stringify(sample.rates, null, 2));
      }
    }

  } catch (err) {
    console.error('エラー:', err);
  }

  process.exit(0);
}

findMaxOnlyPaid();
