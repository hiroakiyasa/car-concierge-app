import { ParkingFeeCalculator } from '../services/parking-fee.service';
import { CoinParking, ParkingDuration, ParkingRate } from '../types';

// テスト用の駐車場データを作成する関数
function createTestParking(name: string, rates: ParkingRate[]): CoinParking {
  return {
    id: Math.random(),
    name,
    lat: 35.6762,
    lng: 139.6505,
    rates,
    created_at: '',
    updated_at: '',
  };
}

// テスト用の駐車時間を作成する関数
function createDuration(year: number, month: number, day: number, hour: number, minute: number, durationMinutes: number): ParkingDuration {
  const startDate = new Date(year, month - 1, day, hour, minute, 0, 0);

  return {
    startDate,
    duration: durationMinutes * 60,
    get endDate() {
      return new Date(this.startDate.getTime() + durationMinutes * 60000);
    },
    get durationInMinutes() {
      return durationMinutes;
    },
    get formattedDuration() {
      const hours = Math.floor(durationMinutes / 60);
      const mins = durationMinutes % 60;
      if (hours > 24) {
        const days = Math.floor(hours / 24);
        const remainingHours = hours % 24;
        return `${days}日${remainingHours > 0 ? remainingHours + '時間' : ''}${mins > 0 ? mins + '分' : ''}`;
      }
      return hours > 0 ? `${hours}時間${mins > 0 ? mins + '分' : ''}` : `${mins}分`;
    }
  };
}

interface TestCase {
  id: number;
  category: string;
  description: string;
  parking: CoinParking;
  duration: ParkingDuration;
  expected: number;
  explanation: string;
}

// 50パターンのテストケースを定義
export function create50TestPatterns(): TestCase[] {
  const testCases: TestCase[] = [];
  let id = 1;

  // ========== 1. 基本的な時間帯別料金（5パターン） ==========

  // 1-1: 昼間の短時間駐車
  testCases.push({
    id: id++,
    category: '基本時間帯',
    description: '昼間30分駐車',
    parking: createTestParking('基本昼間', [
      { type: 'base', minutes: 20, price: 200, timeRange: '8:00～22:00' },
      { type: 'base', minutes: 60, price: 100, timeRange: '22:00～8:00' }
    ]),
    duration: createDuration(2025, 9, 20, 10, 0, 30),
    expected: 400,
    explanation: '昼間料金: 20分200円 × 2単位 = 400円'
  });

  // 1-2: 夜間の短時間駐車
  testCases.push({
    id: id++,
    category: '基本時間帯',
    description: '夜間1時間駐車',
    parking: createTestParking('基本夜間', [
      { type: 'base', minutes: 20, price: 200, timeRange: '8:00～22:00' },
      { type: 'base', minutes: 60, price: 100, timeRange: '22:00～8:00' }
    ]),
    duration: createDuration(2025, 9, 20, 23, 0, 60),
    expected: 100,
    explanation: '夜間料金: 60分100円'
  });

  // 1-3: 境界時刻（朝8時）開始
  testCases.push({
    id: id++,
    category: '基本時間帯',
    description: '朝8時ちょうどから1時間',
    parking: createTestParking('境界朝', [
      { type: 'base', minutes: 30, price: 300, timeRange: '8:00～20:00' },
      { type: 'base', minutes: 60, price: 100, timeRange: '20:00～8:00' }
    ]),
    duration: createDuration(2025, 9, 20, 8, 0, 60),
    expected: 600,
    explanation: '昼間料金開始: 30分300円 × 2 = 600円'
  });

  // 1-4: 境界時刻（夜20時）開始
  testCases.push({
    id: id++,
    category: '基本時間帯',
    description: '夜20時ちょうどから1時間',
    parking: createTestParking('境界夜', [
      { type: 'base', minutes: 30, price: 300, timeRange: '8:00～20:00' },
      { type: 'base', minutes: 60, price: 100, timeRange: '20:00～8:00' }
    ]),
    duration: createDuration(2025, 9, 20, 20, 0, 60),
    expected: 100,
    explanation: '夜間料金開始: 60分100円'
  });

  // 1-5: 深夜0時をまたぐ駐車
  testCases.push({
    id: id++,
    category: '基本時間帯',
    description: '深夜23時から2時間（日またぎ）',
    parking: createTestParking('深夜またぎ', [
      { type: 'base', minutes: 20, price: 200, timeRange: '8:00～22:00' },
      { type: 'base', minutes: 60, price: 100, timeRange: '22:00～8:00' }
    ]),
    duration: createDuration(2025, 9, 20, 23, 0, 120),
    expected: 200,
    explanation: '夜間料金継続: 60分100円 × 2 = 200円'
  });

  // ========== 2. 時間帯をまたぐ料金計算（10パターン） ==========

  // 2-1: 昼から夜への移行
  testCases.push({
    id: id++,
    category: '時間帯またぎ',
    description: '19時から2時間（昼→夜）',
    parking: createTestParking('昼夜またぎ', [
      { type: 'base', minutes: 20, price: 200, timeRange: '8:00～20:00' },
      { type: 'base', minutes: 60, price: 100, timeRange: '20:00～8:00' }
    ]),
    duration: createDuration(2025, 9, 20, 19, 0, 120),
    expected: 700,
    explanation: '19:00-20:00昼間(20分200円×3=600円) + 20:00-21:00夜間(60分100円) = 700円'
  });

  // 2-2: 夜から昼への移行
  testCases.push({
    id: id++,
    category: '時間帯またぎ',
    description: '7時から2時間（夜→昼）',
    parking: createTestParking('夜昼またぎ', [
      { type: 'base', minutes: 20, price: 200, timeRange: '8:00～20:00' },
      { type: 'base', minutes: 60, price: 100, timeRange: '20:00～8:00' }
    ]),
    duration: createDuration(2025, 9, 20, 7, 0, 120),
    expected: 700,
    explanation: '7:00-8:00夜間(60分100円) + 8:00-9:00昼間(20分200円×3=600円) = 700円'
  });

  // 2-3: 3つの時間帯をまたぐ
  testCases.push({
    id: id++,
    category: '時間帯またぎ',
    description: '朝6時から18時間（夜→昼→夜）',
    parking: createTestParking('3時間帯', [
      { type: 'base', minutes: 30, price: 300, timeRange: '9:00～18:00' },
      { type: 'base', minutes: 20, price: 200, timeRange: '18:00～22:00' },
      { type: 'base', minutes: 60, price: 100, timeRange: '22:00～9:00' }
    ]),
    duration: createDuration(2025, 9, 20, 6, 0, 1080), // 18時間
    expected: 8300,
    explanation: '6:00-9:00夜間(180分÷60×100=300円) + 9:00-18:00昼間(540分÷30×300=5400円) + 18:00-22:00夕方(240分÷20×200=2400円) + 22:00-24:00夜間(120分÷60×100=200円) = 8300円'
  });

  // 2-4: 細かい時間帯設定
  testCases.push({
    id: id++,
    category: '時間帯またぎ',
    description: '早朝5時から4時間',
    parking: createTestParking('細かい時間帯', [
      { type: 'base', minutes: 15, price: 100, timeRange: '6:00～9:00' },
      { type: 'base', minutes: 20, price: 200, timeRange: '9:00～18:00' },
      { type: 'base', minutes: 60, price: 80, timeRange: '18:00～6:00' }
    ]),
    duration: createDuration(2025, 9, 20, 5, 0, 240),
    expected: 1280,
    explanation: '5:00-6:00深夜(60分80円) + 6:00-9:00早朝(180分÷15×100=1200円) = 1280円'
  });

  // 2-5: 分単位の境界
  testCases.push({
    id: id++,
    category: '時間帯またぎ',
    description: '19:45から1時間（20:00またぎ）',
    parking: createTestParking('分単位境界', [
      { type: 'base', minutes: 10, price: 100, timeRange: '8:00～20:00' },
      { type: 'base', minutes: 30, price: 100, timeRange: '20:00～8:00' }
    ]),
    duration: createDuration(2025, 9, 20, 19, 45, 60),
    expected: 400,
    explanation: '19:45-20:00昼間(15分÷10×100=200円) + 20:00-20:45夜間(45分÷30×100=200円) = 400円'
  });

  // 2-6: 複雑な料金体系での時間またぎ
  testCases.push({
    id: id++,
    category: '時間帯またぎ',
    description: '21:30から3時間',
    parking: createTestParking('複雑またぎ', [
      { type: 'base', minutes: 15, price: 150, timeRange: '7:00～19:00' },
      { type: 'base', minutes: 30, price: 200, timeRange: '19:00～23:00' },
      { type: 'base', minutes: 60, price: 100, timeRange: '23:00～7:00' }
    ]),
    duration: createDuration(2025, 9, 20, 21, 30, 180),
    expected: 800,
    explanation: '21:30-23:00夕方(90分÷30×200=600円) + 23:00-0:30深夜(90分÷60×100=200円) = 800円'
  });

  // 2-7: 短い時間帯設定
  testCases.push({
    id: id++,
    category: '時間帯またぎ',
    description: '11:30から2時間（昼休みまたぎ）',
    parking: createTestParking('昼休みまたぎ', [
      { type: 'base', minutes: 20, price: 200, timeRange: '9:00～12:00' },
      { type: 'base', minutes: 30, price: 150, timeRange: '12:00～13:00' },
      { type: 'base', minutes: 20, price: 200, timeRange: '13:00～18:00' },
      { type: 'base', minutes: 60, price: 100, timeRange: '18:00～9:00' }
    ]),
    duration: createDuration(2025, 9, 20, 11, 30, 120),
    expected: 1100,
    explanation: '11:30-12:00朝(30分÷20×200=400円) + 12:00-13:00昼(60分÷30×150=300円) + 13:00-13:30午後(30分÷20×200=400円) = 1100円'
  });

  // 2-8: 1分単位の料金設定
  testCases.push({
    id: id++,
    category: '時間帯またぎ',
    description: '分単位料金で時間またぎ',
    parking: createTestParking('分単位料金', [
      { type: 'base', minutes: 1, price: 10, timeRange: '9:00～17:00' },
      { type: 'base', minutes: 5, price: 10, timeRange: '17:00～9:00' }
    ]),
    duration: createDuration(2025, 9, 20, 16, 30, 60),
    expected: 360,
    explanation: '16:30-17:00昼間(30分×10円=300円) + 17:00-17:30夜間(30分÷5×10=60円) = 360円'
  });

  // 2-9: 長時間の時間帯またぎ
  testCases.push({
    id: id++,
    category: '時間帯またぎ',
    description: '12時間駐車（昼夜またぎ）',
    parking: createTestParking('12時間またぎ', [
      { type: 'base', minutes: 30, price: 400, timeRange: '8:00～20:00' },
      { type: 'base', minutes: 60, price: 100, timeRange: '20:00～8:00' }
    ]),
    duration: createDuration(2025, 9, 20, 14, 0, 720),
    expected: 5400,
    explanation: '14:00-20:00昼間(360分÷30×400=4800円) + 20:00-2:00夜間(360分÷60×100=600円) = 5400円'
  });

  // 2-10: 逆転料金の時間またぎ
  testCases.push({
    id: id++,
    category: '時間帯またぎ',
    description: '夜間の方が高い設定',
    parking: createTestParking('逆転料金', [
      { type: 'base', minutes: 60, price: 100, timeRange: '9:00～21:00' },
      { type: 'base', minutes: 30, price: 200, timeRange: '21:00～9:00' }
    ]),
    duration: createDuration(2025, 9, 20, 20, 0, 120),
    expected: 500,
    explanation: '20:00-21:00昼間(60分100円) + 21:00-22:00夜間(60分÷30×200=400円) = 500円'
  });

  // ========== 3. 最大料金の適用（10パターン） ==========

  // 3-1: 単純な日中最大料金
  testCases.push({
    id: id++,
    category: '最大料金',
    description: '日中最大料金適用',
    parking: createTestParking('日中最大', [
      { type: 'base', minutes: 20, price: 200 },
      { type: 'max', minutes: 480, price: 1500 } // 8時間最大
    ]),
    duration: createDuration(2025, 9, 20, 9, 0, 600), // 10時間
    expected: 1500,
    explanation: '通常6000円だが8時間最大1500円が適用'
  });

  // 3-2: 時間帯別最大料金（夜間）
  testCases.push({
    id: id++,
    category: '最大料金',
    description: '夜間最大料金',
    parking: createTestParking('夜間最大', [
      { type: 'base', minutes: 30, price: 300, timeRange: '8:00～20:00' },
      { type: 'base', minutes: 60, price: 100, timeRange: '20:00～8:00' },
      { type: 'max', minutes: 720, price: 500, timeRange: '20:00～8:00' }
    ]),
    duration: createDuration(2025, 9, 20, 21, 0, 600), // 10時間
    expected: 500,
    explanation: '夜間最大料金500円が適用'
  });

  // 3-3: 24時間最大料金
  testCases.push({
    id: id++,
    category: '最大料金',
    description: '24時間最大料金',
    parking: createTestParking('24時間最大', [
      { type: 'base', minutes: 30, price: 300 },
      { type: 'max', minutes: 1440, price: 2000 } // 24時間最大
    ]),
    duration: createDuration(2025, 9, 20, 9, 0, 1440),
    expected: 2000,
    explanation: '24時間最大2000円が適用'
  });

  // 3-4: 複数の最大料金から選択
  testCases.push({
    id: id++,
    category: '最大料金',
    description: '複数最大料金',
    parking: createTestParking('複数最大', [
      { type: 'base', minutes: 20, price: 200 },
      { type: 'max', minutes: 300, price: 2000 }, // 5時間最大
      { type: 'max', minutes: 720, price: 3000 }, // 12時間最大
      { type: 'max', minutes: 1440, price: 4000 } // 24時間最大
    ]),
    duration: createDuration(2025, 9, 20, 9, 0, 360), // 6時間
    expected: 2000,
    explanation: '5時間最大2000円が適用（通常3600円）'
  });

  // 3-5: 最大料金と時間帯またぎ
  testCases.push({
    id: id++,
    category: '最大料金',
    description: '時間帯またぎ最大料金',
    parking: createTestParking('またぎ最大', [
      { type: 'base', minutes: 20, price: 200, timeRange: '8:00～22:00' },
      { type: 'base', minutes: 60, price: 100, timeRange: '22:00～8:00' },
      { type: 'max', minutes: 600, price: 2500, timeRange: '8:00～22:00' }
    ]),
    duration: createDuration(2025, 9, 20, 10, 0, 720), // 12時間
    expected: 2700,
    explanation: '10:00-22:00昼間最大(2500円) + 22:00-22:00夜間(120分÷60×100=200円) = 2700円'
  });

  // 3-6: 短時間最大料金
  testCases.push({
    id: id++,
    category: '最大料金',
    description: '3時間最大料金',
    parking: createTestParking('短時間最大', [
      { type: 'base', minutes: 15, price: 100 },
      { type: 'max', minutes: 180, price: 1000 } // 3時間最大
    ]),
    duration: createDuration(2025, 9, 20, 10, 0, 240), // 4時間
    expected: 1400,
    explanation: '最初の3時間1000円 + 追加1時間(60分÷15×100=400円) = 1400円'
  });

  // 3-7: 最大料金なしの長時間
  testCases.push({
    id: id++,
    category: '最大料金',
    description: '最大料金なし8時間',
    parking: createTestParking('最大なし', [
      { type: 'base', minutes: 30, price: 300 }
    ]),
    duration: createDuration(2025, 9, 20, 9, 0, 480),
    expected: 4800,
    explanation: '30分300円 × 16単位 = 4800円'
  });

  // 3-8: 当日最大料金
  testCases.push({
    id: id++,
    category: '最大料金',
    description: '当日内最大料金',
    parking: createTestParking('当日最大', [
      { type: 'base', minutes: 30, price: 200 },
      { type: 'max', minutes: 0, price: 1500 } // 当日最大（時間指定なし）
    ]),
    duration: createDuration(2025, 9, 20, 6, 0, 1080), // 18時間
    expected: 1500,
    explanation: '当日最大1500円が適用'
  });

  // 3-9: 入庫後最大料金
  testCases.push({
    id: id++,
    category: '最大料金',
    description: '入庫後12時間最大',
    parking: createTestParking('入庫後最大', [
      { type: 'base', minutes: 20, price: 200 },
      { type: 'max', minutes: 720, price: 1800 } // 入庫後12時間最大
    ]),
    duration: createDuration(2025, 9, 20, 9, 0, 840), // 14時間
    expected: 3000,
    explanation: '最初の12時間1800円 + 追加2時間(120分÷20×200=1200円) = 3000円'
  });

  // 3-10: 繰り返し最大料金
  testCases.push({
    id: id++,
    category: '最大料金',
    description: '24時間毎繰り返し最大',
    parking: createTestParking('繰り返し最大', [
      { type: 'base', minutes: 30, price: 300 },
      { type: 'max', minutes: 1440, price: 2000 } // 24時間毎最大
    ]),
    duration: createDuration(2025, 9, 20, 9, 0, 1800), // 30時間
    expected: 3200,
    explanation: '1日目最大2000円 + 2日目6時間(360分÷30×300=3600円)だが最大2000円で計1200円 = 3200円'
  });

  // ========== 4. 曜日別料金（5パターン） ==========

  // 4-1: 平日料金
  testCases.push({
    id: id++,
    category: '曜日別',
    description: '平日料金（金曜日）',
    parking: createTestParking('平日料金', [
      { type: 'base', minutes: 30, price: 300, dayType: '平日' },
      { type: 'base', minutes: 30, price: 500, dayType: '土日祝' }
    ]),
    duration: createDuration(2025, 9, 19, 10, 0, 60), // 金曜日
    expected: 600,
    explanation: '平日料金: 30分300円 × 2 = 600円'
  });

  // 4-2: 土日祝料金
  testCases.push({
    id: id++,
    category: '曜日別',
    description: '土曜日料金',
    parking: createTestParking('土日料金', [
      { type: 'base', minutes: 30, price: 300, dayType: '平日' },
      { type: 'base', minutes: 30, price: 500, dayType: '土日祝' }
    ]),
    duration: createDuration(2025, 9, 20, 10, 0, 60), // 土曜日
    expected: 1000,
    explanation: '土日祝料金: 30分500円 × 2 = 1000円'
  });

  // 4-3: 曜日別最大料金
  testCases.push({
    id: id++,
    category: '曜日別',
    description: '日曜最大料金',
    parking: createTestParking('日曜最大', [
      { type: 'base', minutes: 30, price: 400 },
      { type: 'max', minutes: 1440, price: 1000, dayType: '日祝' }
    ]),
    duration: createDuration(2025, 9, 21, 9, 0, 480), // 日曜日8時間
    expected: 1000,
    explanation: '日祝最大1000円が適用（通常3200円）'
  });

  // 4-4: 曜日またぎ
  testCases.push({
    id: id++,
    category: '曜日別',
    description: '金曜夜から土曜朝（曜日またぎ）',
    parking: createTestParking('曜日またぎ', [
      { type: 'base', minutes: 30, price: 200, dayType: '平日' },
      { type: 'base', minutes: 30, price: 400, dayType: '土日祝' }
    ]),
    duration: createDuration(2025, 9, 19, 23, 0, 120), // 金曜23時から2時間
    expected: 600,
    explanation: '金曜23:00-24:00(30分200円×2) + 土曜0:00-1:00(30分400円×2) = 800円'
  });

  // 4-5: 祝日料金
  testCases.push({
    id: id++,
    category: '曜日別',
    description: '祝日特別料金',
    parking: createTestParking('祝日料金', [
      { type: 'base', minutes: 20, price: 300, dayType: '平日' },
      { type: 'base', minutes: 20, price: 500, dayType: '土日祝' }
    ]),
    duration: createDuration(2025, 9, 23, 10, 0, 60), // 秋分の日（祝日）
    expected: 1500,
    explanation: '祝日料金: 20分500円 × 3 = 1500円'
  });

  // ========== 5. 24時間超の駐車（5パターン） ==========

  // 5-1: 25時間駐車
  testCases.push({
    id: id++,
    category: '24時間超',
    description: '25時間駐車',
    parking: createTestParking('25時間', [
      { type: 'base', minutes: 30, price: 300 },
      { type: 'max', minutes: 1440, price: 2000 }
    ]),
    duration: createDuration(2025, 9, 20, 9, 0, 1500), // 25時間
    expected: 3000,
    explanation: '1日目最大2000円 + 2日目1時間(60分÷30×300=600円) = 2600円'
  });

  // 5-2: 48時間駐車
  testCases.push({
    id: id++,
    category: '24時間超',
    description: '48時間駐車',
    parking: createTestParking('48時間', [
      { type: 'base', minutes: 30, price: 300 },
      { type: 'max', minutes: 1440, price: 2000 }
    ]),
    duration: createDuration(2025, 9, 20, 9, 0, 2880), // 48時間
    expected: 4000,
    explanation: '1日目最大2000円 + 2日目最大2000円 = 4000円'
  });

  // 5-3: 72時間駐車
  testCases.push({
    id: id++,
    category: '24時間超',
    description: '3日間駐車',
    parking: createTestParking('72時間', [
      { type: 'base', minutes: 60, price: 200 },
      { type: 'max', minutes: 1440, price: 1500 }
    ]),
    duration: createDuration(2025, 9, 20, 9, 0, 4320), // 72時間
    expected: 4500,
    explanation: '1日最大1500円 × 3日 = 4500円'
  });

  // 5-4: 36時間駐車（時間帯またぎ）
  testCases.push({
    id: id++,
    category: '24時間超',
    description: '36時間（昼夜またぎ）',
    parking: createTestParking('36時間またぎ', [
      { type: 'base', minutes: 20, price: 200, timeRange: '8:00～20:00' },
      { type: 'base', minutes: 60, price: 100, timeRange: '20:00～8:00' },
      { type: 'max', minutes: 1440, price: 1800 }
    ]),
    duration: createDuration(2025, 9, 20, 10, 0, 2160), // 36時間
    expected: 3600,
    explanation: '1日目最大1800円 + 2日目12時間最大1800円 = 3600円'
  });

  // 5-5: 1週間駐車
  testCases.push({
    id: id++,
    category: '24時間超',
    description: '7日間駐車',
    parking: createTestParking('1週間', [
      { type: 'base', minutes: 60, price: 100 },
      { type: 'max', minutes: 1440, price: 1000 }
    ]),
    duration: createDuration(2025, 9, 20, 9, 0, 10080), // 7日間
    expected: 7000,
    explanation: '1日最大1000円 × 7日 = 7000円'
  });

  // ========== 6. 初回無料・割引パターン（5パターン） ==========

  // 6-1: 初回30分無料
  testCases.push({
    id: id++,
    category: '初回無料',
    description: '初回30分無料で40分駐車',
    parking: createTestParking('初回30分無料', [
      { type: 'base', minutes: 20, price: 200, applyAfter: 30 }
    ]),
    duration: createDuration(2025, 9, 20, 10, 0, 40),
    expected: 200,
    explanation: '最初の30分無料 + 10分分(20分200円の1単位) = 200円'
  });

  // 6-2: 初回60分無料
  testCases.push({
    id: id++,
    category: '初回無料',
    description: '初回60分無料で90分駐車',
    parking: createTestParking('初回60分無料', [
      { type: 'base', minutes: 30, price: 300, applyAfter: 60 }
    ]),
    duration: createDuration(2025, 9, 20, 10, 0, 90),
    expected: 300,
    explanation: '最初の60分無料 + 30分(30分300円) = 300円'
  });

  // 6-3: 条件付き無料（買い物）
  testCases.push({
    id: id++,
    category: '初回無料',
    description: '条件付き無料2時間',
    parking: createTestParking('条件付き無料', [
      { type: 'conditional_free', minutes: 120, price: 0 },
      { type: 'base', minutes: 30, price: 300 }
    ]),
    duration: createDuration(2025, 9, 20, 10, 0, 150), // 2.5時間
    expected: -1, // 条件付き無料は除外
    explanation: '条件付き無料駐車場は料金計算から除外'
  });

  // 6-4: 初回15分無料
  testCases.push({
    id: id++,
    category: '初回無料',
    description: '初回15分無料で20分駐車',
    parking: createTestParking('初回15分無料', [
      { type: 'base', minutes: 10, price: 100, applyAfter: 15 }
    ]),
    duration: createDuration(2025, 9, 20, 10, 0, 20),
    expected: 100,
    explanation: '最初の15分無料 + 5分分(10分100円の1単位) = 100円'
  });

  // 6-5: 初回無料と最大料金
  testCases.push({
    id: id++,
    category: '初回無料',
    description: '初回30分無料で8時間駐車',
    parking: createTestParking('無料＋最大', [
      { type: 'base', minutes: 30, price: 300, applyAfter: 30 },
      { type: 'max', minutes: 480, price: 1500 }
    ]),
    duration: createDuration(2025, 9, 20, 10, 0, 480),
    expected: 1500,
    explanation: '初回30分無料後の料金が最大料金1500円でキャップ'
  });

  // ========== 7. 特殊なケース（10パターン） ==========

  // 7-1: 0円駐車場（無料）
  testCases.push({
    id: id++,
    category: '特殊ケース',
    description: '完全無料駐車場',
    parking: createTestParking('完全無料', [
      { type: 'base', minutes: 60, price: 0 }
    ]),
    duration: createDuration(2025, 9, 20, 10, 0, 180),
    expected: 0,
    explanation: '無料駐車場: 0円'
  });

  // 7-2: 最大料金0円
  testCases.push({
    id: id++,
    category: '特殊ケース',
    description: '最大料金0円',
    parking: createTestParking('最大0円', [
      { type: 'max', minutes: 0, price: 0 }
    ]),
    duration: createDuration(2025, 9, 20, 10, 0, 120),
    expected: 0,
    explanation: '最大料金0円の無料駐車場'
  });

  // 7-3: 深夜料金なし
  testCases.push({
    id: id++,
    category: '特殊ケース',
    description: '深夜料金設定なし',
    parking: createTestParking('深夜なし', [
      { type: 'base', minutes: 30, price: 300, timeRange: '8:00～22:00' }
    ]),
    duration: createDuration(2025, 9, 20, 23, 0, 120),
    expected: -1, // 深夜料金がないため計算不可
    explanation: '深夜時間帯の料金設定なし'
  });

  // 7-4: 1分単位課金
  testCases.push({
    id: id++,
    category: '特殊ケース',
    description: '1分単位の課金',
    parking: createTestParking('1分単位', [
      { type: 'base', minutes: 1, price: 5 }
    ]),
    duration: createDuration(2025, 9, 20, 10, 0, 73),
    expected: 365,
    explanation: '1分5円 × 73分 = 365円'
  });

  // 7-5: 5分単位課金
  testCases.push({
    id: id++,
    category: '特殊ケース',
    description: '5分単位の課金',
    parking: createTestParking('5分単位', [
      { type: 'base', minutes: 5, price: 50 }
    ]),
    duration: createDuration(2025, 9, 20, 10, 0, 32),
    expected: 350,
    explanation: '5分50円 × 7単位(32分÷5切り上げ) = 350円'
  });

  // 7-6: 最大料金のみ
  testCases.push({
    id: id++,
    category: '特殊ケース',
    description: '最大料金のみ設定',
    parking: createTestParking('最大のみ', [
      { type: 'max', minutes: 0, price: 1000 }
    ]),
    duration: createDuration(2025, 9, 20, 10, 0, 300),
    expected: 1000,
    explanation: '基本料金なし、最大料金1000円のみ'
  });

  // 7-7: 超高額料金
  testCases.push({
    id: id++,
    category: '特殊ケース',
    description: '1分1000円の高額料金',
    parking: createTestParking('超高額', [
      { type: 'base', minutes: 1, price: 1000 }
    ]),
    duration: createDuration(2025, 9, 20, 10, 0, 10),
    expected: 10000,
    explanation: '1分1000円 × 10分 = 10000円'
  });

  // 7-8: 複雑な分数料金
  testCases.push({
    id: id++,
    category: '特殊ケース',
    description: '17分単位の料金',
    parking: createTestParking('17分単位', [
      { type: 'base', minutes: 17, price: 170 }
    ]),
    duration: createDuration(2025, 9, 20, 10, 0, 50),
    expected: 510,
    explanation: '17分170円 × 3単位(50分÷17切り上げ) = 510円'
  });

  // 7-9: 同時刻の時間帯設定
  testCases.push({
    id: id++,
    category: '特殊ケース',
    description: '22:00開始の2つの時間帯',
    parking: createTestParking('同時刻開始', [
      { type: 'base', minutes: 30, price: 300, timeRange: '8:00～22:00' },
      { type: 'base', minutes: 60, price: 100, timeRange: '22:00～8:00' }
    ]),
    duration: createDuration(2025, 9, 20, 22, 0, 60),
    expected: 100,
    explanation: '22:00ちょうどは夜間料金: 60分100円'
  });

  // 7-10: 営業時間制限
  testCases.push({
    id: id++,
    category: '特殊ケース',
    description: '営業時間外の料金',
    parking: createTestParking('営業時間', [
      { type: 'base', minutes: 30, price: 300 }
    ]),
    duration: createDuration(2025, 9, 20, 2, 0, 120), // 深夜2時から
    expected: 1200,
    explanation: '24時間営業: 30分300円 × 4 = 1200円'
  });

  return testCases;
}

// テスト実行関数
export function runComprehensiveTests(): { passed: number; failed: number; errors: TestCase[] } {
  const testCases = create50TestPatterns();
  const errors: TestCase[] = [];
  let passed = 0;
  let failed = 0;

  console.log('===== 包括的駐車料金計算テスト（50パターン） =====\n');

  const categories = [...new Set(testCases.map(tc => tc.category))];

  categories.forEach(category => {
    const categoryTests = testCases.filter(tc => tc.category === category);
    console.log(`\n【${category}】${categoryTests.length}パターン`);
    console.log('─'.repeat(50));

    categoryTests.forEach(test => {
      try {
        const calculated = ParkingFeeCalculator.calculateFee(test.parking, test.duration);
        const passed = calculated === test.expected;

        if (passed) {
          passed++;
          console.log(`✅ #${test.id}: ${test.description}`);
          console.log(`   計算値: ¥${calculated} = 期待値: ¥${test.expected}`);
        } else {
          failed++;
          errors.push({
            ...test,
            calculated
          } as any);
          console.log(`❌ #${test.id}: ${test.description}`);
          console.log(`   計算値: ¥${calculated} ≠ 期待値: ¥${test.expected}`);
          console.log(`   説明: ${test.explanation}`);

          // エラー分析
          if (calculated === -1 && test.expected !== -1) {
            console.log(`   ⚠️ エラー: 料金計算不能（料金データ不足の可能性）`);
          } else if (calculated > test.expected) {
            console.log(`   ⚠️ エラー: ${calculated - test.expected}円高い（最大料金未適用？）`);
          } else {
            console.log(`   ⚠️ エラー: ${test.expected - calculated}円安い（時間帯判定ミス？）`);
          }
        }
      } catch (error) {
        failed++;
        errors.push(test);
        console.log(`💥 #${test.id}: ${test.description}`);
        console.log(`   エラー: ${error}`);
      }
    });
  });

  // サマリー
  console.log('\n' + '='.repeat(60));
  console.log('テスト結果サマリー');
  console.log('='.repeat(60));
  console.log(`総テスト数: ${testCases.length}`);
  console.log(`✅ 成功: ${passed} (${(passed / testCases.length * 100).toFixed(1)}%)`);
  console.log(`❌ 失敗: ${failed} (${(failed / testCases.length * 100).toFixed(1)}%)`);

  if (errors.length > 0) {
    console.log('\n失敗したテスト:');
    errors.forEach(error => {
      console.log(`  - #${error.id}: ${error.description}`);
    });
  }

  return { passed, failed, errors };
}