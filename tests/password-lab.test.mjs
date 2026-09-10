// Run with: node --test tests/
import test from 'node:test';
import assert from 'node:assert/strict';
import {rankPasswordGuesses, getRiskMessage} from '../js/password-lab-core.mjs';

test('returns up to five ranked guesses, highest score first', () => {
  const result = rankPasswordGuesses({
    name: 'Jordan',
    nickname: 'Jordy',
    favoriteNumber: '23',
    year: '2029',
    sport: 'Lacrosse',
    teamName: 'Northstars',
    petName: 'Milo',
  });
  assert.equal(result.length, 5);
  assert.ok(result[0].score >= result[1].score);
  assert.ok(result.every(g => g.value.length >= 6 && g.value.length <= 32));
});

test('every guess carries at least one human-readable reason', () => {
  const result = rankPasswordGuesses({nickname: 'Jordy', year: '2029'});
  for (const g of result) assert.ok(g.reasons.length > 0);
});

test('empty input still returns generic fallback guesses, not a crash', () => {
  const result = rankPasswordGuesses({});
  assert.ok(result.length > 0);
  assert.ok(result.every(g => /^DemoAthlete/.test(g.value)));
});

test('getRiskMessage reflects the top score', () => {
  const high = rankPasswordGuesses({nickname: 'Jordy', year: '2029'});
  assert.match(getRiskMessage(high), /risk/i);
  assert.equal(getRiskMessage([]), 'No guesses generated.');
});

test('non-alphanumeric input is stripped before building guesses', () => {
  const result = rankPasswordGuesses({name: "O'Bri3n!! ", favoriteNumber: '7'});
  for (const g of result) assert.equal(/[^a-zA-Z0-9!]/.test(g.value), false);
});
