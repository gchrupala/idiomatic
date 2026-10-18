/*
 * Matching what the learner said or typed against a card's answers, and the
 * browser's speech recogniser. The normalisation is the one tested in
 * spike/asr (score.py): unify letters, drop vowel marks, accents, spaces and
 * punctuation, and write small numbers as words.
 */
(function (root) {
  'use strict';

  const NUM = {
    fa: 'صفر یک دو سه چهار پنج شش هفت هشت نه ده یازده دوازده سیزده چهارده پونزده شونزده هفده هجده نوزده بیست'.split(' '),
    es: 'cero uno dos tres cuatro cinco seis siete ocho nueve diez once doce trece catorce quince dieciseis diecisiete dieciocho diecinueve veinte'.split(' '),
  };
  const FA_MAP = {
    'ي': 'ی', 'ى': 'ی', 'ك': 'ک', 'ة': 'ه', 'أ': 'ا',
    'إ': 'ا', 'آ': 'ا', 'ؤ': 'و', '‌': '',
  };

  function norm(s, lang) {
    s = s.normalize('NFKC').toLowerCase();
    s = s.replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
    if (lang === 'fa') s = [...s].map((c) => FA_MAP[c] ?? c).join('').replace(/[ً-ْٰـ]/g, '');
    else s = s.normalize('NFD').replace(/\p{Mn}/gu, '');
    s = s.replace(/\d+/g, (n) => (+n <= 20 ? ` ${NUM[lang][+n]} ` : n));
    return s.replace(/[\p{P}\p{S}\s_]+/gu, '');
  }

  // Typed Latin transcription of Persian: ā = a, š = sh = s, x = kh, c = ch and so on.
  function normLatin(s) {
    s = s.toLowerCase().replace(/sh/g, 's').replace(/kh/g, 'x').replace(/ch/g, 'c').replace(/gh/g, 'q').replace(/zh/g, 'z');
    return s.normalize('NFD').replace(/\p{Mn}/gu, '').replace(/[^a-z]/g, '');
  }

  function lev(a, b) {
    a = [...a]; b = [...b];
    let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
    for (let i = 1; i <= a.length; i++) {
      const cur = [i];
      for (let j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = cur;
    }
    return prev[b.length];
  }
  const sim = (a, b) => 1 - lev(a, b) / Math.max(a.length, b.length, 1);

  // Which option was said? `options` is a list of lists: every way of saying
  // option i (the word, or the whole sentence with it). Returns the index, or
  // -1 when not sure: the best match needs a score of 0.45 and a lead of 0.1
  // over the next option (the safe rule from spike/asr).
  function pick(alternatives, options, lang) {
    const scores = options.map((forms) => Math.max(...alternatives.flatMap((alt) => forms.map((f) => sim(norm(alt, lang), norm(f, lang))))));
    const order = scores.map((s, i) => [s, i]).sort((x, y) => y[0] - x[0]);
    const [best, second] = [order[0], order[1] || [0, -1]];
    return { index: best[0] >= 0.45 && best[0] - second[0] >= 0.1 ? best[1] : -1, score: best[0] };
  }

  const SR = root.SpeechRecognition || root.webkitSpeechRecognition;

  // Listens once; resolves with the recogniser's alternatives (empty if nothing was understood).
  function listen(lang, onStart) {
    return new Promise((resolve) => {
      const r = new SR();
      r.lang = lang === 'fa' ? 'fa-IR' : 'es-ES';
      r.maxAlternatives = 5;
      r.interimResults = true; // a final result sometimes never comes; keep the last partial one
      let alts = [], final = false, error = null;
      r.onstart = () => onStart && onStart();
      r.onresult = (e) => {
        const res = e.results[e.results.length - 1];
        if (res.isFinal || !final) { alts = [...res].map((a) => a.transcript); final = res.isFinal; }
      };
      r.onerror = (e) => { error = e.error; };
      const timer = setTimeout(() => r.stop(), 8000);
      r.onend = () => { clearTimeout(timer); resolve({ alts, error }); };
      try { r.start(); } catch (e) { resolve({ alts: [], error: String(e) }); }
    });
  }

  root.Speech = { norm, normLatin, sim, pick, listen, available: !!SR };
})(typeof globalThis !== 'undefined' ? globalThis : this);
