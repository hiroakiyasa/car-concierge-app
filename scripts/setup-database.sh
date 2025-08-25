#!/bin/bash

# Supabase project details
PROJECT_ID="jhqnypyxrkwdrgutzttf"
DATABASE_URL="postgresql://postgres.jhqnypyxrkwdrgutzttf:ry45UhbUubH7_Y5@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres"

echo "🚀 Setting up Supabase database..."

# Create tables
echo "📊 Creating database tables..."
psql "$DATABASE_URL" -f supabase/schema.sql

if [ $? -eq 0 ]; then
    echo "✅ Tables created successfully!"
else
    echo "❌ Error creating tables"
    exit 1
fi

# Insert test data
echo "🔧 Inserting test data..."
psql "$DATABASE_URL" -f supabase/seed.sql

if [ $? -eq 0 ]; then
    echo "✅ Test data inserted successfully!"
else
    echo "❌ Error inserting test data"
    exit 1
fi

echo "🎉 Database setup completed successfully!"
echo ""
echo "📱 You can now run the app with: npm start"