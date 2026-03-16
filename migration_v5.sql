-- MIGRATION V5 — Table Wiki (contenu éditorial)
-- À lancer dans Supabase SQL Editor

CREATE TABLE wiki_sections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  page TEXT NOT NULL,       -- 'moods' | 'cold_start' | 'scripts' | 'spotscore' | 'mvp'
  section TEXT NOT NULL,    -- ex: 'bars_moods', 'mvp_testeurs'
  title TEXT NOT NULL,
  content TEXT NOT NULL,    -- JSON ou texte libre
  sort_order INTEGER DEFAULT 0,
  updated_by UUID REFERENCES users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE wiki_sections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON wiki_sections FOR ALL USING (true) WITH CHECK (true);

-- Seed initial content
INSERT INTO wiki_sections (page, section, title, content, sort_order) VALUES

-- MOODS — BARS
('moods', 'bars_moods', 'Bars — Moods', '[
  {"name": "Animé", "desc": "Pour vibrer, danser et sentir l''énergie autour de soi."},
  {"name": "Détente", "desc": "Pour relâcher la pression et profiter, tout simplement."},
  {"name": "Intime", "desc": "Pour se sentir en confiance et partager quelque chose de plus profond."},
  {"name": "Rencontre", "desc": "Pour échanger, créer du lien et faire des rencontres."},
  {"name": "Expérience", "desc": "Pour vivre une sortie différente, qui méritera d''être racontée."}
]', 1),

('moods', 'bars_types', 'Bars — Types', '[
  {"name": "À thème", "desc": "Un univers clair et identifiable dès les premières secondes."},
  {"name": "Signature", "desc": "Un standing et une exigence assumés."},
  {"name": "Dégustation", "desc": "Le respect du produit et du savoir-faire."},
  {"name": "Insolite", "desc": "Un concept volontairement décalé et surprenant."},
  {"name": "Étudiant", "desc": "Un lieu sans prise de tête, parce que tout est plus accessible."}
]', 2),

('moods', 'restaurants_moods', 'Restaurants — Moods', '[
  {"name": "La tablée", "desc": "Pour un moment convivial à plusieurs, sans regarder l''heure."},
  {"name": "Moment complice", "desc": "Pour un tête-à-tête ou une discussion qui compte vraiment."},
  {"name": "Plaisir gourmand", "desc": "Pour se faire plaisir, franchement et sans compromis."},
  {"name": "Sur le pouce", "desc": "Pour bien manger, même quand le temps manque."},
  {"name": "Découverte", "desc": "Pour sortir de ses habitudes et tenter autre chose."}
]', 3),

('moods', 'restaurants_types', 'Restaurants — Types', '[
  {"name": "Tapas & Partage", "desc": "Des plats pensés pour être partagés."},
  {"name": "Street Food", "desc": "Brut et gourmand, sur place comme à emporter."},
  {"name": "Cuisine du Monde", "desc": "Des spécialités qui racontent une culture."},
  {"name": "Traditionnel", "desc": "Des recettes qui traversent le temps."},
  {"name": "Healthy & Végé", "desc": "Une approche végétale et équilibrée."}
]', 4),

('moods', 'sdt_moods', 'Salons de thé — Moods', '[
  {"name": "Apaisant", "desc": "Pour ralentir et faire une pause dans la journée."},
  {"name": "Working", "desc": "Pour se concentrer et avancer au calme."},
  {"name": "Papoter", "desc": "Pour discuter tranquillement et rattraper le temps."},
  {"name": "Petits plaisirs", "desc": "Pour s''offrir un moment gourmand sans occasion particulière."},
  {"name": "Inspiration", "desc": "Pour changer d''air et laisser venir les idées."}
]', 5),

('moods', 'sdt_types', 'Salons de thé — Types', '[
  {"name": "Maison de thé", "desc": "Le thé comme rituel."},
  {"name": "Coffee shop", "desc": "Ici, tout commence par un café."},
  {"name": "Atelier sucré", "desc": "La création au service de la gourmandise."},
  {"name": "Autres horizons", "desc": "Une invitation au voyage."},
  {"name": "Hors du temps", "desc": "Le charme du temps suspendu."}
]', 6),

-- COLD START — MVP TESTEURS
('cold_start', 'mvp_dm1', 'DM MVP — Message d''accroche', 'salut [prénom] ! je sais que t''aimes bien sortir à Toulouse — je lance une app qui aide à choisir où aller selon l''ambiance que t''as envie de vivre ce soir. on cherche 30 personnes pour la tester en vrai avant le lancement officiel. ça te dirait d''être dans les premiers ?', 1),

('cold_start', 'mvp_dm2', 'DM MVP — Relance douce', 'hé, tu m''avais pas répondu — je comprends. juste pour préciser : c''est une session courte (45 min max) en face à face à Toulouse, et en échange t''as accès à l''app gratuitement pendant toute la phase de lancement. tu bosses sur iOS ou Android ?', 2),

('cold_start', 'mvp_dm3', 'DM MVP — Confirmation session', 'parfait ! je note [prénom] dans le panel. on se retrouve [lieu] le [date] vers [heure]. t''as juste à venir avec ton téléphone. je t''envoie un rappel la veille.', 3),

-- COLD START — PARTENAIRES
('cold_start', 'partner_intro', 'Accroche terrain (universelle)', 'Bonjour, je lance Weespoke à Toulouse. En résumé : on transforme vos meilleurs clients en ambassadeurs automatiques auprès de leurs amis. J''ai 3 minutes ?', 4),

('cold_start', 'partner_bars', 'Script Bars — Réalité terrain', 'Vos meilleurs clients — ceux qui reviennent, qui aiment l''ambiance — ils parlent déjà de vous. Mais ce bouche-à-oreille se perd dans des conversations privées. Vous n''en voyez rien, vous ne pouvez pas l''amplifier. Et les soirs creux — jeudi, dimanche — personne ne pense à vous parce que personne ne vous rappelle à ce moment-là.', 5),

('cold_start', 'partner_close', 'Clôture terrain', 'La fiche est déjà là. Votre rôle : valider ensemble, pas remplir. Ça prend 90 secondes. Les 30 premiers lieux ont un tarif pionnier bloqué à vie.', 6),

('cold_start', 'partner_objections', 'Objections fréquentes', '[
  {"obj": "J''ai déjà eu d''autres applis qui sont venues me voir", "rep": "On ne vous vend pas de la publicité. Votre classement dépend uniquement de ce que vos clients font sur l''app. Vous pouvez vérifier ça vous-même après 2 mois."},
  {"obj": "Je vais y réfléchir", "rep": "Qu''est-ce qui vous retient ? [Silence] Si c''est le coût, il est à zéro pendant 2 mois. Si c''est le temps, la fiche prend 3 minutes."},
  {"obj": "C''est une app étudiante, pas ma cible", "rep": "Les étudiants sont le carburant du démarrage, pas le plafond du modèle. Dans 90 jours, l''app fonctionne pour tous les 20-40 ans de Toulouse."},
  {"obj": "Comment je sais que vous allez durer ?", "rep": "L''entrée est gratuite pendant 2 mois, la sortie est libre. Le risque est asymétrique en votre faveur."}
]', 7),

-- SCRIPTS VICTOR
('scripts', 'rules', 'Règles d''or terrain', '[
  "Ne jamais dire ''algorithme''. Dire ''vos clients''.",
  "Ne jamais pitcher les prix avant qu''on vous demande.",
  "Montrer l''app sur téléphone dès que le gérant hésite. Une démo vaut 10 phrases.",
  "L''objectif de cette visite : créer la fiche. Rien d''autre.",
  "Si interlocuteur = manager salarié : demander ''vous pouvez en parler au gérant ?'' et laisser un contact.",
  "Sur une objection : ne pas argumenter immédiatement. Poser une question de retour. Silence. Laisser répondre.",
  "Finir chaque visite avec un nom + mail dans le suivi, même si la fiche n''est pas validée."
]', 1),

('scripts', 'words', 'Mots interdits → mots autorisés', '[
  {"bad": "Algorithme", "good": "Classement basé sur l''activité de vos clients"},
  {"bad": "Startup", "good": "On lance à Toulouse en septembre"},
  {"bad": "Réseau social", "good": "Bouche-à-oreille structuré"},
  {"bad": "Utilisateurs", "good": "Gens qui sortent à Toulouse"},
  {"bad": "On ne sait pas encore", "good": "C''est ce qu''on mesure — vous voyez les chiffres"}
]', 2),

-- SPOTSCORE
('spotscore', 'formula', 'Formule générale', 'SpotScore(U, L) = [(0.6 × VenueScore(L)) + (0.4 × SocialScore(U,L))] × ContextMultiplier', 1),

('spotscore', 'venuescore', 'VenueScore (60%)', '[
  {"label": "Composition", "detail": "40% Volume relatif de check-ins · 30% Ratio recommandations positives · 30% Cohérence mood déclaré / mood ressenti"},
  {"label": "Calcul", "detail": "Sur 30 jours glissants. Recalcul hebdomadaire. Comparaison uniquement à l''intérieur du même type de lieu."},
  {"label": "Cold Start", "detail": "< 15 check-ins sur 30 jours → VenueScore = Moyenne du segment (bars ~60, restos ~64). Ni boost, ni pénalité."}
]', 2),

('spotscore', 'socialscore', 'SocialScore (40%)', '[
  {"label": "Déclenchement", "detail": "Activé uniquement si reco explicite d''un ami."},
  {"label": "MatchScore", "detail": "Basé sur check-ins communs + favoris communs + recos similaires. Fenêtre 30 jours. < 2 signaux communs → MatchScore = 0."},
  {"label": "Calcul", "detail": "Moyenne des 3 meilleurs MatchScores parmi les amis ayant recommandé le lieu. 1 ami = ÷1 · 2 amis = ÷2 · 3 amis = ÷3."}
]', 3),

('spotscore', 'context', 'ContextMultiplier (±15% max)', '[
  {"label": "Distance bars", "detail": "0-1km →×1.00 · 1-3km →×0.95 · +3km →×0.90"},
  {"label": "Distance restos", "detail": "0-2km →×1.00 · 2-5km →×0.97 · +5km →×0.92"},
  {"label": "Mood match", "detail": "Principal →×1.05 · Secondaire →×1.03 · Aucun →×1.00"},
  {"label": "Favoris", "detail": "Déjà favori →×0.95 (favorise découverte)"},
  {"label": "Reco négative", "detail": "×0.85 · max 1 lieu négatif dans un top 5"},
  {"label": "Abonnement", "detail": "Freemium →×1.00 · Partenaire →×1.02 · Premium →×1.05"}
]', 4),

-- MVP/V1
('mvp', 'hypotheses', 'Hypothèses à valider (H1-H4)', '[
  {"id": "H1", "label": "Compréhension recherche", "target": "≥ 80% comprennent la recherche sans aide"},
  {"id": "H2", "label": "Premier check-in", "target": "≥ 50% font un check-in"},
  {"id": "H3", "label": "Réponse à la reco", "target": "≥ 30% répondent à la reco différée"},
  {"id": "H4", "label": "Rétention J7", "target": "≥ 30% actifs à J7 — KPI maître"}
]', 1),

('mvp', 'frictions', 'Codification frictions', '[
  {"code": "F0", "label": "Fluide", "desc": "Aucune hésitation observable."},
  {"code": "F1", "label": "Micro friction", "desc": "Légère hésitation, récupération autonome."},
  {"code": "F2", "label": "Besoin d''aide", "desc": "Demande une explication ou un guidage."},
  {"code": "F3", "label": "Bloquant", "desc": "Ne peut pas continuer sans intervention. Seuil : F2/F3 × 3 = point structurel."}
]', 2),

('mvp', 'protocol', 'Protocole session test', 'Panel : 30 testeurs, 25-32 ans, sorties régulières, décisions de groupe fréquentes. 3-4 tests max/jour. 10 tests/semaine. 3 semaines. Script d''intro à lire mot pour mot : "On teste une nouvelle application qui aide à choisir une sortie différemment. On ne teste pas si l''idée te plaît." Règle fondamentale : ne pas défendre, ne pas argumenter, ne pas justifier. Observer, noter, analyser.', 3),

('mvp', 'scenarios', 'Scénarios post-lancement', '[
  {"id": "A", "label": "Validation forte", "condition": "Tous seuils atteints", "decision": "Maintien Toulouse, stabilisation 90 jours, documentation playbook."},
  {"id": "B", "label": "Densité OK, rétention faible", "condition": "Rétention < 30%", "decision": "Correction onboarding + UX ciblée. Blocage expansion."},
  {"id": "C", "label": "Volume sans densité", "condition": "< 50% avec ≥ 3 amis", "decision": "Concentration 2 écoles, activation micro-cercles, reset communication."},
  {"id": "D", "label": "Échec structurel", "condition": "Rétention < 20%", "decision": "Retour itération produit. Simplification radicale."}
]', 4);
