import { CoinParking, ParkingRate, ParkingDuration } from '@/types';

interface TimeSegment {
  start: Date;
  end: Date;
  rates: ParkingRate[];
}

export class ParkingFeeCalculator {
  /**
   * 駐車料金を計算（時間帯別料金・夜間最大料金対応版）
   */
  static calculateFee(parking: CoinParking, duration: ParkingDuration): number {
    if (!parking.rates || parking.rates.length === 0) {
      return 0;
    }

    const startTime = duration.startDate;
    const endTime = duration.endDate;
    const durationInMinutes = duration.durationInMinutes;

    // 条件付き無料の判定
    const conditionalFreeRate = parking.rates.find(r => r.type === 'conditional_free');
    if (conditionalFreeRate && durationInMinutes <= conditionalFreeRate.minutes) {
      return 0;
    }

    // 駐車時間を時間帯別セグメントに分割
    const segments = this.splitIntoTimeSegments(parking.rates, startTime, endTime);
    
    // 各セグメントの料金を計算して合計
    let totalFee = 0;
    let remainingMaxTime = 0; // 最大料金の残り適用時間

    for (const segment of segments) {
      const segmentFee = this.calculateSegmentFee(
        segment,
        remainingMaxTime
      );
      totalFee += segmentFee.fee;
      remainingMaxTime = segmentFee.remainingMaxTime;
    }

    return totalFee;
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

    while (currentTime < endTime) {
      // 現在時刻に適用される料金を取得
      const applicableRates = this.getRatesForTime(rates, currentTime);
      
      // 次の料金切り替わり時刻を取得
      const nextSwitchTime = this.getNextRateSwitchTime(rates, currentTime, endTime);
      
      segments.push({
        start: new Date(currentTime),
        end: new Date(Math.min(nextSwitchTime.getTime(), endTime.getTime())),
        rates: applicableRates
      });

      currentTime = nextSwitchTime;
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
      // 時間帯指定がない場合はデフォルト料金として追加
      if (!rate.timeRange) {
        applicableRates.push(rate);
        continue;
      }

      // 時間帯をパース
      const timeMatch = rate.timeRange.match(/(\d{1,2}):(\d{2})[～〜~-](\d{1,2}):(\d{2})/);
      if (!timeMatch) continue;

      const rangeStartHour = parseInt(timeMatch[1]);
      const rangeStartMinute = parseInt(timeMatch[2]);
      const rangeEndHour = parseInt(timeMatch[3]);
      const rangeEndMinute = parseInt(timeMatch[4]);

      // 曜日チェック
      if (rate.dayType) {
        const isWeekend = dayOfWeek === '土' || dayOfWeek === '日';
        if (rate.dayType === '平日' && isWeekend) continue;
        if (rate.dayType === '土日祝' && !isWeekend) continue;
      }

      // 時間帯チェック（日またぎ対応）
      const currentMinutes = hour * 60 + minute;
      const rangeStartMinutes = rangeStartHour * 60 + rangeStartMinute;
      const rangeEndMinutes = rangeEndHour * 60 + rangeEndMinute;

      let isInRange = false;
      if (rangeEndMinutes < rangeStartMinutes) {
        // 日またぎの場合（例：18:00-09:00）
        isInRange = currentMinutes >= rangeStartMinutes || currentMinutes < rangeEndMinutes;
      } else {
        // 通常の時間帯（例：09:00-18:00）
        isInRange = currentMinutes >= rangeStartMinutes && currentMinutes < rangeEndMinutes;
      }

      if (isInRange) {
        applicableRates.push(rate);
      }
    }

    // 時間帯別料金が見つからない場合、デフォルト料金のみを返す
    const hasTimeSpecificRates = applicableRates.some(r => r.timeRange);
    if (hasTimeSpecificRates) {
      // 時間帯指定のない料金を除外
      return applicableRates.filter(r => r.timeRange || r.type === 'conditional_free');
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

      const timeMatch = rate.timeRange.match(/(\d{1,2}):(\d{2})[～〜~-](\d{1,2}):(\d{2})/);
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
      if (endHour < startHour) {
        if (currentHour >= startHour) {
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
   * セグメントの料金を計算
   */
  private static calculateSegmentFee(
    segment: TimeSegment,
    previousRemainingMaxTime: number
  ): { fee: number; remainingMaxTime: number } {
    const durationMinutes = Math.round(
      (segment.end.getTime() - segment.start.getTime()) / (1000 * 60)
    );

    if (durationMinutes === 0) {
      return { fee: 0, remainingMaxTime: 0 };
    }

    const baseRate = segment.rates.find(r => r.type === 'base');
    const maxRate = segment.rates.find(r => r.type === 'max');

    let fee = 0;
    let remainingMaxTime = 0;

    // 前のセグメントの最大料金が継続している場合
    if (previousRemainingMaxTime > 0) {
      const coveredMinutes = Math.min(durationMinutes, previousRemainingMaxTime);
      remainingMaxTime = previousRemainingMaxTime - coveredMinutes;
      
      if (coveredMinutes < durationMinutes) {
        // 最大料金期間を超えた分を計算
        const extraMinutes = durationMinutes - coveredMinutes;
        if (baseRate) {
          const units = Math.ceil(extraMinutes / baseRate.minutes);
          fee = units * baseRate.price;
        }
      }
      
      return { fee, remainingMaxTime };
    }

    // 基本料金で計算
    if (baseRate) {
      const units = Math.ceil(durationMinutes / baseRate.minutes);
      fee = units * baseRate.price;
    }

    // 最大料金の適用
    if (maxRate) {
      if (maxRate.minutes === 0 || maxRate.minutes === 1440) {
        // 24時間最大料金
        if (fee > maxRate.price) {
          fee = maxRate.price;
          remainingMaxTime = maxRate.minutes > 0 ? 
            maxRate.minutes - durationMinutes : 
            1440 - durationMinutes;
        }
      } else if (durationMinutes <= maxRate.minutes) {
        // 時間制限付き最大料金
        if (fee > maxRate.price) {
          fee = maxRate.price;
          remainingMaxTime = maxRate.minutes - durationMinutes;
        }
      } else {
        // 最大料金の時間を超えた場合
        const maxPeriods = Math.floor(durationMinutes / maxRate.minutes);
        const remainingMinutes = durationMinutes % maxRate.minutes;
        
        let periodFee = maxRate.price;
        if (baseRate && remainingMinutes > 0) {
          const remainingUnits = Math.ceil(remainingMinutes / baseRate.minutes);
          const remainingFee = remainingUnits * baseRate.price;
          periodFee = Math.min(maxRate.price, remainingFee);
        }
        
        fee = maxPeriods * maxRate.price + periodFee;
      }
    }

    return { fee, remainingMaxTime: Math.max(0, remainingMaxTime) };
  }

  /**
   * 営業時間内かどうかを判定
   */
  static isParkingOpenForEntireDuration(
    parking: CoinParking,
    duration: ParkingDuration
  ): boolean {
    // 24時間営業の場合は常にtrue
    if (parking.hours?.is24h || parking.hours?.access24h) {
      return true;
    }

    // 営業時間情報がない場合はtrueとする
    if (!parking.hours?.schedules || parking.hours.schedules.length === 0) {
      return true;
    }

    const startTime = duration.startDate;
    const endTime = duration.endDate;

    // 日付をまたぐ場合の処理
    const startDay = this.getDayOfWeek(startTime);
    const endDay = this.getDayOfWeek(endTime);

    // 該当する営業時間を取得
    const schedule = parking.hours.schedules.find(s => 
      s.days?.includes(startDay) || s.days?.includes('毎日')
    );

    if (!schedule || !schedule.time) {
      return true; // 営業時間が不明な場合はtrueとする
    }

    // 営業時間のパース（例: "8:00〜20:00"）
    const timeMatch = schedule.time.match(/(\d{1,2}):(\d{2})[～〜~-](\d{1,2}):(\d{2})/);
    if (!timeMatch) {
      return true;
    }

    const openHour = parseInt(timeMatch[1]);
    const openMinute = parseInt(timeMatch[2]);
    const closeHour = parseInt(timeMatch[3]);
    const closeMinute = parseInt(timeMatch[4]);

    const startHour = startTime.getHours();
    const startMinute = startTime.getMinutes();
    const endHour = endTime.getHours();
    const endMinute = endTime.getMinutes();

    // 開始時刻が営業時間内か
    const startInRange = 
      (startHour > openHour || (startHour === openHour && startMinute >= openMinute)) &&
      (startHour < closeHour || (startHour === closeHour && startMinute <= closeMinute));

    // 終了時刻が営業時間内か
    const endInRange = 
      (endHour > openHour || (endHour === openHour && endMinute >= openMinute)) &&
      (endHour < closeHour || (endHour === closeHour && endMinute <= closeMinute));

    return startInRange && endInRange;
  }

  /**
   * 異常な料金レートを検出して修正
   */
  static detectAndFixAbnormalRates(rates: ParkingRate[]): ParkingRate[] {
    const fixedRates = [...rates];

    // 基本料金が異常に高い場合の修正
    const baseRate = fixedRates.find(r => r.type === 'base');
    if (baseRate && baseRate.price > 10000) {
      baseRate.price = 1000; // 上限を1000円に設定
    }

    // 最大料金が基本料金より低い場合の修正
    const maxRate = fixedRates.find(r => r.type === 'max');
    if (baseRate && maxRate && maxRate.price < baseRate.price) {
      maxRate.price = baseRate.price * 8; // 基本料金の8倍を最大料金とする
    }

    return fixedRates;
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
    const maxRate = parking.rates.find(r => r.type === 'max');

    let info = '';
    
    if (baseRate) {
      info += `${baseRate.minutes}分 ${baseRate.price}円`;
    }
    
    if (maxRate) {
      if (info) info += '\n';
      const hours = maxRate.minutes / 60;
      info += `最大料金 (${hours}時間) ${maxRate.price}円`;
    }

    return info || '料金情報なし';
  }
}