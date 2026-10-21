// Placeholder content only. The app ships no official game data: players fill in
// enemies, effects and phases from their own rulebook (or import a shared JSON).

export const DEFAULT_FACES = ['1', '2', '3', '4', '5', '6'];

export const DEFAULT_PHASES = [
  { name: 'Player turns', monster: false },
  { name: 'Enemy phase', monster: true },
  { name: 'Spawn', monster: false },
  { name: 'End of round', monster: false },
];

export const DEFAULT_MONSTERS = [
  {
    id: 'example-small',
    name: 'Example: small bug',
    maxHp: 2,
    effects: { 1: 'Miss', 2: 'Miss', 3: '1 damage', 4: '1 damage', 5: 'Move 1, then 1 damage', 6: '2 damage' },
  },
  {
    id: 'example-big',
    name: 'Example: big bug',
    maxHp: 6,
    effects: { 1: 'Move 1', 2: 'Move 1', 3: '2 damage', 4: '2 damage', 5: '3 damage', 6: '3 damage to all adjacent' },
  },
];

export const DEFAULT_DWARVES = [
  { name: 'Scout', hp: 5 },
  { name: 'Driller', hp: 5 },
  { name: 'Engineer', hp: 5 },
  { name: 'Gunner', hp: 5 },
];
