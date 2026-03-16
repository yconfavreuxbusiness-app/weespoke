-- MIGRATION V4 — Table Ressources
-- À lancer dans Supabase SQL Editor

CREATE TABLE resources (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  url TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('link', 'document', 'asset')),
  category TEXT NOT NULL CHECK (category IN ('Dev', 'Administratif', 'Design', 'Commercial')),
  added_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON resources FOR ALL USING (true) WITH CHECK (true);
