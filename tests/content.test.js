const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const ACTIONS = ['bg', 'enter', 'exit', 'move', 'show', 'hide', 'give', 'open', 'point', 'highlight', 'jump', 'nod', 'shake', 'bubble', 'knock', 'ring'];
const words = (s) => s.split(/[^\p{L}\p{M}‌'’-]+/u).filter(Boolean).map((w) => w.toLowerCase());
const fill = (text, answer) => {
  const [t, tl] = text.split('|'), [a, al] = answer.split('|');
  return tl === undefined ? t.replace('___', a) : `${t.replace('___', a)}|${tl.replace('___', al)}`;
};

const lessons = (lang) => JSON.parse(fs.readFileSync(path.join(ROOT, `content/${lang}/index.json`)));

for (const lang of ['es', 'fa']) for (const id of lessons(lang)) {
  const ch = JSON.parse(fs.readFileSync(path.join(ROOT, `content/${lang}/${id}.json`)));
  const audio = JSON.parse(fs.readFileSync(path.join(ROOT, `content/${lang}/${id}.audio.json`)));
  const pair = (s) => assert.equal(lang === 'fa', s.includes('|'), `${lang}: "${s}" should ${lang === 'fa' ? '' : 'not '}be "script|latin"`);

  test(`${lang}/${id}: every sentence has a speaker with a voice, and audio`, () => {
    for (const s of ch.sentences) {
      pair(s.text);
      assert.ok(ch.voices[s.who], `${s.id}: no voice for ${s.who}`);
      assert.ok(s.who === 'narrator' || ch.cast[s.who], `${s.id}: ${s.who} is not in the cast`);
      assert.ok(s.en && s.pl, `${s.id}: translation missing`);
      assert.ok(audio[s.text], `${s.id}: no audio; run pipeline/build_audio.py`);
    }
  });

  if (ch.story) test(`${lang}/${id}: the story module stages every sentence`, () => {
    const src = fs.readFileSync(path.join(ROOT, `stage/${ch.story}.js`), 'utf8');
    for (const s of ch.sentences) assert.ok(new RegExp(`\\b${s.id}: \\[`).test(src), `${s.id}: not in stage/${ch.story}.js`);
  });

  if (!ch.story) test(`${lang}/${id}: scene actions name known actions, actors and props`, () => {
    const things = { ...ch.cast, ...ch.props };
    for (const s of ch.sentences) for (const a of s.scene || []) {
      const kind = ACTIONS.find((k) => k in a);
      assert.ok(kind, `${s.id}: unknown action ${JSON.stringify(a)}`);
      for (const k of ['enter', 'exit', 'move', 'jump', 'nod', 'shake', 'highlight', 'bubble', 'point', 'to', 'on', 'over'])
        if (typeof a[k] === 'string') assert.ok(ch.cast[a[k]], `${s.id}: ${a[k]} is not in the cast`);
      for (const k of ['show', 'hide', 'give']) if (a[k]) assert.ok(ch.props[a[k]], `${s.id}: ${a[k]} is not a prop`);
      if (a.at) assert.ok(things[a.at], `${s.id}: ${a.at} is not an actor or prop`);
    }
  });

  test(`${lang}/${id}: every glossed form occurs in the text`, () => {
    const script = new Set(ch.sentences.flatMap((s) => words(s.text.split('|')[0])));
    const latin = new Set(ch.sentences.flatMap((s) => words(s.text.split('|')[1] || '')));
    for (const [key, g] of Object.entries(ch.glosses)) {
      assert.ok(g.tl && g.en && g.pl, `${key}: gloss incomplete`);
      for (const f of g.forms || [key]) assert.ok(script.has(f.toLowerCase()), `${key}: "${f}" is not in the text`);
      for (const f of g.la_forms || []) assert.ok(latin.has(f.toLowerCase()), `${key}: "${f}" is not in the transcription`);
      if (lang === 'fa') assert.ok(g.la && g.la_forms, `${key}: transcription missing`);
    }
  });

  test(`${lang}/${id}: cards are well formed and have audio`, () => {
    const ids = new Set();
    for (const c of ch.cards) {
      assert.ok(!ids.has(c.id), `${c.id} twice`); ids.add(c.id);
      if (c.kind === 'picture') { pair(c.word); assert.ok(c.emoji); assert.ok(audio[c.word], `${c.id}: no audio`); continue; }
      assert.ok(['gap', 'question', 'opposite'].includes(c.kind), `${c.id}: unknown kind`);
      assert.equal(c.wrong.length, 3, `${c.id}: needs three wrong answers`);
      assert.equal(new Set([c.answer, ...c.wrong]).size, 4, `${c.id}: answers must differ`);
      [c.answer, ...c.wrong].forEach(pair);
      if (c.kind === 'gap') {
        for (const half of c.text.split('|')) assert.equal(half.split('___').length, 2, `${c.id}: one gap in each half`);
        assert.ok(audio[fill(c.text, c.answer)], `${c.id}: no audio`);
      } else {
        assert.ok(audio[c.kind === 'question' ? c.text : c.word], `${c.id}: no audio`);
        for (const o of [c.answer, ...c.wrong]) assert.ok(audio[o], `${c.id}: no audio for ${o}`);
      }
    }
    assert.ok(ch.cards.filter((c) => c.kind === 'picture').length >= 4, 'at least four pictures');
  });

  test(`${lang}/${id}: audio files exist`, () => {
    for (const a of Object.values(audio)) assert.ok(fs.existsSync(path.join(ROOT, a.file)), `${a.file} missing`);
  });
}
