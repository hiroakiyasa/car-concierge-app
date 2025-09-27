/**
 * 駐車場の営業時間をチェックするサービス
 */

export interface ParkingHours {
  is_24h: boolean;
  hours?: string;
  original_hours?: string;
}

export interface TimeRange {
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
  isOvernight: boolean; // 深夜をまたぐ営業時間
}

export class ParkingHoursService {
  /**
   * 営業時間文字列を解析してTimeRangeオブジェクトに変換
   */
  private static parseTimeRange(hoursString: string): TimeRange | null {
    try {
      // 24時間営業のパターン
      if (hoursString.includes('24時間') || hoursString.includes('24h')) {
        return {
          startHour: 0,
          startMinute: 0,
          endHour: 24,
          endMinute: 0,
          isOvernight: false
        };
      }

      // 一般的な時間範囲パターン: "8:00～22:00", "08:00-22:00", "8時～22時"
      const timePattern = /(\d{1,2})[:時](\d{0,2})[分]?\s*[~～\-－]\s*(\d{1,2})[:時](\d{0,2})[分]?/;
      const match = hoursString.match(timePattern);

      if (match) {
        const startHour = parseInt(match[1], 10);
        const startMinute = match[2] ? parseInt(match[2], 10) : 0;
        const endHour = parseInt(match[3], 10);
        const endMinute = match[4] ? parseInt(match[4], 10) : 0;

        // 深夜営業の判定（終了時間が開始時間より小さい場合）
        const isOvernight = endHour < startHour || (endHour === startHour && endMinute < startMinute);

        return {
          startHour,
          startMinute,
          endHour,
          endMinute,
          isOvernight
        };
      }

      return null;
    } catch (error) {
      console.error('営業時間の解析エラー:', error);
      return null;
    }
  }

  /**
   * 指定された時刻が営業時間内かチェック
   */
  private static isTimeInRange(
    hour: number,
    minute: number,
    timeRange: TimeRange
  ): boolean {
    const timeInMinutes = hour * 60 + minute;
    const startInMinutes = timeRange.startHour * 60 + timeRange.startMinute;
    const endInMinutes = timeRange.endHour * 60 + timeRange.endMinute;

    if (timeRange.isOvernight) {
      // 深夜をまたぐ場合
      return timeInMinutes >= startInMinutes || timeInMinutes < endInMinutes;
    } else {
      // 通常の営業時間
      return timeInMinutes >= startInMinutes && timeInMinutes < endInMinutes;
    }
  }

  /**
   * 駐車時間が営業時間内かチェック
   * @param hours 駐車場の営業時間情報
   * @param parkingStartTime 駐車開始時刻（Date）
   * @param durationMinutes 駐車時間（分）
   * @returns true: 営業時間内、false: 営業時間外
   */
  public static isOpenDuringParkingTime(
    hours: ParkingHours | null | undefined,
    parkingStartTime: Date,
    durationMinutes: number
  ): boolean {
    // 営業時間情報がない場合は24時間営業とみなす
    if (!hours) {
      return true;
    }

    // 24時間営業の場合
    if (hours.is_24h) {
      return true;
    }

    // 営業時間文字列がない場合も24時間営業とみなす
    const hoursString = hours.hours || hours.original_hours;
    if (!hoursString) {
      return true;
    }

    // 営業時間を解析
    const timeRange = this.parseTimeRange(hoursString);
    if (!timeRange) {
      // 解析できない場合は営業中とみなす（安全側の判断）
      return true;
    }

    // 24時間営業の場合
    if (timeRange.startHour === 0 && timeRange.endHour === 24) {
      return true;
    }

    // 駐車開始時刻と終了時刻をチェック
    const startHour = parkingStartTime.getHours();
    const startMinute = parkingStartTime.getMinutes();

    const endTime = new Date(parkingStartTime.getTime() + durationMinutes * 60 * 1000);
    const endHour = endTime.getHours();
    const endMinute = endTime.getMinutes();

    // 駐車開始時刻が営業時間外の場合
    if (!this.isTimeInRange(startHour, startMinute, timeRange)) {
      return false;
    }

    // 駐車終了時刻が営業時間外の場合
    // ただし、日をまたぐ場合の処理が複雑なので、ここでは簡易的にチェック
    if (endTime.getDate() !== parkingStartTime.getDate()) {
      // 日をまたぐ場合は、深夜営業でない限り営業時間外とする
      return timeRange.isOvernight;
    }

    return this.isTimeInRange(endHour, endMinute, timeRange);
  }

  /**
   * 営業状態を示す文字列を取得
   */
  public static getOperatingStatus(
    hours: ParkingHours | null | undefined,
    parkingStartTime: Date,
    durationMinutes: number
  ): string {
    if (!hours) {
      return '24時間営業';
    }

    if (hours.is_24h) {
      return '24時間営業';
    }

    const hoursString = hours.hours || hours.original_hours;
    if (!hoursString) {
      return '営業時間不明';
    }

    const isOpen = this.isOpenDuringParkingTime(hours, parkingStartTime, durationMinutes);

    if (isOpen) {
      return `営業中 (${hoursString})`;
    } else {
      return `営業時間外 (${hoursString})`;
    }
  }
}