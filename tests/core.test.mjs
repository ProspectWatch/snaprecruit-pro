// Run with: node --test tests/
import test from 'node:test';
import assert from 'node:assert/strict';
import {cleanHandle, cleanName, validHandle, buildSuggestions} from '../js/snaprecruit-core.mjs';

// The original scanner-v14.html implementation, copied verbatim, used as the
// reference for the parity check. Do not "improve" this copy.
function v14Suggestions(nameRaw, igRaw, snapRaw){
  const cleanH=s=>String(s||'').trim().replace(/^@/,'').replace(/[^A-Za-z0-9._-]/g,'').slice(0,30);
  const cleanN=s=>String(s||'').trim().replace(/\b(she\/her|he\/him|they\/them)\b/ig,'').replace(/\s+/g,' ').replace(/^[\s._-]+|[\s._-]+$/g,'').slice(0,60);
  const valid=s=>s&&s.length>2&&/[A-Za-z]/.test(s)&&/^[A-Za-z0-9._-]+$/.test(s);
  const name=cleanN(nameRaw),ig=cleanH(igRaw),snap=cleanH(snapRaw);
  const parts=name.toLowerCase().split(/\s+/).filter(Boolean),out=[];
  if(snap)out.push(snap);
  if(parts.length>=2){const f=parts[0],l=parts.at(-1);out.push(`${f}.${l}`,`${f}_${l}`,`${f}-${l}`,`${f}${l}`)}
  if(ig)out.push(ig);
  return [...new Set(out.filter(valid))];
}

test('cleanHandle strips @, invalid chars, caps at 30', () => {
  assert.equal(cleanHandle('@Soph.Mart_21'), 'Soph.Mart_21');
  assert.equal(cleanHandle('  sc: emma!! '), 'scemma');
  assert.equal(cleanHandle('a'.repeat(40)), 'a'.repeat(30));
  assert.equal(cleanHandle(null), '');
  assert.equal(cleanHandle('user-name.ok_1'), 'user-name.ok_1');
});

test('cleanName removes pronouns, collapses whitespace, trims punctuation, caps at 60', () => {
  assert.equal(cleanName('  Emma   Cruz she/her '), 'Emma Cruz');
  assert.equal(cleanName('._-Jordan Lee-_.'), 'Jordan Lee');
  assert.equal(cleanName('They/Them Sam Reyes'), 'Sam Reyes');
  assert.equal(cleanName('X'.repeat(80)).length, 60);
  assert.equal(cleanName(undefined), '');
});

test('validHandle rules', () => {
  assert.equal(validHandle('ab'), false);
  assert.equal(validHandle('abc'), true);
  assert.equal(validHandle('123'), false);
  assert.equal(validHandle('a2c'), true);
  assert.equal(validHandle('has space'), false);
  assert.equal(validHandle(''), false);
});

test('priority order: detected snapchat, name variants, instagram fallback', () => {
  const s = buildSuggestions({name:'Emma Cruz', instagram:'emmac_vb', snapchat:'emma.snaps'});
  assert.deepEqual(s.map(x=>x.handle), ['emma.snaps','emma.cruz','emma_cruz','emma-cruz','emmacruz','emmac_vb']);
  assert.deepEqual(s.map(x=>x.type), ['snapchat','variant','variant','variant','variant','instagram']);
});

test('exactly four name variants, first+last only, from multi-part names', () => {
  const s = buildSuggestions({name:'Mary Jo Ann Beth', instagram:'', snapchat:''});
  assert.deepEqual(s.map(x=>x.handle), ['mary.beth','mary_beth','mary-beth','marybeth']);
});

test('dedup keeps first occurrence: snap equal to a variant, ig equal to a variant', () => {
  const s = buildSuggestions({name:'Emma Cruz', instagram:'emma.cruz', snapchat:'emma_cruz'});
  assert.deepEqual(s.map(x=>x.handle), ['emma_cruz','emma.cruz','emma-cruz','emmacruz']);
  assert.equal(s[0].type, 'snapchat');
  assert.equal(s[1].type, 'variant');
});

test('single-word name produces no variants; ig-only still suggests', () => {
  assert.deepEqual(buildSuggestions({name:'Emma', instagram:'emma_vb', snapchat:''}).map(x=>x.handle), ['emma_vb']);
  assert.deepEqual(buildSuggestions({name:'', instagram:'', snapchat:''}), []);
});

test('parity with scanner-v14 suggestions() across representative inputs', () => {
  const cases = [
    ['Emma Cruz','emmac_vb','emma.snaps'],
    ['Emma Cruz','emma.cruz','emma_cruz'],
    ['  Dalainee   Perry she/her','@dalainee.p','SC dala!'],
    ['A B','ab','ab'],
    ['Jo','jo_1',''],
    ['','',''],
    ['Mary Jo Ann Beth','maryb','mary.beth'],
    ['ÁGATHA SILVA','agatha__s',''],
    ['x y','12','1_2'],
    ['first last','first.last','first.last'],
    ["O'Neil Kane",'okane',''],
  ];
  for (const [name, ig, snap] of cases) {
    assert.deepEqual(
      buildSuggestions({name, instagram:ig, snapchat:snap}).map(x=>x.handle),
      v14Suggestions(name, ig, snap),
      `parity failed for ${JSON.stringify([name,ig,snap])}`
    );
  }
});
