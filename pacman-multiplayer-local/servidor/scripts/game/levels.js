const ROOM_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const DIRECTIONS = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 }
};

const LEVELS = [
  {
    id: 1,
    name: 'Nivel 1 - Monumental',
    mapName: 'Más Monumental / tranquilo',
    background: 'assets/fondo1.png',
    speed: 1.02,
    ghostSpeed: 0.76,
    powerPelletDuration: 6500,
    lives: 3,
    randomizeObjects: true,
    pelletDensity: 0.74,
    powerPelletRatio: 0.06,
    map: [
      '#####################',
      '#P........#........G#',
      '#.###.###.#.###.###.#',
      '#o#.....#...#.....#o#',
      '#.###.#.#####.#.###.#',
      '#.....#...G...#.....#',
      '#.###.###.#.###.###.#',
      '#...........#.......#',
      '#####################'
    ]
  },
  {
    id: 2,
    name: 'Nivel 2 - Monumental de noche',
    mapName: 'Más Monumental / noche',
    background: 'assets/fondo2.jpg',
    speed: 1.08,
    ghostSpeed: 1,
    powerPelletDuration: 6000,
    lives: 3,
    randomizeObjects: true,
    pelletDensity: 0.58,
    powerPelletRatio: 0.035,
    map: [
      '#######################',
      '#P..o.#...o...#..o...G#',
      '#.###.#.#####.#.####..#',
      '#...#..o#...#..o#.....#',
      '###.#####.#.#####.###.#',
      '#o..#.....#.....#...#o#',
      '#.#.#.### G ###.#.#.#.#',
      '#.#..o..#...#..o..#...#',
      '#.#####.#####.#####.#.#',
      '#.......G.....#.......#',
      '#######################'
    ]
  },
  {
    id: 3,
    name: 'Nivel 3 - Túneles',
    mapName: 'Más Monumental / túneles',
    background: 'assets/hero-pacman.jpg',
    speed: 1.16,
    ghostSpeed: 1.1,
    powerPelletDuration: 5500,
    lives: 3,
    randomizeObjects: true,
    pelletDensity: 0.6,
    powerPelletRatio: 0.03,
    map: [
      '#########################',
      '#P......#.........#....G#',
      '#.####..#.#######.#.###.#',
      '#o...#....#.....#...#...#',
      '####.#.####.###.#####.#.#',
      '#....#......# #.......#.#',
      '#.#########.#G#.#######.#',
      '#.....#.....# #.....#...#',
      '#.###.#.#######.###.#.###',
      '#...#...#..G..#...#....o#',
      '#.#.#####.###.#####.###.#',
      '#..G.................#...#',
      '#########################'
    ]
  },
  {
    id: 4,
    name: 'Nivel 4 - Presión',
    mapName: 'Más Monumental / presión',
    background: 'assets/hero-pacman.jpg',
    speed: 1.22,
    ghostSpeed: 1.18,
    powerPelletDuration: 5000,
    lives: 3,
    randomizeObjects: true,
    pelletDensity: 0.62,
    powerPelletRatio: 0.028,
    map: [
      '###########################',
      '#P..#.......#.......#....G#',
      '###.#.#####.#.#####.#.###.#',
      '#...#.#...#...#...#.#...#.#',
      '#.###.#.#.#####.#.#.###.#.#',
      '#.....#.#...o...#.#.....#.#',
      '#.#####.#### ####.#####.#.#',
      '#.#.....#...G...#.....#...#',
      '#.#.###.#.#####.#.###.###.#',
      '#...#...#...G...#...#.....#',
      '#.###.#####.#.#####.###.#.#',
      '#o......G...#.........#...#',
      '###########################'
    ]
  },
  {
    id: 5,
    name: 'Nivel 5 - Final',
    mapName: 'Más Monumental / final',
    background: 'assets/hero-pacman.jpg',
    speed: 1.28,
    ghostSpeed: 1.28,
    powerPelletDuration: 4500,
    lives: 3,
    randomizeObjects: true,
    pelletDensity: 0.64,
    powerPelletRatio: 0.025,
    map: [
      '#############################',
      '#P....#.........#.........G.#',
      '#.###.#.#######.#.#######.#.#',
      '#...#.#...#.....#.....#...#.#',
      '###.#.###.#.#########.#.###.#',
      '#...#.....#.....o.....#.....#',
      '#.#######.##### # #####.###.#',
      '#.#.....#.....#G#.....#...#.#',
      '#.#.###.#####.# #.###.###.#.#',
      '#...#...#...G.# #...#.....#.#',
      '#.###.###.#.#######.#.#####.#',
      '#.....#...#....G....#.....#o#',
      '#.#####.###########.#####.#.#',
      '#G..........................#',
      '#############################'
    ]
  }
];

function hashSeed(seed) {
  const value = String(seed ?? '0');
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function createSeededRandom(seed) {
  let state = hashSeed(seed) || 1;
  return () => {
    state = Math.imul(1664525, state) + 1013904223;
    return (state >>> 0) / 4294967296;
  };
}

function shuffle(items, random) {
  const list = [...items];
  for (let index = list.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [list[index], list[swapIndex]] = [list[swapIndex], list[index]];
  }
  return list;
}

function reserveArea(reserved, point, radius, width, height) {
  for (let y = Math.max(0, point.y - radius); y <= Math.min(height - 1, point.y + radius); y += 1) {
    for (let x = Math.max(0, point.x - radius); x <= Math.min(width - 1, point.x + radius); x += 1) {
      reserved.add(`${x},${y}`);
    }
  }
}

function materializeLevel(level, seed) {
  const rows = level.map.map((row) => row.split(''));
  const openCells = [];
  const ghostStarts = [];
  let pacmanStart = { x: 1, y: 1 };

  rows.forEach((row, y) => {
    row.forEach((cell, x) => {
      if (cell === '#') return;
      if (cell === 'P') {
        pacmanStart = { x, y };
        return;
      }
      if (cell === 'G') {
        ghostStarts.push({ x, y });
        return;
      }
      openCells.push({ x, y });
      row[x] = ' ';
    });
  });

  const random = createSeededRandom(`${level.id}:${seed}`);
  const reserved = new Set();
  reserveArea(reserved, pacmanStart, 2, rows[0]?.length || 0, rows.length);
  ghostStarts.forEach((ghost) => reserveArea(reserved, ghost, 1, rows[0]?.length || 0, rows.length));

  const candidates = shuffle(openCells.filter((cell) => !reserved.has(`${cell.x},${cell.y}`)), random);
  const pelletDensity = Number(level.pelletDensity ?? 0.6);
  const powerRatio = Number(level.powerPelletRatio ?? 0.03);
  const maxPowerPellets = Math.max(2, Math.round(candidates.length * powerRatio));
  const maxPellets = Math.max(18, Math.round(candidates.length * pelletDensity));
  let pelletsPlaced = 0;
  let powerPelletsPlaced = 0;

  for (const cell of candidates) {
    if (pelletsPlaced >= maxPellets && powerPelletsPlaced >= maxPowerPellets) break;
    const key = `${cell.x},${cell.y}`;
    if (reserved.has(key)) continue;
    const row = rows[cell.y];
    if (powerPelletsPlaced < maxPowerPellets && random() > 0.78) {
      row[cell.x] = 'o';
      powerPelletsPlaced += 1;
      continue;
    }
    if (pelletsPlaced < maxPellets) {
      row[cell.x] = '.';
      pelletsPlaced += 1;
    }
  }

  if (pelletsPlaced < maxPellets || powerPelletsPlaced < maxPowerPellets) {
    for (const cell of candidates) {
      const key = `${cell.x},${cell.y}`;
      if (reserved.has(key)) continue;
      const row = rows[cell.y];
      if (pelletsPlaced < maxPellets && row[cell.x] === ' ') {
        row[cell.x] = '.';
        pelletsPlaced += 1;
      } else if (powerPelletsPlaced < maxPowerPellets && row[cell.x] === ' ') {
        row[cell.x] = 'o';
        powerPelletsPlaced += 1;
      }
      if (pelletsPlaced >= maxPellets && powerPelletsPlaced >= maxPowerPellets) break;
    }
  }

  return rows.map((row) => row.join(''));
}

function parseLevel(level, seed = level.id) {
  const mapRows = level.randomizeObjects === false ? level.map : materializeLevel(level, seed);
  const walls = new Set();
  const pellets = [];
  const powerPellets = [];
  const ghosts = [];
  let pacmanStart = { x: 1, y: 1 };

  mapRows.forEach((row, y) => {
    [...row].forEach((cell, x) => {
      if (cell === '#') walls.add(`${x},${y}`);
      if (cell === '.') pellets.push({ x, y });
      if (cell === 'o') powerPellets.push({ x, y });
      if (cell === 'P') pacmanStart = { x, y };
      if (cell === 'G') ghosts.push({ x, y });
    });
  });

  return {
    width: Math.max(...mapRows.map((row) => row.length)),
    height: mapRows.length,
    walls,
    pellets,
    powerPellets,
    pacmanStart,
    ghostStarts: ghosts.length ? ghosts : [{ x: 10, y: 5 }]
  };
}

module.exports = {
  ROOM_CODE_CHARS,
  DIRECTIONS,
  LEVELS,
  parseLevel
};
