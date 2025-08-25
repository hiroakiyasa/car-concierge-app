import { CoinParking, ParkingRate, ParkingDuration } from '@/types';

export class ParkingFeeCalculator {
  /**
   * 駐車料金を計算
   */
  static calculateFee(parking: CoinParking, duration: ParkingDuration): number {
    if (!parking.rates || parking.rates.length === 0) {
      return 0;
    }

    const durationInMinutes = duration.durationInMinutes;
    const startTime = duration.startDate;
    const endTime = duration.endDate;

    // 料金レートを時間帯別に分類
    const rates = this.applyTimeBasedRates(parking.rates, startTime);
    
    // 基本料金を取得
    const baseRate = rates.find(r => r.type === 'base');
    const maxRate = rates.find(r => r.type === 'max');
    const conditionalFreeRate = rates.find(r => r.type === 'conditional_free');

    // 条件付き無料の判定
    if (conditionalFreeRate && durationInMinutes <= conditionalFreeRate.minutes) {
      return 0;
    }

    let totalFee = 0;

    if (baseRate) {
      // 基本料金で計算
      const units = Math.ceil(durationInMinutes / baseRate.minutes);
      totalFee = units * baseRate.price;
    }

    // 最大料金の適用
    if (maxRate && totalFee > maxRate.price) {
      // 最大料金の時間制限を確認
      if (maxRate.minutes === 0 || durationInMinutes <= maxRate.minutes) {
        totalFee = maxRate.price;
      } else {
        // 最大料金の時間を超えた場合、追加料金を計算
        const remainingMinutes = durationInMinutes - maxRate.minutes;
        if (baseRate) {
          const additionalUnits = Math.ceil(remainingMinutes / baseRate.minutes);
          totalFee = maxRate.price + (additionalUnits * baseRate.price);
        }
      }
    }

    return totalFee;
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
   * 時間帯別料金を適用
   */
  private static applyTimeBasedRates(
    rates: ParkingRate[],
    startTime: Date
  ): ParkingRate[] {
    const hour = startTime.getHours();
    const dayOfWeek = this.getDayOfWeek(startTime);

    // 時間帯別の料金を探す
    const timeBasedRates = rates.filter(r => {
      if (!r.timeRange) return false;
      
      const timeMatch = r.timeRange.match(/(\d{1,2}):(\d{2})[～〜~-](\d{1,2}):(\d{2})/);
      if (!timeMatch) return false;

      const rangeStartHour = parseInt(timeMatch[1]);
      const rangeEndHour = parseInt(timeMatch[3]);

      // 曜日チェック
      if (r.dayType) {
        if (r.dayType === '平日' && (dayOfWeek === '土' || dayOfWeek === '日')) {
          return false;
        }
        if (r.dayType === '土日祝' && !(dayOfWeek === '土' || dayOfWeek === '日')) {
          return false;
        }
      }

      // 時間帯チェック
      return hour >= rangeStartHour && hour < rangeEndHour;
    });

    // 時間帯別料金が見つかった場合はそれを優先
    if (timeBasedRates.length > 0) {
      return timeBasedRates;
    }

    // デフォルトの料金を返す
    return rates.filter(r => !r.timeRange);
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