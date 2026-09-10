// Password Predictability Lab — ranking engine.
//
// Runs entirely client-side (see password-predictability-lab.html): nothing
// typed into this tool is ever sent over the network, logged, or stored.
// That's a deliberate design choice, not just a disclaimer — there is no API
// route and no server component here at all, so there's nothing to receive
// or retain the input. It ranks a handful of personal-detail fields against
// common weak-password patterns (name/nickname + number/year, pet + year,
// etc.) purely to show why those patterns are guessable, the same idea
// behind tools like zxcvbn's personal-info scoring.
const COMMON_SUFFIXES = ['1', '12', '21', '23', '24', '25', '26', '!'];

function clean(value) {
  return String(value ?? '').trim().replace(/[^a-zA-Z0-9]/g, '').slice(0, 24);
}

function capitalize(value) {
  if (!value) return '';
  return value[0].toUpperCase() + value.slice(1);
}

function candidate(value, score, reasons) {
  if (value.length < 6 || value.length > 32) return null;
  return { value, score, reasons };
}

export function rankPasswordGuesses(persona) {
  persona = persona || {};
  const name = clean(persona.name);
  const nick = clean(persona.nickname);
  const number = clean(persona.favoriteNumber);
  const year = clean(persona.year);
  const sport = clean(persona.sport);
  const team = clean(persona.teamName);
  const pet = clean(persona.petName);

  const pool = [];
  const seen = new Set();

  function add(value, score, reasons) {
    const item = candidate(value, score, reasons);
    if (!item) return;
    const key = item.value.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    pool.push(item);
  }

  const baseWords = [
    [name, 40, 'uses your name'],
    [nick, 45, 'uses your nickname'],
    [pet, 42, 'uses your pet’s name'],
    [team, 34, 'uses your team name'],
    [sport, 28, 'uses your sport'],
  ];

  for (const [word, baseScore, reason] of baseWords) {
    if (!word) continue;
    add(capitalize(word) + '123', baseScore + 22, [reason, 'common numeric suffix']);
    add(capitalize(word) + '1!', baseScore + 18, [reason, 'simple punctuation pattern']);
    if (number) add(capitalize(word) + number, baseScore + 28, [reason, 'uses your favorite number']);
    if (year) add(capitalize(word) + year, baseScore + 26, [reason, 'uses your year']);
  }

  if (name && number) {
    add(name.toLowerCase() + number + '!', 82, ['combines your name and favorite number', 'adds predictable punctuation']);
  }
  if (nick && year) {
    add(capitalize(nick) + year + '!', 84, ['combines your nickname and year', 'adds predictable punctuation']);
  }
  if (team && number) {
    add(capitalize(team) + number, 76, ['combines your team name and favorite number']);
  }
  if (pet && year) {
    add(capitalize(pet) + year, 78, ['combines your pet’s name and year']);
  }

  // Fallback demo candidates if too few real fields were filled in, so the
  // page still has something to show and explain rather than an empty state.
  if (pool.length < 5) {
    for (const suffix of COMMON_SUFFIXES) {
      add(`DemoAthlete${suffix}`, 20, ['generic fallback pattern — fill in more fields above for a personalized result']);
      if (pool.length >= 8) break;
    }
  }

  return pool.sort((a, b) => b.score - a.score || a.value.localeCompare(b.value)).slice(0, 5);
}

export function getRiskMessage(guesses) {
  if (!guesses.length) return 'No guesses generated.';
  const max = Math.max(...guesses.map((g) => g.score));
  if (max >= 80) return 'High risk: these details produce several highly predictable password patterns.';
  if (max >= 60) return 'Moderate risk: some predictable password patterns were generated.';
  return 'Low risk: few predictable patterns were generated from these details.';
}
