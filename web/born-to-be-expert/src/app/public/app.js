const LETTERS = ["A", "B", "C", "D", "E"];

function escHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function renderInlineMarkdown(text) {
  return escHtml(text).replace(/`([^`]+)`/g, '<code>$1</code>');
}

function highlightCode(code, lang) {
  const kwMap = {
    'python': new Set(['def','return','yield','import','from','class','if','else','elif',
      'for','while','in','not','and','or','True','False','None','with','as','pass',
      'break','continue','lambda','try','except','finally','raise','print']),
    'php': new Set(['function','return','if','else','elseif','while','for','foreach','echo',
      'new','class','public','private','protected','static','extends','implements',
      'namespace','use','true','false','null','void','int','string','bool','array']),
    'java': new Set(['public','private','protected','class','interface','static','void','int',
      'long','double','float','boolean','char','byte','short','String','Object','return',
      'new','extends','implements','import','package','for','while','if','else','final',
      'abstract','super','this','null','true','false','throw','throws','try','catch','finally']),
    'c++': new Set(['int','void','return','struct','class','public','private','protected',
      'namespace','using','for','while','if','else','new','delete','nullptr','true','false',
      'auto','const','static','template','typename','std','bool','char','double','float',
      'long','short','unsigned','include']),
  };
  const keywords = kwMap[lang] || new Set();
  const re = /\/\*[\s\S]*?\*\/|\/\/[^\n]*|#[^\n]*|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|\b\d+(?:\.\d+)?\b|[A-Za-z_]\w*|[^\s\w]|\s+/g;
  let html = '';
  for (const tok of (code.match(re) || [])) {
    if (tok.startsWith('/*') || tok.startsWith('//') ||
        (tok.startsWith('#') && (lang === 'python' || lang === 'php'))) {
      html += '<span style="color:#6a9955">' + escHtml(tok) + '</span>';
    } else if (tok[0] === '"' || tok[0] === "'") {
      html += '<span style="color:#ce9178">' + escHtml(tok) + '</span>';
    } else if (/^\d/.test(tok)) {
      html += '<span style="color:#b5cea8">' + escHtml(tok) + '</span>';
    } else if (/^[A-Za-z_]/.test(tok)) {
      html += keywords.has(tok)
        ? '<span style="color:#569cd6">' + escHtml(tok) + '</span>'
        : escHtml(tok);
    } else {
      html += escHtml(tok);
    }
  }
  return html;
}

const state = {
  name: "",
  language: "",
  questions: [],
  answers: {},
  current: 0,
  diplomaBlob: null,
};

function showView(id) {
  document.querySelectorAll(".view").forEach((v) => v.classList.remove("active"));
  const el = document.getElementById(id);
  el.classList.add("active");
}

document.getElementById("btn-start").addEventListener("click", () => {
  showView("view-name");
});

document.getElementById("btn-name").addEventListener("click", () => {
  const val = document.getElementById("name-input").value.trim();
  const err = document.getElementById("name-error");
  if (!val) {
    err.textContent = "Veuillez saisir votre nom.";
    err.classList.remove("hidden");
    return;
  }
  err.classList.add("hidden");
  state.name = val;
  showView("view-lang");
});

document.getElementById("name-input").addEventListener("keydown", (e) => {
  if (e.key === "Enter") document.getElementById("btn-name").click();
});

document.querySelectorAll(".lang-card").forEach((btn) => {
  btn.addEventListener("click", async () => {
    state.language = btn.dataset.lang;
    await loadQuiz();
    showView("view-quiz");
  });
});

async function loadQuiz() {
  const res = await fetch(`/api/quiz/${encodeURIComponent(state.language)}`);
  const data = await res.json();
  state.questions = data.questions;
  state.answers = {};
  state.current = 0;
  renderQuestion();
}

function renderQuestion() {
  const q = state.questions[state.current];
  const total = state.questions.length;
  const idx = state.current;

  document.getElementById("quiz-lang-label").textContent =
    `Certification ${state.language.toUpperCase()} — Leet Institute`;

  document.getElementById("question-label").textContent =
    `Question ${idx + 1} / ${total}`;

  const fill = document.getElementById("quiz-progress-fill");
  fill.style.width = `${((idx) / total) * 100}%`;

  document.getElementById("quiz-counter").textContent =
    `Question ${idx + 1} / ${total}`;

  document.getElementById("question-text").innerHTML = renderInlineMarkdown(q.question);

  const codeBlock = document.getElementById("question-code");
  if (q.code) {
    codeBlock.innerHTML = '<pre><code>' + highlightCode(q.code, state.language) + '</code></pre>';
    codeBlock.classList.remove("hidden");
  } else {
    codeBlock.innerHTML = "";
    codeBlock.classList.add("hidden");
  }

  const choicesEl = document.getElementById("choices");
  choicesEl.innerHTML = "";

  q.choices.forEach((choice, i) => {
    const btn = document.createElement("button");
    btn.className = "choice-btn" + (state.answers[idx] === i ? " selected" : "");
    btn.dataset.idx = i;

    const letter = document.createElement("span");
    letter.className = "choice-letter";
    letter.textContent = LETTERS[i];

    btn.appendChild(letter);
    const choiceSpan = document.createElement('span');
    choiceSpan.innerHTML = renderInlineMarkdown(choice);
    btn.appendChild(choiceSpan);

    btn.addEventListener("click", () => {
      state.answers[idx] = i;
      document.querySelectorAll(".choice-btn").forEach((b) => b.classList.remove("selected"));
      btn.classList.add("selected");
      letter.style.background = "";
      document.getElementById("quiz-error").classList.add("hidden");
    });

    choicesEl.appendChild(btn);
  });

  document.getElementById("btn-prev").style.visibility = idx === 0 ? "hidden" : "visible";

  const btnNext = document.getElementById("btn-next");
  btnNext.disabled = false;
  const isLast = idx === total - 1;
  btnNext.innerHTML = isLast
    ? 'Soumettre <span class="btn-icon">✓</span>'
    : 'Suivant <span class="btn-icon">→</span>';
}

document.getElementById("btn-prev").addEventListener("click", () => {
  if (state.current > 0) {
    state.current--;
    renderQuestion();
  }
});

document.getElementById("btn-next").addEventListener("click", async () => {
  const idx = state.current;
  const err = document.getElementById("quiz-error");

  if (state.answers[idx] === undefined) {
    err.textContent = "Veuillez sélectionner une réponse.";
    err.classList.remove("hidden");
    return;
  }
  err.classList.add("hidden");

  const q = state.questions[idx];
  const chosen = state.answers[idx];
  const choiceBtns = document.querySelectorAll(".choice-btn");
  const btnNext = document.getElementById("btn-next");
  const btnPrev = document.getElementById("btn-prev");

  // Disable everything during feedback
  choiceBtns.forEach(b => b.disabled = true);
  btnNext.disabled = true;
  btnPrev.disabled = true;

  // Highlight correct answer and wrong selection
  choiceBtns[q.correct].classList.add("correct");
  if (chosen !== q.correct) choiceBtns[chosen].classList.add("wrong");

  await new Promise(resolve => setTimeout(resolve, 1000));

  btnPrev.disabled = false;

  if (idx < state.questions.length - 1) {
    state.current++;
    renderQuestion();
    return;
  }

  btnNext.disabled = true;
  btnNext.innerHTML = "Vérification…";

  const payload = {
    name: state.name,
    language: state.language,
    answers: Object.fromEntries(
      Object.entries(state.answers).map(([k, v]) => [String(k), v])
    ),
  };

  try {
    const res = await fetch("/api/diploma", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const body = await res.json();
      err.textContent = body.detail || "Une erreur est survenue.";
      err.classList.remove("hidden");
      btnNext.disabled = false;
      btnNext.innerHTML = 'Soumettre <span class="btn-icon">✓</span>';
      return;
    }

    state.diplomaBlob = await res.blob();
    document.getElementById("success-name").textContent = state.name;
    document.getElementById("success-desc").textContent =
      `Votre certificat d'expert ${state.language.toUpperCase()} délivré par le Leet Institute est prêt. ` +
      `Vous avez répondu correctement à toutes les questions de l'examen.`;
    showView("view-success");
  } catch {
    err.textContent = "Erreur réseau. Réessayez.";
    err.classList.remove("hidden");
    btnNext.disabled = false;
    btnNext.innerHTML = 'Soumettre <span class="btn-icon">✓</span>';
  }
});

document.getElementById("btn-download").addEventListener("click", () => {
  if (!state.diplomaBlob) return;
  const url = URL.createObjectURL(state.diplomaBlob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `certificat_${state.language}_leet_institute.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
});

document.getElementById("btn-restart").addEventListener("click", () => {
  state.name = "";
  state.language = "";
  state.questions = [];
  state.answers = {};
  state.current = 0;
  state.diplomaBlob = null;
  document.getElementById("name-input").value = "";
  showView("view-name");
});
