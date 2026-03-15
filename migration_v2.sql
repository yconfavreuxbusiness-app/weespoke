-- MIGRATION V2 — À lancer dans Supabase SQL Editor
-- Ajoute le support des sous-tâches (3 niveaux)

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES tasks(id) ON DELETE CASCADE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 0;

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_tasks_parent_id ON tasks(parent_id);
