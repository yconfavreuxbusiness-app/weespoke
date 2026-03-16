-- MIGRATION V5b — Scope MVP & V1 + corrections
-- À lancer dans Supabase SQL Editor

-- Rename existing mvp page entries (already in DB) — no change needed for page name
-- Just add new sections for MVP scope and V1 scope

INSERT INTO wiki_sections (page, section, title, content, sort_order) VALUES

('mvp', 'mvp_scope', 'Scope MVP — Ce qui est dedans', '[
  {"cat": "Social", "items": ["Check-in (1 max/lieu/jour)", "Recommandation après check-in", "Ajout amis (QR code ou ID unique)", "Feed amis — activité visible", "Demande ami réciproque"]},
  {"cat": "Recherche", "items": ["Choix grand type de lieu (Bar / Resto / SDT)", "Roue Mood", "Roue Type de lieu", "Résultats top 5 SpotScore", "CTA j''y vais sur les cartes"]},
  {"cat": "Accueil", "items": ["Autour de moi — 5 lieux les plus proches", "Au cœur de ton Cercle — 5 lieux aimés par tes amis", "Pré-recherches rapides (3 mix Mood/Type)", "Spot du jour (premium/partenaire + VenueScore > 70)"]},
  {"cat": "Profil", "items": ["Création compte (prénom obligatoire)", "Photo de profil", "Historique check-ins", "Favoris"]},
  {"cat": "Algo", "items": ["SpotScore v1.0 complet (VenueScore + SocialScore + ContextMultiplier)", "Cold start VenueScore = moyenne segment"]}
]', 5),

('mvp', 'v1_scope', 'Scope V1 — Ce qui s''ajoute au lancement septembre', '[
  {"cat": "Social", "items": ["Bouton amis/notifs dans la nav", "Notification ajout ami (demande + acceptation)", "Suppression ami depuis profil uniquement", "Playlists perso (création/modif depuis profil, lecture depuis accueil)"]},
  {"cat": "Accueil", "items": ["Events du jour mis en avant (VenueScore)", "Playlists — 5 playlists les plus remplies du user", "Carrousel autour de moi étendu (+5 si pas assez précis)", "Tendance"]},
  {"cat": "Recherche", "items": ["Filtres supplémentaires", "Résultats étendus au-delà de 5"]},
  {"cat": "Onboarding", "items": ["Flux séquentiel complet : compte → 3 amis (skippable) → GIF check-in 8s → accueil", "Micro-étiquette contextuelle au premier check-in", "Condition : H3 < 50% → GIF obligatoire non skippable"]},
  {"cat": "Établissements", "items": ["Fiche établissement enrichie", "Gestion events", "Dashboard établissement (stats check-ins, recos)"]}
]', 6);
