-- MIGRATION V6 — Validations multi-owners + Commentaires
-- À lancer dans Supabase SQL Editor

-- Colonne validations sur les tâches
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS validations UUID[] DEFAULT '{}';

-- Table commentaires
CREATE TABLE IF NOT EXISTS comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON comments FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_comments_task_id ON comments(task_id);
