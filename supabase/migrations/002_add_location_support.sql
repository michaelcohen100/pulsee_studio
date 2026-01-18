-- Migration: Add LOCATION support for Studio Photo Pulsee
-- Run this in your Supabase SQL Editor

-- ============================================
-- UPDATE PROFILES TYPE CONSTRAINT
-- ============================================

-- Drop existing constraint and add new one with LOCATION
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_type_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_type_check 
  CHECK (type IN ('PERSON', 'PRODUCT', 'LOCATION'));

-- ============================================
-- ADD LOCATION_ID TO GALLERY
-- ============================================

ALTER TABLE gallery ADD COLUMN IF NOT EXISTS location_id TEXT;

-- Create index for location queries
CREATE INDEX IF NOT EXISTS idx_gallery_location ON gallery(location_id);
