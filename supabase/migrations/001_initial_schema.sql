-- Migration: Initial Schema for Studio Photo Pulsee
-- Run this in your Supabase SQL Editor

-- ============================================
-- PROFILES TABLE (Mannequins & Products)
-- ============================================

CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('PERSON', 'PRODUCT')),
  name TEXT NOT NULL,
  description TEXT,
  images TEXT[], -- Base64 strings or URLs
  dimensions TEXT,
  is_ai BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS (Row Level Security)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Allow public access (for demo purposes - adjust for production)
CREATE POLICY "Allow public read access on profiles" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert access on profiles" ON profiles
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update access on profiles" ON profiles
  FOR UPDATE USING (true);

CREATE POLICY "Allow public delete access on profiles" ON profiles
  FOR DELETE USING (true);

-- ============================================
-- GALLERY TABLE (Generated Images)
-- ============================================

CREATE TABLE IF NOT EXISTS gallery (
  id TEXT PRIMARY KEY,
  url TEXT NOT NULL,
  prompt TEXT,
  mode TEXT,
  product_id TEXT,
  person_id TEXT,
  style_id TEXT,
  feedback TEXT CHECK (feedback IS NULL OR feedback IN ('like', 'dislike')),
  timestamp BIGINT NOT NULL,
  parent_id TEXT,
  generation_time INTEGER,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for sorting by timestamp
CREATE INDEX IF NOT EXISTS idx_gallery_timestamp ON gallery(timestamp DESC);

-- Enable RLS
ALTER TABLE gallery ENABLE ROW LEVEL SECURITY;

-- Allow public access (for demo purposes)
CREATE POLICY "Allow public read access on gallery" ON gallery
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert access on gallery" ON gallery
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update access on gallery" ON gallery
  FOR UPDATE USING (true);

CREATE POLICY "Allow public delete access on gallery" ON gallery
  FOR DELETE USING (true);
