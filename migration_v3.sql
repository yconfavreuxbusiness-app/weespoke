-- MIGRATION V3 — Multi-assignation
-- À lancer dans Supabase SQL Editor

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS assigned_users UUID[] DEFAULT '{}';

-- Migrer les données existantes : copier assigned_to dans assigned_users
UPDATE tasks SET assigned_users = ARRAY[assigned_to] WHERE assigned_to IS NOT NULL AND (assigned_users IS NULL OR array_length(assigned_users, 1) IS NULL);
