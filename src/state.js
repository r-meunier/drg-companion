import { DEFAULT_FACES, DEFAULT_MONSTERS, DEFAULT_PHASES } from './data.js';

const KEY = 'drg-companion:v1';

export function freshLibrary() {
  return {
    faces: [...DEFAULT_FACES],
    phases: structuredClone(DEFAULT_PHASES),
    monsters: structuredClone(DEFAULT_MONSTERS),
  };
}

export function freshState() {
  return { version: 1, view: 'game', library: freshLibrary(), game: null };
}

export function isLibrary(lib) {
  return (
    lib &&
    Array.isArray(lib.faces) &&
    Array.isArray(lib.phases) &&
    Array.isArray(lib.monsters) &&
    lib.monsters.every((m) => m && typeof m.id === 'string' && typeof m.name === 'string')
  );
}

export function load() {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY));
    if (parsed?.version === 1 && isLibrary(parsed.library)) return parsed;
  } catch {
    // Storage blocked or corrupt: start fresh.
  }
  return freshState();
}

export function save(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Private mode or quota: the game still works for this session.
  }
}
