import { ParkingFeeCalculator } from '../services/parking-fee.service.js';
import { CoinParking, ParkingDuration } from '../types/index.js';

interface TestCase {
  name: string;
  description: string;
  parking: CoinParking;
  testScenarios: {
    startTime: string;
    endTime: string;
    expectedFee: number;
    explanation: string;
  }[];
}

function createParkingDuration(startTime: string, endTime: string): ParkingDuration {
  const start = new Date(startTime);
  const end = new Date(endTime);
  const durationSeconds = Math.round((end.getTime() - start.getTime()) / 1000);

  return {
    startDate: start,
    duration: durationSeconds,
    get endDate() {
      return end;
    },
    get durationInMinutes() {
      return Math.round(durationSeconds / 60);
    },
    get formattedDuration() {
      const hours = Math.floor(durationSeconds / 3600);
      const minutes = Math.floor((durationSeconds % 3600) / 60);
      if (hours > 0) {
        return `${hours}時間${minutes > 0 ? `${minutes}分` : ''}`;
      }
      return `${minutes}分`;
    }
  };
}

const testCases: TestCase[] = [
  {
    name: "テスト1: 基本料金と24時間最大料金",
    description: "30分200円、24時間最大2000円のシンプルなケース",
    parking: {
      id: '1',
      name: "標準コインパーキング",
      lat: 35.6812,
      lng: 139.7671,
      category: "コインパーキング",
      rates: [
        { id: '1', type: 'base', minutes: 30, price: 200 },
        { id: '2', type: 'max', minutes: 1440, price: 2000 }
      ]
    } as CoinParking,
    testScenarios: [
      {
        startTime: "2025-01-19T09:00:00",
        endTime: "2025-01-19T10:00:00",
        expectedFee: 400,
        explanation: "1時間 = 30分×2 = 200円×2 = 400円"
      },
      {
        startTime: "2025-01-19T09:00:00",
        endTime: "2025-01-19T14:00:00",
        expectedFee: 2000,
        explanation: "5時間 = 30分×10 = 200円×10 = 2000円（最大料金適用）"
      },
      {
        startTime: "2025-01-19T09:00:00",
        endTime: "2025-01-20T10:00:00",
        expectedFee: 2400,
        explanation: "25時間 = 24時間(最大2000円) + 1時間(400円) = 2400円"
      }
    ]
  },
  {
    name: "テスト2: 昼夜異なる料金体系",
    description: "昼間(8:00-20:00)と夜間(20:00-8:00)で料金が異なるケース",
    parking: {
      id: '2',
      name: "時間帯別料金パーキング",
      lat: 35.6812,
      lng: 139.7671,
      category: "コインパーキング",
      rates: [
        { id: '1', type: 'base', minutes: 20, price: 300, timeRange: "8:00~20:00", dayType: "毎日" },
        { id: '2', type: 'base', minutes: 60, price: 100, timeRange: "20:00~8:00", dayType: "毎日" },
        { id: '3', type: 'max', minutes: 720, price: 1800, timeRange: "8:00~20:00", dayType: "毎日" },
        { id: '4', type: 'max', minutes: 720, price: 500, timeRange: "20:00~8:00", dayType: "毎日" }
      ]
    } as CoinParking,
    testScenarios: [
      {
        startTime: "2025-01-19T09:00:00",
        endTime: "2025-01-19T11:00:00",
        expectedFee: 1800,
        explanation: "昼間2時間 = 20分×6 = 300円×6 = 1800円（昼間最大料金適用）"
      },
      {
        startTime: "2025-01-19T19:00:00",
        endTime: "2025-01-19T21:00:00",
        expectedFee: 1000,
        explanation: "19:00-20:00(昼間1時間=900円) + 20:00-21:00(夜間1時間=100円) = 1000円"
      },
      {
        startTime: "2025-01-19T20:00:00",
        endTime: "2025-01-20T08:00:00",
        expectedFee: 500,
        explanation: "夜間12時間 = 60分×12 = 100円×12 = 1200円→夜間最大500円適用"
      }
    ]
  },
  {
    name: "テスト3: 時間制限付き最大料金",
    description: "最大料金が特定時間内のみ適用されるケース",
    parking: {
      id: '3',
      name: "時間制限最大料金パーキング",
      lat: 35.6812,
      lng: 139.7671,
      category: "コインパーキング",
      rates: [
        { id: '1', type: 'base', minutes: 15, price: 100 },
        { id: '2', type: 'max', minutes: 180, price: 600 }  // 3時間まで最大600円
      ]
    } as CoinParking,
    testScenarios: [
      {
        startTime: "2025-01-19T09:00:00",
        endTime: "2025-01-19T11:00:00",
        expectedFee: 600,
        explanation: "2時間 = 15分×8 = 100円×8 = 800円→3時間以内なので最大600円適用"
      },
      {
        startTime: "2025-01-19T09:00:00",
        endTime: "2025-01-19T13:00:00",
        expectedFee: 1000,
        explanation: "4時間 = 最初の3時間(600円) + 追加1時間(15分×4=400円) = 1000円"
      },
      {
        startTime: "2025-01-19T09:00:00",
        endTime: "2025-01-19T15:30:00",
        expectedFee: 1600,
        explanation: "6.5時間 = 3時間(600円) + 3時間(600円) + 30分(200円) = 1400円"
      }
    ]
  },
  {
    name: "テスト4: 平日と土日祝で異なる料金",
    description: "平日と土日祝で基本料金と最大料金が異なるケース",
    parking: {
      id: '4',
      name: "曜日別料金パーキング",
      lat: 35.6812,
      lng: 139.7671,
      category: "コインパーキング",
      rates: [
        { id: '1', type: 'base', minutes: 30, price: 200, dayType: "平日" },
        { id: '2', type: 'base', minutes: 30, price: 300, dayType: "土日祝" },
        { id: '3', type: 'max', minutes: 1440, price: 1500, dayType: "平日" },
        { id: '4', type: 'max', minutes: 1440, price: 2500, dayType: "土日祝" }
      ]
    } as CoinParking,
    testScenarios: [
      {
        startTime: "2025-01-20T09:00:00",  // 月曜日
        endTime: "2025-01-20T15:00:00",
        expectedFee: 1500,
        explanation: "平日6時間 = 30分×12 = 200円×12 = 2400円→平日最大1500円適用"
      },
      {
        startTime: "2025-01-18T09:00:00",  // 土曜日
        endTime: "2025-01-18T15:00:00",
        expectedFee: 2500,
        explanation: "土曜6時間 = 30分×12 = 300円×12 = 3600円→土日最大2500円適用"
      },
      {
        startTime: "2025-01-17T22:00:00",  // 金曜夜から土曜朝
        endTime: "2025-01-18T10:00:00",
        expectedFee: 2300,
        explanation: "金曜22:00-24:00(平日2時間=800円) + 土曜0:00-10:00(土曜10時間=2500円最大) = 3300円"
      }
    ]
  },
  {
    name: "テスト5: 初回割引と最大料金の組み合わせ",
    description: "最初の時間が割引料金で、その後通常料金になるケース",
    parking: {
      id: '5',
      name: "初回割引パーキング",
      lat: 35.6812,
      lng: 139.7671,
      category: "コインパーキング",
      rates: [
        { id: '1', type: 'base', minutes: 60, price: 100, timeRange: "0:00~1:00" },  // 最初の1時間100円
        { id: '2', type: 'base', minutes: 30, price: 300 },  // その後30分300円
        { id: '3', type: 'max', minutes: 1440, price: 2000 }
      ]
    } as CoinParking,
    testScenarios: [
      {
        startTime: "2025-01-19T10:00:00",
        endTime: "2025-01-19T11:00:00",
        expectedFee: 100,
        explanation: "最初の1時間 = 100円（初回割引）"
      },
      {
        startTime: "2025-01-19T10:00:00",
        endTime: "2025-01-19T12:30:00",
        expectedFee: 1600,
        explanation: "2.5時間 = 最初の1時間(100円) + 追加1.5時間(30分×3=900円) = 1000円"
      },
      {
        startTime: "2025-01-19T10:00:00",
        endTime: "2025-01-19T18:00:00",
        expectedFee: 2000,
        explanation: "8時間 = 計算上4900円→最大料金2000円適用"
      }
    ]
  },
  {
    name: "テスト6: 短時間高額・長時間割安パターン",
    description: "短時間は高いが、長時間になると割安になるケース",
    parking: {
      id: '6',
      name: "長時間割安パーキング",
      lat: 35.6812,
      lng: 139.7671,
      category: "コインパーキング",
      rates: [
        { id: '1', type: 'base', minutes: 10, price: 300 },  // 10分300円と高額
        { id: '2', type: 'max', minutes: 60, price: 800 },    // 1時間最大800円
        { id: '3', type: 'max', minutes: 1440, price: 1200 }  // 24時間最大1200円
      ]
    } as CoinParking,
    testScenarios: [
      {
        startTime: "2025-01-19T09:00:00",
        endTime: "2025-01-19T09:20:00",
        expectedFee: 600,
        explanation: "20分 = 10分×2 = 300円×2 = 600円"
      },
      {
        startTime: "2025-01-19T09:00:00",
        endTime: "2025-01-19T10:00:00",
        expectedFee: 800,
        explanation: "60分 = 10分×6 = 1800円→1時間最大800円適用"
      },
      {
        startTime: "2025-01-19T09:00:00",
        endTime: "2025-01-20T09:00:00",
        expectedFee: 1200,
        explanation: "24時間 = 24時間最大1200円適用"
      }
    ]
  },
  {
    name: "テスト7: 夜間料金打ち止めパターン",
    description: "夜間(18:00-8:00)は最大料金、昼間は通常料金",
    parking: {
      id: '7',
      name: "夜間打ち止めパーキング",
      lat: 35.6812,
      lng: 139.7671,
      category: "コインパーキング",
      rates: [
        { id: '1', type: 'base', minutes: 20, price: 200, timeRange: "8:00~18:00" },
        { id: '2', type: 'max', minutes: 840, price: 400, timeRange: "18:00~8:00" }  // 夜間14時間で400円打ち止め
      ]
    } as CoinParking,
    testScenarios: [
      {
        startTime: "2025-01-19T17:00:00",
        endTime: "2025-01-19T19:00:00",
        expectedFee: 1000,
        explanation: "17:00-18:00(昼間1時間=600円) + 18:00-19:00(夜間最大400円) = 1000円"
      },
      {
        startTime: "2025-01-19T18:00:00",
        endTime: "2025-01-20T08:00:00",
        expectedFee: 400,
        explanation: "夜間14時間 = 夜間最大料金400円"
      },
      {
        startTime: "2025-01-19T16:00:00",
        endTime: "2025-01-20T09:00:00",
        expectedFee: 1800,
        explanation: "16:00-18:00(昼間2時間=1200円) + 18:00-8:00(夜間最大400円) + 8:00-9:00(昼間1時間=600円) = 2200円"
      }
    ]
  },
  {
    name: "テスト8: 複数日またぎの複雑な料金計算",
    description: "3日間にまたがる駐車で、各日の最大料金が適用されるケース",
    parking: {
      id: '8',
      name: "複数日またぎパーキング",
      lat: 35.6812,
      lng: 139.7671,
      category: "コインパーキング",
      rates: [
        { id: '1', type: 'base', minutes: 30, price: 250 },
        { id: '2', type: 'max', minutes: 1440, price: 1500 }  // 当日最大1500円
      ]
    } as CoinParking,
    testScenarios: [
      {
        startTime: "2025-01-19T14:00:00",
        endTime: "2025-01-19T20:00:00",
        expectedFee: 1500,
        explanation: "6時間 = 30分×12 = 250円×12 = 3000円→当日最大1500円"
      },
      {
        startTime: "2025-01-19T14:00:00",
        endTime: "2025-01-20T14:00:00",
        expectedFee: 1500,
        explanation: "24時間 = 24時間最大1500円"
      },
      {
        startTime: "2025-01-19T14:00:00",
        endTime: "2025-01-21T16:00:00",
        expectedFee: 3500,
        explanation: "50時間 = 24時間×2(3000円) + 2時間(500円) = 3500円"
      }
    ]
  },
  {
    name: "テスト9: 分単位の細かい料金設定",
    description: "10分単位の細かい料金設定で端数処理を確認",
    parking: {
      id: '9',
      name: "細かい料金設定パーキング",
      lat: 35.6812,
      lng: 139.7671,
      category: "コインパーキング",
      rates: [
        { id: '1', type: 'base', minutes: 10, price: 50 },
        { id: '2', type: 'max', minutes: 180, price: 600 },
        { id: '3', type: 'max', minutes: 1440, price: 1800 }
      ]
    } as CoinParking,
    testScenarios: [
      {
        startTime: "2025-01-19T09:00:00",
        endTime: "2025-01-19T09:31:00",
        expectedFee: 200,
        explanation: "31分 = 10分×4（切り上げ） = 50円×4 = 200円"
      },
      {
        startTime: "2025-01-19T09:00:00",
        endTime: "2025-01-19T11:45:00",
        expectedFee: 600,
        explanation: "2時間45分 = 10分×17 = 850円→3時間以内最大600円"
      },
      {
        startTime: "2025-01-19T09:00:00",
        endTime: "2025-01-19T13:01:00",
        expectedFee: 700,
        explanation: "4時間1分 = 3時間(最大600円) + 1時間1分(10分×7=350円) = 950円"
      }
    ]
  },
  {
    name: "テスト10: イベント日特別料金",
    description: "特定の日付や時間帯で特別料金が適用されるケース",
    parking: {
      id: '10',
      name: "イベント特別料金パーキング",
      lat: 35.6812,
      lng: 139.7671,
      category: "コインパーキング",
      rates: [
        { id: '1', type: 'base', minutes: 30, price: 200 },
        { id: '2', type: 'base', minutes: 30, price: 500, timeRange: "10:00~16:00", dayType: "土日祝" },  // 土日祝の昼間は高額
        { id: '3', type: 'max', minutes: 1440, price: 2000 },
        { id: '4', type: 'max', minutes: 360, price: 5000, timeRange: "10:00~16:00", dayType: "土日祝" }  // 土日祝昼間の最大料金も高額
      ]
    } as CoinParking,
    testScenarios: [
      {
        startTime: "2025-01-20T11:00:00",  // 月曜日
        endTime: "2025-01-20T14:00:00",
        expectedFee: 1200,
        explanation: "平日3時間 = 30分×6 = 200円×6 = 1200円"
      },
      {
        startTime: "2025-01-18T11:00:00",  // 土曜日
        endTime: "2025-01-18T14:00:00",
        expectedFee: 3000,
        explanation: "土曜昼間3時間 = 30分×6 = 500円×6 = 3000円"
      },
      {
        startTime: "2025-01-18T09:00:00",  // 土曜日
        endTime: "2025-01-18T17:00:00",
        expectedFee: 5800,
        explanation: "9:00-10:00(通常400円) + 10:00-16:00(特別最大5000円) + 16:00-17:00(通常400円) = 5800円"
      }
    ]
  }
];

function runComprehensiveTests() {
  console.log("=".repeat(80));
  console.log("駐車料金計算 包括的テスト（10ケース）");
  console.log("=".repeat(80));

  let passedTests = 0;
  let failedTests = 0;
  const failedDetails: string[] = [];

  testCases.forEach((testCase, caseIndex) => {
    console.log(`\n【${testCase.name}】`);
    console.log(`説明: ${testCase.description}`);
    console.log(`料金設定:`);
    testCase.parking.rates.forEach(rate => {
      let rateStr = `  - ${rate.type === 'base' ? '基本' : '最大'}: ${rate.minutes}分 ${rate.price}円`;
      if (rate.timeRange) rateStr += ` (${rate.timeRange})`;
      if (rate.dayType) rateStr += ` [${rate.dayType}]`;
      console.log(rateStr);
    });
    console.log("");

    testCase.testScenarios.forEach((scenario, scenarioIndex) => {
      const duration = createParkingDuration(scenario.startTime, scenario.endTime);
      const calculatedFee = ParkingFeeCalculator.calculateFee(testCase.parking, duration);

      const startDate = new Date(scenario.startTime);
      const endDate = new Date(scenario.endTime);
      const startStr = `${startDate.getMonth() + 1}/${startDate.getDate()} ${startDate.getHours()}:${String(startDate.getMinutes()).padStart(2, '0')}`;
      const endStr = `${endDate.getMonth() + 1}/${endDate.getDate()} ${endDate.getHours()}:${String(endDate.getMinutes()).padStart(2, '0')}`;

      const passed = calculatedFee === scenario.expectedFee;

      console.log(`  シナリオ${scenarioIndex + 1}: ${startStr} → ${endStr} (${duration.formattedDuration})`);
      console.log(`    期待値: ¥${scenario.expectedFee}`);
      console.log(`    計算値: ¥${calculatedFee} ${passed ? '✅' : '❌'}`);
      console.log(`    説明: ${scenario.explanation}`);

      if (passed) {
        passedTests++;
      } else {
        failedTests++;
        failedDetails.push(`テスト${caseIndex + 1}-シナリオ${scenarioIndex + 1}: ${testCase.name} - 期待値¥${scenario.expectedFee}、実際¥${calculatedFee}`);
      }
    });
  });

  console.log("\n" + "=".repeat(80));
  console.log("テスト結果サマリー");
  console.log("=".repeat(80));
  console.log(`✅ 成功: ${passedTests}件`);
  console.log(`❌ 失敗: ${failedTests}件`);
  console.log(`合計: ${passedTests + failedTests}件`);
  console.log(`成功率: ${((passedTests / (passedTests + failedTests)) * 100).toFixed(1)}%`);

  if (failedTests > 0) {
    console.log("\n失敗したテストの詳細:");
    failedDetails.forEach(detail => console.log(`  - ${detail}`));
  }

  return { passed: passedTests, failed: failedTests };
}

// テスト実行
const result = runComprehensiveTests();

// 結果に基づいて終了コードを設定
if (result.failed > 0) {
  console.log("\n⚠️  料金計算アルゴリズムに問題があります。修正が必要です。");
  process.exit(1);
} else {
  console.log("\n✨ すべてのテストが成功しました！料金計算アルゴリズムは正常に動作しています。");
  process.exit(0);
}