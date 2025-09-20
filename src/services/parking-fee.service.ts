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

    // 料金データのバリデーション
    const baseRates = parking.rates.filter(r => r.type === 'base');
    const progressiveRates = parking.rates.filter(r => r.type === 'progressive');
    const maxRates = parking.rates.filter(r => r.type === 'max');

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

    // 駐車時間を時間帯別セグメントに分割
    const segments = this.splitIntoTimeSegments(parking.rates, startTime, endTime);

    // 各セグメントの料金を計算
    let totalFee = 0;
    let accumulatedMinutes = 0;
    let timeRangeFees: Map<string, number> = new Map(); // 時間帯別の累積料金

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
      const progressiveRate = applicableRates.progressiveRate;
      const maxRate = applicableRates.maxRate;

      let segmentFee = 0;

      // progressive料金の処理（初回料金後の追加料金）
      if (progressiveRate && progressiveRate.applyAfter !== undefined) {
        // apply_after時間を超えている部分だけprogressive料金を適用
        if (accumulatedMinutes >= progressiveRate.applyAfter) {
          // すべてprogressive料金
          const units = Math.ceil(segmentMinutes / progressiveRate.minutes);
          segmentFee = units * progressiveRate.price;
        } else if (accumulatedMinutes + segmentMinutes > progressiveRate.applyAfter) {
          // 一部がprogressive料金
          const baseMinutes = progressiveRate.applyAfter - accumulatedMinutes;
          const progressiveMinutes = segmentMinutes - baseMinutes;

          // 初回料金部分
          if (baseRate) {
            const baseUnits = Math.ceil(baseMinutes / baseRate.minutes);
            segmentFee += baseUnits * baseRate.price;
          }

          // progressive料金部分
          const progressiveUnits = Math.ceil(progressiveMinutes / progressiveRate.minutes);
          segmentFee += progressiveUnits * progressiveRate.price;
        } else {
          // まだ初回料金期間内
          if (baseRate) {
            const units = Math.ceil(segmentMinutes / baseRate.minutes);
            segmentFee = units * baseRate.price;
          }
        }
      } else if (baseRate) {
        // 通常の基本料金で計算
        const units = Math.ceil(segmentMinutes / baseRate.minutes);
        segmentFee = units * baseRate.price;

        // 分刻み料金のデバッグログ
        if (baseRate.minutes <= 30) {
          console.log(`💰 分刻み料金計算: ${segmentMinutes}分 ÷ ${baseRate.minutes}分 = ${units}単位 × ${baseRate.price}円 = ${segmentFee}円`);
        }
      } else {
        // baseRateもprogressiveRateもない場合
        // 料金計算不可（時間帯外など）
        console.warn(`⚠️ セグメントに適用可能な料金がありません`);
        return -1; // 料金計算不可を全体に伝播
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
    const overallMaxRates = parking.rates.filter(r =>
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

    // base料金の選択（時間帯と曜日を考慮）
    const baseRates = rates.filter(r => r.type === 'base');
    if (baseRates.length > 0) {
      // より具体的な条件を持つ料金を優先
      baseRate = baseRates.sort((a, b) => {
        const scoreA = (a.timeRange ? 2 : 0) + (a.dayType ? 1 : 0);
        const scoreB = (b.timeRange ? 2 : 0) + (b.dayType ? 1 : 0);
        return scoreB - scoreA;
      })[0];
    }

    // progressive料金の選択（apply_after条件を確認）
    const progressiveRates = rates.filter(r =>
      r.type === 'progressive' &&
      r.applyAfter !== undefined &&
      accumulatedMinutes + segmentMinutes > r.applyAfter
    );
    if (progressiveRates.length > 0) {
      progressiveRate = progressiveRates[0];
    }

    // max料金の選択
    const maxRates = rates.filter(r => r.type === 'max');
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
    // 料金計算不可として扱う（-1を返す原因となる）
    if (applicableRates.length === 0 && rates.some(r => r.timeRange || r.dayType)) {
      console.warn(`⚠️ 現在時刻に適用できる料金がありません`);
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
   * 料金情報を文字列でフォーマット
   */
  static formatFeeInfo(parking: CoinParking): string {
    if (!parking.rates || parking.rates.length === 0) {
      return '料金情報なし';
    }

    const baseRate = parking.rates.find(r => r.type === 'base');
    const progressiveRate = parking.rates.find(r => r.type === 'progressive');
    const maxRate = parking.rates.find(r => r.type === 'max');

    let info = '';

    if (baseRate) {
      // 分刻み料金の表示を適切にフォーマット
      if (baseRate.minutes < 60) {
        info += `${baseRate.minutes}分毎 ${baseRate.price}円`;
      } else if (baseRate.minutes === 60) {
        info += `1時間 ${baseRate.price}円`;
      } else {
        const hours = baseRate.minutes / 60;
        if (Number.isInteger(hours)) {
          info += `${hours}時間 ${baseRate.price}円`;
        } else {
          info += `${baseRate.minutes}分 ${baseRate.price}円`;
        }
      }
    }

    if (progressiveRate) {
      if (info) info += '\n';
      info += `${progressiveRate.applyAfter}分以降: ${progressiveRate.minutes}分 ${progressiveRate.price}円`;
    }

    if (maxRate) {
      if (info) info += '\n';
      if (maxRate.minutes === 0 || maxRate.minutes === 1440) {
        info += `最大料金 ${maxRate.price}円`;
      } else {
        const hours = maxRate.minutes / 60;
        info += `最大料金 (${hours}時間) ${maxRate.price}円`;
      }
    }

    return info || '料金情報なし';
  }
}