-- ─────────────────────────────────────────────────────────────
-- Fun : on garde « Qui de nous deux ? », on retire le quiz de couple et « Nos défis »
-- ─────────────────────────────────────────────────────────────

-- Thème d'une question « Qui de nous deux ? » (null pour les questions ajoutées à la main).
ALTER TABLE quiz_questions ADD COLUMN category text;

-- Quiz de couple : questions et réponses supprimées en cascade.
DELETE FROM quizzes WHERE kind = 'couple_quiz';

-- « Nos défis » et le badge associé.
DELETE FROM badges WHERE slug = 'five-challenges';
DROP TABLE challenges;
