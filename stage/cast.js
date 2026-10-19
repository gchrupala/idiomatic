// The people and the dog of the Spanish stories, so they look the same in every lesson.
import { Person, Dog } from './engine.js';

const LOOKS = {
  ane: () => new Person('ane', { scale: 1.0, leg: 58, body: 50, head: 27, skin: '#f8cfae', hair: '#5a321b', hairStyle: 'bob', lashes: true, top: '#e2445c', collar: '#fff8ef', shoes: '#2e3a8f' }),
  iker: () => new Person('iker', { scale: 0.84, leg: 46, body: 44, head: 29, skin: '#f8cfae', hair: '#6e4222', hairStyle: 'short', top: '#2f74d0', trousers: '#2c4b80', shoes: '#e2445c' }),
  begona: () => new Person('begona', { scale: 1.12, leg: 62, body: 60, head: 22, eyes: 0.85, skin: '#f0c19c', hair: '#3a2216', hairStyle: 'bun', lashes: true, top: '#2e9d6b', collar: '#ffe9a8', shoes: '#7a3b20' }),
  mikel: () => new Person('mikel', { scale: 1.18, leg: 62, body: 62, head: 22, eyes: 0.85, skin: '#f0c19c', hair: '#332a26', hairStyle: 'beardy', beard: true, beret: '#1f2a44', top: '#7a5cc2', trousers: '#3a3a48', shoes: '#4a2f1d' }),
  bruna: () => new Person('bruna', { scale: 1.12, leg: 62, body: 58, head: 23, eyes: 0.88, skin: '#e9b48f', hair: '#2b211c', hairStyle: 'curly', lashes: true, glasses: '#3b2a20', top: '#d4902a', scarf: '#7fc3ec', shoes: '#5a3420' }),
  waiter: () => new Person('waiter', { scale: 1.1, leg: 62, body: 58, head: 22, eyes: 0.85, skin: '#f0c19c', hair: '#1c1c1c', hairStyle: 'short', top: '#ffffff', trousers: '#222222', apron: '#2d2d2d', shoes: '#222222', raised: 34 }), // on the raised floor behind the bar
  txiki: () => new Dog('txiki', { color: '#f4efe6', patch: '#2b2b2b', ear: '#2b2b2b', collar: '#e2445c', scale: 0.82 }),
};

export function cast(...ids) { return Object.fromEntries(ids.map((id) => [id, LOOKS[id]()])); }
