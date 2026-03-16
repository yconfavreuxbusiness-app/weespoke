-- MIGRATION V5d — Scope MVP/V1 en tableau par écran
-- À lancer dans Supabase SQL Editor

DELETE FROM wiki_sections WHERE section IN ('mvp_scope', 'v1_scope', 'hypotheses', 'frictions', 'protocol', 'scenarios');

INSERT INTO wiki_sections (page, section, title, content, sort_order) VALUES

('mvp', 'scope_table', 'Scope MVP / V1 — par écran', '[
  {
    "screen": "🏠 Accueil",
    "mvp": ["Autour de moi (5 lieux proches)", "Au cœur de ton Cercle (faux amis injectés)", "Pré-recherches rapides (3 mix Mood/Type, rotation 6h)", "Tendance"],
    "v1": ["Spot du jour (reveal 10h, badge journée)", "Events du jour", "Playlists user (5 playlists les plus remplies)", "Faux amis remplacés par vrais amis"]
  },
  {
    "screen": "🔍 Recherche",
    "mvp": ["Choix grand type de lieu + date + heure", "Roue Mood", "Roue Type de lieu", "Top 5 résultats — mock data (pas le vrai SpotScore)", "CTA J''y vais", "Bouton Filtres"],
    "v1": ["Résultats basés sur le vrai SpotScore", "Bouton Map — carte des lieux ouverts"]
  },
  {
    "screen": "👤 Profil",
    "mvp": ["Favoris", "À tester", "Déconnexion", "Suppression compte"],
    "v1": ["Modification photo + infos", "Liste amis + suppression", "Recos passées", "Bookmarks & favoris", "Playlists (création, modif, suppression)", "Gestion des masqués", "Réglages (check-in public, ville, moods préférés)"]
  },
  {
    "screen": "👥 Social",
    "mvp": ["❌ Absent du MVP"],
    "v1": ["Feed amis (check-ins publics + recos + favoris)", "Bouton amis/notifs dans la nav", "Ajout ami (QR code ou ID unique)", "Amitié réciproque obligatoire", "Notif ajout ami uniquement (anti-stalk)", "Suppression ami depuis profil uniquement"]
  },
  {
    "screen": "⚡ SpotScore",
    "mvp": ["❌ Mock data — résultats simulés", "Pas d''algo réel en MVP"],
    "v1": ["VenueScore réel (40% check-ins + 30% recos + 30% mood)", "SocialScore réel (MatchScore amis)", "ContextMultiplier actif", "Cold start = moyenne du segment"]
  },
  {
    "screen": "🚀 Onboarding",
    "mvp": ["❌ Absent — accès direct à l''app brute (intentionnel pour ne pas biaiser H3)"],
    "v1": ["Compte → 3 amis (skippable avec friction) → GIF check-in 8s → accueil", "Micro-étiquette contextuelle au 1er check-in", "Si H3 < 50% en MVP → GIF obligatoire non skippable"]
  }
]', 1),

('mvp', 'hypotheses', 'Hypothèses à valider (H1-H4)', '[
  {"id": "H1", "label": "Compréhension recherche", "target": "≥ 80% comprennent la recherche sans aide"},
  {"id": "H2", "label": "Premier check-in", "target": "≥ 50% font un check-in"},
  {"id": "H3", "label": "Réponse à la reco", "target": "≥ 30% répondent à la reco différée"},
  {"id": "H4", "label": "Rétention J7", "target": "≥ 30% actifs à J7 — KPI maître"}
]', 2),

('mvp', 'frictions', 'Codification frictions', '[
  {"code": "F0", "label": "Fluide", "desc": "Aucune hésitation observable."},
  {"code": "F1", "label": "Micro friction", "desc": "Légère hésitation, récupération autonome."},
  {"code": "F2", "label": "Besoin d''aide", "desc": "Demande une explication ou un guidage."},
  {"code": "F3", "label": "Bloquant", "desc": "Ne peut pas continuer sans intervention. Seuil : F2/F3 × 3 = point structurel."}
]', 3),

('mvp', 'protocol', 'Protocole session test', 'Panel : 30 testeurs, 25-32 ans, sorties régulières, décisions de groupe fréquentes. 3-4 tests max/jour. 10 tests/semaine. 3 semaines. Script d''intro à lire mot pour mot : "On teste une nouvelle application qui aide à choisir une sortie différemment. On ne teste pas si l''idée te plaît." Règle fondamentale : ne pas défendre, ne pas argumenter, ne pas justifier. Observer, noter, analyser.', 4),

('mvp', 'scenarios', 'Scénarios post-lancement', '[
  {"id": "A", "label": "Validation forte", "condition": "Tous seuils atteints", "decision": "Maintien Toulouse, stabilisation 90 jours, documentation playbook."},
  {"id": "B", "label": "Densité OK, rétention faible", "condition": "Rétention < 30%", "decision": "Correction onboarding + UX ciblée. Blocage expansion."},
  {"id": "C", "label": "Volume sans densité", "condition": "< 50% avec ≥ 3 amis", "decision": "Concentration 2 écoles, activation micro-cercles, reset communication."},
  {"id": "D", "label": "Échec structurel", "condition": "Rétention < 20%", "decision": "Retour itération produit. Simplification radicale."}
]', 5);
