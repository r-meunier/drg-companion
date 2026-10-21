import './style.css';
import { DEFAULT_DWARVES } from './data.js';
import { freshLibrary, isLibrary, load, save } from './state.js';

let state = load();
const undoStack = [];
const app = document.getElementById('app');

const uid = () => Math.random().toString(36).slice(2, 9);
const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const monsterType = (id) => state.library.monsters.find((m) => m.id === id);
const currentPhase = () => state.library.phases[state.game.phaseIndex] ?? { name: '—', monster: false };

function commit() {
  save(state);
  render();
}

// Wraps every game mutation so a mis-tap at the table can be undone.
function act(fn) {
  undoStack.push(JSON.stringify(state.game));
  if (undoStack.length > 50) undoStack.shift();
  fn(state.game);
  commit();
}

function log(text) {
  state.game.log.unshift({ round: state.game.round, text });
  state.game.log.length = Math.min(state.game.log.length, 200);
}

function enterPhase(game) {
  const phase = currentPhase();
  log(`${phase.name} begins`);
  if (phase.monster) {
    game.queue = game.enemies.filter((e) => e.hp > 0).map((e) => e.uid);
    game.queuePos = 0;
    game.lastRoll = null;
  }
}

// The enemy whose turn it is, skipping any that died or were removed mid-phase.
function activeEnemy(game) {
  while (game.queuePos < game.queue.length) {
    const enemy = game.enemies.find((e) => e.uid === game.queue[game.queuePos]);
    if (enemy && enemy.hp > 0) return enemy;
    game.queuePos++;
  }
  return null;
}

/* ---------- Views ---------- */

function render() {
  const view = state.view;
  app.innerHTML = `
    <header class="top">
      <div>
        <h1>Mission Control</h1>
        <p class="tagline">Unofficial DRG board game companion</p>
      </div>
      <nav>
        <button data-action="view" data-view="game" class="${view === 'game' ? 'on' : ''}">Game</button>
        <button data-action="view" data-view="library" class="${view === 'library' ? 'on' : ''}">Library</button>
      </nav>
    </header>
    <main>${view === 'library' ? libraryView() : state.game ? gameView() : setupView()}</main>
    <footer>Fan-made and not affiliated with Mood Publishing or Ghost Ship Games. Your data stays in this browser.</footer>
  `;
}

function setupView() {
  const rows = DEFAULT_DWARVES.map(
    (d, i) => `
      <label class="row">
        <input type="checkbox" name="use" data-i="${i}" checked />
        <input type="text" name="name" data-i="${i}" value="${esc(d.name)}" aria-label="Player name" />
        <input type="number" name="hp" data-i="${i}" value="${d.hp}" min="1" aria-label="Max HP" class="num" />
      </label>`,
  ).join('');
  return `
    <section class="card">
      <h2>New mission</h2>
      <p class="hint">Pick who's playing and their max HP. Set up enemy types and dice effects in the <b>Library</b> tab first. The examples are placeholders, so copy the real values from your rulebook.</p>
      <form id="setup">
        <div class="row head"><span></span><span>Dwarf</span><span>HP</span></div>
        ${rows}
        <button type="submit" class="primary wide">Start mission</button>
      </form>
    </section>`;
}

function gameView() {
  const g = state.game;
  const phase = currentPhase();
  const phases = state.library.phases
    .map((p, i) => `<li class="${i === g.phaseIndex ? 'on' : ''}">${esc(p.name)}</li>`)
    .join('');
  const options = state.library.monsters.map((m) => `<option value="${esc(m.id)}">${esc(m.name)}</option>`).join('');

  return `
    <section class="card phasebar">
      <div class="round">Round <b>${g.round}</b></div>
      <ol class="phases">${phases}</ol>
      <div class="controls">
        <button data-action="undo" ${undoStack.length ? '' : 'disabled'}>Undo</button>
        <button data-action="next-phase" class="primary">Next phase →</button>
      </div>
    </section>

    ${phase.monster ? monsterPhaseView(g) : ''}

    <section class="card">
      <h2>Dwarves</h2>
      ${g.dwarves.map((d) => hpRow('dwarf', d.id, d.name, d.hp, d.maxHp)).join('')}
    </section>

    <section class="card">
      <h2>Enemies on the board <span class="count">${g.enemies.filter((e) => e.hp > 0).length}</span></h2>
      ${g.enemies.length ? g.enemies.map(enemyRow).join('') : '<p class="hint">No enemies yet.</p>'}
      <form id="add-enemy" class="add">
        <select name="type" aria-label="Enemy type">${options}</select>
        <input type="number" name="qty" value="1" min="1" max="20" class="num" aria-label="How many" />
        <button type="submit">Spawn</button>
      </form>
    </section>

    <section class="card">
      <h2>Log</h2>
      <ul class="log">${g.log.map((l) => `<li><span>R${l.round}</span> ${esc(l.text)}</li>`).join('')}</ul>
      <button data-action="end-game" class="danger">End mission</button>
    </section>`;
}

function monsterPhaseView(g) {
  const enemy = activeEnemy(g);
  if (!enemy) {
    return `
      <section class="card spotlight">
        <h2>${esc(currentPhase().name)}</h2>
        <p>${g.queue.length ? 'Every enemy has acted.' : 'No enemies on the board.'}</p>
        <button data-action="next-phase" class="primary wide">Continue to next phase →</button>
      </section>`;
  }
  const type = monsterType(enemy.typeId);
  const total = g.queue.length;
  const faces = state.library.faces
    .map((f) => `<button data-action="roll" data-face="${esc(f)}" class="die ${g.lastRoll?.face === f ? 'on' : ''}">${esc(f)}</button>`)
    .join('');
  const result = g.lastRoll
    ? `<div class="result"><span>Rolled ${esc(g.lastRoll.face)}</span><strong>${esc(g.lastRoll.text)}</strong></div>`
    : '<p class="hint">Roll the die, then tap the face you got.</p>';

  return `
    <section class="card spotlight">
      <h2>${esc(currentPhase().name)} · ${g.queuePos + 1} of ${total}</h2>
      <div class="turn">
        <div class="who">${esc(enemy.label)}</div>
        <div class="hp-big">${enemy.hp} / ${type?.maxHp ?? '?'} HP</div>
      </div>
      <div class="dice">${faces}</div>
      ${result}
      <button data-action="next-enemy" class="primary wide">Next enemy →</button>
    </section>`;
}

function hpRow(kind, id, name, hp, maxHp) {
  const pct = maxHp ? Math.max(0, Math.min(100, (hp / maxHp) * 100)) : 0;
  return `
    <div class="unit ${hp <= 0 ? 'down' : ''}">
      <div class="unit-name">${esc(name)}</div>
      <div class="bar"><i style="width:${pct}%"></i></div>
      <div class="hp">
        <button data-action="hp" data-kind="${kind}" data-id="${id}" data-delta="-1" aria-label="Lose 1 HP">−</button>
        <span>${hp}/${maxHp}</span>
        <button data-action="hp" data-kind="${kind}" data-id="${id}" data-delta="1" aria-label="Gain 1 HP">+</button>
      </div>
    </div>`;
}

function enemyRow(e) {
  const type = monsterType(e.typeId);
  return `
    <div class="enemy">
      ${hpRow('enemy', e.uid, e.label, e.hp, type?.maxHp ?? e.hp)}
      <button data-action="remove-enemy" data-id="${e.uid}" class="ghost" aria-label="Remove ${esc(e.label)}">✕</button>
    </div>`;
}

function libraryView() {
  const lib = state.library;
  const phases = lib.phases
    .map(
      (p, i) => `
      <div class="row phase-row">
        <input type="text" data-field="phase-name" data-i="${i}" value="${esc(p.name)}" aria-label="Phase name" />
        <label class="check"><input type="checkbox" data-field="phase-monster" data-i="${i}" ${p.monster ? 'checked' : ''} /> enemies act</label>
        <button data-action="del-phase" data-i="${i}" class="ghost" aria-label="Delete phase">✕</button>
      </div>`,
    )
    .join('');
  const monsters = lib.monsters
    .map(
      (m) => `
      <div class="monster">
        <div class="row">
          <input type="text" data-field="m-name" data-id="${esc(m.id)}" value="${esc(m.name)}" aria-label="Enemy name" />
          <input type="number" data-field="m-hp" data-id="${esc(m.id)}" value="${m.maxHp}" min="1" class="num" aria-label="Max HP" />
          <button data-action="del-monster" data-id="${esc(m.id)}" class="ghost" aria-label="Delete enemy">✕</button>
        </div>
        <div class="effects">
          ${lib.faces
            .map(
              (f) => `
            <label><span>${esc(f)}</span>
              <input type="text" data-field="m-effect" data-id="${esc(m.id)}" data-face="${esc(f)}" value="${esc(m.effects?.[f] ?? '')}" placeholder="effect" />
            </label>`,
            )
            .join('')}
        </div>
      </div>`,
    )
    .join('');

  return `
    <section class="card">
      <h2>Die faces</h2>
      <p class="hint">Comma-separated, e.g. <code>1,2,3,4,5,6</code> or symbol names.</p>
      <input type="text" data-field="faces" value="${esc(lib.faces.join(', '))}" class="wide" />
    </section>
    <section class="card">
      <h2>Round phases</h2>
      ${phases}
      <button data-action="add-phase">+ Add phase</button>
    </section>
    <section class="card">
      <h2>Enemy types</h2>
      <p class="hint">Name, max HP, and what happens for each die face.</p>
      ${monsters}
      <button data-action="add-monster">+ Add enemy type</button>
    </section>
    <section class="card">
      <h2>Share</h2>
      <p class="hint">Export your setup as a file someone else can import.</p>
      <div class="controls">
        <button data-action="export">Export JSON</button>
        <label class="button">Import JSON<input type="file" accept="application/json,.json" id="import" hidden /></label>
        <button data-action="reset-library" class="danger">Reset to examples</button>
      </div>
    </section>`;
}

/* ---------- Events ---------- */

const actions = {
  view: (el) => {
    state.view = el.dataset.view;
    commit();
  },
  undo: () => {
    if (!undoStack.length) return;
    state.game = JSON.parse(undoStack.pop());
    commit();
  },
  'next-phase': () =>
    act((g) => {
      g.phaseIndex++;
      if (g.phaseIndex >= state.library.phases.length) {
        g.phaseIndex = 0;
        g.round++;
      }
      enterPhase(g);
    }),
  roll: (el) =>
    act((g) => {
      const enemy = activeEnemy(g);
      if (!enemy) return;
      const face = el.dataset.face;
      const text = monsterType(enemy.typeId)?.effects?.[face] || 'No effect set for this face';
      g.lastRoll = { face, text };
      log(`${enemy.label} rolled ${face}: ${text}`);
    }),
  'next-enemy': () =>
    act((g) => {
      g.queuePos++;
      g.lastRoll = null;
    }),
  hp: (el) =>
    act((g) => {
      const list = el.dataset.kind === 'dwarf' ? g.dwarves : g.enemies;
      const unit = list.find((u) => (u.id ?? u.uid) === el.dataset.id);
      if (!unit) return;
      const max = unit.maxHp ?? monsterType(unit.typeId)?.maxHp ?? Infinity;
      const before = unit.hp;
      unit.hp = Math.max(0, Math.min(max, unit.hp + Number(el.dataset.delta)));
      if (before > 0 && unit.hp === 0) log(`${unit.name ?? unit.label} is down`);
    }),
  'remove-enemy': (el) =>
    act((g) => {
      const enemy = g.enemies.find((e) => e.uid === el.dataset.id);
      g.enemies = g.enemies.filter((e) => e.uid !== el.dataset.id);
      if (enemy) log(`${enemy.label} removed`);
    }),
  'end-game': () => {
    if (!confirm('End this mission? The log and board will be cleared.')) return;
    state.game = null;
    undoStack.length = 0;
    commit();
  },
  'add-phase': () => {
    state.library.phases.push({ name: 'New phase', monster: false });
    commit();
  },
  'del-phase': (el) => {
    if (state.library.phases.length <= 1) return;
    state.library.phases.splice(Number(el.dataset.i), 1);
    if (state.game) state.game.phaseIndex = Math.min(state.game.phaseIndex, state.library.phases.length - 1);
    commit();
  },
  'add-monster': () => {
    state.library.monsters.push({ id: uid(), name: 'New enemy', maxHp: 3, effects: {} });
    commit();
  },
  'del-monster': (el) => {
    if (state.game?.enemies.some((e) => e.typeId === el.dataset.id)) {
      alert('That enemy type is on the board in the current mission. Remove those enemies first.');
      return;
    }
    state.library.monsters = state.library.monsters.filter((m) => m.id !== el.dataset.id);
    commit();
  },
  export: () => {
    const blob = new Blob([JSON.stringify(state.library, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'mission-control-library.json';
    a.click();
    URL.revokeObjectURL(a.href);
  },
  'reset-library': () => {
    if (state.game) {
      alert('End the current mission before resetting the library.');
      return;
    }
    if (!confirm('Replace your library with the example placeholders?')) return;
    state.library = freshLibrary();
    commit();
  },
};

app.addEventListener('click', (e) => {
  const el = e.target.closest('[data-action]');
  if (el && actions[el.dataset.action]) actions[el.dataset.action](el);
});

// Library edits save on change without re-rendering, so typing keeps focus.
app.addEventListener('change', async (e) => {
  const el = e.target;
  const lib = state.library;
  const m = el.dataset.id && lib.monsters.find((x) => x.id === el.dataset.id);
  switch (el.dataset.field) {
    case 'faces': {
      const faces = [...new Set(el.value.split(',').map((s) => s.trim()).filter(Boolean))];
      if (faces.length) lib.faces = faces;
      return commit();
    }
    case 'phase-name':
      lib.phases[el.dataset.i].name = el.value.trim() || 'Phase';
      break;
    case 'phase-monster':
      lib.phases[el.dataset.i].monster = el.checked;
      break;
    case 'm-name':
      if (m) m.name = el.value.trim() || 'Enemy';
      break;
    case 'm-hp':
      if (m) m.maxHp = Math.max(1, Number(el.value) || 1);
      break;
    case 'm-effect':
      if (m) (m.effects ??= {})[el.dataset.face] = el.value;
      break;
  }
  if (el.id === 'import' && el.files[0]) {
    try {
      const lib = JSON.parse(await el.files[0].text());
      if (!isLibrary(lib)) throw new Error('bad shape');
      if (state.game) throw new Error('game running');
      state.library = lib;
      return commit();
    } catch (err) {
      alert(err.message === 'game running' ? 'End the current mission before importing.' : "That file isn't a Mission Control library.");
    }
  }
  save(state);
});

app.addEventListener('submit', (e) => {
  e.preventDefault();
  const form = e.target;
  if (form.id === 'setup') {
    const dwarves = DEFAULT_DWARVES.map((_, i) => ({
      use: form.querySelector(`[name=use][data-i="${i}"]`).checked,
      name: form.querySelector(`[name=name][data-i="${i}"]`).value.trim() || `Dwarf ${i + 1}`,
      hp: Math.max(1, Number(form.querySelector(`[name=hp][data-i="${i}"]`).value) || 1),
    }))
      .filter((d) => d.use)
      .map((d) => ({ id: uid(), name: d.name, hp: d.hp, maxHp: d.hp }));
    if (!dwarves.length) return alert('Pick at least one dwarf.');
    state.game = { round: 1, phaseIndex: 0, dwarves, enemies: [], counters: {}, queue: [], queuePos: 0, lastRoll: null, log: [] };
    undoStack.length = 0;
    enterPhase(state.game);
    commit();
  }
  if (form.id === 'add-enemy') {
    const type = monsterType(form.elements.type.value);
    const qty = Math.max(1, Math.min(20, Number(form.elements.qty.value) || 1));
    if (!type) return;
    act((g) => {
      for (let i = 0; i < qty; i++) {
        const n = (g.counters[type.id] = (g.counters[type.id] ?? 0) + 1);
        g.enemies.push({ uid: uid(), typeId: type.id, label: `${type.name} #${n}`, hp: type.maxHp });
      }
      log(`Spawned ${qty} × ${type.name}`);
    });
  }
});

render();
