/*
 * Mowa: one chapter per language, heard first, then read, then practised.
 * Views: home, listen (animated stage), read (text with glosses) and
 * practice (cards from the chapter, scheduled with FSRS in srs.js).
 */
(function () {
  'use strict';

  const $ = (sel, el = document) => el.querySelector(sel);
  const h = (tag, attrs = {}, ...kids) => {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'class') e.className = v;
      else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
      else if (v !== null && v !== undefined && v !== false) e.setAttribute(k, v === true ? '' : v);
    }
    for (const k of kids.flat()) if (k !== null && k !== undefined && k !== false) e.append(k);
    return e;
  };
  const mount = (...kids) => app.replaceChildren(...kids.flat().filter((k) => k !== null && k !== undefined && k !== false));
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const shuffle = (xs) => { xs = [...xs]; for (let i = xs.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [xs[i], xs[j]] = [xs[j], xs[i]]; } return xs; };

  const LANGS = {
    es: { name: 'Español', native: 'Español', flag: '🇪🇸', note: 'Spain, colloquial' },
    fa: { name: 'Persian', native: 'فارسی', flag: '🇮🇷', note: 'Tehran, spoken' },
  };
  const NEW_PER_DAY = 15;
  const KEY = 'mowa:v1';

  // ---------- saved state ----------

  const defaults = () => ({ l1: (navigator.language || '').startsWith('pl') ? 'pl' : 'en', script: true, heard: {}, cards: { es: {}, fa: {} }, newDay: {}, log: [] });
  let store;
  try { store = { ...defaults(), ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch (e) { store = defaults(); }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) { /* private mode: progress lasts this visit only */ } };

  // ---------- content ----------

  const chapters = {};
  async function chapter(lang) {
    if (!chapters[lang]) {
      const [ch, audio] = await Promise.all([
        fetch(`content/${lang}/ch01.json`).then((r) => r.json()),
        fetch(`content/${lang}/ch01.audio.json`).then((r) => r.json()),
      ]);
      ch.audio = audio;
      chapters[lang] = ch;
    }
    return chapters[lang];
  }

  // Persian strings are "script|latin"; Spanish ones are plain.
  const split = (s) => { const [script, latin] = s.split('|'); return { script, latin: latin ?? null }; };
  const fill = (text, answer) => {
    const t = split(text), a = split(answer);
    return t.latin === null ? t.script.replace('___', a.script) : `${t.script.replace('___', a.script)}|${t.latin.replace('___', a.latin)}`;
  };

  // A text as shown: Persian in Latin transcription, with the script below.
  function shown(s, cls = '') {
    const { script, latin } = split(s);
    if (latin === null) return h('span', { class: cls }, script);
    return h('span', { class: `fa ${cls}` }, h('span', { class: 'lat' }, latin), store.script ? h('span', { class: 'script', dir: 'rtl', lang: 'fa' }, script) : null);
  }

  // ---------- audio ----------

  let playing = null;
  function play(ch, text, rate = 1) {
    stopAudio();
    const a = ch.audio[text];
    if (!a) return Promise.resolve();
    const el = new Audio(a.file);
    el.playbackRate = rate;
    el.preservesPitch = true;
    return new Promise((resolve) => {
      playing = { el, resolve };
      el.onended = el.onerror = () => { if (playing && playing.el === el) playing = null; resolve(); };
      el.play().catch(() => { if (playing && playing.el === el) playing = null; resolve(); });
    });
  }
  function stopAudio() { if (playing) { const p = playing; playing = null; p.el.pause(); p.resolve(); } }

  // ---------- views ----------

  const app = $('#app');
  let leave = () => {};
  function go(hash) { location.hash = hash; }
  window.addEventListener('hashchange', route);

  async function route() {
    leave(); leave = () => {};
    stopAudio();
    const [, lang, view] = location.hash.replace(/^#\/?/, '#').split(/[#/]/);
    if (!LANGS[lang]) return home();
    store.lang = lang; save();
    const ch = await chapter(lang);
    document.title = `${LANGS[lang].name} · Mowa`;
    if (view === 'listen') return listenView(ch);
    if (view === 'read') return readView(ch);
    if (view === 'practice') return practiceView(ch);
    return chapterView(ch);
  }

  function top(title, back) {
    return h('header', { class: 'top' }, back ? h('a', { class: 'back', href: back, 'aria-label': 'Back' }, '‹') : null, h('h1', {}, title));
  }

  function home() {
    document.title = 'Mowa';
    mount(
      top('Mowa'),
      h('p', { class: 'muted' }, 'Listen first, then read, then practise. One chapter per language for now.'),
      h('div', { class: 'langs' }, Object.entries(LANGS).map(([id, l]) =>
        h('a', { class: 'lang', href: `#/${id}` }, h('span', { class: 'flag' }, l.flag), h('span', {}, h('b', {}, l.name), h('br'), h('span', { class: 'muted' }, l.note))))),
      h('section', { class: 'settings' },
        h('label', {}, 'Translations in ', h('select', { onchange: (e) => { store.l1 = e.target.value; save(); } },
          h('option', { value: 'en', selected: store.l1 === 'en' }, 'English'), h('option', { value: 'pl', selected: store.l1 === 'pl' }, 'Polski'))),
        h('label', {}, h('input', { type: 'checkbox', checked: store.script, onchange: (e) => { store.script = e.target.checked; save(); } }), ' Show Persian script under the transcription')),
    );
  }

  function chapterView(ch) {
    const lang = ch.lang, key = `${lang}/${ch.id}`;
    const due = practiceCards(ch).length ? countDue(ch) : 0;
    mount(
      top(LANGS[lang].name, '#/'),
      h('p', { class: 'muted' }, 'Chapter 1'),
      h('h2', { class: 'title' }, shown(ch.title)),
      h('nav', { class: 'steps' },
        h('a', { href: `#/${lang}/listen`, class: 'step' }, h('span', { class: 'icon' }, '🎧'), h('span', {}, h('b', {}, 'Listen'), h('br'), h('span', { class: 'muted' }, store.heard[key] ? 'Heard ✓' : 'Start here: watch and listen'))),
        h('a', { href: `#/${lang}/read`, class: 'step' }, h('span', { class: 'icon' }, '📖'), h('span', {}, h('b', {}, 'Read'), h('br'), h('span', { class: 'muted' }, 'The text, with help for new words'))),
        h('a', { href: `#/${lang}/practice`, class: 'step' }, h('span', { class: 'icon' }, '🃏'), h('span', {}, h('b', {}, 'Practise'), h('br'), h('span', { class: 'muted' }, due ? `${due} cards for today` : 'Nothing due right now')))),
    );
  }

  // ---------- listen ----------

  function speakerName(ch, who) { return who === 'narrator' ? null : ch.cast[who].name; }

  function listenView(ch) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.classList.add('stage');
    const sub = h('div', { class: 'subtitle', hidden: true });
    const playBtn = h('button', { class: 'round primary', 'aria-label': 'Play' }, '▶');
    const dots = h('div', { class: 'dots' }, ch.sentences.map((_, i) => h('button', { 'aria-label': `Sentence ${i + 1}`, onclick: () => jump(i) })));
    const end = h('div', { class: 'end', hidden: true }, h('p', {}, h('b', {}, 'Chapter heard.'), ' Now read it, or start practising.'),
      h('div', { class: 'row' }, h('a', { class: 'button', href: `#/${ch.lang}/read` }, 'Read'), h('a', { class: 'button', href: `#/${ch.lang}/practice` }, 'Practise')));
    let rate = 1, i = 0, on = false;
    const speedBtn = h('button', { class: 'chip', onclick: () => { rate = rate === 1 ? 0.8 : 1; speedBtn.textContent = rate === 1 ? 'Normal speed' : 'Slow'; } }, 'Normal speed');
    const subBtn = h('button', { class: 'chip', onclick: () => { sub.hidden = !sub.hidden; subBtn.classList.toggle('on', !sub.hidden); } }, 'Subtitles');
    mount(
      top(shown(ch.title), `#/${ch.lang}`),
      svg, sub, dots,
      h('div', { class: 'controls' },
        h('button', { class: 'round', 'aria-label': 'Previous sentence', onclick: () => jump(Math.max(0, i - 1)) }, '⏮'),
        playBtn,
        h('button', { class: 'round', 'aria-label': 'Next sentence', onclick: () => jump(Math.min(ch.sentences.length - 1, i + 1)) }, '⏭')),
      h('div', { class: 'row center' }, speedBtn, subBtn),
      end,
    );
    const scene = new Scene(svg, ch);
    const mark = () => [...dots.children].forEach((d, k) => { d.classList.toggle('done', k < i); d.classList.toggle('now', k === i); });
    const showSub = () => {
      const s = ch.sentences[i], who = speakerName(ch, s.who);
      sub.replaceChildren(who ? h('span', { class: 'who' }, shown(who)) : '', shown(s.text));
    };
    mark(); showSub();

    async function run() {
      on = true; playBtn.textContent = '⏸'; end.hidden = true;
      while (on && i < ch.sentences.length) {
        const s = ch.sentences[i];
        mark(); showSub();
        scene.seek(i); scene.play(i);
        scene.talking(s.who, true);
        await play(ch, s.text, rate);
        scene.talking(s.who, false);
        if (!on) return;
        await sleep(700 / rate);
        if (!on) return;
        i++;
      }
      on = false; playBtn.textContent = '▶';
      if (i >= ch.sentences.length) {
        i = ch.sentences.length - 1; mark();
        store.heard[`${ch.lang}/${ch.id}`] = true; save();
        end.hidden = false;
        i = 0;
      }
    }
    function pause() { on = false; stopAudio(); scene.talking(null, false); playBtn.textContent = '▶'; }
    function jump(k) { const was = on; pause(); i = k; scene.seek(i); mark(); showSub(); if (was) run(); else { run(); } }
    playBtn.onclick = () => (on ? pause() : run());
    leave = pause;
  }

  // ---------- read ----------

  function glossIndex(ch) {
    const idx = new Map();
    for (const [key, g] of Object.entries(ch.glosses)) {
      for (const f of g.forms || [key]) idx.set(f.toLowerCase(), key);
      for (const f of g.la_forms || []) idx.set(f.toLowerCase(), key);
    }
    return idx;
  }

  // Splits a text into words and the rest, and makes glossed words tappable.
  function glossed(text, idx, onWord, dir) {
    const span = h('span', dir ? { dir } : {});
    for (const part of text.split(/([\p{L}\p{M}‌'’-]+)/u)) {
      const key = idx.get(part.toLowerCase());
      span.append(key ? h('button', { class: 'w', onclick: (e) => { e.stopPropagation(); onWord(key, e.currentTarget); } }, part) : part);
    }
    return span;
  }

  function readView(ch) {
    const idx = glossIndex(ch);
    const pop = h('div', { class: 'pop', hidden: true });
    let current = -1, all = false;
    const rows = ch.sentences.map((s, i) => {
      const { script, latin } = split(s.text);
      const who = speakerName(ch, s.who);
      const tr = h('div', { class: 'tr', hidden: true }, s[store.l1]);
      const row = h('div', { class: 'sent', onclick: () => { all = false; say(i); } },
        who ? h('div', { class: 'who' }, shown(who)) : null,
        latin === null
          ? h('div', { class: 'text' }, glossed(script, idx, word))
          : h('div', { class: 'text fa' }, h('div', { class: 'lat' }, glossed(latin, idx, word)), store.script ? h('div', { class: 'script', lang: 'fa' }, glossed(script, idx, word, 'rtl')) : null),
        tr,
        h('button', { class: 'trbtn', 'aria-label': 'Translation', onclick: (e) => { e.stopPropagation(); tr.hidden = !tr.hidden; } }, store.l1 === 'pl' ? 'PL' : 'EN'));
      return row;
    });
    function word(key, anchor) {
      const g = ch.glosses[key];
      const l1 = h('div', { class: 'l1', hidden: true }, g[store.l1]);
      const head = g.la ? `${key}|${g.la}` : key;
      pop.replaceChildren(h('div', { class: 'head' }, shown(head)), h('div', { class: 'tl' }, shown(g.tl)),
        h('button', { class: 'chip', onclick: () => { l1.hidden = false; } }, store.l1 === 'pl' ? 'Po polsku' : 'In English'), l1);
      const r = anchor.getBoundingClientRect();
      pop.style.top = `${window.scrollY + r.bottom + 6}px`;
      pop.style.left = `${Math.max(8, Math.min(window.innerWidth - 280, r.left - 20))}px`;
      pop.hidden = false;
    }
    async function say(i) {
      current = i;
      rows.forEach((r, k) => r.classList.toggle('now', k === i));
      await play(ch, ch.sentences[i].text);
      if (current !== i) return;
      rows[i].classList.remove('now');
      if (all && i + 1 < rows.length) { await sleep(400); if (all && current === i) say(i + 1); }
    }
    const allBtn = h('button', { class: 'chip', onclick: () => { all = !all; allBtn.textContent = all ? 'Stop' : 'Play all'; if (all) say(0); else stopAudio(); } }, 'Play all');
    mount(top(shown(ch.title), `#/${ch.lang}`),
      h('p', { class: 'muted' }, 'Tap a sentence to hear it. Tap an underlined word for help in the language itself.'),
      h('div', { class: 'row' }, allBtn), h('div', { class: 'reader' }, rows), pop);
    const close = (e) => { if (!pop.contains(e.target)) pop.hidden = true; };
    document.addEventListener('click', close, true);
    leave = () => { all = false; document.removeEventListener('click', close, true); };
  }

  // ---------- practice ----------

  // Every card of the chapter, in the order new cards are introduced.
  function practiceCards(ch) {
    const by = (k) => ch.cards.filter((c) => c.kind === k);
    return [
      ...by('picture').map((c) => ({ id: `${c.id}.see`, base: c.id, type: 'see', src: c })),
      ...by('gap').map((c) => ({ id: c.id, base: c.id, type: 'gap', src: c })),
      ...by('question').map((c) => ({ id: c.id, base: c.id, type: 'question', src: c })),
      ...by('picture').map((c) => ({ id: `${c.id}.hear`, base: c.id, type: 'hear', src: c })),
      ...by('opposite').map((c) => ({ id: c.id, base: c.id, type: 'opposite', src: c })),
      ...by('picture').map((c) => ({ id: `${c.id}.type`, base: c.id, type: 'type', src: c })),
    ];
  }
  const memory = (lang, id) => store.cards[lang][id] || SRS.newCard(id);
  function newLeft(lang, now) {
    const day = SRS.dayIndex(now, SRS.DEFAULTS.rolloverHour);
    const d = store.newDay[lang];
    return NEW_PER_DAY - (d && d.day === day ? d.n : 0);
  }
  function queues(ch, now) {
    return SRS.buildQueues(practiceCards(ch).map((c) => memory(ch.lang, c.id)), now, newLeft(ch.lang, now));
  }
  function countDue(ch) {
    const q = queues(ch, Date.now());
    return q.learningNow.length + q.learningAhead.length + q.review.length + q.fresh.length;
  }

  function practiceView(ch) {
    const lang = ch.lang, cards = practiceCards(ch), byId = Object.fromEntries(cards.map((c) => [c.id, c]));
    const grid = h('div', { class: 'grid' });
    const stage = h('div', { class: 'card' });
    let last = null;
    const paintGrid = () => grid.replaceChildren(...cards.map((c) => {
      const m = memory(lang, c.id);
      const cls = m.type === 'new' ? '' : m.type === 'review' ? (m.interval >= 21 ? 'mastered' : 'learned') : 'practising';
      return h('span', { class: `sq ${cls}`, title: c.id });
    }));
    const notHeard = !store.heard[`${lang}/${ch.id}`];
    mount(top('Practise', `#/${lang}`), grid,
      notHeard ? h('p', { class: 'note' }, 'Tip: listen to the chapter first. The cards only use what is in it. ', h('a', { href: `#/${lang}/listen` }, 'Listen')) : null,
      stage);
    paintGrid();
    let gone = false;
    leave = () => { gone = true; };
    next();

    function next() {
      if (gone) return;
      const now = Date.now();
      const avoid = last ? cards.filter((c) => c.base === last.base).map((c) => c.id) : [];
      const m = SRS.pickNext(queues(ch, now), avoid);
      if (!m) return done(now);
      show(byId[m.id], m);
    }

    function done(now) {
      const later = cards.map((c) => memory(lang, c.id)).filter((m) => m.type !== 'new' && m.due > now).map((m) => m.due);
      const when = later.length ? new Date(Math.min(...later)) : null;
      stage.replaceChildren(h('p', { class: 'big' }, 'Done for now 🎉'),
        h('p', { class: 'muted' }, when ? `The next card comes back ${relative(when - now)}.` : 'Come back tomorrow for new cards.'));
    }

    async function show(card, m) {
      const src = card.src;
      let options, prompt, answerText, sayForms, audioFirst = null;
      const pics = ch.cards.filter((c) => c.kind === 'picture');
      const others = shuffle(pics.filter((p) => p.id !== src.id)).slice(0, 3);
      if (card.type === 'see') {
        options = shuffle([src, ...others]).map((p) => ({ label: shown(p.word), text: p.word, right: p === src, forms: [p.word] }));
        prompt = h('div', { class: 'pic' }, src.emoji);
        answerText = src.word;
      } else if (card.type === 'hear') {
        options = shuffle([src, ...others]).map((p) => ({ label: h('span', { class: 'pic small' }, p.emoji), text: p.word, right: p === src }));
        prompt = h('button', { class: 'round primary', onclick: () => play(ch, src.word) }, '🔊');
        audioFirst = src.word; answerText = src.word;
      } else if (card.type === 'type') {
        prompt = h('div', {}, h('div', { class: 'pic' }, src.emoji), h('button', { class: 'round', onclick: () => play(ch, src.word) }, '🔊'));
        audioFirst = src.word; answerText = src.word;
      } else {
        const all = shuffle([src.answer, ...src.wrong]);
        options = all.map((o) => ({ label: shown(o), text: o, right: o === src.answer, forms: card.type === 'gap' ? [o, fill(src.text, o)] : [o] }));
        if (card.type === 'gap') { prompt = h('div', { class: 'q' }, shown(src.text)); answerText = fill(src.text, src.answer); }
        if (card.type === 'question') { prompt = h('div', { class: 'q' }, h('button', { class: 'round small', onclick: () => play(ch, src.text) }, '🔊'), shown(src.text)); audioFirst = src.text; answerText = src.answer; }
        if (card.type === 'opposite') { prompt = h('div', { class: 'q' }, shown(src.word), h('span', { class: 'muted' }, ' ↔ ?')); answerText = src.answer; }
      }
      const instr = { see: 'What is this?', hear: 'Which one do you hear?', type: lang === 'fa' ? 'Write what you hear, in Latin letters' : 'Write what you hear', gap: 'Which word is missing?', question: 'Choose the answer', opposite: 'What is the opposite?' }[card.type];
      const feedback = h('p', { class: 'feedback' });
      const body = h('div', { class: 'answers' });
      stage.replaceChildren(h('p', { class: 'muted' }, instr), h('div', { class: 'prompt' }, prompt), body, feedback);
      if (audioFirst) await play(ch, audioFirst);
      if (gone) return;
      let t0 = performance.now(), answered = false;

      const finish = async (right, how, almost = false) => {
        if (answered) return;
        answered = true;
        const secs = (performance.now() - t0) / 1000;
        const typed = card.type === 'type';
        const cfg = { ...SRS.DEFAULTS, fastSeconds: (typed ? 8 : 5) + (how === 'voice' ? 2 : 0), slowSeconds: (typed ? 20 : 15) + (how === 'voice' ? 3 : 0) };
        let rating = SRS.autoGrade(right, secs, m.type, cfg);
        if (right && !typed && m.type === 'new' && rating === SRS.EASY) rating = SRS.GOOD; // one of four may be a guess
        if (right && almost) rating = SRS.HARD;
        const now = Date.now();
        if (m.type === 'new') {
          const day = SRS.dayIndex(now, SRS.DEFAULTS.rolloverHour);
          const d = store.newDay[lang] && store.newDay[lang].day === day ? store.newDay[lang] : { day, n: 0 };
          store.newDay[lang] = { day, n: d.n + 1 };
        }
        store.cards[lang][card.id] = SRS.answer(m, rating, now);
        store.log.push({ card_id: `${lang}.${card.id}`, review_time: now, review_rating: rating, review_state: m.type, review_duration: Math.round(secs * 1000), how });
        save();
        last = card;
        paintGrid();
        await play(ch, answerText);
        if (right) { await sleep(500); next(); }
      };

      if (card.type === 'type') {
        const input = h('input', { class: 'typed', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', placeholder: lang === 'fa' ? split(src.word).latin.replace(/./g, '·') : '' });
        const check = h('button', { class: 'primary', type: 'submit' }, 'Check');
        const form = h('form', { class: 'row', onsubmit: (e) => {
          e.preventDefault();
          if (answered) return next();
          const want = split(src.word), got = input.value.trim();
          const a = lang === 'fa' ? Speech.normLatin(got) : Speech.norm(got, lang);
          const b = lang === 'fa' ? Speech.normLatin(want.latin) : Speech.norm(want.script.replace(/^(el|la|los|las)\s+/i, ''), lang);
          const bFull = lang === 'fa' ? b : Speech.norm(want.script, lang);
          const s = Math.max(Speech.sim(a, b), Speech.sim(a, bFull));
          const right = s >= 0.8;
          feedback.replaceChildren(right ? (s === 1 ? '✓' : '✓ Almost: ') : '✗ ', s === 1 ? '' : shown(src.word));
          feedback.className = `feedback ${right ? 'ok' : 'bad'}`;
          check.textContent = 'Next';
          finish(right, 'typed', s < 1);
        } }, input, check);
        body.append(form);
        input.focus();
        return;
      }

      const buttons = options.map((o) => h('button', { class: 'opt', onclick: () => choose(o, 'tap') }, o.label));
      body.append(...buttons);
      function choose(o, how) {
        const k = options.indexOf(o);
        if (answered) { if (o.right) next(); return; } // after a mistake, tap the right answer to go on
        buttons[k].classList.add(o.right ? 'right' : 'wrong');
        if (!o.right) {
          buttons[options.findIndex((x) => x.right)].classList.add('right');
          feedback.textContent = 'Tap the right answer to go on.';
        }
        finish(o.right, how);
      }
      if (Speech.available && options[0].forms) {
        const mic = h('button', { class: 'mic', 'aria-label': 'Answer by speaking' }, '🎤 Say it');
        mic.onclick = async () => {
          if (answered) return;
          stopAudio();
          mic.classList.add('on'); mic.textContent = '🎤 Listening…';
          const { alts, error } = await Speech.listen(lang);
          mic.classList.remove('on'); mic.textContent = '🎤 Say it';
          if (answered) return;
          const forms = options.map((o) => o.forms.map((f) => split(f).script));
          const { index } = Speech.pick(alts, forms, lang);
          if (index >= 0) return choose(options[index], 'voice');
          feedback.textContent = alts.length ? `I heard “${alts[0]}”. Try again, or tap.` : error === 'not-allowed' ? 'The microphone is blocked for this page.' : 'I didn’t catch that. Try again, or tap.';
        };
        body.after(mic);
      }
    }
  }

  function relative(ms) {
    const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
    const min = Math.round(ms / 60000);
    if (min < 60) return rtf.format(Math.max(1, min), 'minute');
    const hr = Math.round(min / 60);
    if (hr < 24) return rtf.format(hr, 'hour');
    return rtf.format(Math.round(hr / 24), 'day');
  }

  route();
})();
