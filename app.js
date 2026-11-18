/* =========================================================
   بنك المعلومات - الصف الحادي عشر
   جميع الحقوق محفوظة © باسم أبو أنس 2026
   ملف واحد للبرنامج كله. البيانات في مجلد data
   ========================================================= */
'use strict';

/* ---------- المواد ---------- */
const SUBJECTS = [
  { key: 'islamic',   name: 'التربية الإسلامية', icon: '🕌', color: '#0f7a5a' },
  { key: 'quran',     name: 'القرآن الكريم',     icon: '📗', color: '#1b8f3a' },
  { key: 'arabic',    name: 'اللغة العربية',     icon: '📖', color: '#b5482b' },
  { key: 'english',   name: 'English',           icon: '🔤', color: '#3558c9', ltr: true },
  { key: 'physics',   name: 'الفيزياء',          icon: '🧲', color: '#7b3fc4' },
  { key: 'chemistry', name: 'الكيمياء',          icon: '⚗️', color: '#c2410c' },
  { key: 'biology',   name: 'الأحياء',           icon: '🧬', color: '#15803d' },
  { key: 'geology',   name: 'الجيولوجيا',        icon: '🪨', color: '#8a6a3b' },
];
const SUBJ = Object.fromEntries(SUBJECTS.map(s => [s.key, s]));

/* ---------- التخزين على الجهاز ---------- */
const PFX = 'g11:';
const store = {
  get(k, d) { try { const v = localStorage.getItem(PFX + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(PFX + k, JSON.stringify(v)); } catch { toast('تعذر الحفظ على الجهاز'); } },
};
const S = {
  read: store.get('read', {}),          // { "arabic:l01": true }
  stats: store.get('stats', {}),        // { arabic: {answered, correct} }
  mistakes: store.get('mistakes', {}),  // { "arabic:l01q1": {streak} }
  favs: store.get('favs', { lessons: [], questions: [] }),
  reports: store.get('reports', []),
  settings: store.get('settings', { theme: 'light', fs: 17 }),
};
const save = k => store.set(k, S[k]);

/* ---------- تحميل البيانات ---------- */
const DATA = {};
async function load(key) {
  if (DATA[key]) return DATA[key];
  const r = await fetch('data/' + key + '.json');
  if (!r.ok) throw new Error('تعذر تحميل ' + key);
  const d = await r.json();
  d._lessons = [];
  d.units.forEach(u => u.lessons.forEach(l => { l._unit = u; d._lessons.push(l); }));
  return (DATA[key] = d);
}
const loadAll = () => Promise.all(SUBJECTS.map(s => load(s.key)));
const findLesson = (d, id) => d._lessons.find(l => l.id === id);

/* ---------- أدوات مساعدة ---------- */
const $ = s => document.querySelector(s);
const app = $('#app');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const norm = s => String(s || '').toLowerCase()
  .replace(/[ً-ٰٟـ]/g, '')
  .replace(/[أإآٱ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي');
let toastTimer;
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => (t.hidden = true), 2200);
}
function setTitle(t, showBack = true) {
  $('#pageTitle').textContent = t;
  $('#backBtn').hidden = !showBack; $('#homeBtn').hidden = !showBack;
  document.title = t + ' | بنك المعلومات';
}
function pagesText(p) {
  if (!p) return '';
  if (typeof p === 'string') return 'الصفحات: ' + p;
  const arr = p.book || p.sb || p.pdf;
  if (!arr || !arr.length) return '';
  return 'الصفحات: ' + (arr.length > 1 ? arr[0] + '-' + arr[arr.length - 1] : arr[0]);
}
const qKey = (sk, q) => sk + ':' + q.id;
const lKey = (sk, l) => sk + ':' + l.id;

/* ---------- الإعدادات والمظهر ---------- */
function applySettings() {
  const t = S.settings.theme === 'auto'
    ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : S.settings.theme;
  document.documentElement.dataset.theme = t;
  document.documentElement.style.setProperty('--fs', S.settings.fs + 'px');
}

/* ---------- التوجيه ---------- */
$('#backBtn').onclick = () => history.length > 1 ? history.back() : go('');
$('#homeBtn').onclick = () => go('');
function go(h) { location.hash = '#/' + h; }
window.addEventListener('hashchange', route);

async function route() {
  stopTimer();
  closeModal();
  window.scrollTo(0, 0);
  const raw = location.hash.replace(/^#\/?/, '');
  const [path, qs] = raw.split('?');
  const parts = path.split('/').filter(Boolean).map(decodeURIComponent);
  const params = new URLSearchParams(qs || '');
  try {
    switch (parts[0]) {
      case undefined: return home();
      case 's': return subjectPage(parts[1]);
      case 'l': return lessonPage(parts[1], parts[2]);
      case 'setup': return quizSetup(params.get('scope') || 'all');
      case 'quiz': return quizRun();
      case 'result': return quizResult();
      case 'cards': return cardsPage(parts[1], parts[2]);
      case 'search': return searchPage(params.get('q') || '');
      case 'mistakes': return mistakesPage();
      case 'favs': return favsPage();
      case 'reports': return reportsPage();
      case 'settings': return settingsPage();
      case 'ref': return refPage();
      default: return home();
    }
  } catch (e) {
    console.error(e);
    app.innerHTML = `<div class="card empty">حدث خطأ: ${esc(e.message)}<br><br>
      <span class="muted">إذا فتحت الملف مباشرة من الجهاز فشغّله عبر خادم (مثل معاينة Acode) أو من رابط GitHub Pages.</span></div>`;
  }
}

/* =========================================================
   الشاشة الرئيسية
   ========================================================= */
async function home() {
  setTitle('بنك المعلومات', false);
  app.innerHTML = '<div class="loading">جارٍ التحميل…</div>';
  await loadAll();
  const mCount = Object.keys(S.mistakes).length;
  const fCount = S.favs.lessons.length + S.favs.questions.length;
  let totalL = 0, readL = 0;
  const cards = SUBJECTS.map(s => {
    const d = DATA[s.key]; const n = d._lessons.length;
    const r = d._lessons.filter(l => S.read[lKey(s.key, l)]).length;
    totalL += n; readL += r;
    const st = S.stats[s.key];
    const acc = st && st.answered ? Math.round(100 * st.correct / st.answered) + '%' : '—';
    return `<button class="subj" style="--c:${s.color}" onclick="go('s/${s.key}')">
      <span class="ic">${s.icon}</span><b>${esc(s.name)}</b>
      <div class="progress"><i style="width:${n ? 100 * r / n : 0}%"></i></div>
      <div class="muted">${r}/${n} درس • الدقة ${acc}</div></button>`;
  }).join('');
  app.innerHTML = `
    <div class="hero"><h2>بنك المعلومات</h2>
      <p>الصف الحادي عشر • الفصل الدراسي الأول • ${esc(DATA.arabic.year || '')}</p>
      <div class="progress" style="margin-top:.7rem;background:rgba(255,255,255,.25)"><i style="width:${totalL ? 100 * readL / totalL : 0}%;background:#fff"></i></div>
      <p style="margin-top:.3rem;font-size:.8rem">أنجزت ${readL} من ${totalL} درساً</p></div>
    <div class="subjects">${cards}</div>
    <div class="tools">
      <button class="tool" onclick="go('search')"><span>🔎</span>البحث</button>
      <button class="tool" onclick="go('setup?scope=all')"><span>📝</span>اختبار شامل</button>
      <button class="tool" onclick="go('mistakes')"><span>❗</span>أخطائي<em>${mCount} سؤال</em></button>
      <button class="tool" onclick="go('favs')"><span>⭐</span>المفضلة<em>${fCount}</em></button>
      <button class="tool" onclick="go('reports')"><span>🚩</span>البلاغات<em>${S.reports.length}</em></button>
      <button class="tool" onclick="go('settings')"><span>⚙️</span>الإعدادات</button>
    </div>
    <div class="card muted">💡 تنبيه: نصوص الآيات والأحاديث في البرنامج للمذاكرة، والمرجع النهائي هو المصحف والكتاب المدرسي والمعلم.</div>
    <footer class="copyright">جميع الحقوق محفوظة © باسم أبو أنس 2026</footer>`;
}

/* =========================================================
   صفحة المادة
   ========================================================= */
async function subjectPage(key) {
  const s = SUBJ[key]; if (!s) return go('');
  setTitle(s.name);
  const d = await load(key);
  let html = `<div class="row" style="margin-bottom:.8rem">
    <button class="btn primary grow" onclick="go('setup?scope=${key}')">📝 اختبار المادة</button>
    <button class="btn grow" onclick="go('search')">🔎 بحث</button></div>`;
  if (key === 'english' && d.reference) html += `<button class="btn block" style="margin-bottom:.8rem" onclick="go('ref')">📚 Glossary & Irregular Verbs</button>`;
  d.units.forEach((u, ui) => {
    const done = u.lessons.filter(l => S.read[lKey(key, l)]).length;
    html += `<div class="card unit"><div class="row"><h3 class="grow">${esc(u.title)}</h3>
      <span class="badge">${done}/${u.lessons.length}</span></div>`;
    let lastCh = '';
    u.lessons.forEach(l => {
      const ch = l.chapter || l.section || '';
      if (ch && ch !== lastCh) { html += `<div class="muted" style="margin-top:.5rem">${esc(ch)}</div>`; lastCh = ch; }
      const isDone = S.read[lKey(key, l)];
      html += `<button class="lesson-link ${isDone ? 'done' : ''}" onclick="go('l/${key}/${encodeURIComponent(l.id)}')">
        <span class="chk">${isDone ? '✓' : ''}</span><span class="grow ${s.ltr ? 'ltr' : ''}">${esc(l.title)}</span>
        <span class="muted">${l.questions ? l.questions.length + ' س' : ''}</span></button>`;
    });
    html += `<button class="btn block" onclick="go('setup?scope=${key}/${ui}')">اختبار الوحدة</button></div>`;
  });
  app.innerHTML = html;
}

/* =========================================================
   عرض محتوى الدرس
   ========================================================= */
// [العنوان العربي, العنوان الإنجليزي, طريقة العرض]
const FIELDS = {
  author: ['الكاتب', 'Author', 'p'], source: ['المصدر', 'Source', 'p'], narrator: ['راوي الحديث', 'Narrator', 'p'],
  intro: ['تمهيد', 'Introduction', 'p'],
  text: ['النص', 'Text', 'text'],
  summary: ['الملخص', 'Summary', 'p'],
  objectives: ['أهداف الدرس', 'Objectives', 'ul'],
  mainIdeas: ['الأفكار الرئيسية', 'Main Ideas', 'ul'],
  keyPoints: ['أهم النقاط', 'Key Points', 'ul'],
  facts: ['معلومات', 'Facts', 'ul'],
  concepts: ['المفاهيم والمصطلحات', 'Concepts', 'terms'],
  definitions: ['التعريفات', 'Definitions', 'terms'],
  vocabulary: ['المفردات', 'Vocabulary', 'terms'],
  wordFamilies: ['عائلات الكلمات', 'Word Families', 'table-obj'],
  formulas: ['القوانين', 'Formulas', 'formulas'],
  examples: ['أمثلة محلولة', 'Worked Examples', 'objs'],
  evidence: ['الأدلة', 'Evidence', 'evidence'],
  tables: ['جداول ومقارنات', 'Tables', 'tables'],
  comparisons: ['مقارنات', 'Comparisons', 'tables'],
  rules: ['قواعد', 'Rules', 'objs'],
  steps: ['خطوات', 'Steps', 'ol'],
  literary: ['الجماليات الأدبية', 'Literary', 'objs'],
  grammar: ['القواعد', 'Grammar', 'objs'],
  proverbs: ['أمثال', 'Proverbs', 'objs'],
  readings: ['القراءة', 'Reading', 'objs'],
  listening: ['الاستماع', 'Listening', 'objs'],
  pronunciation: ['النطق', 'Pronunciation', 'objs'],
  functions: ['التعبيرات الوظيفية', 'Functions', 'objs'],
  writing: ['الكتابة', 'Writing', 'obj'],
  quotes: ['اقتباسات', 'Quotes', 'objs'],
  characters: ['الشخصيات', 'Characters', 'objs'],
  episodes: ['الأحداث', 'Episodes', 'objs'],
  themes: ['الموضوعات', 'Themes', 'ul'],
  values: ['القيم المستفادة', 'Values', 'ul'],
  guidance: ['الهدايات', 'Guidance', 'ul'],
  safety: ['قواعد الأمان', 'Safety', 'ul'],
  activities: ['الأنشطة العملية', 'Activities', 'objs'],
};
const SKIP = new Set(['id', 'num', 'title', 'titleEn', 'type', 'pages', 'section', 'chapter', 'questions', 'textNote', '_unit']);
const SUBLABEL = {
  term: '', en: '', meaning: 'المعنى', word: '', ar: 'بالعربي', def: 'Definition', pos: '',
  point: 'النقطة', explanation: 'الشرح', example: 'مثال', title: '', summary: 'Summary', keyFacts: 'Key facts',
  rules: 'Rules', examples: 'Examples', topic: '', points: '', function: '', phrases: 'Phrases', task: 'Task', tips: 'Tips',
  text: '', author: '—', name: '', description: '', idea: 'الفكرة', proverb: 'المثل', type: '', ref: 'المصدر', use: 'الاستشهاد',
  q: 'السؤال', solution: 'الحل', formula: '', eq: '', notes: 'ملاحظة', goal: 'الهدف', aim: 'الهدف', materials: 'المواد',
  result: 'النتيجة', conclusions: 'الاستنتاجات', n: 'نشاط', items: '', verb: 'Verb', noun: 'Noun', adjective: 'Adjective', adverb: 'Adverb',
};
function renderValue(v) {
  if (Array.isArray(v)) {
    if (v.every(x => typeof x !== 'object')) return `<ul>${v.map(x => `<li>${esc(x)}</li>`).join('')}</ul>`;
    return v.map(renderObj).join('');
  }
  if (v && typeof v === 'object') return renderObj(v);
  return `<div style="white-space:pre-line">${esc(v)}</div>`;
}
function renderObj(o) {
  if (typeof o !== 'object' || o === null) return `<div>${esc(o)}</div>`;
  const head = o.title || o.topic || o.name || o.function || o.point || o.idea;
  let h = '<div class="sub">';
  if (o.n != null && o.title) h += `<b>${esc(SUBLABEL.n)} ${esc(o.n)}: ${esc(o.title)}</b>`;
  else if (head) h += `<b>${esc(head)}</b>`;
  if (o.en) h += ` <span class="term en">${esc(o.en)}</span>`;
  if (o.type && o.text) h += `<span class="badge">${esc(o.type)}</span>`;
  for (const [k, v] of Object.entries(o)) {
    if (['title', 'topic', 'name', 'function', 'n', 'en'].includes(k)) continue;
    if (k === 'point' && head === o.point) continue;
    if (k === 'idea' && head === o.idea) continue;
    if (k === 'type' && o.text) continue;
    if (v == null || v === '') continue;
    const lab = SUBLABEL[k] ?? k;
    if (k === 'text') { h += `<div class="textblock" style="margin:.4rem 0">${esc(v)}</div>`; continue; }
    if (k === 'author' && o.text) { h += `<div class="muted">— ${esc(v)}</div>`; continue; }
    if (k === 'formula' || k === 'eq') { h += `<div class="formula">${esc(v)}</div>`; continue; }
    h += `<div>${lab ? `<span class="k">${esc(lab)}:</span> ` : ''}${Array.isArray(v) ? renderValue(v) : esc(v)}</div>`;
  }
  return h + '</div>';
}
function renderTable(t) {
  const rows = t.rows || [];
  if (!rows.length) return '';
  const [hd, ...body] = rows;
  return `${t.title ? `<b>${esc(t.title)}</b>` : ''}<div class="tbl-wrap"><table>
    <tr>${hd.map(c => `<th>${esc(c)}</th>`).join('')}</tr>
    ${body.map(r => `<tr>${r.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</table></div>`;
}
function renderField(key, v, ltr) {
  const f = FIELDS[key] || [key, key, 'auto'];
  const mode = f[2];
  if (v == null || (Array.isArray(v) && !v.length) || v === '') return '';
  switch (mode) {
    case 'p': return `<div style="white-space:pre-line">${esc(v)}</div>`;
    case 'text': return `<div class="textblock">${esc(v)}</div>`;
    case 'ul': return `<ul>${v.map(x => `<li>${esc(x)}</li>`).join('')}</ul>`;
    case 'ol': return `<ol>${v.map(x => `<li>${esc(x)}</li>`).join('')}</ol>`;
    case 'terms': return v.map(t => {
      const term = t.term || t.word;
      const extra = [t.pos && `(${t.pos})`, t.en].filter(Boolean).join(' ');
      const mean = [t.meaning, t.ar && (ltr ? t.ar : ''), t.def].filter(Boolean);
      return `<div class="term"><b>${esc(term)}</b> ${extra ? `<span class="en">${esc(extra)}</span>` : ''}
        ${t.ar && ltr ? `<div dir="rtl" style="text-align:right">${esc(t.ar)}</div>` : ''}
        ${mean.filter(m => m !== t.ar).map(m => `<div>${esc(m)}</div>`).join('')}</div>`;
    }).join('');
    case 'formulas': return v.map(x => `<div class="sub"><b>${esc(x.name)}</b><div class="formula">${esc(x.formula || x.eq)}</div>${x.notes ? `<div class="muted">${esc(x.notes)}</div>` : ''}</div>`).join('');
    case 'tables': return v.map(renderTable).join('');
    case 'table-obj': {
      const keys = Object.keys(v[0]);
      return renderTable({ rows: [keys.map(k => SUBLABEL[k] || k), ...v.map(o => keys.map(k => o[k] || ''))] });
    }
    case 'evidence': return v.map(e => `<div class="sub"><span class="badge">${esc(e.type)}</span>
      <div class="textblock" style="margin:.4rem 0;font-size:1rem">${esc(e.text)}</div>
      <div class="muted">${esc(e.ref)}${e.use ? ' — ' + esc(e.use) : ''}</div></div>`).join('');
    case 'obj': return renderObj(v);
    default: return renderValue(v);
  }
}

async function lessonPage(key, id) {
  const s = SUBJ[key]; if (!s) return go('');
  const d = await load(key);
  const l = findLesson(d, id); if (!l) return go('s/' + key);
  setTitle(s.name);
  const ltr = !!s.ltr;
  const fields = Object.keys(l).filter(k => !SKIP.has(k) && l[k] != null && !(Array.isArray(l[k]) && !l[k].length));
  // ترتيب: حسب FIELDS ثم أي حقل غير معروف
  const order = Object.keys(FIELDS);
  fields.sort((a, b) => (order.indexOf(a) + 1 || 99) - (order.indexOf(b) + 1 || 99));
  const lab = k => (FIELDS[k] ? FIELDS[k][ltr ? 1 : 0] : k);
  const chips = fields.map(k => `<button class="chip" onclick="document.getElementById('sec-${k}').scrollIntoView({behavior:'smooth'})">${esc(lab(k))}</button>`).join('');
  const qn = (l.questions || []).length;
  let html = `<div class="card ${ltr ? 'ltr' : ''}"><div class="muted">${esc(l._unit.title)}${l.chapter ? ' • ' + esc(l.chapter) : ''}</div>
    <h2 style="margin:.3rem 0">${esc(l.title)}</h2>${l.titleEn ? `<div class="muted" dir="ltr" style="text-align:right">${esc(l.titleEn)}</div>` : ''}
    <div class="muted">${esc(pagesText(l.pages))}${qn ? ' • ' + qn + ' سؤال' : ''}</div></div>
    ${fields.length > 2 ? `<div class="chips">${chips}${qn ? `<button class="chip" onclick="go('setup?scope=${key}/l/${encodeURIComponent(id)}')">📝 ${ltr ? 'Quiz' : 'الأسئلة'}</button>` : ''}</div>` : ''}`;
  for (const k of fields) {
    html += `<section class="card sec ${ltr ? 'ltr' : ''}" id="sec-${k}"><h3>${esc(lab(k))}</h3>${renderField(k, l[k], ltr)}
      ${k === 'text' && l.textNote ? `<div class="note">⚠️ ${esc(l.textNote)}</div>` : ''}</section>`;
  }
  const isRead = !!S.read[lKey(key, l)];
  const isFav = S.favs.lessons.includes(lKey(key, l));
  const hasCards = cardItems(l).length > 0;
  html += `<div class="actions">
    <button id="readBtn" class="${isRead ? 'on' : ''}" onclick="toggleRead('${key}','${esc(id)}')"><span>${isRead ? '✅' : '☑️'}</span>${isRead ? 'مقروء' : 'قرأته'}</button>
    <button id="favBtn" class="${isFav ? 'on' : ''}" onclick="toggleFavLesson('${key}','${esc(id)}')"><span>${isFav ? '⭐' : '☆'}</span>المفضلة</button>
    ${qn ? `<button onclick="go('setup?scope=${key}/l/${encodeURIComponent(id)}')"><span>📝</span>اختبرني</button>` : ''}
    ${hasCards ? `<button onclick="go('cards/${key}/${encodeURIComponent(id)}')"><span>🃏</span>بطاقات</button>` : ''}
    <button onclick="openReport({subject:'${key}',lessonId:'${esc(id)}'})"><span>🚩</span>بلّغ عن خطأ</button></div>`;
  app.innerHTML = html;
}
function toggleRead(key, id) {
  const k = key + ':' + id;
  if (S.read[k]) delete S.read[k]; else S.read[k] = true;
  save('read'); route();
  if (S.read[k]) toast('أحسنت! سُجّل الدرس كمقروء');
}
function toggleFavLesson(key, id) {
  const k = key + ':' + id, a = S.favs.lessons, i = a.indexOf(k);
  if (i >= 0) a.splice(i, 1); else a.push(k);
  save('favs'); toast(i >= 0 ? 'أزيل من المفضلة' : 'أضيف إلى المفضلة');
  const b = $('#favBtn'); if (b) { b.classList.toggle('on', i < 0); b.querySelector('span').textContent = i < 0 ? '⭐' : '☆'; }
}

/* =========================================================
   البطاقات التعليمية
   ========================================================= */
function cardItems(l) {
  const out = [];
  for (const k of ['concepts', 'definitions', 'vocabulary']) {
    (l[k] || []).forEach(t => {
      const front = t.term || t.word; if (!front) return;
      const back = [t.meaning, t.ar, t.def].filter(Boolean).join('\n');
      if (back) out.push({ front, sub: [t.pos, t.en].filter(Boolean).join(' • '), back });
    });
  }
  return out;
}
let cards = null;
async function cardsPage(key, id) {
  const s = SUBJ[key]; const d = await load(key); const l = findLesson(d, id);
  if (!l) return go('');
  setTitle('بطاقات: ' + s.name);
  if (!cards || cards.id !== key + id) cards = { id: key + id, items: cardItems(l), i: 0 };
  drawCard(l);
}
function drawCard(l) {
  const c = cards, it = c.items[c.i];
  app.innerHTML = `<div class="muted" style="margin-bottom:.5rem">${esc(l.title)}</div>
    <div class="row" style="margin-bottom:.5rem"><span class="grow muted">البطاقة ${c.i + 1} من ${c.items.length} — اضغط البطاقة لقلبها</span></div>
    <div class="flash" id="flash" onclick="this.classList.toggle('flipped')"><div class="flash-inner">
      <div class="face"><b>${esc(it.front)}</b>${it.sub ? `<div class="muted" dir="auto">${esc(it.sub)}</div>` : ''}</div>
      <div class="face back"><div style="white-space:pre-line" dir="auto">${esc(it.back)}</div></div></div></div>
    <div class="row"><button class="btn grow" onclick="moveCard(-1)">→ السابقة</button>
      <button class="btn grow" onclick="cards.items=shuffle(cards.items);cards.i=0;route()">🔀 خلط</button>
      <button class="btn primary grow" onclick="moveCard(1)">التالية ←</button></div>`;
}
function moveCard(n) { cards.i = (cards.i + n + cards.items.length) % cards.items.length; route(); }

/* =========================================================
   الاختبارات
   ========================================================= */
// scope: all | KEY | KEY/UNIT | KEY/l/LESSONID | mistakes | favs
async function gather(scope) {
  const out = [];
  const add = (key, l) => (l.questions || []).forEach(q => out.push({ key, lesson: l, q }));
  if (scope === 'mistakes' || scope === 'favs') {
    const keys = scope === 'mistakes' ? Object.keys(S.mistakes) : S.favs.questions;
    await loadAll();
    for (const k of keys) {
      const [key, qid] = k.split(':');
      const d = DATA[key]; if (!d) continue;
      for (const l of d._lessons) { const q = (l.questions || []).find(x => x.id === qid); if (q) { out.push({ key, lesson: l, q }); break; } }
    }
    return out;
  }
  const [key, a, b] = scope.split('/');
  if (key === 'all') { await loadAll(); SUBJECTS.forEach(s => DATA[s.key]._lessons.forEach(l => add(s.key, l))); return out; }
  const d = await load(key);
  if (a === 'l') add(key, findLesson(d, b));
  else if (a != null) d.units[+a].lessons.forEach(l => add(key, l));
  else d._lessons.forEach(l => add(key, l));
  return out;
}
async function scopeTitle(scope) {
  if (scope === 'all') return 'اختبار شامل لكل المواد';
  if (scope === 'mistakes') return 'مراجعة أخطائي';
  if (scope === 'favs') return 'الأسئلة المفضلة';
  const [key, a, b] = scope.split('/'); const d = await load(key);
  if (a === 'l') return SUBJ[key].name + ' — ' + findLesson(d, b).title;
  if (a != null) return SUBJ[key].name + ' — ' + d.units[+a].title;
  return 'اختبار ' + SUBJ[key].name;
}

async function quizSetup(scope) {
  setTitle('إعداد الاختبار');
  const all = await gather(scope);
  const cnt = t => all.filter(x => x.q.type === t).length;
  if (!all.length) { app.innerHTML = '<div class="card empty">لا توجد أسئلة هنا بعد.</div>'; return; }
  const counts = [10, 20, 30, 50].filter(n => n < all.length);
  app.innerHTML = `<div class="card"><h2>${esc(await scopeTitle(scope))}</h2>
    <div class="muted">عدد الأسئلة المتاحة: ${all.length}</div></div>
    <div class="card opts-setup">
      <h3>نوع الأسئلة</h3>
      <label><input type="checkbox" id="t-mcq" ${cnt('mcq') ? 'checked' : 'disabled'}> اختيار من متعدد (${cnt('mcq')})</label>
      <label><input type="checkbox" id="t-tf" ${cnt('tf') ? 'checked' : 'disabled'}> صح أو خطأ (${cnt('tf')})</label>
      <label><input type="checkbox" id="t-short" ${cnt('short') ? 'checked' : 'disabled'}> أسئلة مقالية قصيرة (${cnt('short')})</label>
      <h3 style="margin-top:1rem">عدد الأسئلة</h3>
      <select id="count">${counts.map(n => `<option value="${n}" ${n === 10 ? 'selected' : ''}>${n}</option>`).join('')}<option value="0" ${counts.length ? '' : 'selected'}>الكل</option></select>
      <h3 style="margin-top:1rem">المؤقت</h3>
      <select id="timer"><option value="0">بدون مؤقت</option><option value="5">5 دقائق</option><option value="10">10 دقائق</option><option value="20">20 دقيقة</option><option value="30">30 دقيقة</option></select>
      <button class="btn primary block" style="margin-top:1rem" id="startBtn">ابدأ الاختبار</button></div>`;
  $('#startBtn').onclick = async () => {
    const types = ['mcq', 'tf', 'short'].filter(t => $('#t-' + t).checked);
    if (!types.length) return toast('اختر نوعاً واحداً على الأقل');
    let pool = shuffle(all.filter(x => types.includes(x.q.type)));
    const n = +$('#count').value; if (n) pool = pool.slice(0, n);
    if (!pool.length) return toast('لا توجد أسئلة بهذه الاختيارات');
    const mins = +$('#timer').value;
    quiz = { scope, title: await scopeTitle(scope), items: pool, i: 0, answers: [], end: mins ? Date.now() + mins * 60000 : 0 };
    location.replace('#/quiz');
  };
}

let quiz = null, timerId = null;
function stopTimer() { if (timerId) { clearInterval(timerId); timerId = null; } }
function quizRun() {
  stopTimer();
  if (!quiz) return go('');
  if (quiz.i >= quiz.items.length) return location.replace('#/result');
  setTitle(quiz.title);
  const { key, lesson, q } = quiz.items[quiz.i];
  const ltr = SUBJ[key].ltr;
  const n = quiz.items.length;
  const isFav = S.favs.questions.includes(qKey(key, q));
  const typeName = { mcq: 'اختيار من متعدد', tf: 'صح أو خطأ', short: 'سؤال مقالي' }[q.type];
  let body = '';
  if (q.type === 'mcq') body = q.options.map((o, i) => `<button class="opt" data-i="${i}" dir="auto">${esc(o)}</button>`).join('');
  else if (q.type === 'tf') body = `<div class="row"><button class="opt grow" data-v="true">✔️ صح</button><button class="opt grow" data-v="false">✖️ خطأ</button></div>`;
  else body = `<textarea id="myAns" placeholder="اكتب إجابتك هنا (اختياري)" dir="auto"></textarea>
    <button class="btn primary block" id="reveal">أظهر الإجابة النموذجية</button>`;
  app.innerHTML = `<div class="qhead"><span class="badge">${quiz.i + 1} / ${n}</span>
      ${quiz.end ? '<span class="timer" id="timer"></span>' : ''}<span class="badge">${typeName}</span></div>
    <div class="progress"><i style="width:${100 * quiz.i / n}%"></i></div>
    <div class="card" style="margin-top:.8rem"><div class="muted">${esc(SUBJ[key].name)} • ${esc(lesson.title)}</div>
      <div class="qtext ${ltr ? 'ltr' : ''}" dir="auto">${esc(q.q)}</div>${body}<div id="fb"></div></div>
    <div class="row"><button class="btn" id="qfav">${isFav ? '⭐' : '☆'} مفضلة</button>
      <button class="btn" onclick="openReport({subject:'${key}',lessonId:'${esc(lesson.id)}',qid:'${esc(q.id)}'})">🚩 بلّغ</button>
      <span class="grow"></span><button class="btn" id="skip">تخطَّ</button>
      <button class="btn primary" id="next" hidden>${quiz.i + 1 < n ? 'التالي ←' : 'النتيجة'}</button></div>`;
  $('#qfav').onclick = () => {
    const k = qKey(key, q), a = S.favs.questions, i = a.indexOf(k);
    if (i >= 0) a.splice(i, 1); else a.push(k); save('favs');
    $('#qfav').textContent = (i < 0 ? '⭐' : '☆') + ' مفضلة';
  };
  $('#skip').onclick = () => record(null);
  $('#next').onclick = () => { quiz.i++; quizRun(); window.scrollTo(0, 0); };
  if (q.type === 'mcq' || q.type === 'tf') {
    app.querySelectorAll('.opt').forEach(b => b.onclick = () => {
      const correct = q.type === 'mcq' ? +b.dataset.i === q.answer : (b.dataset.v === 'true') === q.answer;
      app.querySelectorAll('.opt').forEach(x => {
        x.disabled = true;
        const isRight = q.type === 'mcq' ? +x.dataset.i === q.answer : (x.dataset.v === 'true') === q.answer;
        if (isRight) x.classList.add('correct');
      });
      if (!correct) b.classList.add('wrong');
      const right = q.type === 'mcq' ? q.options[q.answer] : (q.answer ? 'صح' : 'خطأ');
      $('#fb').innerHTML = `<div class="feedback ${correct ? 'ok' : 'bad'}"><b>${correct ? 'إجابة صحيحة 👏' : 'إجابة خاطئة — الصحيح: ' + esc(right)}</b>
        ${q.explanation ? `<p>${esc(q.explanation)}</p>` : ''}</div>`;
      record(correct, true);
    });
  } else {
    $('#reveal').onclick = () => {
      $('#reveal').remove();
      $('#fb').innerHTML = `<div class="feedback ok"><b>الإجابة النموذجية:</b><p style="white-space:pre-line" dir="auto">${esc(q.answer)}</p></div>
        <div class="muted">قارن إجابتك ثم قيّم نفسك:</div>
        <div class="row" style="margin-top:.4rem"><button class="btn ok grow" id="selfOk">✔️ أصبت</button><button class="btn bad grow" id="selfBad">✖️ أخطأت</button></div>`;
      $('#selfOk').onclick = () => record(true);
      $('#selfBad').onclick = () => record(false);
    };
  }
  if (quiz.end) {
    const tick = () => {
      const left = Math.max(0, quiz.end - Date.now());
      const t = $('#timer'); if (t) t.textContent = '⏱ ' + Math.floor(left / 60000) + ':' + String(Math.floor(left / 1000) % 60).padStart(2, '0');
      if (!left) { stopTimer(); toast('انتهى الوقت'); location.replace('#/result'); }
    };
    tick(); timerId = setInterval(tick, 1000);
  }
}
function record(correct, keepOnPage) {
  const { key, q } = quiz.items[quiz.i];
  quiz.answers[quiz.i] = correct;
  if (correct !== null) {
    const st = S.stats[key] || (S.stats[key] = { answered: 0, correct: 0 });
    st.answered++; if (correct) st.correct++; save('stats');
    const k = qKey(key, q);
    if (!correct) S.mistakes[k] = { streak: 0 };
    else if (S.mistakes[k]) { if (++S.mistakes[k].streak >= 2) { delete S.mistakes[k]; toast('خرج السؤال من بنك أخطائك 🎉'); } }
    save('mistakes');
  }
  if (keepOnPage) { $('#next').hidden = false; $('#skip').hidden = true; return; }
  quiz.i++; quizRun(); window.scrollTo(0, 0);
}
function quizResult() {
  stopTimer();
  if (!quiz) return go('');
  setTitle('النتيجة');
  const n = quiz.items.length;
  const c = quiz.answers.filter(x => x === true).length;
  const pct = Math.round(100 * c / n);
  const msg = pct >= 90 ? 'ممتاز! أداء رائع 🌟' : pct >= 75 ? 'جيد جداً 👍' : pct >= 50 ? 'جيد، راجع أخطاءك 💪' : 'تحتاج إلى مراجعة الدروس 📚';
  const wrong = quiz.items.map((x, i) => ({ ...x, a: quiz.answers[i] })).filter(x => x.a !== true);
  const ansText = q => q.type === 'mcq' ? q.options[q.answer] : q.type === 'tf' ? (q.answer ? 'صح' : 'خطأ') : q.answer;
  app.innerHTML = `<div class="card"><div class="score">${pct}%</div>
    <div style="text-align:center">${c} من ${n} إجابة صحيحة<br><b>${msg}</b></div></div>
    ${wrong.length ? `<h3>راجع هذه الأسئلة (${wrong.length})</h3>` + wrong.map(x => `<div class="card">
      <div class="muted">${esc(SUBJ[x.key].name)} • ${esc(x.lesson.title)} ${x.a === undefined || x.a === null ? '• لم تُجب' : ''}</div>
      <div style="font-weight:600;margin:.3rem 0" dir="auto">${esc(x.q.q)}</div>
      <div class="feedback ok" style="margin:0"><b>الإجابة:</b> <span style="color:var(--text);white-space:pre-line" dir="auto">${esc(ansText(x.q))}</span></div></div>`).join('') : ''}
    <div class="row"><button class="btn primary grow" onclick="go('setup?scope=${esc(quiz.scope)}')">اختبار جديد</button>
      <button class="btn grow" onclick="go('mistakes')">بنك أخطائي</button></div>`;
}

/* =========================================================
   أخطائي والمفضلة
   ========================================================= */
async function mistakesPage() {
  setTitle('بنك أخطائي');
  const items = await gather('mistakes');
  if (!items.length) { app.innerHTML = '<div class="card empty">لا توجد أخطاء محفوظة 👏<br>كل سؤال تخطئ فيه سيظهر هنا، ويخرج بعد أن تجيبه صحيحاً مرتين.</div>'; return; }
  const by = {}; items.forEach(x => (by[x.key] = (by[x.key] || 0) + 1));
  app.innerHTML = `<div class="card"><h2>${items.length} سؤال تحتاج مراجعة</h2>
    <div class="muted">يخرج السؤال من البنك بعد أن تجيبه صحيحاً مرتين متتاليتين.</div>
    <ul>${Object.entries(by).map(([k, n]) => `<li>${esc(SUBJ[k].name)}: ${n}</li>`).join('')}</ul>
    <button class="btn primary block" onclick="go('setup?scope=mistakes')">ابدأ مراجعة الأخطاء</button>
    <button class="btn block" onclick="if(confirm('مسح كل الأخطاء؟')){S.mistakes={};save('mistakes');route()}">مسح البنك</button></div>`;
}
async function favsPage() {
  setTitle('المفضلة');
  await loadAll();
  const ls = S.favs.lessons.map(k => { const [key, id] = k.split(':'); const l = DATA[key] && findLesson(DATA[key], id); return l && { key, l }; }).filter(Boolean);
  let html = `<div class="card"><h3>الدروس (${ls.length})</h3>${ls.length ? ls.map(x => `<button class="lesson-link" onclick="go('l/${x.key}/${encodeURIComponent(x.l.id)}')">
    <span>${SUBJ[x.key].icon}</span><span class="grow">${esc(x.l.title)}</span></button>`).join('') : '<div class="muted">اضغط ☆ في أي درس لإضافته.</div>'}</div>`;
  html += `<div class="card"><h3>الأسئلة (${S.favs.questions.length})</h3>${S.favs.questions.length
    ? `<button class="btn primary block" onclick="go('setup?scope=favs')">اختبرني في الأسئلة المفضلة</button>`
    : '<div class="muted">اضغط ☆ أثناء الاختبار لحفظ السؤال.</div>'}</div>`;
  app.innerHTML = html;
}

/* =========================================================
   البحث
   ========================================================= */
let searchIndex = null;
function textOf(v) {
  if (v == null) return '';
  if (typeof v !== 'object') return String(v);
  if (Array.isArray(v)) return v.map(textOf).join(' \n ');
  return Object.entries(v).filter(([k]) => !k.startsWith('_')).map(([, x]) => textOf(x)).join(' \n ');
}
async function buildIndex() {
  if (searchIndex) return searchIndex;
  await loadAll();
  searchIndex = [];
  SUBJECTS.forEach(s => DATA[s.key]._lessons.forEach(l => {
    const { questions, _unit, ...rest } = l;
    const raw = textOf(rest);
    searchIndex.push({ key: s.key, l, raw, n: norm(raw), qs: (questions || []).map(q => ({ q, n: norm(q.q + ' ' + textOf(q.options) + ' ' + textOf(q.answer)) })) });
  }));
  return searchIndex;
}
async function searchPage(q0) {
  setTitle('البحث');
  app.innerHTML = `<input id="sq" type="search" placeholder="ابحث في كل المواد… (مثال: الكالسيت)" value="${esc(q0)}" dir="auto" autofocus>
    <div class="muted" style="margin:.4rem 0 .8rem">يبحث في الملخصات والمصطلحات والجداول والأسئلة</div><div id="sres"></div>`;
  const inp = $('#sq'); let t;
  inp.oninput = () => { clearTimeout(t); t = setTimeout(() => runSearch(inp.value), 250); };
  inp.onkeydown = e => { if (e.key === 'Enter') history.replaceState(null, '', '#/search?q=' + encodeURIComponent(inp.value)); };
  if (q0) runSearch(q0);
}
async function runSearch(q) {
  const box = $('#sres'); if (!box) return;
  const nq = norm(q.trim());
  if (nq.length < 2) { box.innerHTML = ''; return; }
  box.innerHTML = '<div class="muted">جارٍ البحث…</div>';
  const idx = await buildIndex();
  const res = [];
  for (const e of idx) {
    const pos = e.n.indexOf(nq);
    const qhits = e.qs.filter(x => x.n.includes(nq)).length;
    if (pos < 0 && !qhits) continue;
    let snip = '';
    if (pos >= 0) {
      const a = Math.max(0, pos - 50), b = Math.min(e.raw.length, pos + nq.length + 70);
      const part = e.raw.slice(a, b).replace(/\s+/g, ' ');
      snip = (a ? '…' : '') + esc(part) + (b < e.raw.length ? '…' : '');
      const words = q.trim().split(/\s+/).map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
      try { snip = snip.replace(new RegExp('(' + words.join('|') + ')', 'gi'), '<mark>$1</mark>'); } catch { }
    }
    res.push({ e, snip, qhits, score: (pos >= 0 ? 10 : 0) + qhits });
  }
  res.sort((x, y) => y.score - x.score);
  box.innerHTML = res.length ? `<div class="muted" style="margin-bottom:.5rem">${res.length} نتيجة</div>` + res.slice(0, 60).map(r => `
    <button class="result" onclick="go('l/${r.e.key}/${encodeURIComponent(r.e.l.id)}')">
      <div class="row"><span>${SUBJ[r.e.key].icon}</span><b class="grow">${esc(r.e.l.title)}</b>${r.qhits ? `<span class="badge">${r.qhits} سؤال</span>` : ''}</div>
      ${r.snip ? `<div class="muted" dir="auto">${r.snip}</div>` : ''}</button>`).join('')
    : '<div class="empty">لا توجد نتائج. جرّب كلمة أخرى.</div>';
}

/* =========================================================
   مراجع الإنجليزي
   ========================================================= */
async function refPage() {
  setTitle('Glossary & Irregular Verbs');
  const d = await load('english'); const ref = d.reference || {};
  const g = ref.glossary || [], v = ref.irregularVerbs || [];
  app.innerHTML = `<div class="ltr"><input id="gq" type="search" placeholder="Search the glossary…">
    <div class="card" style="margin-top:.6rem"><h3>Glossary (<span id="gn">${g.length}</span>)</h3><div id="gl"></div></div>
    <div class="card"><h3>Irregular Verbs (${v.length})</h3>${renderTable({ rows: [['Base', 'Past', 'Past Participle'], ...v.map(x => [x.base, x.past, x.pp])] })}</div></div>`;
  const draw = q => {
    const nq = q.toLowerCase().trim();
    const list = g.filter(x => !nq || (x.word + ' ' + x.def).toLowerCase().includes(nq));
    $('#gn').textContent = list.length;
    $('#gl').innerHTML = list.slice(0, 300).map(x => `<div class="term"><b>${esc(x.word)}</b> <span class="en">${esc(x.pos || '')}</span><div>${esc(x.def)}</div></div>`).join('');
  };
  draw(''); $('#gq').oninput = e => draw(e.target.value);
}

/* =========================================================
   البلاغات
   ========================================================= */
const KINDS = ['معلومة خاطئة', 'إجابة خاطئة', 'نص آية أو حديث', 'خطأ إملائي', 'أخرى'];
function closeModal() { const m = $('#modal'); m.hidden = true; m.innerHTML = ''; }
function openReport(ctx) {
  const m = $('#modal');
  m.innerHTML = `<div class="modal-box"><h3>🚩 بلّغ عن خطأ</h3>
    <div class="muted">${esc(SUBJ[ctx.subject].name)} • الدرس ${esc(ctx.lessonId)}${ctx.qid ? ' • السؤال ' + esc(ctx.qid) : ''}</div>
    <label>نوع الخطأ</label><select id="rk">${KINDS.map(k => `<option>${k}</option>`).join('')}</select>
    <label>ملاحظتك (ما الخطأ؟ وما الصحيح إن كنت تعرفه؟)</label><textarea id="rn" dir="auto"></textarea>
    <div class="row" style="margin-top:.8rem"><button class="btn primary grow" id="rs">حفظ البلاغ</button><button class="btn grow" id="rc">إلغاء</button></div></div>`;
  m.hidden = false;
  m.onclick = e => { if (e.target === m) closeModal(); };
  $('#rc').onclick = closeModal;
  $('#rs').onclick = () => {
    S.reports.push({ ...ctx, kind: $('#rk').value, note: $('#rn').value.trim(), time: new Date().toISOString() });
    save('reports'); closeModal(); toast('حُفظ البلاغ ✔️ صدّره من صفحة «البلاغات»');
  };
}
async function reportText() {
  await loadAll();
  return '📋 بلاغات بنك المعلومات\n' + S.reports.map((r, i) => {
    const l = DATA[r.subject] && findLesson(DATA[r.subject], r.lessonId);
    return `\n${i + 1}) ${SUBJ[r.subject].name} | ${r.lessonId}${l ? ' (' + l.title + ')' : ''}${r.qid ? ' | سؤال ' + r.qid : ''}\nالنوع: ${r.kind}\nالملاحظة: ${r.note || '—'}`;
  }).join('\n');
}
function reportsPage() {
  setTitle('البلاغات');
  if (!S.reports.length) { app.innerHTML = '<div class="card empty">لا توجد بلاغات.<br>استخدم زر 🚩 في الدروس والأسئلة لتسجيل أي خطأ.</div>'; return; }
  app.innerHTML = `<div class="card"><h2>${S.reports.length} بلاغ</h2>
    <div class="muted">صدّر البلاغات وأرسلها في المحادثة لتصحيح الملفات.</div>
    <div class="row" style="margin-top:.6rem"><button class="btn primary grow" id="cp">📋 نسخ</button>
    ${navigator.share ? '<button class="btn grow" id="sh">📤 مشاركة</button>' : ''}<button class="btn grow" id="dl">⬇️ تنزيل</button></div></div>
    ${S.reports.map((r, i) => `<div class="card"><div class="row"><b class="grow">${esc(SUBJ[r.subject].name)} • ${esc(r.lessonId)}${r.qid ? ' • ' + esc(r.qid) : ''}</b>
      <button class="btn" onclick="S.reports.splice(${i},1);save('reports');route()">🗑</button></div>
      <span class="badge">${esc(r.kind)}</span><div dir="auto">${esc(r.note || '—')}</div>
      <div class="muted">${new Date(r.time).toLocaleString('ar-KW')}</div></div>`).join('')}
    <button class="btn bad block" onclick="if(confirm('حذف كل البلاغات؟')){S.reports=[];save('reports');route()}">حذف الكل بعد إرسالها</button>`;
  $('#cp').onclick = async () => { try { await navigator.clipboard.writeText(await reportText()); toast('نُسخت البلاغات'); } catch { toast('تعذر النسخ، استخدم التنزيل'); } };
  if ($('#sh')) $('#sh').onclick = async () => { try { await navigator.share({ title: 'بلاغات', text: await reportText() }); } catch { } };
  $('#dl').onclick = async () => download('بلاغات.txt', await reportText(), 'text/plain');
}
function download(name, text, type) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: type + ';charset=utf-8' }));
  a.download = name; document.body.appendChild(a); a.click(); a.remove();
}

/* =========================================================
   الإعدادات
   ========================================================= */
function settingsPage() {
  setTitle('الإعدادات');
  const st = S.settings;
  app.innerHTML = `<div class="card"><h3>المظهر</h3>
    <select id="th"><option value="light">فاتح</option><option value="dark">ليلي</option><option value="auto">تلقائي حسب الجهاز</option></select>
    <h3 style="margin-top:1rem">حجم الخط: <span id="fsv">${st.fs}</span></h3>
    <input type="range" id="fs" min="14" max="24" value="${st.fs}"></div>
    <div class="card"><h3>نسخة احتياطية</h3><div class="muted">احفظ تقدمك (الدروس المقروءة، الأخطاء، المفضلة، البلاغات) لنقله إلى جهاز آخر.</div>
    <div class="row" style="margin-top:.5rem"><button class="btn primary grow" id="bk">⬇️ حفظ نسخة</button>
    <label class="btn grow" style="text-align:center">⬆️ استعادة<input type="file" id="rs" accept=".json" hidden></label></div></div>
    <div class="card"><h3>إعادة الضبط</h3><button class="btn bad block" id="rst">مسح كل التقدم</button></div>
    <div class="card muted">بنك المعلومات للصف الحادي عشر — الفصل الدراسي الأول<br>البيانات محفوظة على جهازك فقط.<br>جميع الحقوق محفوظة © باسم أبو أنس 2026</div>`;
  $('#th').value = st.theme;
  $('#th').onchange = e => { st.theme = e.target.value; save('settings'); applySettings(); };
  $('#fs').oninput = e => { st.fs = +e.target.value; $('#fsv').textContent = st.fs; save('settings'); applySettings(); };
  $('#bk').onclick = () => {
    const out = {}; for (const k of ['read', 'stats', 'mistakes', 'favs', 'reports', 'settings']) out[k] = S[k];
    download('نسخة-بنك-المعلومات.json', JSON.stringify(out), 'application/json');
  };
  $('#rs').onchange = async e => {
    try {
      const d = JSON.parse(await e.target.files[0].text());
      for (const k of ['read', 'stats', 'mistakes', 'favs', 'reports', 'settings']) if (d[k]) { S[k] = d[k]; save(k); }
      applySettings(); toast('تمت الاستعادة'); go('');
    } catch { toast('الملف غير صالح'); }
  };
  $('#rst').onclick = () => {
    if (!confirm('سيُمسح كل تقدمك وأخطاؤك ومفضلتك وبلاغاتك. متأكد؟')) return;
    for (const k of ['read', 'stats', 'mistakes', 'reports']) { S[k] = Array.isArray(S[k]) ? [] : {}; save(k); }
    S.favs = { lessons: [], questions: [] }; save('favs'); toast('تم المسح'); go('');
  };
}

/* ---------- البدء ---------- */
applySettings();
route();
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('sw.js').catch(() => { });
}
