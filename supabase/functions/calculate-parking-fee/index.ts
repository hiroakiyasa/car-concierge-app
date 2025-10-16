import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    const { parking_id, parking_minutes, day_type = '全日' } = await req.json();

    console.log('=== リクエスト受信 ===');
    console.log('parking_id:', parking_id);
    console.log('parking_minutes:', parking_minutes, '(約', Math.floor(parking_minutes / 60), '時間', parking_minutes % 60, '分)');
    console.log('day_type:', day_type);

    // Validate inputs
    if (!parking_id || !parking_minutes) {
      return new Response(
        JSON.stringify({
          status: 'error',
          message: '必須パラメータが不足しています',
          fee: 0,
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    // Create Supabase client using service role key for database access
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Fetch parking spot data
    const { data: parkingSpot, error } = await supabase
      .from('parking_spots')
      .select('id, name, rates')
      .eq('id', parking_id)
      .single();

    if (error) {
      console.error('Database error:', error);
      return new Response(
        JSON.stringify({
          status: 'error',
          message: 'データベースエラー',
          fee: 0,
          error: error.message,
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    if (!parkingSpot || !parkingSpot.rates) {
      return new Response(
        JSON.stringify({
          status: 'error',
          message: '駐車場データが見つかりません',
          fee: 0,
        }),
        {
          status: 404,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    console.log('駐車場名:', parkingSpot.name);
    console.log('料金データ:', JSON.stringify(parkingSpot.rates, null, 2));

    // Calculate fee
    const fee = calculateParkingFee(parkingSpot.rates, parking_minutes, day_type);

    console.log('=== 最終結果 ===');
    console.log('計算料金:', fee, '円');

    return new Response(
      JSON.stringify({
        status: 'success',
        fee: fee,
        parking_id: parking_id,
        parking_name: parkingSpot.name,
        parking_minutes: parking_minutes,
        day_type: day_type,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({
        status: 'error',
        message: error.message || 'エラーが発生しました',
        fee: 0,
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
});

function calculateParkingFee(rates: any[], parkingMinutes: number, dayType: string): number {
  if (!rates || rates.length === 0 || parkingMinutes <= 0) return 0;

  console.log('\n=== 料金計算開始 ===');
  console.log('駐車時間:', parkingMinutes, '分 (', Math.floor(parkingMinutes / 60), '時間', parkingMinutes % 60, '分)');

  // 24時間を超える場合は、24時間ごとに最大料金を繰り返し適用
  if (parkingMinutes > 1440) {
    console.log('⚠️ 24時間を超える駐車');

    // 完全な24時間の回数を計算
    const fullDays = Math.floor(parkingMinutes / 1440);
    const remainingMinutes = parkingMinutes % 1440;

    console.log(`完全な24時間: ${fullDays}回, 残り時間: ${remainingMinutes}分`);

    let totalFee = 0;

    // 各24時間に対して最大料金を適用
    for (let i = 0; i < fullDays; i++) {
      const dayFee = calculateSingleDayFee(rates, 1440, dayType);
      console.log(`${i + 1}日目の料金: ${dayFee}円`);
      totalFee += dayFee;
    }

    // 残りの時間に対して通常料金を適用
    if (remainingMinutes > 0) {
      const remainingFee = calculateSingleDayFee(rates, remainingMinutes, dayType);
      console.log(`残り${remainingMinutes}分の料金: ${remainingFee}円`);
      totalFee += remainingFee;
    }

    console.log(`合計料金: ${totalFee}円`);
    return totalFee;
  }

  // 24時間以内の場合は通常通り計算
  return calculateSingleDayFee(rates, parkingMinutes, dayType);
}

function calculateSingleDayFee(rates: any[], minutes: number, dayType: string): number {
  console.log('\n--- 1日分の料金計算 ---');
  console.log('対象時間:', minutes, '分');

  // フィルタリング - 該当する料金のみ
  const applicableRates = rates.filter((rate) => {
    if (!rate.day_type || rate.day_type === '全日') return true;
    return matchDayType(rate.day_type, dayType);
  });

  if (applicableRates.length === 0) return 0;

  // タイプ別に分類
  const baseRates = applicableRates.filter((r) => r.type === 'base');
  const maxRates = applicableRates.filter((r) => r.type === 'max').sort((a, b) => a.minutes - b.minutes);
  const progressiveRates = applicableRates
    .filter((r) => r.type === 'progressive')
    .sort((a, b) => (a.apply_after || 0) - (b.apply_after || 0));

  console.log('基本料金数:', baseRates.length);
  console.log('最大料金数:', maxRates.length);
  console.log('累進料金数:', progressiveRates.length);

  let totalFee = 0;

  // Progressive料金の処理（修正版）
  if (progressiveRates.length > 0 && baseRates.length > 0) {
    const firstProgressive = progressiveRates[0];
    const threshold = firstProgressive.apply_after || 0;

    if (minutes > threshold) {
      console.log(`✅ Progressive料金適用（threshold: ${threshold}分）`);

      // 1. apply_afterまでの基本料金を計算
      const baseRate = baseRates[0];
      const baseUnits = Math.ceil(threshold / baseRate.minutes);
      const baseFee = baseUnits * baseRate.price;
      console.log(`  基本料金部分: ${threshold}分 → ${baseUnits}単位 × ${baseRate.price}円 = ${baseFee}円`);
      totalFee += baseFee;

      // 2. apply_after以降のprogressive料金を計算
      const progressiveMinutes = minutes - threshold;
      const progressiveUnits = Math.ceil(progressiveMinutes / firstProgressive.minutes);
      const progressiveFee = progressiveUnits * firstProgressive.price;
      console.log(`  Progressive部分: ${progressiveMinutes}分 → ${progressiveUnits}単位 × ${firstProgressive.price}円 = ${progressiveFee}円`);
      totalFee += progressiveFee;

      console.log(`  合計料金（最大料金適用前）: ${totalFee}円`);
    } else {
      // threshold未満は基本料金のみ
      const baseRate = baseRates[0];
      const unitCount = Math.ceil(minutes / baseRate.minutes);
      totalFee = unitCount * baseRate.price;
      console.log(`基本料金のみ: ${minutes}分 → ${unitCount}単位 × ${baseRate.price}円 = ${totalFee}円`);
    }
  } else if (baseRates.length > 0) {
    // Progressive料金がない場合は基本料金のみ
    const selectedBaseRate = baseRates.reduce((best, rate) => {
      if (rate.price === 0) return rate;
      if (best.price === 0) return best;
      const currentUnitPrice = rate.price / rate.minutes;
      const bestUnitPrice = best.price / best.minutes;
      return currentUnitPrice < bestUnitPrice ? rate : best;
    });

    const unitCount = Math.ceil(minutes / selectedBaseRate.minutes);
    totalFee = unitCount * selectedBaseRate.price;

    console.log(`基本料金計算:`);
    console.log(`  - 選択したレート: ${selectedBaseRate.price}円/${selectedBaseRate.minutes}分`);
    console.log(`  - ${minutes}分 ÷ ${selectedBaseRate.minutes}分 = ${unitCount}回`);
    console.log(`  - ${unitCount}回 × ${selectedBaseRate.price}円 = ${totalFee}円`);
  }

  // 最大料金のチェック
  console.log('\n最大料金チェック:');
  if (maxRates.length > 0) {
    // time_rangeがない最大料金（終日最大）を探す
    const allDayMaxRates = maxRates.filter((r) => !r.time_range);
    console.log('  終日最大料金:', allDayMaxRates.length, '件');
    allDayMaxRates.forEach((r) => {
      console.log(`    - ${r.price}円 (${r.minutes}分まで)`);
    });

    if (allDayMaxRates.length > 0) {
      // 終日最大料金がある場合
      for (const maxRate of allDayMaxRates) {
        if (minutes <= maxRate.minutes) {
          const finalFee = Math.min(totalFee, maxRate.price);
          console.log(`\n✅ 終日最大料金適用: ${maxRate.price}円`);
          console.log(`   基本料金 ${totalFee}円 vs 最大料金 ${maxRate.price}円`);
          console.log(`   → 最終料金: ${finalFee}円`);
          return finalFee;
        }
      }

      // 最大料金の時間を超えた場合でも、最後の終日最大料金と比較
      const lastMaxRate = allDayMaxRates[allDayMaxRates.length - 1];
      if (lastMaxRate.minutes === 1440) {
        // 24時間の最大料金があれば、それと比較
        const finalFee = Math.min(totalFee, lastMaxRate.price);
        console.log(`\n✅ 24時間終日最大料金適用: ${lastMaxRate.price}円`);
        console.log(`   基本料金 ${totalFee}円 vs 最大料金 ${lastMaxRate.price}円`);
        console.log(`   → 最終料金: ${finalFee}円`);
        return finalFee;
      }
    } else {
      // 終日最大料金がない場合、時間帯別の最大料金をチェック
      console.log('  時間帯別最大料金:', maxRates.length, '件');
      for (const maxRate of maxRates) {
        if (minutes <= maxRate.minutes) {
          const finalFee = Math.min(totalFee, maxRate.price);
          console.log(`\n✅ 時間帯別最大料金適用: ${maxRate.price}円`);
          console.log(`   → 最終料金: ${finalFee}円`);
          return finalFee;
        }
      }
    }
  } else {
    console.log('  最大料金なし');
  }

  console.log(`\n✅ 最終料金: ${totalFee}円`);
  return totalFee;
}

function matchDayType(rateDayType: string, requestDayType: string): boolean {
  if (rateDayType === requestDayType) return true;
  if (rateDayType === '全日') return true;

  // 平日パターン
  const weekdayPatterns = ['月', '火', '水', '木', '金', '平日', '月～金'];

  // 休日パターン
  const holidayPatterns = ['土', '日', '祝', '休日', '土日祝', '土日'];

  const isRateWeekday = weekdayPatterns.some((p) => rateDayType.includes(p));
  const isRateHoliday = holidayPatterns.some((p) => rateDayType.includes(p));
  const isRequestWeekday = weekdayPatterns.some((p) => requestDayType.includes(p));
  const isRequestHoliday = holidayPatterns.some((p) => requestDayType.includes(p));

  return (isRateWeekday && isRequestWeekday) || (isRateHoliday && isRequestHoliday);
}
