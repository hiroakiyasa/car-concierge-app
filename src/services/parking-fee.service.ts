import { CoinParking, ParkingRate, ParkingDuration } from '@/types';

interface TimeSegment {
  start: Date;
  end: Date;
  rates: ParkingRate[];
  totalElapsedMinutes: number; // セグメント開始時点での累積時間
}

export class ParkingFeeCalculator {
  /**
   * 駐車料金を計算（時間帯別料金・夜間最大料金対応版）
   */
  static calculateFee(parking: CoinParking, duration: ParkingDuration): number {
    if (!parking.rates || parking.rates.length === 0) {
      console.warn(`⚠️ ${parking.name}に料金データがありません。`, parking.rates);
      return -1;
    }

    // データベースのsnake_caseをcamelCaseに変換
    const normalizedRates = parking.rates.map(rate => ({
      ...rate,
      applyAfter: rate.applyAfter ?? (rate as any).apply_after ?? rate.applyAfter,
      dayType: rate.dayType ?? (rate as any).day_type ?? rate.dayType,
      timeRange: rate.timeRange ?? (rate as any).time_range ?? rate.timeRange,
    }));

    // データ検証: base料金にapply_afterがある場合は無効
    const invalidBaseRates = normalizedRates.filter(r =>
      r.type === 'base' && r.applyAfter !== undefined && r.applyAfter !== null
    );
    if (invalidBaseRates.length > 0) {
      console.error(`❌ 無効な料金データ: base料金にapply_afterが含まれています - ${parking.name}`, invalidBaseRates);
      return -1; // 無効なデータなので計算不可
    }

    // 料金データのバリデーション
    const baseRates = normalizedRates.filter(r => r.type === 'base');
    const progressiveRates = normalizedRates.filter(r => r.type === 'progressive');
    const maxRates = normalizedRates.filter(r => r.type === 'max');

    // base料金もprogressive料金もない場合
    if (baseRates.length === 0 && progressiveRates.length === 0) {
      // max料金のみの場合をチェック
      if (maxRates.length > 0 && maxRates[0].price !== undefined) {
        if (maxRates[0].price === 0) {
          console.log(`✅ ${parking.name}は最大料金0円の無料駐車場です。`);
          return 0;
        }
        console.log(`💰 ${parking.name}は最大料金のみ: ¥${maxRates[0].price}`);
        return maxRates[0].price;
      }
      console.warn(`⚠️ ${parking.name}の基本料金データがありません。`);
      return -1;
    }

    // 無料駐車場の特別処理（price=0かつminutes=0の場合のみ）
    // ただし、progressive料金がある場合は無料駐車場ではない
    const freeBaseRate = baseRates.find(r => r.price === 0 && r.minutes === 0);
    if (freeBaseRate && progressiveRates.length === 0) {
      console.log(`✅ ${parking.name}は完全無料駐車場です。`);
      return 0;
    }

    const startTime = duration.startDate;
    const endTime = duration.endDate;
    const totalDurationMinutes = duration.durationInMinutes;

    // デバッグ用：土日祝の無料時間がある駐車場
    if (parking.id === 22298 || parking.id === 22314 || parking.id === 22443) {
      console.log(`🔍 [${parking.id}] ${parking.name} 料金計算デバッグ:`);
      console.log(`  - 開始時刻: ${startTime.toLocaleString('ja-JP')}`);
      console.log(`  - 曜日: ${this.getDayOfWeek(startTime)}`);
      console.log(`  - 駐車時間: ${totalDurationMinutes}分`);
      console.log(`  - rates:`, JSON.stringify(normalizedRates));
    }

    // 駐車時間を時間帯別セグメントに分割
    const segments = this.splitIntoTimeSegments(normalizedRates, startTime, endTime);

    // 各セグメントの料金を計算
    let totalFee = 0;
    let accumulatedMinutes = 0;
    let timeRangeFees: Map<string, number> = new Map(); // 時間帯別の累積料金

    // 累積計算のためのロールアップ状態（セグメント跨ぎの丸め重複を防止）
    let baseAccumMinutes = 0; // applyAfter までの基本料金に属する累積分
    let baseUnitsCharged = 0;
    let lastBaseKey: string | null = null;

    let progAccumMinutes = 0; // progressive 適用後の累積分
    let progUnitsCharged = 0;
    let lastProgKey: string | null = null;

    for (const segment of segments) {
      const segmentMinutes = Math.round(
        (segment.end.getTime() - segment.start.getTime()) / 60000
      );

      if (segmentMinutes === 0) continue;

      // 適用される料金レートを取得
      const applicableRates = this.getApplicableRatesForSegment(
        segment.rates,
        segment.start,
        accumulatedMinutes,
        segmentMinutes
      );

      const baseRate = applicableRates.baseRate;
      let progressiveRate = applicableRates.progressiveRate;
      const maxRate = applicableRates.maxRate;

      let segmentFee = 0;

      // 料金計算のロジック改善
      const currentMinutes = accumulatedMinutes + segmentMinutes;

      // デバッグログ
      if (parking.id === 22443) {
        console.log(`    セグメント計算: 累積${accumulatedMinutes}分, セグメント${segmentMinutes}分, 合計${currentMinutes}分`);
        console.log(`    適用料金: base=${baseRate?.price || 'なし'}円/${baseRate?.minutes || 'なし'}分, progressive=${progressiveRate?.price || 'なし'}円 (after=${progressiveRate?.applyAfter || 'なし'})`);
      }

      // progressive料金の処理（セグメント跨ぎの丸め過大請求を防ぐためのロールアップ方式）
      // 1) このセグメントで参照できるprogressive候補（applyAfter最小）
      const progressiveCandidates = segment.rates
        .filter(r => r.type === 'progressive' && r.applyAfter !== undefined)
        .sort((a, b) => (a.applyAfter! - b.applyAfter!));
      const progressiveCandidate = progressiveCandidates[0];
      // progressiveRateが選ばれていないが候補がある場合（閾値未到達セグメントなど）は候補を使う
      if (!progressiveRate && progressiveCandidate) {
        progressiveRate = progressiveCandidate;
      }

      // 2) applyAfter閾値を決定
      const applyAfterThreshold = progressiveRate?.applyAfter;

      // 3) セグメントを base部 と progressive部 に分割して、それぞれロールアップ計算
      let basePortion = segmentMinutes;
      let progPortion = 0;
      if (applyAfterThreshold !== undefined) {
        // 閾値までの残り分をbaseとして扱い、それ以降をprogressive
        const remainingUntilProg = Math.max(0, applyAfterThreshold - accumulatedMinutes);
        basePortion = Math.max(0, Math.min(segmentMinutes, remainingUntilProg));
        progPortion = Math.max(0, segmentMinutes - basePortion);
      }

      // 3-a) base部のロールアップ（レートが変わったらリセット）
      if (basePortion > 0) {
        if (!baseRate) {
          console.warn(`⚠️ base料金が見つからないため計算不可`);
          return -1;
        }
        const baseKey = `base:${baseRate.minutes}:${baseRate.price}:${baseRate.dayType || ''}:${baseRate.timeRange || ''}`;
        if (lastBaseKey !== baseKey) {
          lastBaseKey = baseKey;
          baseAccumMinutes = 0;
          baseUnitsCharged = 0;
        }
        baseAccumMinutes += basePortion;
        const newUnits = Math.ceil(baseAccumMinutes / baseRate.minutes);
        const addUnits = newUnits - baseUnitsCharged;
        if (addUnits > 0) {
          segmentFee += addUnits * baseRate.price;
          baseUnitsCharged = newUnits;
        }
      }

      // 3-b) progressive部のロールアップ（レートが変わったらリセット）
      if (progPortion > 0) {
        if (!progressiveRate) {
          // progressive部だがレートが未定義の場合は安全にbase扱い（想定外データへのフォールバック）
          if (!baseRate) {
            console.warn(`⚠️ progressive料金もbase料金も見つからないため計算不可`);
            return -1;
          }
          const baseKey = `base:${baseRate.minutes}:${baseRate.price}:${baseRate.dayType || ''}:${baseRate.timeRange || ''}`;
          if (lastBaseKey !== baseKey) {
            lastBaseKey = baseKey;
            baseAccumMinutes = 0;
            baseUnitsCharged = 0;
          }
          baseAccumMinutes += progPortion;
          const newUnits = Math.ceil(baseAccumMinutes / baseRate.minutes);
          const addUnits = newUnits - baseUnitsCharged;
          if (addUnits > 0) {
            segmentFee += addUnits * baseRate.price;
            baseUnitsCharged = newUnits;
          }
        } else {
          const progKey = `prog:${progressiveRate.minutes}:${progressiveRate.price}:${progressiveRate.dayType || ''}:${progressiveRate.timeRange || ''}`;
          if (lastProgKey !== progKey) {
            lastProgKey = progKey;
            progAccumMinutes = 0;
            progUnitsCharged = 0;
          }
          progAccumMinutes += progPortion;
          const newUnits = Math.ceil(progAccumMinutes / progressiveRate.minutes);
          const addUnits = newUnits - progUnitsCharged;
          if (addUnits > 0) {
            segmentFee += addUnits * progressiveRate.price;
            progUnitsCharged = newUnits;
          }
        }
      }

      // base/progressiveのどちらにも当てはまらず、何も加算されていない場合のフォールバック
      if (segmentFee === 0 && !baseRate && !progressiveRate) {
        console.warn(`⚠️ セグメントに適用可能な料金がありません`);
        return -1;
      }

      // 時間帯別最大料金の適用
      if (maxRate && maxRate.timeRange) {
        const timeRangeKey = maxRate.timeRange;
        const currentRangeFee = timeRangeFees.get(timeRangeKey) || 0;
        const newRangeFee = currentRangeFee + segmentFee;

        if (newRangeFee > maxRate.price) {
          segmentFee = maxRate.price - currentRangeFee;
          if (segmentFee < 0) segmentFee = 0;
          timeRangeFees.set(timeRangeKey, maxRate.price);
        } else {
          timeRangeFees.set(timeRangeKey, newRangeFee);
        }
      }

      totalFee += segmentFee;
      accumulatedMinutes += segmentMinutes;
    }

    // 全体の最大料金チェック（時間帯指定なし）
    const overallMaxRates = normalizedRates.filter(r =>
      r.type === 'max' &&
      !r.timeRange &&
      !r.dayType
    ).sort((a, b) => {
      if (a.minutes === 0 && b.minutes === 0) return 0;
      if (a.minutes === 0) return 1;
      if (b.minutes === 0) return -1;
      return a.minutes - b.minutes;
    });

    for (const maxRate of overallMaxRates) {
      if (maxRate.minutes === 0 || maxRate.minutes >= totalDurationMinutes) {
        if (totalFee > maxRate.price) {
          totalFee = maxRate.price;
        }
        if (maxRate.minutes !== 0) break;
      }
    }

    return totalFee;
  }

  /**
   * セグメントに適用される料金を取得
   */
  private static getApplicableRatesForSegment(
    rates: ParkingRate[],
    segmentStart: Date,
    accumulatedMinutes: number,
    segmentMinutes: number
  ): { baseRate?: ParkingRate; progressiveRate?: ParkingRate; maxRate?: ParkingRate } {
    let baseRate: ParkingRate | undefined;
    let progressiveRate: ParkingRate | undefined;
    let maxRate: ParkingRate | undefined;

    // 現在時刻の曜日を取得
    const dayOfWeek = this.getDayOfWeek(segmentStart);
    const isWeekend = dayOfWeek === '土' || dayOfWeek === '日';
    const isHoliday = false; // 祝日判定は別途実装が必要

    // 曜日に応じた料金をフィルタリング
    const filterByDayType = (rate: ParkingRate): boolean => {
      if (!rate.dayType) return true; // 曜日指定なしは常に適用

      if (rate.dayType === '月～金' || rate.dayType === '平日') {
        return !isWeekend && !isHoliday;
      }
      if (rate.dayType === '土日祝') {
        return isWeekend || isHoliday;
      }
      if (rate.dayType === '土') {
        return dayOfWeek === '土';
      }
      if (rate.dayType === '日祝') {
        return dayOfWeek === '日' || isHoliday;
      }
      if (rate.dayType === '土日') {
        return isWeekend;
      }
      return true;
    };

    // base料金の選択（曜日を考慮）
    // 重要: base料金にapply_afterがある場合は無効なデータとして除外
    const baseRates = rates.filter(r =>
      r.type === 'base' &&
      filterByDayType(r) &&
      !r.applyAfter // base料金にapply_afterがあるのは無効
    );
    if (baseRates.length > 0) {
      // より具体的な条件を持つ料金を優先
      baseRate = baseRates.sort((a, b) => {
        const scoreA = (a.timeRange ? 2 : 0) + (a.dayType ? 1 : 0);
        const scoreB = (b.timeRange ? 2 : 0) + (b.dayType ? 1 : 0);
        return scoreB - scoreA;
      })[0];
    }

    // progressive料金の選択（apply_after条件と曜日を確認）
    // 複数のprogressive料金がある場合、現在の累積時間に最も適したものを選択
    const progressiveRates = rates.filter(r =>
      r.type === 'progressive' &&
      r.applyAfter !== undefined &&
      filterByDayType(r)
    );

    // 現在の累積時間に最も適したprogressive料金を選択
    // apply_afterが小さい順（早い段階の料金から）にソートして適用
    const sortedProgressiveRates = progressiveRates.sort((a, b) => (a.applyAfter || 0) - (b.applyAfter || 0));

    // 現在のセグメントの終了時間
    const segmentEnd = accumulatedMinutes + segmentMinutes;

    // 適切なprogressive料金を見つける
    // 重要: progressive料金は、セグメントの一部でもapply_afterを超える場合に返す
    // ただし、実際の適用は calculateFee メソッドで行う
    for (const rate of sortedProgressiveRates) {
      // セグメントの終了時点でこのprogressive料金の適用範囲内にある場合
      if (segmentEnd > rate.applyAfter!) {
        // 次のprogressive料金を確認
        const nextRateIndex = sortedProgressiveRates.indexOf(rate) + 1;
        const nextRate = sortedProgressiveRates[nextRateIndex];

        // 次の料金帯が存在しない、または累積時間が次の料金帯に達していない場合
        if (!nextRate || accumulatedMinutes < nextRate.applyAfter!) {
          progressiveRate = rate;
          break;
        }
      }
    }

    // Progressive料金を持つ駐車場の詳細デバッグ
    if (rates.find(r => r.type === 'progressive' && (r.applyAfter === 30 || r.timeRange))) {
      console.log(`  [Progressive料金デバッグ] 累積:${accumulatedMinutes}分, セグメント:${segmentMinutes}分`);
      console.log(`    - 全rates:`, rates.map(r => ({
        type: r.type,
        price: r.price,
        minutes: r.minutes,
        applyAfter: r.applyAfter,
        dayType: r.dayType,
        timeRange: r.timeRange
      })));
      console.log(`    - filterByDayType結果:`, rates.map(r => ({
        type: r.type,
        applyAfter: r.applyAfter,
        dayType: r.dayType,
        timeRange: r.timeRange,
        passed: filterByDayType(r)
      })));
      console.log(`    - progressiveRatesフィルタ後:`, progressiveRates.length, '件');
      console.log(`    - 選択されたprogressiveRate:`, progressiveRate ?
        `${progressiveRate.minutes}分${progressiveRate.price}円 (after:${progressiveRate.applyAfter}, timeRange:${progressiveRate.timeRange})` :
        'なし');
    }

    // デバッグ用：選択された料金を確認
    if (rates.some(r => r.type === 'progressive' || (r.dayType === '土日祝' && r.price === 0))) {
      console.log(`  [適用料金] 曜日:${dayOfWeek}, 累積:${accumulatedMinutes}分, セグメント:${segmentMinutes}分`);
      console.log(`    - segmentEnd: ${accumulatedMinutes + segmentMinutes}分`);
      console.log(`    - 利用可能なprogressive料金:`, sortedProgressiveRates.map(r => `after=${r.applyAfter}, price=${r.price}`));
      console.log(`    - baseRate:`, baseRate ? `${baseRate.minutes}分${baseRate.price}円` : 'なし');
      console.log(`    - progressiveRate:`, progressiveRate ? `${progressiveRate.minutes}分${progressiveRate.price}円 (after:${progressiveRate.applyAfter})` : 'なし');
    }

    // max料金の選択（曜日を考慮）
    const maxRates = rates.filter(r => r.type === 'max' && filterByDayType(r));
    if (maxRates.length > 0) {
      // 時間帯指定のmax料金を優先
      const timeSpecificMax = maxRates.filter(r => r.timeRange);
      if (timeSpecificMax.length > 0) {
        maxRate = timeSpecificMax[0];
      } else {
        maxRate = maxRates[0];
      }
    }

    return { baseRate, progressiveRate, maxRate };
  }

  /**
   * 駐車時間を時間帯別セグメントに分割
   */
  private static splitIntoTimeSegments(
    rates: ParkingRate[],
    startTime: Date,
    endTime: Date
  ): TimeSegment[] {
    const segments: TimeSegment[] = [];
    let currentTime = new Date(startTime);
    let totalElapsedMinutes = 0;

    // 時間帯別料金が定義されているか確認
    const hasTimeRanges = rates.some(r => r.timeRange);

    if (!hasTimeRanges) {
      // 時間帯別料金がない場合は全期間を1セグメントとして処理
      segments.push({
        start: new Date(startTime),
        end: new Date(endTime),
        rates: rates,
        totalElapsedMinutes: 0
      });
      return segments;
    }

    while (currentTime < endTime) {
      // 現在時刻に適用される料金を取得
      const applicableRates = this.getRatesForTime(rates, currentTime);

      // 次の料金切り替わり時刻を取得
      const nextSwitchTime = this.getNextRateSwitchTime(rates, currentTime, endTime);

      const segmentEnd = new Date(Math.min(nextSwitchTime.getTime(), endTime.getTime()));
      const segmentMinutes = Math.round(
        (segmentEnd.getTime() - currentTime.getTime()) / 60000
      );

      segments.push({
        start: new Date(currentTime),
        end: segmentEnd,
        rates: applicableRates,
        totalElapsedMinutes
      });

      totalElapsedMinutes += segmentMinutes;
      currentTime = nextSwitchTime;

      // 無限ループ防止
      if (currentTime >= endTime) break;
    }

    return segments;
  }

  /**
   * 指定時刻に適用される料金を取得
   */
  private static getRatesForTime(rates: ParkingRate[], time: Date): ParkingRate[] {
    const hour = time.getHours();
    const minute = time.getMinutes();
    const dayOfWeek = this.getDayOfWeek(time);

    const applicableRates: ParkingRate[] = [];

    for (const rate of rates) {
      // 曜日チェック
      if (rate.dayType) {
        const isWeekend = dayOfWeek === '土' || dayOfWeek === '日';
        const isHoliday = false; // 祝日判定は別途実装が必要

        // 正規化ルールに従った曜日判定
        if (rate.dayType === '月～金' && (isWeekend || isHoliday)) continue;
        if (rate.dayType === '平日' && (isWeekend || isHoliday)) continue;
        if (rate.dayType === '土日祝' && !isWeekend && !isHoliday) continue;
        if (rate.dayType === '土' && dayOfWeek !== '土') continue;
        if (rate.dayType === '日祝' && dayOfWeek !== '日' && !isHoliday) continue;
        if (rate.dayType === '土日' && !isWeekend) continue;
      }

      // 時間帯チェック
      if (rate.timeRange) {
        const timeMatch = rate.timeRange.match(/(\d{1,2}):(\d{2})[～〜~\-](\d{1,2}):(\d{2})/);
        if (!timeMatch) {
          // 時間帯指定がない場合はデフォルト料金として追加
          applicableRates.push(rate);
          continue;
        }

        const rangeStartHour = parseInt(timeMatch[1]);
        const rangeStartMinute = parseInt(timeMatch[2]);
        const rangeEndHour = parseInt(timeMatch[3]);
        const rangeEndMinute = parseInt(timeMatch[4]);

        // 時間帯チェック（日またぎ対応）
        const currentMinutes = hour * 60 + minute;
        const rangeStartMinutes = rangeStartHour * 60 + rangeStartMinute;
        const rangeEndMinutes = rangeEndHour * 60 + rangeEndMinute;

        let isInRange = false;
        if (rangeEndMinutes <= rangeStartMinutes) {
          // 日またぎの場合（例：20:00～8:00）
          isInRange = currentMinutes >= rangeStartMinutes || currentMinutes < rangeEndMinutes;
        } else {
          // 通常の時間帯（例：8:00～20:00）
          isInRange = currentMinutes >= rangeStartMinutes && currentMinutes < rangeEndMinutes;
        }

        if (isInRange) {
          applicableRates.push(rate);
        }
      } else {
        // 時間帯指定がない場合はデフォルト料金として追加
        applicableRates.push(rate);
      }
    }

    // 時間帯指定料金しかなく、現在時刻に適用できる料金がない場合
    // 時間帯に関係なく全ての料金を返す（ユーザー体験を優先）
    if (applicableRates.length === 0 && rates.some(r => r.timeRange || r.dayType)) {
      console.warn(`⚠️ 現在時刻に適用できる料金がないため、時間帯を無視して全料金を適用します`);
      // 時間帯指定を無視して、曜日だけをチェックして返す
      for (const rate of rates) {
        // 曜日チェックのみ
        if (rate.dayType) {
          const isWeekend = dayOfWeek === '土' || dayOfWeek === '日';
          const isHoliday = false;

          if (rate.dayType === '月～金' && (isWeekend || isHoliday)) continue;
          if (rate.dayType === '平日' && (isWeekend || isHoliday)) continue;
          if (rate.dayType === '土日祝' && !isWeekend && !isHoliday) continue;
          if (rate.dayType === '土' && dayOfWeek !== '土') continue;
          if (rate.dayType === '日祝' && dayOfWeek !== '日' && !isHoliday) continue;
          if (rate.dayType === '土日' && !isWeekend) continue;
        }

        applicableRates.push(rate);
      }
    }

    return applicableRates;
  }

  /**
   * 次の料金切り替わり時刻を取得
   */
  private static getNextRateSwitchTime(
    rates: ParkingRate[],
    currentTime: Date,
    endTime: Date
  ): Date {
    const switchTimes: Date[] = [];
    const currentHour = currentTime.getHours();
    const currentMinute = currentTime.getMinutes();

    // 各料金の開始・終了時刻を収集
    for (const rate of rates) {
      if (!rate.timeRange) continue;

      const timeMatch = rate.timeRange.match(/(\d{1,2}):(\d{2})[～〜~\-](\d{1,2}):(\d{2})/);
      if (!timeMatch) continue;

      const startHour = parseInt(timeMatch[1]);
      const startMinute = parseInt(timeMatch[2]);
      const endHour = parseInt(timeMatch[3]);
      const endMinute = parseInt(timeMatch[4]);

      // 今日の切り替わり時刻を計算
      const todayStart = new Date(currentTime);
      todayStart.setHours(startHour, startMinute, 0, 0);

      const todayEnd = new Date(currentTime);
      todayEnd.setHours(endHour, endMinute, 0, 0);

      // 日またぎの場合の調整
      if (endHour < startHour || (endHour === startHour && endMinute < startMinute)) {
        if (currentHour >= startHour || (currentHour === startHour && currentMinute >= startMinute)) {
          // 現在が夜間帯の場合、終了時刻は翌日
          todayEnd.setDate(todayEnd.getDate() + 1);
        } else {
          // 現在が早朝の場合、開始時刻は前日
          todayStart.setDate(todayStart.getDate() - 1);
        }
      }

      // 未来の切り替わり時刻のみ追加
      if (todayStart > currentTime) switchTimes.push(todayStart);
      if (todayEnd > currentTime) switchTimes.push(todayEnd);

      // 翌日の切り替わり時刻も考慮
      const tomorrowStart = new Date(todayStart);
      tomorrowStart.setDate(tomorrowStart.getDate() + 1);
      if (tomorrowStart <= endTime) switchTimes.push(tomorrowStart);
    }

    // 最も近い切り替わり時刻を返す
    if (switchTimes.length === 0) return endTime;

    switchTimes.sort((a, b) => a.getTime() - b.getTime());
    return switchTimes[0] <= endTime ? switchTimes[0] : endTime;
  }

  /**
   * 曜日を取得
   */
  private static getDayOfWeek(date: Date): string {
    const days = ['日', '月', '火', '水', '木', '金', '土'];
    return days[date.getDay()];
  }

  /**
   * 駐車場が指定期間中ずっと営業しているかチェック
   */
  static isParkingOpenForEntireDuration(
    parking: CoinParking,
    duration: ParkingDuration
  ): boolean {
    try {
      const start = duration.startDate;
      const end = duration.endDate;

      // 無効な期間は通す
      if (!(start instanceof Date) || !(end instanceof Date) || start >= end) return true;

      const h: any = parking.hours || (parking as any).Hours || null;

      // 24時間営業フラグがあれば通す
      if (h && (h.is_24h === true || h.is24h === true || h.access_24h === true)) return true;

      // 営業時間の時間帯を抽出（日次の時間帯配列）
      const ranges = this.parseOpenTimeRanges(h);
      if (!ranges || ranges.length === 0) {
        // データがなければ除外しない（不明扱い）
        return true;
      }

      // 期間が完全に営業時間内かを確認
      return this.isIntervalFullyOpen(start, end, ranges);
    } catch (e) {
      // 解析に失敗した場合は除外しない（安全側）
      return true;
    }
  }

  // 営業時間の文字列/構造から、1日の開店時間帯(minute-of-day)配列を抽出
  private static parseOpenTimeRanges(hours: any): Array<{ start: number; end: number }> {
    const out: Array<{ start: number; end: number }> = [];
    if (!hours) return out;

    const pushRange = (sMin: number, eMin: number) => {
      const norm = (n: number) => Math.max(0, Math.min(1440, n));
      let s = norm(sMin);
      let e = norm(eMin);
      if (isNaN(s) || isNaN(e)) return;
      if (s === e) {
        // 24h のような場合（同値）→全日扱い
        out.push({ start: 0, end: 1440 });
        return;
      }
      if (e > s) {
        out.push({ start: s, end: e });
      } else {
        // 日またぎ 22:00～8:00 → [22:00,24:00)、[0:00,8:00)
        out.push({ start: s, end: 1440 });
        out.push({ start: 0, end: e });
      }
    };

    const parseStr = (str: string) => {
      if (!str) return;
      // 複数区切りに対応
      const parts = String(str).split(/[、,\/\n]|・|＆|＆|\s+/).filter(Boolean);
      const regex = /(\d{1,2})[:：](\d{2})\s*[～〜\-]\s*(\d{1,2})[:：](\d{2})/;
      for (const p of parts) {
        const m = p.match(regex);
        if (m) {
          const sh = parseInt(m[1]);
          const sm = parseInt(m[2]);
          const eh = parseInt(m[3]);
          const em = parseInt(m[4]);
          pushRange(sh * 60 + sm, eh * 60 + em);
        }
      }
    };

    if (typeof hours === 'string') {
      parseStr(hours);
      return out;
    }
    if (hours?.text) parseStr(hours.text);
    if (hours?.hours && typeof hours.hours === 'string') parseStr(hours.hours);
    if (Array.isArray(hours?.schedules)) {
      for (const sch of hours.schedules) {
        if (sch && typeof sch.time === 'string') parseStr(sch.time);
      }
    }

    return out;
  }

  // 指定期間が毎日の営業時間帯に完全に含まれているか
  private static isIntervalFullyOpen(start: Date, end: Date, ranges: Array<{ start: number; end: number }>): boolean {
    let cur = new Date(start);
    while (cur < end) {
      const dayStart = new Date(cur);
      dayStart.setHours(0, 0, 0, 0);
      const nextDay = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
      const segEnd = end < nextDay ? end : nextDay;

      const a = (cur.getHours() * 60 + cur.getMinutes());
      const b = (segEnd.getHours() * 60 + segEnd.getMinutes());

      // 当日内の[a,b]区間が、いずれかの営業時間帯に完全に含まれている必要がある
      let covered = false;
      for (const r of ranges) {
        if (a >= r.start && b <= r.end) { covered = true; break; }
      }
      if (!covered) return false;

      cur = segEnd;
    }
    return true;
  }

  /**
   * 料金情報を文字列でフォーマット
   */
  static formatFeeInfo(parking: CoinParking): string {
    if (!parking.rates || parking.rates.length === 0) {
      return '料金情報なし';
    }

    // データベースのsnake_caseをcamelCaseに変換
    const normalizedRates = parking.rates.map(rate => ({
      ...rate,
      applyAfter: rate.applyAfter ?? (rate as any).apply_after ?? rate.applyAfter,
      dayType: rate.dayType ?? (rate as any).day_type ?? rate.dayType,
      timeRange: rate.timeRange ?? (rate as any).time_range ?? rate.timeRange,
    }));

    const baseRates = normalizedRates.filter(r => r.type === 'base');
    const progressiveRates = normalizedRates.filter(r => r.type === 'progressive');
    const maxRates = normalizedRates.filter(r => r.type === 'max');

    let info = '';

    // 時間帯別にグループ化
    const timeRanges = [...new Set(normalizedRates.filter(r => r.timeRange).map(r => r.timeRange))];

    if (timeRanges.length > 0) {
      // 時間帯別料金がある場合
      const timeRangeInfos: string[] = [];

      for (const timeRange of timeRanges) {
        const rangeRates = normalizedRates.filter(r => r.timeRange === timeRange);
        const baseRate = rangeRates.find(r => r.type === 'base');
        const progressiveRate = rangeRates.find(r => r.type === 'progressive');

        if (progressiveRate && progressiveRate.applyAfter === 30 && baseRate && baseRate.price === 0) {
          // 30分未満無料、30分以降の料金表示（original_feesの形式に合わせる）
          timeRangeInfos.push(`${timeRange} 30分未満無料､30分以降入庫から${progressiveRate.minutes}分毎¥${progressiveRate.price}`);
        } else if (progressiveRate && baseRate && baseRate.price === 0) {
          // その他のprogressive料金パターン
          timeRangeInfos.push(`${timeRange} ${progressiveRate.applyAfter}分未満無料､${progressiveRate.applyAfter}分以降${progressiveRate.minutes}分毎¥${progressiveRate.price}`);
        } else if (baseRate && baseRate.price > 0) {
          timeRangeInfos.push(`${timeRange} ${baseRate.minutes}分毎¥${baseRate.price}`);
        } else if (baseRate && baseRate.price === 0 && !progressiveRate) {
          // progressive料金が本当にない場合のみ0円表示
          timeRangeInfos.push(`${timeRange} ${baseRate.minutes}分毎¥0`);
        }
      }

      info = timeRangeInfos.join('\n');
    } else {
      // 時間帯指定なしの通常料金
      const displayBaseRate = baseRates.find(r => r.price > 0) || baseRates[0];

      if (progressiveRates.length > 0) {
        const firstProgressive = progressiveRates.sort((a, b) => (a.applyAfter || 0) - (b.applyAfter || 0))[0];

        // 基本料金が無料でprogressive料金がある場合
        if ((!displayBaseRate || displayBaseRate.price === 0) && firstProgressive) {
          if (firstProgressive.applyAfter === 30) {
            if (progressiveRates.length > 1 && progressiveRates[1].applyAfter === 60) {
              info = `30分～60分 ¥${firstProgressive.price} / 60分以降 ${progressiveRates[1].minutes}分毎 ¥${progressiveRates[1].price}`;
            } else {
              info = `最初の30分無料 / 30分以降 ${firstProgressive.minutes}分毎 ¥${firstProgressive.price}`;
            }
          } else if (firstProgressive.applyAfter === 60) {
            // 60分無料の場合の表示を改善
            info = `最初の60分無料 / 60分以降 ${firstProgressive.minutes}分毎 ¥${firstProgressive.price}`;
          } else {
            info = `最初の${firstProgressive.applyAfter}分無料 / ${firstProgressive.applyAfter}分以降 ${firstProgressive.minutes}分毎 ¥${firstProgressive.price}`;
          }
        } else if (displayBaseRate) {
          // 通常の基本料金
          if (displayBaseRate.price === 0 && firstProgressive && firstProgressive.applyAfter) {
            // base料金が0円でprogressive料金がある場合
            info = `最初の${firstProgressive.applyAfter}分無料 / ${firstProgressive.applyAfter}分以降 ${firstProgressive.minutes}分毎 ¥${firstProgressive.price}`;
          } else if (displayBaseRate.minutes < 60) {
            info = `${displayBaseRate.minutes}分毎 ¥${displayBaseRate.price}`;
          } else if (displayBaseRate.minutes === 60) {
            info = `1時間 ¥${displayBaseRate.price}`;
          } else {
            const hours = displayBaseRate.minutes / 60;
            if (Number.isInteger(hours)) {
              info = `${hours}時間 ¥${displayBaseRate.price}`;
            } else {
              info = `${displayBaseRate.minutes}分 ¥${displayBaseRate.price}`;
            }
          }

          // progressive料金も追加表示（base料金が0円でない場合のみ）
          if (firstProgressive && displayBaseRate.price > 0) {
            info += `\n${firstProgressive.applyAfter}分以降: ${firstProgressive.minutes}分毎 ¥${firstProgressive.price}`;
          }
        }
      } else if (displayBaseRate) {
        // progressive料金なしの場合
        // 基本料金が0円の場合は表示しない（無料期間として扱う）
        if (displayBaseRate.price === 0) {
          info = `最初の${displayBaseRate.minutes}分無料`;
        } else if (displayBaseRate.minutes < 60) {
          info = `${displayBaseRate.minutes}分毎 ¥${displayBaseRate.price}`;
        } else if (displayBaseRate.minutes === 60) {
          info = `1時間 ¥${displayBaseRate.price}`;
        } else {
          const hours = displayBaseRate.minutes / 60;
          if (Number.isInteger(hours)) {
            info = `${hours}時間 ¥${displayBaseRate.price}`;
          } else {
            info = `${displayBaseRate.minutes}分 ¥${displayBaseRate.price}`;
          }
        }
      }
    }

    // 最大料金の表示
    if (maxRates.length > 0) {
      const firstMax = maxRates[0];
      if (info) info += '\n';
      if (firstMax.minutes === 0 || firstMax.minutes === 1440) {
        info += `最大料金 ¥${firstMax.price}`;
      } else {
        const hours = firstMax.minutes / 60;
        info += `最大料金 (${hours}時間) ¥${firstMax.price}`;
      }
    }

    return info || '料金情報なし';
  }
}
