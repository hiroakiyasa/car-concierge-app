// Node.js 18+ has built-in fetch

const SUPABASE_URL = 'https://jhqnypyxrkwdrgutzttf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpocW55cHl4cmt3ZHJndXR6dHRmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTE1OTkyMiwiZXhwIjoyMDcwNzM1OTIyfQ.RYzOyy09wv5G2tB4u2ykZMgBUY_uh7vJP030wAFwpmw';

async function checkParkingHours() {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/parking_spots?limit=5`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    console.log('🔍 駐車場データ数:', data.length);
    console.log('\n📊 各駐車場の営業時間データ:');
    console.log('================================');
    
    data.forEach((parking, index) => {
      console.log(`\n${index + 1}. ${parking.name}`);
      console.log('   is_24h:', parking.is_24h);
      console.log('   hours フィールド:', JSON.stringify(parking.hours, null, 2));
      console.log('   hours の型:', typeof parking.hours);
      
      if (parking.hours) {
        console.log('   hours 内のキー:', Object.keys(parking.hours));
        if (parking.hours.text) {
          console.log('   → text:', parking.hours.text);
        }
        if (parking.hours.is_24h !== undefined) {
          console.log('   → is_24h:', parking.hours.is_24h);
        }
      }
      console.log('   --------------------------------');
    });
    
  } catch (error) {
    console.error('エラー:', error);
  }
}

checkParkingHours();