-- Supabase用のテーブル作成スクリプト

-- 駐車場テーブル
CREATE TABLE IF NOT EXISTS parking_spots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  lat DECIMAL(10, 8) NOT NULL,
  lng DECIMAL(11, 8) NOT NULL,
  category TEXT DEFAULT 'コインパーキング',
  address TEXT,
  type TEXT,
  description TEXT,
  rating DECIMAL(3, 2),
  prefecture TEXT,
  elevation DECIMAL(8, 2),
  
  -- 料金情報
  original_fees TEXT,
  rates JSONB DEFAULT '[]'::jsonb,
  calculated_fee DECIMAL(10, 2),
  
  -- 営業時間
  hours JSONB,
  is_24h BOOLEAN DEFAULT false,
  
  -- 施設情報
  capacity INTEGER,
  payment_methods TEXT,
  restrictions TEXT,
  vehicle_dimensions JSONB,
  
  -- 近隣施設
  nearest_convenience_store JSONB,
  nearest_hotspring JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- コンビニエンスストアテーブル
CREATE TABLE IF NOT EXISTS convenience_stores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  lat DECIMAL(10, 8) NOT NULL,
  lng DECIMAL(11, 8) NOT NULL,
  category TEXT DEFAULT 'コンビニ',
  address TEXT,
  sub_type TEXT,
  phone_number TEXT,
  operating_hours TEXT,
  brand TEXT,
  prefecture TEXT,
  elevation DECIMAL(8, 2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 温泉テーブル
CREATE TABLE IF NOT EXISTS hot_springs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  lat DECIMAL(10, 8) NOT NULL,
  lng DECIMAL(11, 8) NOT NULL,
  category TEXT DEFAULT '温泉',
  address TEXT,
  price TEXT,
  operating_hours TEXT,
  holiday_info TEXT,
  facility_type TEXT,
  rating DECIMAL(3, 2),
  prefecture TEXT,
  elevation DECIMAL(8, 2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ガソリンスタンドテーブル
CREATE TABLE IF NOT EXISTS gas_stations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  lat DECIMAL(10, 8) NOT NULL,
  lng DECIMAL(11, 8) NOT NULL,
  category TEXT DEFAULT 'ガソリンスタンド',
  address TEXT,
  brand TEXT,
  services TEXT[],
  operating_hours TEXT,
  prefecture TEXT,
  elevation DECIMAL(8, 2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- お祭り・花火大会テーブル
CREATE TABLE IF NOT EXISTS festivals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  lat DECIMAL(10, 8) NOT NULL,
  lng DECIMAL(11, 8) NOT NULL,
  category TEXT DEFAULT 'お祭り・花火大会',
  address TEXT,
  event_date DATE,
  event_time TEXT,
  description TEXT,
  prefecture TEXT,
  elevation DECIMAL(8, 2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックスの作成
CREATE INDEX idx_parking_spots_location ON parking_spots(lat, lng);
CREATE INDEX idx_parking_spots_category ON parking_spots(category);
CREATE INDEX idx_parking_spots_prefecture ON parking_spots(prefecture);
CREATE INDEX idx_parking_spots_is_24h ON parking_spots(is_24h);

CREATE INDEX idx_convenience_stores_location ON convenience_stores(lat, lng);
CREATE INDEX idx_convenience_stores_brand ON convenience_stores(brand);

CREATE INDEX idx_hot_springs_location ON hot_springs(lat, lng);

CREATE INDEX idx_gas_stations_location ON gas_stations(lat, lng);
CREATE INDEX idx_gas_stations_brand ON gas_stations(brand);

CREATE INDEX idx_festivals_location ON festivals(lat, lng);
CREATE INDEX idx_festivals_event_date ON festivals(event_date);

-- 空間インデックス用の関数（PostGIS拡張が必要な場合）
-- CREATE EXTENSION IF NOT EXISTS postgis;
-- ALTER TABLE parking_spots ADD COLUMN location GEOGRAPHY(POINT);
-- UPDATE parking_spots SET location = ST_MakePoint(lng, lat)::geography;
-- CREATE INDEX idx_parking_spots_geography ON parking_spots USING GIST(location);

-- Row Level Security (RLS) の設定
ALTER TABLE parking_spots ENABLE ROW LEVEL SECURITY;
ALTER TABLE convenience_stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE hot_springs ENABLE ROW LEVEL SECURITY;
ALTER TABLE gas_stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE festivals ENABLE ROW LEVEL SECURITY;

-- 読み取り専用のポリシー作成
CREATE POLICY "Allow public read access" ON parking_spots
  FOR SELECT USING (true);

CREATE POLICY "Allow public read access" ON convenience_stores
  FOR SELECT USING (true);

CREATE POLICY "Allow public read access" ON hot_springs
  FOR SELECT USING (true);

CREATE POLICY "Allow public read access" ON gas_stations
  FOR SELECT USING (true);

CREATE POLICY "Allow public read access" ON festivals
  FOR SELECT USING (true);