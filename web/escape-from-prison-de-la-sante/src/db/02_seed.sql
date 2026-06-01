INSERT INTO blocs (name, wing, capacity, description) VALUES
('Fox River A', 'A', 32, 'Aile principale du quartier A. Détenus à sécurité moyenne.'),
('Fox River B', 'B', 28, 'Aile B, quartier haute sécurité. Détenus condamnés à de longues peines.'),
('Fox River C', 'C', 20, 'Aile C, jeunes détenus et primo-incarcérés.');

INSERT INTO users (username, email, password_hash, role, token) VALUES
('m.scofield',    'm.scofield@detenu.penitentiaire-sante.fr',        crypt('FoxRiver1!',                                    gen_salt('bf', 10)), 'inmate',   NULL),
('l.burrows',     'l.burrows@detenu.penitentiaire-sante.fr',         crypt(encode(gen_random_bytes(24), 'base64'),          gen_salt('bf', 10)), 'inmate',   NULL),
('f.sucre',       'f.sucre@detenu.penitentiaire-sante.fr',           crypt(encode(gen_random_bytes(24), 'base64'),          gen_salt('bf', 10)), 'inmate',   NULL),
('t.bagwell',     't.bagwell@detenu.penitentiaire-sante.fr',         crypt(encode(gen_random_bytes(24), 'base64'),          gen_salt('bf', 10)), 'inmate',   NULL),
('c.westmoreland','c.westmoreland@detenu.penitentiaire-sante.fr',    crypt(encode(gen_random_bytes(24), 'base64'),          gen_salt('bf', 10)), 'inmate',   NULL),
('j.abruzzi',     'j.abruzzi@detenu.penitentiaire-sante.fr',        crypt(encode(gen_random_bytes(24), 'base64'),          gen_salt('bf', 10)), 'inmate',   NULL),
('d.apolskis',    'd.apolskis@detenu.penitentiaire-sante.fr',       crypt(encode(gen_random_bytes(24), 'base64'),          gen_salt('bf', 10)), 'inmate',   NULL),
('b.franklin',    'b.franklin@detenu.penitentiaire-sante.fr',       crypt(encode(gen_random_bytes(24), 'base64'),          gen_salt('bf', 10)), 'inmate',   NULL),
('b.bellick',     'b.bellick@administration.penitentiaire-sante.fr', crypt(encode(gen_random_bytes(24), 'base64'),          gen_salt('bf', 10)), 'guard',   NULL),
('r.geary',       'r.geary@administration.penitentiaire-sante.fr',   crypt(encode(gen_random_bytes(24), 'base64'),          gen_salt('bf', 10)), 'guard',    NULL),
('h.pope',        'h.pope@direction.penitentiaire-sante.fr',         crypt(encode(gen_random_bytes(24), 'base64'),          gen_salt('bf', 10)), 'director', NULL);

INSERT INTO inmate_profiles (user_id, prison_number, cell, bloc_id, entry_date, release_date, offense, conduct_score, wallet_balance, phone_credits) VALUES
((SELECT id FROM users WHERE username='m.scofield'),   'PS-2019-0741', 'A-107', 1, '2019-03-12', '2024-03-12', 'Braquage à main armée — Première Banque Nationale de Chicago', 88, 12.00, 5),
((SELECT id FROM users WHERE username='l.burrows'),    'PS-2004-0023', 'A-212', 1, '2004-11-29', NULL,         'Meurtre prémédité sur la personne de Terrence Steadman (peine commuée)', 72, 4.00, 0),
((SELECT id FROM users WHERE username='f.sucre'),      'PS-2019-0742', 'A-107', 1, '2019-03-12', '2021-03-12', 'Complicité de braquage à main armée', 95, 18.00, 12),
((SELECT id FROM users WHERE username='t.bagwell'),    'PS-2001-0155', 'B-40',  2, '2001-06-15', NULL,         'Agression aggravée, séquestration, extorsion', 31, 2.00, 0),
((SELECT id FROM users WHERE username='c.westmoreland'),'PS-1990-0008','B-23',  2, '1990-09-03', NULL,         'Vol à main armée — Braquage de la Banque Fédérale de Denver', 79, 35.00, 3),
((SELECT id FROM users WHERE username='j.abruzzi'),    'PS-2000-0312', 'A-301', 1, '2000-02-07', NULL,         'Crime organisé, association de malfaiteurs, homicides', 55, 28.00, 8),
((SELECT id FROM users WHERE username='d.apolskis'),   'PS-2021-0899', 'C-15',  3, '2021-08-22', '2024-08-22', 'Vol aggravé avec circonstances aggravantes', 91, 9.00, 6),
((SELECT id FROM users WHERE username='b.franklin'),   'PS-2014-0567', 'A-202', 1, '2014-05-18', '2022-05-18', 'Fraude documentaire, falsification de billets de banque', 83, 16.00, 4);

INSERT INTO work_jobs (name, description, location, pay_amount, cooldown_minutes, slots_available) VALUES
('Laverie',                 'Tri, lavage et repassage du linge de la prison. Travail physique, idéal pour ceux qui veulent rester actifs.',      'Buanderie — Bâtiment C',        5.00,  5,  8),
('Cuisine',                 'Préparation et service des repas. Équipe de 4 détenus sous supervision du cuisinier chef.',                         'Cuisines centrale',             8.00,  10, 6),
('Atelier menuiserie',      'Fabrication et réparation de mobilier pour la prison. Formation certifiante disponible.',                           'Atelier — Bâtiment B',          12.00, 20, 4),
('Bibliothèque',            'Aide au classement des ouvrages, accueil des détenus et gestion des prêts. Poste calme et valorisant.',             'Bibliothèque',                  6.00,  8,  3),
('Entretien des cours',     'Balayage, désherbage et entretien général des cours extérieures. Travail en plein air.',                            'Cour extérieure',               9.00,  15, 6),
('Blanchisserie administrative', 'Traitement du linge des bureaux administratifs. Accès zone restreinte, requiert conduite irréprochable.',     'Zone administrative — Bât. D',  14.00, 30, 2);

INSERT INTO store_items (name, description, price, category, stock, image_slug) VALUES
('Coussin ergonomique',      'Coussin à mémoire de forme pour améliorer le confort sur les couchages réglementaires.',  12.00, 'comfort',       50, 'coussin'),
('Radio portable',           'Radio FM/AM avec écouteurs inclus. Réception correcte en cellule.',                       25.00, 'comfort',       30, 'radio'),
('Lampe de chevet',          'Lampe à LED rechargeable, lumière douce pour la lecture nocturne.',                       18.00, 'comfort',       40, 'lampe'),
('Poster réglementaire',     'Poster format A3 (choix parmi le catalogue approuvé).',                                    5.00, 'comfort',       100,'poster'),
('Tapis de sol',             'Tapis antidérapant 60×90 cm pour égayer la cellule.',                                     8.00, 'comfort',       60, 'tapis'),
('Chocolat noir 200g',       'Tablette de chocolat noir 70% cacao.',                                                     2.00, 'food',          200,'chocolat'),
('Café moulu 100g',          'Café arabica moulu, à préparer avec la bouilloire réglementaire.',                         4.00, 'food',          150,'cafe'),
('Conserve de thon',         'Thon à l''huile d''olive, 160g.',                                                          3.00, 'food',          180,'thon'),
('Biscuits assortis',        'Boîte de 250g de biscuits secs variés.',                                                   2.50, 'food',          200,'biscuits'),
('Sachet de sucre 250g',     'Sucre blanc en poudre.',                                                                   1.50, 'food',          300,'sucre'),
('Shampoing premium 250ml',  'Shampoing tous types de cheveux, sans silicone.',                                          6.00, 'hygiene',       80, 'shampoing'),
('Déodorant roll-on',        'Déodorant 48h sans alcool, 50ml.',                                                         5.00, 'hygiene',       100,'deodorant'),
('Rasoir électrique',        'Rasoir à grille rechargeable par USB. Usage personnel uniquement.',                        20.00, 'hygiene',      25, 'rasoir'),
('Gel douche 250ml',         'Gel douche parfumé, pH neutre.',                                                           3.50, 'hygiene',       120,'gel_douche'),
('Jeu de cartes',            'Jeu de 54 cartes plastifiées standard.',                                                   3.00, 'leisure',       70, 'cartes'),
('Puzzle 500 pièces',        'Puzzle thème paysage, 500 pièces, boîte incluse.',                                         8.00, 'leisure',       40, 'puzzle'),
('Livre de poche',           'Roman au choix parmi le catalogue (liste disponible à l''accueil).',                       5.00, 'leisure',       80, 'livre'),
('Carnet et stylo',          'Carnet de 100 pages avec stylo bille noir.',                                               4.00, 'leisure',       90, 'carnet'),
('Unités téléphoniques ×10', 'Recharge de 10 unités téléphoniques pour les appels autorisés.',                          8.00, 'communication', 500,'telephone'),
('Timbres ×5',               'Carnet de 5 timbres pour le courrier ordinaire.',                                          4.00, 'communication', 200,'timbres');

INSERT INTO books (title, author, genre, isbn, description, available_copies) VALUES
('Le Comte de Monte-Cristo',       'Alexandre Dumas',       'Roman aventure',  '978-2-07-040850-4', 'L''histoire d''Edmond Dantès, faussement emprisonné, qui s''évade et prépare sa vengeance.', 2),
('L''Étranger',                    'Albert Camus',          'Roman philosophique', '978-2-07-036024-5', 'Meursault, un homme indifférent au monde, commet un meurtre et affronte la justice.', 3),
('Les Misérables',                 'Victor Hugo',           'Roman social',    '978-2-07-040850-5', 'Jean Valjean, ancien forçat, tente de se reconstruire dans une France du XIXe siècle.', 2),
('1984',                           'George Orwell',         'Dystopie',        '978-2-07-036822-7', 'Dans une société totalitaire, Winston Smith résiste au régime du Grand Frère.', 2),
('Papillon',                       'Henri Charrière',       'Autobiographie',  '978-2-07-036400-7', 'Le récit authentique de l''évasion de Henri Charrière des bagnards de Guyane.', 3),
('Le Procès',                      'Franz Kafka',           'Roman absurde',   '978-2-07-036021-4', 'Josef K. est arrêté et jugé pour un crime qu''on ne lui révèle jamais.', 1),
('De la délinquance à la vertu',   'Jack Henry Abbott',     'Autobiographie',  '978-2-07-037882-9', 'Correspondance d''un détenu américain avec Norman Mailer. Portrait d''une vie carcérale.', 1),
('En attendant Godot',             'Samuel Beckett',        'Théâtre',         '978-2-07-036475-5', 'Deux personnages attendent Godot qui ne vient jamais. Une pièce sur l''absurde et l''espoir.', 2),
('Cent ans de solitude',           'Gabriel García Márquez','Roman',           '978-2-07-036862-3', 'La saga de la famille Buendía sur plusieurs générations dans la ville imaginaire de Macondo.', 1),
('Le Rouge et le Noir',            'Stendhal',              'Roman historique', '978-2-07-036044-3', 'L''ascension sociale de Julien Sorel, fils d''un charpentier, dans la France de la Restauration.', 2);

INSERT INTO announcements (title, content, author_id, bloc_id, priority) VALUES
(
    'Rappel — Règlement intérieur : usage des téléphones',
    'Je rappelle à l''ensemble des détenus que l''usage des téléphones est strictement encadré. Les appels ne sont autorisés qu''aux horaires affichés (8h-9h, 12h-13h, 18h-19h30). Tout manquement à cette règle entraînera la suspension immédiate des droits téléphoniques pour une durée de 7 jours. La liste des contacts autorisés doit être déposée au greffe au plus tard le vendredi 17h. — Adjudant Bellick',
    (SELECT id FROM users WHERE username='b.bellick'),
    NULL,
    'high'
),
(
    'Fermeture temporaire de la bibliothèque — Inventaire annuel',
    'La bibliothèque sera fermée du lundi au mercredi de la semaine prochaine pour réalisation de l''inventaire annuel des collections. Les emprunts en cours sont prolongés d''une semaine automatiquement. Aucune pénalité ne sera appliquée durant cette période. Les détenus travaillant à la bibliothèque sont invités à se présenter dès 7h30 lundi matin. — Adjudant Bellick',
    (SELECT id FROM users WHERE username='b.bellick'),
    NULL,
    'normal'
),
(
    'Aile A — Travaux de plomberie : coupure d''eau',
    'Des travaux de plomberie urgents sont programmés mercredi de 6h à 12h dans l''aile A. L''eau froide sera coupée dans toutes les cellules A-100 à A-320. Des jerricans d''eau seront distribués la veille au soir. La douche du gymnase restera accessible. Merci de votre compréhension. — Adjudant Bellick',
    (SELECT id FROM users WHERE username='b.bellick'),
    1,
    'high'
),
(
    'Nouvelles modalités des visites familiales',
    'Suite à la directive pénitentiaire n°2024-112, les visites familiales sont désormais soumises à une réservation obligatoire 72h à l''avance via le formulaire disponible au greffe ou sur le présent portail. Les créneaux disponibles sont : 09h-10h, 14h-15h et 16h-17h du lundi au samedi. Le dimanche est réservé aux visites longues durée (UVF) sur accord du directeur. — Adjudant Bellick',
    (SELECT id FROM users WHERE username='b.bellick'),
    NULL,
    'normal'
),
(
    'Aile B — Mise en garde : comportements récents',
    'Des incidents répétés ont été signalés dans l''aile B ces dernières semaines. Je rappelle que tout détenu impliqué dans des comportements d''intimidation, de trafic ou de dégradation sera sanctionné conformément au règlement disciplinaire. Les cellules B-38 à B-45 feront l''objet d''inspections renforcées. — Adjudant Bellick',
    (SELECT id FROM users WHERE username='b.bellick'),
    2,
    'urgent'
),
(
    'Programme sportif — Nouveaux créneaux',
    'De nouveaux créneaux d''activités sportives sont ouverts à partir du mois prochain. Football en salle : mardi et jeudi 14h-16h (aile A et C). Musculation : lundi, mercredi, vendredi 7h-9h (sur inscription). Yoga : mercredi 16h-17h (toutes ailes, 12 places). Les inscriptions sont ouvertes au greffe dès maintenant. — Adjudant R. Geary',
    (SELECT id FROM users WHERE username='r.geary'),
    NULL,
    'low'
);

INSERT INTO posts (content, author_id, bloc_id, likes) VALUES
('Quelqu''un a des nouvelles de la date de reprise des cours de dessin ? Ça fait trois semaines que c''est suspendu.', (SELECT id FROM users WHERE username='m.scofield'), 1, 4),
('La soupe d''hier soir, c''était quoi ? Du carton bouilli ? Je comprends plus pourquoi on paie à la cantine...', (SELECT id FROM users WHERE username='f.sucre'), 1, 7),
('Pour ceux qui travaillent à l''atelier : on a besoin de deux personnes de plus jeudi matin. Parlez à Geary avant 10h.', (SELECT id FROM users WHERE username='j.abruzzi'), 1, 2),
('Le puzzle 1000 pièces que j''avais commandé est finalement 500 pièces. La boîte était mal étiquetée. Je le pose en salle commune si quelqu''un veut.', (SELECT id FROM users WHERE username='b.franklin'), 1, 5),
('Rappel aux gars de la cellule A-107 : on a une réunion pour organiser le tournoi de cartes ce soir après le dîner.', (SELECT id FROM users WHERE username='m.scofield'), 1, 3),
('Les mecs de l''aile B font trop de bruit la nuit. Impossible de dormir. J''ai déposé un signalement mais rien ne change.', (SELECT id FROM users WHERE username='t.bagwell'), 2, 1),
('Westmoreland, t''as fini le bouquin que je t''avais passé ? Le Comte de Monte-Cristo ?', (SELECT id FROM users WHERE username='t.bagwell'), 2, 0),
('Oui, je l''ai fini. Excellent. Je le rends demain. Si quelqu''un d''autre veut le lire après.', (SELECT id FROM users WHERE username='c.westmoreland'), 2, 6),
('Tweener, t''as des nouvelles de ta demande de permission ?', (SELECT id FROM users WHERE username='d.apolskis'), 3, 1),
('Toujours en attente. Ça fait deux semaines. Je commence à croire qu''ils ont perdu le dossier.', (SELECT id FROM users WHERE username='d.apolskis'), 3, 2);

INSERT INTO comments (content, user_id, post_id) VALUES
('Moi aussi j''attends. Le prof avait dit "après les travaux" mais les travaux sont finis depuis longtemps.', (SELECT id FROM users WHERE username='l.burrows'), 1),
('Pareil. C''est du poulet, normalement. Mais là j''ai pas reconnu.', (SELECT id FROM users WHERE username='j.abruzzi'), 2),
('La soupe c''est souvent de la récup. Mais hier c''était vraiment bas de gamme.', (SELECT id FROM users WHERE username='b.franklin'), 2),
('Je suis dispo jeudi. Je passe voir Geary ce matin.', (SELECT id FROM users WHERE username='m.scofield'), 3),
('Moi aussi je suis partant si y''a encore de la place.', (SELECT id FROM users WHERE username='l.burrows'), 3);

INSERT INTO approved_contacts (inmate_id, contact_name, contact_phone, relation, approved_by) VALUES
((SELECT id FROM users WHERE username='m.scofield'),    'Lincoln Burrows',    '+33 6 12 34 56 78', 'Frère',           (SELECT id FROM users WHERE username='b.bellick')),
((SELECT id FROM users WHERE username='l.burrows'),     'L.J. Burrows',       '+33 6 23 45 67 89', 'Fils',            (SELECT id FROM users WHERE username='b.bellick')),
((SELECT id FROM users WHERE username='f.sucre'),       'Maricruz Delgado',   '+33 6 34 56 78 90', 'Fiancée',         (SELECT id FROM users WHERE username='r.geary')),
((SELECT id FROM users WHERE username='b.franklin'),    'Kacee Franklin',     '+33 6 45 67 89 01', 'Épouse',          (SELECT id FROM users WHERE username='b.bellick')),
((SELECT id FROM users WHERE username='c.westmoreland'),'Lisa Rix',           '+33 6 56 78 90 12', 'Fille',           (SELECT id FROM users WHERE username='r.geary')),
((SELECT id FROM users WHERE username='d.apolskis'),    'Marie Apolskis',     '+33 6 67 89 01 23', 'Mère',            (SELECT id FROM users WHERE username='b.bellick'));

INSERT INTO visit_requests (inmate_id, visitor_name, visitor_relation, visitor_phone, requested_date, time_slot, status) VALUES
((SELECT id FROM users WHERE username='m.scofield'), 'Sara Tancredi', 'Amie proche', '+33 6 98 76 54 32', CURRENT_DATE + 3, '14:00-15:00', 'approved'),
((SELECT id FROM users WHERE username='f.sucre'),    'Maricruz Delgado', 'Fiancée', '+33 6 34 56 78 90', CURRENT_DATE + 5, '09:00-10:00', 'pending'),
((SELECT id FROM users WHERE username='l.burrows'),  'L.J. Burrows', 'Fils', '+33 6 23 45 67 89', CURRENT_DATE + 1, '16:00-17:00', 'approved'),
((SELECT id FROM users WHERE username='b.franklin'), 'Kacee Franklin', 'Épouse', '+33 6 45 67 89 01', CURRENT_DATE - 7, '14:00-15:00', 'completed');

INSERT INTO parloir_sessions (visit_request_id, started_at, ended_at, duration_minutes, transcript) VALUES
(
    (SELECT id FROM visit_requests WHERE inmate_id=(SELECT id FROM users WHERE username='b.franklin') AND status='completed'),
    NOW() - INTERVAL '8 days',
    NOW() - INTERVAL '8 days' + INTERVAL '45 minutes',
    45,
    '[
        {"speaker":"visitor","text":"Benjamin, tu as bonne mine. Comment tu vas ?","timestamp":"00:00"},
        {"speaker":"inmate","text":"Bien, mieux qu''avant. Le travail à l''atelier m''aide à tenir.","timestamp":"00:32"},
        {"speaker":"visitor","text":"Les enfants t''envoient leurs dessins. Je les ai mis dans l''enveloppe.","timestamp":"01:15"},
        {"speaker":"inmate","text":"Merci Kacee. C''est ce qui me fait tenir.","timestamp":"01:48"}
    ]'::jsonb
);

INSERT INTO incidents (reporter_id, involved_id, type, description, status, conduct_penalty) VALUES
((SELECT id FROM users WHERE username='b.bellick'), (SELECT id FROM users WHERE username='t.bagwell'), 'fight', 'Altercation physique avec un autre détenu en salle commune. Bagwell a frappé en premier selon trois témoins.', 'resolved', 15),
((SELECT id FROM users WHERE username='m.scofield'), NULL, 'maintenance', 'Fuite d''eau sous le lavabo de la cellule A-107. L''eau s''écoule vers le couloir. Signalement urgent.', 'resolved', 0),
((SELECT id FROM users WHERE username='d.apolskis'), NULL, 'complaint', 'La nourriture servie le mercredi soir est régulièrement insuffisante en quantité. Je demande une révision des portions.', 'investigating', 0);

INSERT INTO medical_records (inmate_id, blood_type, allergies, chronic_conditions) VALUES
((SELECT id FROM users WHERE username='m.scofield'),    'A+', 'Aucune allergie connue',                        'Légère insuffisance rénale sous surveillance'),
((SELECT id FROM users WHERE username='l.burrows'),     'O-', 'Pénicilline (réaction cutanée)',                'Aucune'),
((SELECT id FROM users WHERE username='f.sucre'),       'B+', 'Aucune allergie connue',                        'Asthme léger'),
((SELECT id FROM users WHERE username='t.bagwell'),     'AB+','Aucune allergie connue',                        'Hypertension artérielle traitée'),
((SELECT id FROM users WHERE username='c.westmoreland'),'A-', 'Aspirine (saignements gastro-intestinaux)',     'Diabète de type 2, insuffisance cardiaque légère'),
((SELECT id FROM users WHERE username='j.abruzzi'),     'B-', 'Aucune allergie connue',                        'Aucune'),
((SELECT id FROM users WHERE username='d.apolskis'),    'O+', 'Aucune allergie connue',                        'Aucune'),
((SELECT id FROM users WHERE username='b.franklin'),    'A+', 'Latex (réaction cutanée modérée)',              'Aucune');

INSERT INTO external_feeds (name, url, type, active, created_by) VALUES
('Circulaires DAP — Ministère de la Justice', 'http://intranet.dap.penitentiaire-sante.local/api/feeds/circulaires.json', 'json', true, (SELECT id FROM users WHERE username='b.bellick')),
('Bulletin officiel pénitentiaire', 'http://intranet.dap.penitentiaire-sante.local/api/feeds/bulletin-officiel.json', 'json', true, (SELECT id FROM users WHERE username='r.geary'));

-- Reputation scores
UPDATE inmate_profiles SET reputation_score = 75 WHERE user_id = (SELECT id FROM users WHERE username='m.scofield');
UPDATE inmate_profiles SET reputation_score = 65 WHERE user_id = (SELECT id FROM users WHERE username='l.burrows');
UPDATE inmate_profiles SET reputation_score = 80 WHERE user_id = (SELECT id FROM users WHERE username='f.sucre');
UPDATE inmate_profiles SET reputation_score = 25 WHERE user_id = (SELECT id FROM users WHERE username='t.bagwell');
UPDATE inmate_profiles SET reputation_score = 70 WHERE user_id = (SELECT id FROM users WHERE username='c.westmoreland');
UPDATE inmate_profiles SET reputation_score = 85 WHERE user_id = (SELECT id FROM users WHERE username='j.abruzzi');
UPDATE inmate_profiles SET reputation_score = 55 WHERE user_id = (SELECT id FROM users WHERE username='d.apolskis');
UPDATE inmate_profiles SET reputation_score = 60 WHERE user_id = (SELECT id FROM users WHERE username='b.franklin');

-- Gangs
INSERT INTO gangs (name, description, leader_id) VALUES
('PI (Prison Industry)', 'Le syndicat du crime d''Abruzzi. Contrôle les ateliers et les flux de contrebande.', (SELECT id FROM users WHERE username='j.abruzzi')),
('Bande à Bagwell', 'Alliance des détenus les plus dangereux. Intimidation et extorsion.', (SELECT id FROM users WHERE username='t.bagwell')),
('Alliance Fox River', 'Le groupe de Scofield. Solidarité, entraide et planification.', (SELECT id FROM users WHERE username='m.scofield')),
('Indics de Bellick', 'Réseau d''informateurs au service de l''adjudant Bellick. Discrétion requise.', NULL);

-- Gang members
INSERT INTO gang_members (gang_id, user_id, role) VALUES
((SELECT id FROM gangs WHERE name='PI (Prison Industry)'), (SELECT id FROM users WHERE username='j.abruzzi'), 'leader'),
((SELECT id FROM gangs WHERE name='Bande à Bagwell'), (SELECT id FROM users WHERE username='t.bagwell'), 'leader'),
((SELECT id FROM gangs WHERE name='Alliance Fox River'), (SELECT id FROM users WHERE username='m.scofield'), 'leader'),
((SELECT id FROM gangs WHERE name='Alliance Fox River'), (SELECT id FROM users WHERE username='l.burrows'), 'lieutenant'),
((SELECT id FROM gangs WHERE name='Alliance Fox River'), (SELECT id FROM users WHERE username='f.sucre'), 'member'),
((SELECT id FROM gangs WHERE name='PI (Prison Industry)'), (SELECT id FROM users WHERE username='c.westmoreland'), 'member');

-- Gang messages
INSERT INTO gang_messages (gang_id, sender_id, content) VALUES
((SELECT id FROM gangs WHERE name='Alliance Fox River'), (SELECT id FROM users WHERE username='m.scofield'), 'On se retrouve à la cour à 14h. Apportez les plans.'),
((SELECT id FROM gangs WHERE name='Alliance Fox River'), (SELECT id FROM users WHERE username='l.burrows'), 'Je serai là. On a combien de temps ?'),
((SELECT id FROM gangs WHERE name='Alliance Fox River'), (SELECT id FROM users WHERE username='f.sucre'), 'Moi aussi. Scofield, t''as avancé sur le truc ?'),
((SELECT id FROM gangs WHERE name='PI (Prison Industry)'), (SELECT id FROM users WHERE username='j.abruzzi'), 'Je veux Fibonacci. Scofield a les infos. On doit le convaincre.'),
((SELECT id FROM gangs WHERE name='Bande à Bagwell'), (SELECT id FROM users WHERE username='t.bagwell'), 'Pretty, tu crois que t''es à l''abri ici ? Personne ne l''est.');

-- Contraband items
INSERT INTO contraband_items (name, description, base_price, risk_level, category, reveals_activation_code) VALUES
('Téléphone portable',              'Smartphone d''occasion, chargeur inclus. Réseau 4G.',                                                                                              80.00,   75, 'electronics', FALSE),
('Shiv (couteau artisanal)',         'Lame aiguisée à partir d''une brosse à dents. Usage défensif uniquement.',                                                                         15.00,   90, 'weapon',      FALSE),
('Pruno (alcool artisanal)',         'Vin de prison fermenté à base de fruits, sucre et pain.',                                                                                            8.00,   40, 'alcohol',     FALSE),
('Médicaments (non prescrits)',      'Comprimés d''anxiolytiques détournés de l''infirmerie.',                                                                                            25.00,   60, 'drug',        FALSE),
('Paquet de cigarettes',             'Marlboro Red, paquet entier. Monnaie d''échange universelle.',                                                                                      12.00,   30, 'tobacco',     FALSE),
('Carte SIM prépayée',               'Carte SIM avec 2h de crédit. Non traçable.',                                                                                                       35.00,   70, 'electronics', FALSE),
('Flask de whisky',                  'Petite flasque de bourbon, 20cl. Cachée dans une bouteille de shampoing.',                                                                         20.00,   55, 'alcohol',     FALSE),
('Briquet Zippo',                    'Briquet métallique rechargeable. Objet de troc très prisé.',                                                                                        10.00,   25, 'other',       FALSE),
('Tatouage (kit)',                   'Aiguille artisanale + encre de stylo. Pour tatouages DIY.',                                                                                         18.00,   45, 'other',       FALSE),
('Câble USB',                        'Câble de recharge pour téléphone portable de contrebande.',                                                                                          5.00,   20, 'electronics', FALSE),
('Tuyau — Accès service réglementaire', 'Information confidentielle sur l''activation d''un service administratif interne. Source fiable, contacts haut placés. Discrétion absolue garantie.', 1800.00, 10, 'other', TRUE);

-- Generate a random activation code at init time — stored only in service_config
INSERT INTO service_config (key, value)
VALUES ('flux_activation_code', 'FLUX-' || encode(gen_random_bytes(16), 'hex'));

-- Black market listings
INSERT INTO black_market_listings (seller_id, contraband_item_id, price, quantity, active) VALUES
((SELECT id FROM users WHERE username='j.abruzzi'), (SELECT id FROM contraband_items WHERE name='Téléphone portable'), 100.00, 2, true),
((SELECT id FROM users WHERE username='t.bagwell'), (SELECT id FROM contraband_items WHERE name='Shiv (couteau artisanal)'), 20.00, 3, true),
((SELECT id FROM users WHERE username='f.sucre'), (SELECT id FROM contraband_items WHERE name='Pruno (alcool artisanal)'), 10.00, 5, true),
((SELECT id FROM users WHERE username='c.westmoreland'), (SELECT id FROM contraband_items WHERE name='Paquet de cigarettes'), 15.00, 10, true),
((SELECT id FROM users WHERE username='d.apolskis'), (SELECT id FROM contraband_items WHERE name='Briquet Zippo'), 12.00, 2, true),
((SELECT id FROM users WHERE username='c.westmoreland'), (SELECT id FROM contraband_items WHERE name='Tuyau — Accès service réglementaire'), 1800.00, 1, true);

-- Trades (historical)
INSERT INTO trades (listing_id, buyer_id, seller_id, price, detected) VALUES
(1, (SELECT id FROM users WHERE username='m.scofield'), (SELECT id FROM users WHERE username='j.abruzzi'), 100.00, false),
(3, (SELECT id FROM users WHERE username='l.burrows'), (SELECT id FROM users WHERE username='f.sucre'), 10.00, false),
(2, (SELECT id FROM users WHERE username='d.apolskis'), (SELECT id FROM users WHERE username='t.bagwell'), 20.00, true);

-- Rehabilitation programs
INSERT INTO programs (name, description, total_sessions, conduct_bonus, required_for_leave, category) VALUES
('Gestion de la colère', 'Programme de 12 sessions pour apprendre à canaliser sa frustration et éviter les conflits.', 12, 8, true, 'anger_management'),
('Atelier menuiserie avancé', 'Formation certifiante en ébénisterie. Débouchés professionnels à la sortie.', 20, 5, false, 'vocational'),
('Préparation au GED', 'Cours de mise à niveau pour obtenir l''équivalent du baccalauréat.', 15, 6, false, 'education'),
('Thérapie individuelle', 'Suivi psychologique hebdomadaire avec le Dr Tancredi. Confidentiel.', 10, 10, true, 'therapy'),
('Programme anti-addiction', 'Accompagnement pour les détenus souffrant de dépendances (alcool, drogues, jeu).', 8, 7, true, 'addiction');

-- Program enrollments
INSERT INTO program_enrollments (program_id, inmate_id, sessions_completed, status) VALUES
((SELECT id FROM programs WHERE name='Gestion de la colère'), (SELECT id FROM users WHERE username='t.bagwell'), 3, 'in_progress'),
((SELECT id FROM programs WHERE name='Thérapie individuelle'), (SELECT id FROM users WHERE username='m.scofield'), 7, 'in_progress'),
((SELECT id FROM programs WHERE name='Atelier menuiserie avancé'), (SELECT id FROM users WHERE username='b.franklin'), 20, 'completed'),
((SELECT id FROM programs WHERE name='Préparation au GED'), (SELECT id FROM users WHERE username='d.apolskis'), 5, 'in_progress'),
((SELECT id FROM programs WHERE name='Programme anti-addiction'), (SELECT id FROM users WHERE username='l.burrows'), 2, 'enrolled');

-- Update completed enrollment
UPDATE program_enrollments SET completed_at = NOW() - INTERVAL '30 days'
WHERE inmate_id = (SELECT id FROM users WHERE username='b.franklin') AND status = 'completed';

-- Mail / Courrier
INSERT INTO mail (inmate_id, direction, correspondent_name, subject, content, status) VALUES
((SELECT id FROM users WHERE username='m.scofield'), 'outgoing', 'Veronica Donovan', 'Appel urgent', 'Veronica, j''ai besoin que tu vérifies le dossier de Lincoln. Il y a des incohérences dans les preuves. Le témoin clé, Leticia Barris, a disparu. Cherche du côté de Terrence Steadman. Fais attention à toi.', 'delivered'),
((SELECT id FROM users WHERE username='m.scofield'), 'incoming', 'Veronica Donovan', 'RE: Appel urgent', 'Michael, j''ai trouvé des pistes. Steadman est peut-être vivant. Je continue les recherches. Ne fais rien de dangereux.', 'delivered'),
((SELECT id FROM users WHERE username='f.sucre'), 'outgoing', 'Maricruz Delgado', 'Mi amor', 'Maricruz, je pense à toi chaque jour. La date approche. Je te promets qu''on sera ensemble bientôt. Garde la foi.', 'pending'),
((SELECT id FROM users WHERE username='l.burrows'), 'incoming', 'L.J. Burrows', 'Papa', 'Papa, maman dit que je peux venir te voir bientôt. J''ai eu 15 en maths. Tu me manques.', 'delivered'),
((SELECT id FROM users WHERE username='c.westmoreland'), 'outgoing', 'Lisa Rix', 'Ma chère fille', 'Lisa, je sais que tu ne veux plus me voir. Mais je t''écris quand même. J''ai fait des erreurs, mais tu restes la plus belle chose de ma vie. Marilyn te ressemblait tant.', 'pending'),
((SELECT id FROM users WHERE username='t.bagwell'), 'outgoing', 'Service juridique', 'Demande de révision', 'Je demande une révision de mon dossier. Les conditions de détention dans l''aile B sont inhumaines. Je documenterai chaque infraction.', 'intercepted'),
((SELECT id FROM users WHERE username='b.franklin'), 'incoming', 'Kacee Franklin', 'Les enfants', 'Benjamin, les enfants ont fait un dessin pour toi. Je te l''envoie avec cette lettre. On t''attend. Tiens bon.', 'delivered');

-- Prison events / Schedule
INSERT INTO prison_events (name, description, event_time, event_type, recurring, day_of_week, bloc_id) VALUES
('Appel du matin', 'Comptage obligatoire. Tous les détenus doivent être présents dans leur cellule.', '06:30', 'roll_call', true, NULL, NULL),
('Petit-déjeuner', 'Service en salle commune. Café, pain, confiture.', '07:00', 'meal', true, NULL, NULL),
('Ouverture des cellules', 'Début de la journée. Accès aux espaces communs.', '07:30', 'activity', true, NULL, NULL),
('Appel de mi-journée', 'Comptage obligatoire avant le déjeuner.', '11:30', 'roll_call', true, NULL, NULL),
('Déjeuner', 'Service en salle commune. Menu du jour.', '12:00', 'meal', true, NULL, NULL),
('Promenade', 'Accès à la cour extérieure. 2 heures.', '14:00', 'exercise', true, NULL, NULL),
('Goûter', 'Distribution en cellule.', '16:00', 'meal', true, NULL, NULL),
('Appel du soir', 'Comptage obligatoire. Retour en cellule.', '17:30', 'roll_call', true, NULL, NULL),
('Dîner', 'Service en salle commune. Dernier repas de la journée.', '18:00', 'meal', true, NULL, NULL),
('Temps libre en cellule', 'Lecture, écriture, radio autorisée.', '19:00', 'activity', true, NULL, NULL),
('Extinction des feux', 'Fermeture des cellules. Silence obligatoire.', '21:30', 'lockdown', true, NULL, NULL),
('Messe dominicale', 'Service religieux facultatif. Chapelle du bâtiment A.', '10:00', 'special', true, 0, 1),
('Tournoi de football', 'Match inter-blocs dans la cour principale.', '15:00', 'special', false, NULL, NULL);

-- Enriched medical records
UPDATE medical_records SET chronic_conditions = 'Amputation main droite (réattachement chirurgical raté), troubles psychopathiques diagnostiqués' WHERE inmate_id = (SELECT id FROM users WHERE username='t.bagwell');
UPDATE medical_records SET chronic_conditions = 'Cancer du poumon stade III (diagnostic récent), diabète de type 2, insuffisance cardiaque' WHERE inmate_id = (SELECT id FROM users WHERE username='c.westmoreland');
UPDATE medical_records SET notes = 'Tatouage couvrant le torse et les bras — plan architectural codé. Surveiller automutilation.' WHERE inmate_id = (SELECT id FROM users WHERE username='m.scofield');

-- More posts
INSERT INTO posts (content, author_id, bloc_id, likes) VALUES
('Quelqu''un sait pourquoi Scofield passe autant de temps à l''infirmerie ? C''est louche.', (SELECT id FROM users WHERE username='d.apolskis'), 1, 3),
('J''ai entendu dire que Fibonacci serait transféré ici. Les gars de PI s''agitent.', (SELECT id FROM users WHERE username='b.franklin'), 1, 8),
('Le directeur Pope m''a demandé de l''aider avec sa maquette du Taj Mahal. Ça va me prendre du temps.', (SELECT id FROM users WHERE username='m.scofield'), 1, 12),
('Abruzzi a retrouvé la main sur les ateliers. Personne ne bouge sans son accord maintenant.', (SELECT id FROM users WHERE username='l.burrows'), 1, 5),
('La bouffe s''améliore pas. Qui a des conserves en rab ?', (SELECT id FROM users WHERE username='f.sucre'), 1, 4);

-- More comments
INSERT INTO comments (content, user_id, post_id) VALUES
('Laisse tomber Tweener, mêle-toi de tes affaires.', (SELECT id FROM users WHERE username='t.bagwell'), (SELECT id FROM posts WHERE content LIKE '%Scofield passe autant%')),
('Fibonacci, c''est une légende. Personne ne sait à quoi il ressemble.', (SELECT id FROM users WHERE username='j.abruzzi'), (SELECT id FROM posts WHERE content LIKE '%Fibonacci serait transféré%')),
('Le Taj Mahal ? Scofield est vraiment un type bizarre.', (SELECT id FROM users WHERE username='f.sucre'), (SELECT id FROM posts WHERE content LIKE '%Taj Mahal%'));

-- More incidents
INSERT INTO incidents (reporter_id, involved_id, type, description, status, conduct_penalty) VALUES
((SELECT id FROM users WHERE username='b.bellick'), (SELECT id FROM users WHERE username='j.abruzzi'), 'fight', 'Abruzzi a menacé un détenu avec un outil de l''atelier menuiserie. Outil confisqué.', 'investigating', 10),
((SELECT id FROM users WHERE username='r.geary'), (SELECT id FROM users WHERE username='t.bagwell'), 'contraband', 'Tentative de trafic de cigarettes dans l''aile B. Paquet saisi lors d''une fouille.', 'open', 8),
((SELECT id FROM users WHERE username='m.scofield'), NULL, 'maintenance', 'Fissure suspecte dans le mur de la cellule A-107. Requiert inspection structurelle urgente.', 'investigating', 0);

-- Historical wallet transactions
INSERT INTO wallet_transactions (inmate_id, amount, type, description, flagged, recipient_id) VALUES
((SELECT id FROM users WHERE username='m.scofield'), -100.00, 'transfer', 'Virement envoyé', true, (SELECT id FROM users WHERE username='l.burrows')),
((SELECT id FROM users WHERE username='l.burrows'), 100.00, 'transfer', 'Virement reçu', true, (SELECT id FROM users WHERE username='m.scofield')),
((SELECT id FROM users WHERE username='j.abruzzi'), -30.00, 'transfer', 'Virement envoyé', false, (SELECT id FROM users WHERE username='c.westmoreland')),
((SELECT id FROM users WHERE username='c.westmoreland'), 30.00, 'transfer', 'Virement reçu', false, (SELECT id FROM users WHERE username='j.abruzzi'));
