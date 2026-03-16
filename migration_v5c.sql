-- MIGRATION V5c — Correction scope MVP & V1
-- À lancer dans Supabase SQL Editor

-- Supprimer les anciens scopes incorrects
DELETE FROM wiki_sections WHERE section IN ('mvp_scope', 'v1_scope');

-- Réinsérer avec le bon contenu
INSERT INTO wiki_sections (page, section, title, content, sort_order) VALUES

('mvp', 'mvp_scope', 'Scope MVP — Ce qui est dedans', '[
  {"cat": "Accueil", "items": [
    "En-tête (Toulouse, notif)",
    "Autour de moi — 5 lieux les plus proches",
    "Au cœur de ton Cercle — 5 lieux aimés par tes amis (faux amis injectés en MVP)",
    "Pré-recherches rapides — 3 mix Mood/Type (rotation quotidienne à 6h)",
    "Tendance"
  ]},
  {"cat": "Recherche", "items": [
    "Choix grand type de lieu (Bar / Resto / SDT) + date + heure",
    "Roue Mood",
    "Roue Type de lieu",
    "Résultats top 5 — mock data (pas le vrai SpotScore)",
    "CTA J''y vais sur les cartes",
    "Bouton Filtres"
  ]},
  {"cat": "Profil", "items": [
    "Favoris",
    "À tester",
    "Déconnexion",
    "Suppression compte"
  ]},
  {"cat": "Ce qui est ABSENT du MVP", "items": [
    "❌ Onglet Social — absent totalement",
    "❌ SpotScore réel — mock data uniquement",
    "❌ Ajout d''amis réels",
    "❌ Onboarding séquentiel",
    "❌ Spot du jour, Events, Playlists"
  ]}
]', 5),

('mvp', 'v1_scope', 'Scope V1 — Ce qui s''ajoute au lancement septembre', '[
  {"cat": "Accueil", "items": [
    "Spot du jour — reveal à 10h, badge valable toute la journée (lieu premium/partenaire + VenueScore > 70)",
    "Events du jour mis en avant",
    "Playlists user — 5 playlists les plus remplies, lecture depuis accueil"
  ]},
  {"cat": "Recherche", "items": [
    "Bouton Map sur les résultats — affiche les lieux ouverts sur une carte",
    "Résultats basés sur le vrai SpotScore (plus de mock data)"
  ]},
  {"cat": "Social — activé en V1", "items": [
    "Feed amis — check-ins publics + recos + favoris, triés par temps (sans heure exacte, anti-stalk)",
    "Bouton amis/notifs dans la nav",
    "Ajout ami — QR code ou ID unique",
    "Amitié réciproque obligatoire",
    "Notification ajout ami (demande + acceptation uniquement)",
    "Suppression ami depuis profil uniquement (pas de notif à la personne supprimée)"
  ]},
  {"cat": "Profil", "items": [
    "Modification photo + infos (hors email)",
    "Liste amis + suppression",
    "Recos passées + suppression",
    "Bookmarks & favoris + suppression",
    "Playlists — création, modification, suppression, retirer un lieu",
    "Gestion des masqués (sortir les blacklistés)",
    "Réglages : check-in public par défaut, ville par défaut, moods préférés"
  ]},
  {"cat": "SpotScore réel", "items": [
    "VenueScore activé — 40% check-ins + 30% recos + 30% cohérence mood",
    "SocialScore activé — MatchScore basé sur amis réels",
    "ContextMultiplier activé",
    "Cold start VenueScore = moyenne du segment"
  ]},
  {"cat": "Onboarding", "items": [
    "Flux séquentiel : compte → ajouter 3 amis (skippable avec friction) → GIF check-in 8s → accueil",
    "Micro-étiquette contextuelle au premier check-in",
    "Si H3 < 50% en MVP → GIF obligatoire non skippable"
  ]}
]', 6);
