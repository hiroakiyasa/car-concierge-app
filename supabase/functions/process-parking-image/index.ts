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
 * Gemini Flash で画像から直接駐車場データを抽出
 * Gemini 2.0 Flash Experimental はマルチモーダルモデルで画像入力に対応
 * より高精度なOCRと理解能力を提供
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

  const extractionPrompt = `あなたは駐車場看板の画像から情報を抽出する専門AIです。

# 重要指示

画像内の文字を **すべて** 読み取り、以下の情報を抽出してJSON形式で出力してください。
**確信度が低くても、推測で構いません。空欄で返さないでください。**

## 必須取得項目

### 1. 駐車場名（name）★絶対に抽出★
**抽出方法：**
- 看板の **最も大きく目立つ文字** がブランド名です
- 例：「名鉄協商パーキング」「タイムズ」「リパーク」「三井のリパーク」
- 地名も含める場合：「名鉄協商パーキング 三好が丘」
- **重要**：ブランド名だけでも必ず抽出してください

### 2. 料金情報（rates配列）★最重要★
画像内の**すべての料金情報**を以下のJSON構造で正規化してください：

**【重要】フィールド順序を必ず守ってください：minutes → price → type → その他**

\`\`\`json
{
  "minutes": 時間（分）,      // 必ず分単位で記録（最初のフィールド）
  "price": 料金（円）,        // 数値のみ（¥記号不要・2番目のフィールド）
  "type": "料金タイプ",      // base, progressive, max のいずれか（3番目のフィールド）
  "time_range": "時間帯",     // オプション（4番目）
  "day_type": "曜日タイプ",   // オプション（5番目）
  "apply_after": 適用開始時間  // progressiveタイプのみ必須（最後）
}
\`\`\`

## 料金タイプ（type）の判定ルール

### タイプ1: base（基本料金）
**定義：** 通常の時間単位料金
**キーワード：** 「○分¥○」「○時間¥○」（「以降」「最初」がない場合）
**変換例（フィールド順序を守る）：**
- 「30分¥200」→ {"minutes": 30, "price": 200, "type": "base"}
- 「60分¥300」→ {"minutes": 60, "price": 300, "type": "base"}
- 「12分¥200」→ {"minutes": 12, "price": 200, "type": "base"}
- 「月～金 8:00～20:00 30分¥200」→ {"minutes": 30, "price": 200, "type": "base", "time_range": "8:00～20:00", "day_type": "月～金"}

### タイプ2: progressive（段階料金）
**定義：** 初回料金と以降料金が異なる場合
**キーワード：** 「最初の」「初回」「以降」「以後」
**必須フィールド：** apply_after（初回料金が適用される時間後）
**変換例（フィールド順序を守る）：**
- 「最初の1時間¥360以降20分毎¥120」→
  [
    {"minutes": 60, "price": 360, "type": "base"},
    {"minutes": 20, "price": 120, "type": "progressive", "apply_after": 60}
  ]
- 「入庫後30分迄¥100以降30分¥200」→
  [
    {"minutes": 30, "price": 100, "type": "base"},
    {"minutes": 30, "price": 200, "type": "progressive", "apply_after": 30}
  ]

### タイプ3: max（最大料金）
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

**変換例（フィールド順序を守る）：**
- 「最大料金 全日 入庫後24時間¥1000」→ {"minutes": 1440, "price": 1000, "type": "max", "day_type": "全日"}
- 「最大料金 20:00～8:00 ¥300」→ {"minutes": 720, "price": 300, "type": "max", "time_range": "20:00～8:00"}
- 「宿泊料金(23:00～7:30)¥500」→ {"minutes": 510, "price": 500, "type": "max", "time_range": "23:00～7:30"}
- 「入庫から24時間まで ¥900」→ {"minutes": 1440, "price": 900, "type": "max"}

## その他の情報

### 3. 営業時間（hours）★既存データ構造に完全に合わせる★
以下の構造で出力してください：

\`\`\`json
{
  "original_hours": "元の営業時間データ",
  "is_24h": true または false,
  "schedules": [
    {"days": ["毎日"], "time": "24:00"}
  ],
  "hours": "24:00" または "8:00～22:00",
  "operating_days": ["毎日"],
  "restrictions": [],
  "holidays": ["無休"],
  "closed_days": [],
  "access_24h": true または false
}
\`\`\`

**判定ルール：**
- 24時間営業の場合:
  - is_24h: true
  - schedules: [{"days": ["毎日"], "time": "24:00"}]
  - hours: "24:00"
  - operating_days: ["毎日"]
  - holidays: ["無休"]
  - access_24h: true

- 時間指定がある場合（例：8:00〜22:00）:
  - is_24h: false
  - schedules: [{"days": ["毎日"], "time": "8:00〜22:00"}]
  - hours: "8:00〜22:00"
  - operating_days: ["毎日"]
  - holidays: [] (記載がない場合)
  - access_24h: false

### 4. 収容台数（capacity）
- 「20台」→ 20（数値のみ）

### 5. 住所（address）
- 都道府県名を含む住所

### 6. 電話番号（phone_number）
- TEL表記も含む

## 出力形式（必ずJSON形式のみ）

**【重要】rates配列のフィールド順序：minutes → price → type → その他**

{
  "name": "ブランド名 地名",
  "rates": [
    {"minutes": 60, "price": 200, "type": "base", "time_range": "8:00～18:00"},
    {"minutes": 60, "price": 100, "type": "base", "time_range": "18:00～8:00"},
    {"minutes": 1440, "price": 600, "type": "max"},
    {"minutes": 840, "price": 400, "type": "max", "time_range": "18:00～8:00"}
  ],
  "capacity": 20,
  "hours": {
    "original_hours": "24時間営業, 定休日: 無休",
    "is_24h": true,
    "schedules": [{"days": ["毎日"], "time": "24:00"}],
    "hours": "24:00",
    "operating_days": ["毎日"],
    "restrictions": [],
    "holidays": ["無休"],
    "closed_days": [],
    "access_24h": true
  },
  "address": "愛知県○○市...",
  "phone_number": "0120-XXX-XXX"
}

## 最重要チェックリスト

✅ **name（駐車場名）は「ブランド名 + 地名」形式で抽出**
✅ **rates配列のフィールド順序：minutes → price → type → その他（必須）**
✅ **「最大料金」という文字があれば必ずmaxタイプを含める**
✅ **progressiveタイプには必ずapply_afterを付ける**
✅ **minutesは必ず分単位の数値で記録**
✅ **priceは¥記号を付けずに数値のみ**
✅ **hours オブジェクトは complete な構造で出力（original_hours, is_24h, schedules, hours, operating_days, restrictions, holidays, closed_days, access_24h）**
✅ **必ずJSON形式のみ出力** - 説明文・コードブロック（\`\`\`）は不要
✅ **rates配列は必ず含める** - 画像内のすべての料金を見落とさない

---

# 重要な最終指示

1. **駐車場名（name）と料金情報（rates）は絶対に抽出してください**
2. **rates配列の各要素は必ず minutes → price → type の順序で記述**
3. **hoursオブジェクトは既存データ構造と完全一致させる**
4. 確信度が低くても、画像に文字が見えれば必ず抽出してください
5. 「読み取れない」「不明」などの返答は禁止です
6. **純粋なJSON形式のみ出力**してください（説明文や\`\`\`は不要）

上記のルールに従って、駐車場情報をJSON形式で出力してください。`;

  try {
    console.log('🤖 Gemini 2.0 Flash Experimental を呼び出し中...');

    // Gemini 2.0 Flash Experimental を使用（最新の高性能モデル）
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: extractionPrompt,
                },
                {
                  inline_data: {
                    mime_type: 'image/jpeg',
                    data: base64Image,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 8192,
            topP: 0.95,
            topK: 40,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Gemini API error: ${response.status}`, errorText);
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    const geminiText = result.candidates?.[0]?.content?.parts?.[0]?.text || '{}';

    console.log('🤖 Gemini API 生レスポンス:');
    console.log('='.repeat(80));
    console.log(geminiText);
    console.log('='.repeat(80));

    // JSONを抽出（マークダウンのコードブロックを除去）
    let jsonText = geminiText.trim();

    // コードブロックの除去（複数パターンに対応）
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/^```json\n?/, '').replace(/\n?```$/, '');
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```\n?/, '').replace(/\n?```$/, '');
    }

    // 前後の空白を除去
    jsonText = jsonText.trim();

    console.log('📋 抽出されたJSON文字列:');
    console.log('='.repeat(80));
    console.log(jsonText);
    console.log('='.repeat(80));

    // JSONをパース
    let parsedData;
    try {
      parsedData = JSON.parse(jsonText);
      console.log('✅ JSON パース成功');
    } catch (parseError) {
      console.error('❌ JSON パースエラー:', parseError);
      console.error('パースしようとした文字列:', jsonText.substring(0, 500));
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
