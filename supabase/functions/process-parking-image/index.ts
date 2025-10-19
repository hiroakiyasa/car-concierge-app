/**
 * Supabase Edge Function: 駐車場画像認識処理
 * ユーザーが投稿した駐車場の看板画像をOCRで解析し、構造化データを抽出
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 環境変数から認証情報を取得
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const googleVisionApiKey = Deno.env.get('GOOGLE_VISION_API_KEY'); // オプション
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY'); // Gemini API

    // Supabaseクライアント作成（Service Role使用）
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // リクエストボディを解析
    const { submissionId } = await req.json();

    if (!submissionId) {
      throw new Error('submissionId is required');
    }

    console.log(`Processing submission: ${submissionId}`);

    // 1. 投稿情報を取得
    const { data: submission, error: fetchError } = await supabase
      .from('parking_submissions')
      .select('*')
      .eq('id', submissionId)
      .single();

    if (fetchError || !submission) {
      throw new Error(`Submission not found: ${fetchError?.message}`);
    }

    // ステータスを処理中に更新
    await supabase
      .from('parking_submissions')
      .update({ status: 'processing' })
      .eq('id', submissionId);

    // 2. Storageから画像を取得
    const { data: imageData, error: downloadError } = await supabase.storage
      .from('parking-submissions')
      .download(submission.image_path);

    if (downloadError || !imageData) {
      throw new Error(`Failed to download image: ${downloadError?.message}`);
    }

    // 3. 画像をBase64に変換
    const arrayBuffer = await imageData.arrayBuffer();
    const base64Image = btoa(
      new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
    );

    // 4. Gemini Flash で画像から直接データ抽出
    const extractedData = await extractParkingDataWithGemini(base64Image, geminiApiKey);

    // 投稿時の位置情報を extracted_data に追加
    // （ユーザーが指定した位置 または 写真のEXIF位置情報）
    if (submission.latitude && submission.longitude) {
      extractedData.latitude = submission.latitude;
      extractedData.longitude = submission.longitude;
      console.log('📍 投稿の位置情報を extracted_data に追加:', {
        latitude: submission.latitude,
        longitude: submission.longitude,
      });

      // 標高を取得
      try {
        const elevation = await getElevation(submission.latitude, submission.longitude);
        extractedData.elevation = elevation;
        console.log(`⛰️ 標高を取得: ${elevation}m`);
      } catch (error) {
        console.error('標高取得エラー:', error);
      }

      // 最寄りの施設を取得
      try {
        const nearbyFacilities = await getNearbyFacilities(
          supabase,
          submission.latitude,
          submission.longitude
        );
        extractedData.nearest_convenience_store = nearbyFacilities.convenience_store;
        extractedData.nearest_toilet = nearbyFacilities.toilet;
        extractedData.nearest_hot_spring = nearbyFacilities.hot_spring;
        console.log('🏪 最寄り施設を取得:', nearbyFacilities);
      } catch (error) {
        console.error('最寄り施設取得エラー:', error);
      }
    }

    const confidenceScore = calculateConfidenceScore(extractedData);

    console.log('Extracted Data:', JSON.stringify(extractedData, null, 2));
    console.log('Confidence Score:', confidenceScore);

    // 6. 投稿レコードを更新（常に手動承認が必要）
    const { error: updateError } = await supabase
      .from('parking_submissions')
      .update({
        ocr_result: null,
        extracted_data: extractedData,
        confidence_score: confidenceScore,
        status: 'pending',
        updated_at: new Date().toISOString(),
      })
      .eq('id', submissionId);

    if (updateError) {
      throw new Error(`Failed to update submission: ${updateError.message}`);
    }

    // 7. 管理者にメール通知を送信
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const adminEmail = Deno.env.get('ADMIN_EMAIL') || 'trailfusionai@gmail.com';

    if (resendApiKey) {
      try {
        await sendAdminNotification(
          resendApiKey,
          adminEmail,
          submission,
          extractedData,
          confidenceScore,
          supabaseUrl
        );
        console.log('Admin notification email sent successfully');
      } catch (emailError) {
        console.error('Failed to send admin notification:', emailError);
        // メール送信失敗してもエラーにしない（投稿処理は成功）
      }
    } else {
      console.warn('RESEND_API_KEY not found, skipping email notification');
    }

    return new Response(
      JSON.stringify({
        success: true,
        submissionId,
        extractedData,
        confidenceScore,
        status: 'pending',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Edge Function Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Unknown error occurred',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

/**
 * Gemini 2.5 Flash で画像から直接駐車場データを抽出
 * JSON Schema による構造化出力を使用（公式推奨方法）
 */
async function extractParkingDataWithGemini(
  base64Image: string,
  geminiApiKey: string | undefined
): Promise<any> {
  // APIキーがない場合はデフォルト値を返す
  if (!geminiApiKey) {
    console.warn('⚠️ Gemini API key not found, returning default data');
    return {
      rates: [],
      hours: {
        hours: '24:00',
        is_24h: true,
        original_hours: '24時間営業',
      },
    };
  }

  // JSON Schema による構造定義（Gemini公式の推奨方法）
  const responseSchema = {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: '駐車場名（看板の最も大きく目立つ文字、ブランド名）',
        nullable: true,
      },
      rates: {
        type: 'array',
        description: '料金情報の配列',
        items: {
          type: 'object',
          properties: {
            minutes: {
              type: 'integer',
              description: '時間（分単位）',
            },
            price: {
              type: 'integer',
              description: '料金（円）',
            },
            type: {
              type: 'string',
              description: '料金タイプ: base（基本料金）, progressive（段階料金）, max（最大料金）',
              enum: ['base', 'progressive', 'max'],
            },
            time_range: {
              type: 'string',
              description: '時間帯（例: 18:00〜10:00）',
              nullable: true,
            },
            day_type: {
              type: 'string',
              description: '曜日タイプ（例: 平日、土日祝）',
              nullable: true,
            },
            apply_after: {
              type: 'integer',
              description: 'progressive料金の場合、何分後から適用されるか',
              nullable: true,
            },
          },
          required: ['minutes', 'price', 'type'],
        },
      },
      capacity: {
        type: 'integer',
        description: '収容台数',
        nullable: true,
      },
      hours: {
        type: 'object',
        description: '営業時間情報',
        properties: {
          original_hours: {
            type: 'string',
            description: '元のテキスト',
          },
          is_24h: {
            type: 'boolean',
            description: '24時間営業かどうか',
          },
          hours: {
            type: 'string',
            description: '営業時間（例: 24:00, 8:00〜22:00）',
          },
          schedules: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                days: {
                  type: 'array',
                  items: { type: 'string' },
                },
                time: { type: 'string' },
              },
            },
          },
          operating_days: {
            type: 'array',
            items: { type: 'string' },
          },
          restrictions: {
            type: 'array',
            items: { type: 'string' },
          },
          holidays: {
            type: 'array',
            items: { type: 'string' },
          },
          closed_days: {
            type: 'array',
            items: { type: 'string' },
          },
          access_24h: {
            type: 'boolean',
          },
        },
        required: ['original_hours', 'is_24h', 'hours'],
      },
      address: {
        type: 'string',
        description: '住所',
        nullable: true,
      },
      phone_number: {
        type: 'string',
        description: '電話番号',
        nullable: true,
      },
    },
    required: ['rates', 'hours'],
  };

  // 駐車場料金正規化プロンプト（完全版）
  const extractionPrompt = `この駐車場看板の画像から以下の情報を抽出してください：

## 基本情報の抽出：
1. **駐車場名** - 看板に大きく表示されているブランド名や施設名
2. **料金情報** - すべての料金パターン（必ず正規化ルールに従う）
3. **収容台数** - 「○台」と書かれている数字
4. **営業時間** - 24時間営業かどうか、営業時間帯
5. **住所** - 表示されている場合
6. **電話番号** - 表示されている場合

## 料金タイプ（type）の判定ルール【重要】

### 1. base（基本料金）
**定義：** 通常の時間単位料金
**キーワード：** 「○分¥○」「○時間¥○」（「以降」「最初」がない場合）
**例：**
- 「30分¥200」→ type: base, price: 200, minutes: 30
- 「60分¥300」→ type: base, price: 300, minutes: 60
- 「12分¥200」→ type: base, price: 200, minutes: 12

### 2. progressive（段階料金）
**定義：** 初回料金と以降料金が異なる場合
**キーワード：** 「最初の」「初回」「以降」「以後」「毎」
**必須フィールド：** apply_after（初回料金が適用される時間後）
**例：**
- 「最初の1時間¥360以降20分毎¥120」
  → [
      {type: "base", price: 360, minutes: 60},
      {type: "progressive", price: 120, minutes: 20, apply_after: 60}
    ]
- 「入庫後30分迄¥100以降30分¥200」
  → [
      {type: "base", price: 100, minutes: 30},
      {type: "progressive", price: 200, minutes: 30, apply_after: 30}
    ]

### 3. max（最大料金）
**定義：** 料金の上限設定
**キーワード：** 「最大料金」「上限」「打止」「打切」「宿泊料金」「○時間以内」「○時間迄」
**minutes計算ルール：**
- 「入庫後24時間」「当日24時迄」→ 1440分
- 「入庫後12時間」→ 720分
- 「入庫後6時間」→ 360分
- 「入庫後3時間」→ 180分
- 時間帯指定の場合は実際の時間を計算
  - 「20:00～8:00」→ 720分（12時間）
  - 「22:00～8:00」→ 600分（10時間）
  - 「23:00～7:30」→ 510分（8時間30分）
**例：**
- 「最大料金 全日 入庫後24時間¥1000」→ type: max, price: 1000, minutes: 1440
- 「最大料金 20:00～8:00 ¥300」→ type: max, price: 300, minutes: 720, time_range: "20:00～8:00"

## 曜日タイプ（day_type）の判定ルール

| 元の表記 | day_typeの値 |
|---------|-------------|
| 月～金、平日 | "月～金" |
| 土日祝 | "土日祝" |
| 土のみ | "土" |
| 日祝 | "日祝" |
| 全日 | **省略**（他の曜日設定がない場合） |

**重要：** 「全日」は基本的に省略。他の曜日別料金と併用される場合のみ明示的に記載。

## 時間帯（time_range）の記録ルール

- 時間指定がある場合のみ追加（例：「8:00～22:00」）
- 日またぎも含めてそのまま記録（例：「22:00～8:00」）
- 「0:00～24:00」は全日の意味なので**省略可能**
- 「8:00～8:00」は24時間の意味なので**省略推奨**

## 特殊ケースの処理

### 無料駐車場
type: max, price: 0, minutes: 1440

### 条件付き無料
「入庫後20分迄無料」などの条件付き無料がある場合：
- 無料時間も base タイプとして記録（price: 0）
- その後の料金は progressive タイプで記録
**例：** 「入庫後20分迄無料以降20分¥100」
  → [
      {type: "base", price: 0, minutes: 20},
      {type: "progressive", price: 100, minutes: 20, apply_after: 20}
    ]

### 除外すべき情報
- 括弧内の車室番号別料金：「(1･4･5番車室¥1000)」→ 無視
- 繰り返し適用の注記：「※最大料金は繰り返し適用となります」→ 無視
- 曜日による変動の注記：「※最大料金は入庫時の曜日により異なります」→ 無視
- 「(1回限り)」「(繰返し有)」などの説明文 → 無視

## チェックリスト【必ず確認】

✅ 料金タイプは正しく判定されているか
- baseは通常料金
- progressiveは「以降」がある場合のみ（apply_after必須）
- maxは最大料金・上限料金・宿泊料金

✅ minutesは分単位で正しく計算されているか
- 1時間 = 60分
- 24時間 = 1440分
- 12時間 = 720分
- 6時間 = 360分

✅ day_typeは適切に設定されているか
- 「全日」は基本的に省略
- 「月～金」「土日祝」など明確に指定

✅ 不要な情報は除外されているか
- 車室番号別料金は無視
- 繰り返し適用の注記は無視

## 最重要ポイント

1. **「最大料金」という文字があれば必ずmaxタイプを含める**
2. **progressiveタイプには必ずapply_afterを付ける**
3. **minutesは必ず分単位の数値で記録**
4. **priceは¥記号を付けずに数値のみ**
5. **「全日」のday_typeは基本的に省略**
6. **括弧内の特殊料金は無視**

## 正規化の例

例：「入庫後1時間¥200 夜間 18:00～8:00 ¥100/時間 最大料金 24時間¥600 夜間最大 18:00～8:00 ¥400」
→ [
    {type: "base", price: 200, minutes: 60},
    {type: "base", price: 100, minutes: 60, time_range: "18:00～8:00"},
    {type: "max", price: 600, minutes: 1440},
    {type: "max", price: 400, minutes: 840, time_range: "18:00～8:00"}
  ]

このルールに従えば、100%正確に駐車場料金を正規化できます。`;

  try {
    console.log('🤖 Gemini 2.5 Flash (JSON Schema) を呼び出し中...');

    // タイムアウト設定（30秒）
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      // Gemini 2.5 Flash を使用（v1beta API + JSON Schema）
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
          body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  inline_data: {
                    mime_type: 'image/jpeg',
                    data: base64Image,
                  },
                },
                {
                  text: extractionPrompt,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 8192,
            topP: 0.95,
            topK: 40,
            responseMimeType: 'application/json', // JSON出力を強制
            responseSchema: responseSchema, // スキーマで構造を定義
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Gemini API error: ${response.status}`, errorText);

      // レート制限エラーの場合は特別なメッセージ
      if (response.status === 429) {
        throw new Error('Gemini API レート制限に達しました。1分後に再度お試しください。');
      }

      throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
    }

      clearTimeout(timeoutId);

      const result = await response.json();
      const geminiText = result.candidates?.[0]?.content?.parts?.[0]?.text || '{}';

      console.log('🤖 Gemini 2.5 Flash API 生レスポンス (JSON Schema):');
    console.log('='.repeat(80));
    console.log(geminiText);
    console.log('='.repeat(80));

    // JSON Schemaを使用しているため、直接パース可能
    let parsedData;
    try {
      parsedData = JSON.parse(geminiText);
      console.log('✅ JSON パース成功（Schema駆動）');
    } catch (parseError) {
      console.error('❌ JSON パースエラー:', parseError);
      console.error('パースしようとした文字列:', geminiText.substring(0, 500));
      throw new Error(`JSON parse failed: ${parseError.message}`);
    }

    // rates配列のフィールド順序を正規化（minutes → price → type → その他）
    const normalizedRates = Array.isArray(parsedData.rates)
      ? parsedData.rates.map((rate: any) => {
          const normalized: any = {};
          // 必須フィールドを正しい順序で追加
          if (rate.minutes !== undefined) normalized.minutes = rate.minutes;
          if (rate.price !== undefined) normalized.price = rate.price;
          if (rate.type) normalized.type = rate.type;
          // オプショナルフィールドを追加
          if (rate.time_range) normalized.time_range = rate.time_range;
          if (rate.day_type) normalized.day_type = rate.day_type;
          if (rate.apply_after !== undefined) normalized.apply_after = rate.apply_after;
          return normalized;
        })
      : [];

    // hours オブジェクトを正規化（既存データ構造に完全一致）
    let normalizedHours = parsedData.hours;
    if (parsedData.hours && !parsedData.hours.schedules) {
      // Gemini が簡略版を返した場合、完全な構造に変換
      const is24h = parsedData.hours.is_24h || false;
      normalizedHours = {
        original_hours: parsedData.hours.original_hours || (is24h ? '24時間営業' : parsedData.hours.hours || ''),
        is_24h: is24h,
        schedules: [
          {
            days: ['毎日'],
            time: is24h ? '24:00' : parsedData.hours.hours || '24:00',
          },
        ],
        hours: is24h ? '24:00' : parsedData.hours.hours || '24:00',
        operating_days: ['毎日'],
        restrictions: [],
        holidays: is24h ? ['無休'] : [],
        closed_days: [],
        access_24h: is24h,
      };
    }

    // ExtractedData型に変換
    const extractedData = {
      name: parsedData.name || undefined,
      rates: normalizedRates,
      capacity: typeof parsedData.capacity === 'number' ? parsedData.capacity : undefined,
      hours: normalizedHours || {
        original_hours: '24時間営業',
        is_24h: true,
        schedules: [{ days: ['毎日'], time: '24:00' }],
        hours: '24:00',
        operating_days: ['毎日'],
        restrictions: [],
        holidays: ['無休'],
        closed_days: [],
        access_24h: true,
      },
      address: parsedData.address || undefined,
      phone_number: parsedData.phone_number || undefined,
    };

      console.log('✅ Gemini でデータ抽出成功（正規化後）:', extractedData);
      return extractedData;
    } catch (fetchError: any) {
      clearTimeout(timeoutId);

      // タイムアウトエラーの処理
      if (fetchError.name === 'AbortError') {
        console.error('⏱️ Gemini API タイムアウト (30秒)');
        throw new Error('Gemini API タイムアウト: 30秒以内に応答がありませんでした。画像サイズを小さくするか、後でもう一度お試しください。');
      }

      // その他のfetchエラー
      throw fetchError;
    }
  } catch (error) {
    console.error('❌ Gemini API エラー:', error);
    // エラー時はデフォルト値を返す
    return {
      rates: [],
      hours: {
        hours: '24:00',
        is_24h: true,
        original_hours: '24時間営業',
      },
    };
  }
}

/**
 * 信頼度スコアを計算
 */
function calculateConfidenceScore(extractedData: any): number {
  let score = 0;

  // 駐車場名が抽出できた
  if (extractedData.name) score += 0.3;

  // 料金情報が抽出できた
  if (extractedData.rates && extractedData.rates.length > 0) {
    score += 0.4;
    // 複数の料金パターンがある
    if (extractedData.rates.length >= 2) score += 0.1;
  }

  // 営業時間が抽出できた
  if (extractedData.hours) score += 0.1;

  // 収容台数が抽出できた
  if (extractedData.capacity) score += 0.05;

  // 住所が抽出できた
  if (extractedData.address) score += 0.05;

  // スコアを0-1の範囲にクランプ
  return Math.min(Math.max(score, 0), 1);
}

/**
 * 管理者にメール通知を送信（Resend API使用）
 */
async function sendAdminNotification(
  resendApiKey: string,
  adminEmail: string,
  submission: any,
  extractedData: any,
  confidenceScore: number,
  supabaseUrl: string
): Promise<void> {
  // 承認/却下用のリンク
  const approveUrl = `${supabaseUrl}/functions/v1/approve-submission?id=${submission.id}&action=approve`;
  const rejectUrl = `${supabaseUrl}/functions/v1/approve-submission?id=${submission.id}&action=reject`;

  // 抽出データをHTMLテーブルで整形
  const extractedDataHtml = `
    <h3>抽出されたデータ</h3>
    <table style="border-collapse: collapse; width: 100%; max-width: 600px;">
      <tr>
        <th style="border: 1px solid #ddd; padding: 8px; background-color: #f2f2f2; text-align: left;">項目</th>
        <th style="border: 1px solid #ddd; padding: 8px; background-color: #f2f2f2; text-align: left;">値</th>
      </tr>
      <tr>
        <td style="border: 1px solid #ddd; padding: 8px;">駐車場名</td>
        <td style="border: 1px solid #ddd; padding: 8px;">${extractedData.name || '未抽出'}</td>
      </tr>
      <tr>
        <td style="border: 1px solid #ddd; padding: 8px;">営業時間</td>
        <td style="border: 1px solid #ddd; padding: 8px;">${extractedData.hours || '未抽出'}</td>
      </tr>
      <tr>
        <td style="border: 1px solid #ddd; padding: 8px;">収容台数</td>
        <td style="border: 1px solid #ddd; padding: 8px;">${extractedData.capacity || '未抽出'}</td>
      </tr>
      <tr>
        <td style="border: 1px solid #ddd; padding: 8px;">住所</td>
        <td style="border: 1px solid #ddd; padding: 8px;">${extractedData.address || '未抽出'}</td>
      </tr>
      <tr>
        <td style="border: 1px solid #ddd; padding: 8px;">電話番号</td>
        <td style="border: 1px solid #ddd; padding: 8px;">${extractedData.phone || '未抽出'}</td>
      </tr>
    </table>

    <h4>料金情報</h4>
    <table style="border-collapse: collapse; width: 100%; max-width: 600px;">
      <tr>
        <th style="border: 1px solid #ddd; padding: 8px; background-color: #f2f2f2; text-align: left;">タイプ</th>
        <th style="border: 1px solid #ddd; padding: 8px; background-color: #f2f2f2; text-align: left;">時間</th>
        <th style="border: 1px solid #ddd; padding: 8px; background-color: #f2f2f2; text-align: left;">料金</th>
        <th style="border: 1px solid #ddd; padding: 8px; background-color: #f2f2f2; text-align: left;">時間帯</th>
      </tr>
      ${
        extractedData.rates
          ?.map(
            (rate: any) => `
        <tr>
          <td style="border: 1px solid #ddd; padding: 8px;">${rate.type}</td>
          <td style="border: 1px solid #ddd; padding: 8px;">${rate.minutes}分</td>
          <td style="border: 1px solid #ddd; padding: 8px;">¥${rate.price}</td>
          <td style="border: 1px solid #ddd; padding: 8px;">${rate.time_range || '-'}</td>
        </tr>
      `
          )
          .join('') ||
        '<tr><td colspan="4" style="border: 1px solid #ddd; padding: 8px; text-align: center;">料金情報なし</td></tr>'
      }
    </table>

    <h4>位置情報</h4>
    <p>緯度: ${submission.latitude}<br>経度: ${submission.longitude}</p>
    <p><a href="https://www.google.com/maps?q=${submission.latitude},${submission.longitude}" target="_blank">Google Mapsで開く</a></p>

    <h4>JSON データ (デバッグ用)</h4>
    <pre style="background-color: #f5f5f5; padding: 10px; border-radius: 5px; overflow-x: auto;">${JSON.stringify(
      extractedData,
      null,
      2
    )}</pre>
  `;

  // HTMLメール本文
  const htmlBody = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>新規駐車場投稿 - 承認待ち</title>
    </head>
    <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #1976d2; border-bottom: 2px solid #1976d2; padding-bottom: 10px;">🅿️ 新規駐車場投稿 - 承認待ち</h2>

      <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <p><strong>投稿ID:</strong> ${submission.id}</p>
        <p><strong>投稿タイプ:</strong> ${
          submission.submission_type === 'new_parking' ? '新規駐車場' : '料金更新'
        }</p>
        <p><strong>信頼度スコア:</strong> ${(confidenceScore * 100).toFixed(1)}%</p>
        <p><strong>ステータス:</strong> ${submission.status}</p>
        <p><strong>投稿日時:</strong> ${new Date(submission.created_at).toLocaleString('ja-JP')}</p>
        ${submission.user_notes ? `<p><strong>ユーザーメモ:</strong> ${submission.user_notes}</p>` : ''}
      </div>

      <h3>📸 投稿画像</h3>
      <p><a href="${submission.image_url}" target="_blank">画像を開く</a></p>
      <img src="${submission.image_url}" alt="駐車場画像" style="max-width: 100%; height: auto; border: 1px solid #ddd; border-radius: 5px;" />

      ${extractedDataHtml}

      <div style="margin: 30px 0; padding: 20px; background-color: #e3f2fd; border-radius: 5px;">
        <h3 style="margin-top: 0;">✅ アクション</h3>
        <p>以下のリンクをクリックして、この投稿を承認または却下してください：</p>
        <div style="margin: 20px 0;">
          <a href="${approveUrl}" style="display: inline-block; padding: 12px 24px; margin: 10px 10px 10px 0; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">✓ 承認する</a>
          <a href="${rejectUrl}" style="display: inline-block; padding: 12px 24px; margin: 10px 0; background-color: #f44336; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">✗ 却下する</a>
        </div>
        <p style="font-size: 12px; color: #666;">※ リンクをクリックすると、データベースが自動的に更新されます。</p>
      </div>

      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666;">
        <p>このメールは CAR Concierge アプリの駐車場投稿システムから自動送信されています。</p>
        <p>管理画面: <a href="${supabaseUrl.replace(
          '/functions/v1',
          ''
        )}/project/_/editor">Supabase Dashboard</a></p>
      </div>
    </body>
    </html>
  `;

  // Resend API経由でメール送信
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'CAR Concierge <noreply@resend.dev>',
      to: [adminEmail],
      subject: `🅿️ 新規駐車場投稿 - ${extractedData.name || '名称未抽出'} [信頼度: ${(
        confidenceScore * 100
      ).toFixed(0)}%]`,
      html: htmlBody,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Resend API error: ${response.status} - ${error}`);
  }

  const result = await response.json();
  console.log('Email sent successfully:', result);
}

/**
 * 標高を取得（Open Elevation API使用）
 */
async function getElevation(latitude: number, longitude: number): Promise<number> {
  try {
    const response = await fetch(
      `https://api.open-elevation.com/api/v1/lookup?locations=${latitude},${longitude}`
    );

    if (!response.ok) {
      throw new Error(`Elevation API error: ${response.status}`);
    }

    const data = await response.json();
    const elevation = data.results?.[0]?.elevation;

    if (typeof elevation === 'number') {
      return Math.round(elevation); // 整数に丸める
    }

    throw new Error('Invalid elevation data');
  } catch (error) {
    console.error('標高取得エラー:', error);
    // エラー時はデフォルト値を返す
    return 0;
  }
}

/**
 * 最寄りの施設を取得（Supabaseデータベースから）
 * 範囲指定で絞り込んでから距離計算を行う
 */
async function getNearbyFacilities(
  supabase: any,
  latitude: number,
  longitude: number
): Promise<any> {
  const result: any = {};

  // 検索範囲（緯度経度で±0.5度 ≈ 約55km四方）
  const searchRadius = 0.5;
  const minLat = latitude - searchRadius;
  const maxLat = latitude + searchRadius;
  const minLng = longitude - searchRadius;
  const maxLng = longitude + searchRadius;

  console.log(
    `🔍 検索範囲: 緯度 ${minLat.toFixed(4)}～${maxLat.toFixed(4)}, 経度 ${minLng.toFixed(
      4
    )}～${maxLng.toFixed(4)}`
  );

  // 最寄りのコンビニを取得
  try {
    const { data: convenienceStores, error } = await supabase
      .from('convenience_stores')
      .select('id, name, lat, lng')
      .not('lat', 'is', null)
      .not('lng', 'is', null)
      .gte('lat', minLat)
      .lte('lat', maxLat)
      .gte('lng', minLng)
      .lte('lng', maxLng);

    if (error) {
      throw error;
    }

    console.log(`📍 コンビニ検索結果: ${convenienceStores?.length || 0}件`);

    if (convenienceStores && convenienceStores.length > 0) {
      let nearest = null;
      let minDistance = Infinity;

      for (const store of convenienceStores) {
        const distance = calculateDistance(latitude, longitude, store.lat, store.lng);
        if (distance < minDistance) {
          minDistance = distance;
          nearest = {
            id: store.id,
            name: store.name,
            distance: Math.round(distance),
          };
        }
      }

      if (nearest) {
        result.convenience_store = nearest;
        console.log(`✅ 最寄りコンビニ: ${nearest.name} (${nearest.distance}m)`);
      }
    }
  } catch (error) {
    console.error('コンビニ取得エラー:', error);
  }

  // 最寄りのトイレを取得
  try {
    const { data: toilets, error } = await supabase
      .from('toilets')
      .select('id, name, lat, lng')
      .not('lat', 'is', null)
      .not('lng', 'is', null)
      .gte('lat', minLat)
      .lte('lat', maxLat)
      .gte('lng', minLng)
      .lte('lng', maxLng);

    if (error) {
      throw error;
    }

    console.log(`📍 トイレ検索結果: ${toilets?.length || 0}件`);

    if (toilets && toilets.length > 0) {
      let nearest = null;
      let minDistance = Infinity;

      for (const toilet of toilets) {
        const distance = calculateDistance(latitude, longitude, toilet.lat, toilet.lng);
        if (distance < minDistance) {
          minDistance = distance;
          nearest = {
            id: toilet.id,
            name: toilet.name,
            distance: Math.round(distance),
          };
        }
      }

      if (nearest) {
        result.toilet = nearest;
        console.log(`✅ 最寄りトイレ: ${nearest.name} (${nearest.distance}m)`);
      }
    }
  } catch (error) {
    console.error('トイレ取得エラー:', error);
  }

  // 最寄りの温泉を取得
  try {
    const { data: hotSprings, error } = await supabase
      .from('hot_springs')
      .select('id, name, lat, lng')
      .not('lat', 'is', null)
      .not('lng', 'is', null)
      .gte('lat', minLat)
      .lte('lat', maxLat)
      .gte('lng', minLng)
      .lte('lng', maxLng);

    if (error) {
      throw error;
    }

    console.log(`📍 温泉検索結果: ${hotSprings?.length || 0}件`);

    if (hotSprings && hotSprings.length > 0) {
      let nearest = null;
      let minDistance = Infinity;

      for (const hotSpring of hotSprings) {
        const distance = calculateDistance(latitude, longitude, hotSpring.lat, hotSpring.lng);
        if (distance < minDistance) {
          minDistance = distance;
          nearest = {
            id: hotSpring.id,
            name: hotSpring.name,
            distance: Math.round(distance),
          };
        }
      }

      if (nearest) {
        result.hot_spring = nearest;
        console.log(`✅ 最寄り温泉: ${nearest.name} (${nearest.distance}m)`);
      }
    }
  } catch (error) {
    console.error('温泉取得エラー:', error);
  }

  return result;
}

/**
 * 2点間の距離を計算（Haversine公式）
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // 地球の半径（メートル）
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // メートル単位の距離
}
