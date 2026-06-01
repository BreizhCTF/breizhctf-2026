'use strict';

const express    = require('express');
const { execSync } = require('child_process');
const { createCanvas, GlobalFonts } = require('@napi-rs/canvas');
const fs   = require('fs');
const path = require('path');

const FONT_REGULAR = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf';
const FONT_BOLD    = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf';
const FONT_MONO    = '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf';

GlobalFonts.registerFromPath(FONT_REGULAR, 'DejaSans');
GlobalFonts.registerFromPath(FONT_BOLD,    'DejaSans');
GlobalFonts.registerFromPath(FONT_MONO,    'DejaSlabMono');

const QUIZ = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'quiz.json'), 'utf-8')
);

const LANG_SKILLS = {
    'python': [
        'Ingénierie de l\'importation de solutions externes',
        'Optimisation de performances par extension matérielle',
        'Maitrise de l\'espacement syntaxique',
        'Simplification par le typage implicite',
        'Gouvernance d\'environnements virtuels isolés',
    ],
    'php': [
        'Modernisation de patrimoines numériques historiques',
        'Surpassement créatif des conventions de nommage',
        'Maitrise du debuggage post-déploiement',
        'Pragmatisme architectural hors frameworks',
        'Résilience face à l\'opinion académique',
    ],
    'java': [
        'Maîtrise de la verbosité architecturale certifiée',
        'Hiérarchisation complexe de composants unitaires',
        'Standardisation de l\'abstraction multi-couches',
        'Gestion prévisionnelle des temps de compilation',
        'Encapsulation de n\'importe quelle structure',
    ],
    'c++': [
        'Responsabilisation totale du cycle de vie mémoire',
        'Navigation avancée en arithmétique de pointeurs',
        'Interprétation sémiologique des erreurs de templates',
        'Exploration des comportements indéterminés',
        'Négociation directe avec l\'unité de calcul',
    ],
};

function buildDiploma(name, language) {
  let cowsayText = '';
  try {
    cowsayText = execSync(`figlet 'Felicitations ${name} !'`, {
      timeout:  10000,
      env:      { ...process.env, PATH: `/usr/bin:${process.env.PATH || ''}` },
      encoding: 'utf8',
    });
  } catch (e) {
    cowsayText = ((e.stdout || '') + (e.stderr || '') || '').toString();
  }

  const W = 1100, H = 780;
  const CREAM = '#FEFCF3';
  const GOLD  = '#A3780A';
  const GOLD2 = '#D2AA3C';
  const DARK  = '#121228';
  const GREY  = '#6E6978';
  const NAVY  = '#0A0F23';

  const canvas = createCanvas(W, H);
  const ctx    = canvas.getContext('2d');
  ctx.textBaseline = 'top';

  ctx.fillStyle = CREAM;
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  ctx.globalAlpha = 0.05;
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 90;
  ctx.beginPath();
  ctx.ellipse(W / 2, H / 2, 230, 230, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 0.025;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(W / 2, H / 2, 280, 280, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  ctx.fillStyle = NAVY;
  ctx.fillRect(0, 0, W, 16);
  ctx.fillRect(0, H - 16, W, 16);
  ctx.fillRect(0, 0, 16, H);
  ctx.fillRect(W - 16, 0, 16, H);
  ctx.fillStyle = GOLD;
  ctx.fillRect(0, 16, W, 3);
  ctx.fillRect(0, H - 19, W, 3);
  ctx.fillRect(16, 0, 3, H);
  ctx.fillRect(W - 19, 0, 3, H);

  for (let i = 0; i < 3; i++) {
    const o = 24 + i * 6;
    ctx.strokeStyle = (i === 0) ? GOLD : GOLD2;
    ctx.lineWidth   = (i === 0) ? 2 : 1;
    ctx.strokeRect(o, o, W - 2 * o, H - 2 * o);
  }

  function drawCentered(text, y, fillStyle, font) {
    ctx.font      = font;
    ctx.fillStyle = fillStyle;
    const w = ctx.measureText(text).width;
    ctx.fillText(text, (W - w) / 2, y);
  }

  drawCentered('LEET INSTITUTE', 42, NAVY, 'bold 15px DejaSans');
  drawCentered('Centre d’Évaluation & de Certification Professionnelle', 60, GREY, '11px DejaSans');

  const titleBannerY = 76;
  const titleBannerH = 52;
  ctx.fillStyle = NAVY;
  ctx.fillRect(42, titleBannerY, W - 84, titleBannerH);
  ctx.strokeStyle = GOLD; ctx.lineWidth = 1;
  ctx.strokeRect(42, titleBannerY, W - 84, titleBannerH);
  ctx.save();
  ctx.textBaseline = 'middle';
  drawCentered('DIPLÔME D’EXPERT', titleBannerY + titleBannerH / 2 - 7, '#F0EDE8', 'bold 22px DejaSans');
  drawCentered('Certification de Niveau IV — Grade Expert', titleBannerY + titleBannerH / 2 + 11, GOLD2, '11px DejaSans');
  ctx.restore();

  const sepY = 138;
  ctx.strokeStyle = GOLD2;
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(W / 2 - 300, sepY); ctx.lineTo(W / 2 - 72, sepY); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(W / 2 +  72, sepY); ctx.lineTo(W / 2 + 300, sepY); ctx.stroke();
  ctx.fillStyle = GOLD;
  ctx.beginPath(); ctx.ellipse(W / 2,      sepY, 6, 4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(W / 2 - 42, sepY, 3, 2, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(W / 2 + 42, sepY, 3, 2, 0, 0, Math.PI * 2); ctx.fill();

  drawCentered('atteste que', 152, GREY, '14px DejaSans');

  ctx.font      = 'bold 52px DejaSans';
  ctx.fillStyle = DARK;
  const nameWidth  = ctx.measureText(name).width;
  const nameHeight = 52 * 1.2;
  ctx.fillText(name, (W - nameWidth) / 2, 176);

  const underlineY = Math.round(176 + nameHeight + 2);
  const uw = Math.min(nameWidth + 80, W - 120);
  ctx.strokeStyle = GOLD; ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(W / 2 - uw / 2, underlineY);
  ctx.lineTo(W / 2 + uw / 2, underlineY);
  ctx.stroke();

  const langY = underlineY + 22;
  drawCentered('a satisfait aux exigences de l’examen d’expert en', langY, GREY, '14px DejaSans');

  const langY2 = langY + 32;
  ctx.font      = 'bold 40px DejaSans';
  ctx.fillStyle = NAVY;
  const langWidth  = ctx.measureText(language.toUpperCase()).width;
  const langHeight = 40 * 1.2;
  ctx.fillText(language.toUpperCase(), (W - langWidth) / 2, langY2);

  const sealCX = W - 98;
  const sealCY = Math.round(langY2 + langHeight / 2);
  ctx.fillStyle = NAVY;
  ctx.beginPath(); ctx.ellipse(sealCX, sealCY, 46, 46, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = GOLD;  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(sealCX, sealCY, 46, 46, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = GOLD2; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.ellipse(sealCX, sealCY, 38, 38, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.save();
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 16px DejaSans'; ctx.fillStyle = GOLD;
  const expW = ctx.measureText('EXP').width;
  ctx.fillText('EXP', sealCX - expW / 2, sealCY - 8);
  ctx.font = 'bold 10px DejaSans'; ctx.fillStyle = GOLD2;
  const ertW = ctx.measureText('EXPERT').width;
  ctx.fillText('EXPERT', sealCX - ertW / 2, sealCY + 8);
  ctx.font = '8px DejaSans'; ctx.fillStyle = GREY;
  const lvW = ctx.measureText('NIV. IV').width;
  ctx.fillText('NIV. IV', sealCX - lvW / 2, sealCY + 22);
  ctx.restore();

  let metaY = Math.round(langY2 + langHeight + 26);
  ctx.strokeStyle = GOLD2; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(60, metaY); ctx.lineTo(W - 60, metaY); ctx.stroke();
  metaY += 12;

  const dateStr  = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
  const scoreStr = 'Score : 100% — Mention Très Très Bien';
  const refStr   = `Réf. LI-${language.toUpperCase()}-${String(Math.floor(Math.random() * 100000)).padStart(5, '0')}`;

  ctx.font = '13px DejaSans'; ctx.fillStyle = GREY;
  ctx.fillText(`Date de délivrance : ${dateStr}`, 80, metaY);
  const scoreW = ctx.measureText(scoreStr).width;
  ctx.fillText(scoreStr, (W - scoreW) / 2, metaY);
  const refW = ctx.measureText(refStr).width;
  ctx.fillText(refStr, W - 80 - refW, metaY);

  const signSepY = H - 72;
  const signY    = H - 58;

  const cowY = metaY + 28;
  ctx.strokeStyle = GOLD2; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(60, cowY - 4); ctx.lineTo(W - 60, cowY - 4); ctx.stroke();

  const RDIV = 730;
  ctx.strokeStyle = GOLD2; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(RDIV, cowY + 4); ctx.lineTo(RDIV, signSepY - 8); ctx.stroke();

  const skills = LANG_SKILLS[language] || ['Syntaxe avancée', 'Structures de données', 'Concepts OOP', 'Paradigmes', 'Code idiomatique'];
  const skillsX = RDIV + 16;

  ctx.font = 'bold 11px DejaSans'; ctx.fillStyle = GOLD;
  ctx.fillText('COMPÉTENCES VALIDÉES', skillsX, cowY + 4);
  ctx.strokeStyle = GOLD2; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(skillsX, cowY + 20); ctx.lineTo(W - 44, cowY + 20); ctx.stroke();

  skills.forEach((skill, i) => {
    const sy = cowY + 30 + i * 22;
    ctx.font = 'bold 11px DejaSans'; ctx.fillStyle = GOLD;
    ctx.fillText('✓', skillsX, sy);
    ctx.font = '11px DejaSans'; ctx.fillStyle = DARK;
    ctx.fillText(skill, skillsX + 18, sy);
  });

  const badgeY = cowY + 30 + skills.length * 22 + 12;
  const bX = skillsX, bW = W - 44 - bX;
  ctx.fillStyle = NAVY;
  ctx.fillRect(bX, badgeY, bW, 26);
  ctx.save();
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 11px DejaSans'; ctx.fillStyle = GOLD;
  const btW = ctx.measureText('NIVEAU : EXPERT').width;
  ctx.fillText('NIVEAU : EXPERT', bX + (bW - btW) / 2, badgeY + 13);
  ctx.restore();

  ctx.font = '12px DejaSlabMono'; ctx.fillStyle = DARK;
  const lineH    = 16;
  const maxLines = Math.floor((signSepY - 12 - cowY) / lineH);
  cowsayText.split('\n').slice(0, maxLines).forEach((line, i) => {
    ctx.fillText(line, 60, cowY + i * lineH);
  });

  ctx.strokeStyle = GOLD2; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(60, signSepY); ctx.lineTo(W - 60, signSepY); ctx.stroke();

  ctx.font = '13px DejaSans'; ctx.fillStyle = GREY;
  ctx.fillText('Direction des certifications', 80, signY);
  const liW = ctx.measureText('leet-institute.bzh').width;
  ctx.fillStyle = GOLD;
  ctx.fillText('leet-institute.bzh', (W - liW) / 2, signY);
  const yrW = ctx.measureText('© 2026 Leet Institute').width;
  ctx.fillStyle = GREY;
  ctx.fillText('© 2026 Leet Institute', W - 80 - yrW, signY);

  return canvas.toBuffer('image/png');
}

let previewCache = null;

const app = express();
app.use(express.json());

app.get('/api/preview', (_req, res) => {
  if (!previewCache) previewCache = buildDiploma('John Doe', 'python');
  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.send(previewCache);
});

app.get('/api/quiz/:language', (req, res) => {
  const lang = req.params.language;
  if (!QUIZ[lang]) {
    return res.status(404).json({ detail: 'Langage inconnu' });
  }
  const questions = QUIZ[lang].map((q, i) => ({
    id:       i,
    question: q.question,
    choices:  q.choices,
    code:     q.code || null,
    correct:  q.correct,
  }));
  res.json({ questions });
});

app.post('/api/diploma', (req, res) => {
  const { name, language, answers } = req.body ?? {};

  if (!QUIZ[language]) {
    return res.status(400).json({ detail: 'Langage inconnu' });
  }
  if (!name || name.length > 200) {
    return res.status(400).json({ detail: 'Nom invalide' });
  }

  const questions = QUIZ[language];
  for (let i = 0; i < questions.length; i++) {
    const key = String(i);
    if (answers?.[key] === undefined) {
      return res.status(400).json({ detail: `Réponse manquante pour la question ${i + 1}` });
    }
    if (answers[key] !== questions[i].correct) {
      return res.status(403).json({ detail: "Mauvaises réponses — retente ta chance !" });
    }
  }

  const png = buildDiploma(name, language);
  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Content-Disposition', 'attachment; filename="diplome.png"');
  res.send(png);
});

app.use(express.static(path.join(__dirname, 'public'), { index: 'index.html' }));

app.listen(8000, '0.0.0.0', () => {
  console.log('Listening on http://0.0.0.0:8000');
});
