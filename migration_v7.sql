-- MIGRATION V7 — Colonne mot de passe
-- À lancer dans Supabase SQL Editor

ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- Les mots de passe sont définis au premier login de chaque utilisateur
-- Aucune valeur à insérer ici
