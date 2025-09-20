import { CoinParking, ParkingRate, ParkingDuration } from '@/types';

interface TimeSegment {
  start: Date;
  end: Date;
  minutes: number;
}

interface RateApplication {
  rate: ParkingRate;
  minutes: number;
  fee: number;
}

export class ParkingFeeCalculatorV2 {
  /**
   * メインの料金計算関数
   */
  static calculateFee(parking: CoinParking, duration: ParkingDuration): number {
    if (!parking.rates || parking.rates.length === 0) {
      return -1;
    }

    const baseRates = parking.rates.filter(r => r.type === 'base');
    const maxRates = parking.rates.filter(r => r.type === 'max');

    if (baseRates.length === 0) {
      const maxRate = maxRates.find(r => r.price !== undefined);
      if (maxRate) {
        return maxRate.price === 0 ? 0 : maxRate.price;
      }
      return -1;
    }

    const totalMinutes = duration.durationInMinutes;

    // 条件付き無料チェック
    const conditionalFree = parking.rates.find(r => r.type === 'conditional_free');
    if (conditionalFree && totalMinutes <= conditionalFree.minutes) {
      return -1;
    }

    // 料金計算の実行
    return this.calculateTotalFee(parking, duration);
  }

  /**
   * 総料金計算
   */
  private static calculateTotalFee(parking: CoinParking, duration: ParkingDuration): number {
    const totalMinutes = duration.durationInMinutes;
    const startTime = duration.startDate;
    const endTime = duration.endDate;

    // 時間制限付き最大料金があるかチェック
    const limitedMaxRates = parking.rates.filter(r =>
      r.type === 'max' &&
      r.minutes > 0 &&
      r.minutes < 1440 &&
      !r.timeRange
    ).sort((a, b) => a.minutes - b.minutes);

    if (limitedMaxRates.length > 0) {
      const shortestMax = limitedMaxRates[0];

      // 最短の制限時間を超える場合、その時間で分割
      if (totalMinutes > shortestMax.minutes) {
        return this.calculateWithLimitedMax(parking, duration, shortestMax);
      }
    }

    // 24時間最大料金の処理
    const dailyMax = parking.rates.find(r =>
      r.type === 'max' &&
      r.minutes === 1440 &&
      !r.timeRange &&
      !r.dayType
    );

    if (dailyMax && totalMinutes > 1440) {
      return this.calculateWithDailyMax(parking, duration, dailyMax);
    }

    // 通常の計算
    return this.calculatePeriodFee(parking, startTime, endTime);
  }

  /**
   * 時間制限付き最大料金での計算
   */
  private static calculateWithLimitedMax(
    parking: CoinParking,
    duration: ParkingDuration,
    limitedMax: ParkingRate
  ): number {
    let totalFee = 0;
    let currentTime = new Date(duration.startDate);
    const endTime = duration.endDate;

    while (currentTime < endTime) {
      const periodEnd = new Date(Math.min(
        currentTime.getTime() + limitedMax.minutes * 60000,
        endTime.getTime()
      ));

      const periodFee = this.calculatePeriodFee(parking, currentTime, periodEnd);

      // この期間の最大料金を適用
      totalFee += Math.min(periodFee, limitedMax.price);

      currentTime = new Date(currentTime.getTime() + limitedMax.minutes * 60000);
    }

    return totalFee;
  }

  /**
   * 24時間最大料金での計算
   */
  private static calculateWithDailyMax(
    parking: CoinParking,
    duration: ParkingDuration,
    dailyMax: ParkingRate
  ): number {
    const totalMinutes = duration.durationInMinutes;
    const fullDays = Math.floor(totalMinutes / 1440);
    const remainingMinutes = totalMinutes % 1440;

    let totalFee = fullDays * dailyMax.price;

    if (remainingMinutes > 0) {
      const remainingStart = new Date(
        duration.startDate.getTime() + fullDays * 24 * 60 * 60000
      );
      const remainingEnd = duration.endDate;

      const remainingFee = this.calculatePeriodFee(parking, remainingStart, remainingEnd);
      totalFee += Math.min(remainingFee, dailyMax.price);
    }

    return totalFee;
  }

  /**
   * 期間の料金計算（時間帯・曜日考慮）
   */
  private static calculatePeriodFee(
    parking: CoinParking,
    startTime: Date,
    endTime: Date
  ): number {
    const segments = this.splitIntoSegments(startTime, endTime);
    let totalFee = 0;

    for (const segment of segments) {
      const segmentFee = this.calculateSegmentFee(parking, segment);
      totalFee += segmentFee;
    }

    // 期間全体の最大料金チェック
    const totalMinutes = Math.round((endTime.getTime() - startTime.getTime()) / 60000);
    const periodMax = this.findApplicableMaxRate(parking.rates, startTime, totalMinutes);

    if (periodMax && totalFee > periodMax.price) {
      totalFee = periodMax.price;
    }

    return totalFee;
  }

  /**
   * 時間帯ごとのセグメント分割
   */
  private static splitIntoSegments(startTime: Date, endTime: Date): TimeSegment[] {
    const segments: TimeSegment[] = [];
    let current = new Date(startTime);

    while (current < endTime) {
      // 次の時間帯切り替わりを取得
      const nextSwitch = this.getNextTimeSwitch(current, endTime);

      segments.push({
        start: new Date(current),
        end: new Date(nextSwitch),
        minutes: Math.round((nextSwitch.getTime() - current.getTime()) / 60000)
      });

      current = nextSwitch;
    }

    return segments;
  }

  /**
   * 次の時間帯切り替わり時刻を取得
   */
  private static getNextTimeSwitch(current: Date, endTime: Date): Date {
    const switches = [
      this.getNextHourBoundary(current, 8),   // 8:00
      this.getNextHourBoundary(current, 18),  // 18:00
      this.getNextHourBoundary(current, 20),  // 20:00
      this.getNextHourBoundary(current, 0),   // 0:00 (日付変更)
      this.getNextHourBoundary(current, 10),  // 10:00
      this.getNextHourBoundary(current, 16),  // 16:00
    ].filter(d => d > current && d <= endTime);

    if (switches.length === 0) return endTime;

    return switches.sort((a, b) => a.getTime() - b.getTime())[0];
  }

  /**
   * 次の指定時刻を取得
   */
  private static getNextHourBoundary(current: Date, targetHour: number): Date {
    const next = new Date(current);
    next.setHours(targetHour, 0, 0, 0);

    if (next <= current) {
      next.setDate(next.getDate() + 1);
    }

    return next;
  }

  /**
   * セグメントの料金計算
   */
  private static calculateSegmentFee(parking: CoinParking, segment: TimeSegment): number {
    const rates = this.getApplicableRates(parking.rates, segment.start);

    if (!rates.baseRate) return 0;

    // 初回割引（applyAfter）の処理
    if (rates.baseRate.applyAfter !== undefined) {
      const startHour = segment.start.getHours();
      const endHour = segment.end.getHours();

      // 時間帯指定の初回割引をチェック
      if (rates.baseRate.timeRange) {
        const timeMatch = rates.baseRate.timeRange.match(/(\d{1,2}):(\d{2})[～〜~\-](\d{1,2}):(\d{2})/);
        if (timeMatch) {
          const rangeStart = parseInt(timeMatch[1]);
          const rangeEnd = parseInt(timeMatch[3]);

          // 指定時間帯内の場合のみ適用
          if (startHour >= rangeStart && endHour <= rangeEnd) {
            if (segment.minutes <= rates.baseRate.applyAfter) {
              return rates.baseRate.price; // 初回割引適用
            }
          }
        }
      }
    }

    // 通常料金計算
    let fee = 0;
    if (rates.baseRate.minutes > 0) {
      const units = Math.ceil(segment.minutes / rates.baseRate.minutes);
      fee = units * rates.baseRate.price;
    }

    // セグメント内の最大料金適用
    if (rates.maxRate) {
      if (rates.maxRate.timeRange) {
        // 時間帯指定の最大料金
        fee = Math.min(fee, rates.maxRate.price);
      } else if (rates.maxRate.minutes > 0 && segment.minutes <= rates.maxRate.minutes) {
        // 時間制限付き最大料金
        fee = Math.min(fee, rates.maxRate.price);
      }
    }

    return fee;
  }

  /**
   * 適用可能な料金を取得
   */
  private static getApplicableRates(
    rates: ParkingRate[],
    time: Date
  ): { baseRate?: ParkingRate; maxRate?: ParkingRate } {
    const dayOfWeek = this.getDayOfWeek(time);
    const hour = time.getHours();
    const minute = time.getMinutes();

    let baseRate: ParkingRate | undefined;
    let maxRate: ParkingRate | undefined;

    // 全ての料金をチェック
    for (const rate of rates) {
      // 曜日チェック
      if (rate.dayType) {
        const isWeekend = dayOfWeek === '土' || dayOfWeek === '日';
        if (rate.dayType === '平日' && isWeekend) continue;
        if (rate.dayType === '土日祝' && !isWeekend) continue;
      }

      // 時間帯チェック
      if (rate.timeRange) {
        if (!this.isInTimeRange(hour, minute, rate.timeRange)) continue;
      }

      // 料金タイプごとに処理
      if (rate.type === 'base') {
        if (!baseRate || this.isMoreSpecific(rate, baseRate)) {
          baseRate = rate;
        }
      } else if (rate.type === 'max') {
        if (!maxRate || this.isMoreSpecific(rate, maxRate)) {
          maxRate = rate;
        }
      }
    }

    // デフォルト料金を取得
    if (!baseRate) {
      baseRate = rates.find(r => r.type === 'base' && !r.timeRange && !r.dayType);
    }
    if (!maxRate) {
      maxRate = rates.find(r => r.type === 'max' && !r.timeRange && !r.dayType);
    }

    return { baseRate, maxRate };
  }

  /**
   * 適用可能な最大料金を探す
   */
  private static findApplicableMaxRate(
    rates: ParkingRate[],
    startTime: Date,
    durationMinutes: number
  ): ParkingRate | undefined {
    const dayOfWeek = this.getDayOfWeek(startTime);
    const isWeekend = dayOfWeek === '土' || dayOfWeek === '日';

    return rates
      .filter(r => {
        if (r.type !== 'max') return false;

        // 曜日チェック
        if (r.dayType === '平日' && isWeekend) return false;
        if (r.dayType === '土日祝' && !isWeekend) return false;

        // 時間制限チェック
        if (r.minutes > 0 && r.minutes < durationMinutes) return false;

        return true;
      })
      .sort((a, b) => {
        // より具体的な条件を優先
        const scoreA = (a.dayType ? 1 : 0) + (a.timeRange ? 2 : 0);
        const scoreB = (b.dayType ? 1 : 0) + (b.timeRange ? 2 : 0);
        if (scoreA !== scoreB) return scoreB - scoreA;

        // 料金が安い方を優先
        return a.price - b.price;
      })[0];
  }

  /**
   * より具体的な料金設定かチェック
   */
  private static isMoreSpecific(rate1: ParkingRate, rate2: ParkingRate): boolean {
    const score1 = (rate1.timeRange ? 2 : 0) + (rate1.dayType ? 1 : 0);
    const score2 = (rate2.timeRange ? 2 : 0) + (rate2.dayType ? 1 : 0);
    return score1 > score2;
  }

  /**
   * 時間帯に含まれるかチェック
   */
  private static isInTimeRange(hour: number, minute: number, timeRange: string): boolean {
    const match = timeRange.match(/(\d{1,2}):(\d{2})[～〜~\-](\d{1,2}):(\d{2})/);
    if (!match) return false;

    const startHour = parseInt(match[1]);
    const startMinute = parseInt(match[2]);
    const endHour = parseInt(match[3]);
    const endMinute = parseInt(match[4]);

    const currentMinutes = hour * 60 + minute;
    const rangeStart = startHour * 60 + startMinute;
    const rangeEnd = endHour * 60 + endMinute;

    if (rangeEnd < rangeStart) {
      // 日またぎ
      return currentMinutes >= rangeStart || currentMinutes < rangeEnd;
    } else {
      return currentMinutes >= rangeStart && currentMinutes < rangeEnd;
    }
  }

  /**
   * 曜日を取得
   */
  private static getDayOfWeek(date: Date): string {
    const days = ['日', '月', '火', '水', '木', '金', '土'];
    return days[date.getDay()];
  }
}