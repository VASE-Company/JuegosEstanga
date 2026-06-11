// Caracteres disponibles para generar códigos de sala
const ROOM_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

// Definición de direcciones de movimiento con sus vectores x,y
const DIRECTIONS = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 }
};

// Configuración de los 5 niveles del juego
const LEVELS = [
  {
    id: 1,
    name: 'Nivel 1 - Monumental',
    mapName: 'Más Monumental / tranquilo',
    background: 'assets/fondo1.png',
    speed: 1.02, // Velocidad de Pacman
    ghostSpeed: 0.76, // Velocidad de los fantasmas
    powerPelletDuration: 6500, // Duración de la píldora de poder en ms
    lives: 3, // Vidas iniciales
    randomizeObjects: true, // Randomizar posición de pellets
    pelletDensity: 0.74, // Densidad de pellets normales
    powerPelletRatio: 0.06, // Proporción de pellets de poder
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
      '#.#########.#G..#######.#',
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

/**
 * Genera un hash a partir de una semilla para usar en generador pseudo-aleatorio
 * @param {string|number} seed - La semilla para generar el hash
 * @returns {number} Número de hash sin signo
 */
function hashSeed(seed) {
  const value = String(seed ?? '0');
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/**
 * Crea un generador de números pseudo-aleatorios seeded
 * @param {string|number} seed - La semilla inicial
 * @returns {Function} Función que retorna números aleatorios [0, 1)
 */
function createSeededRandom(seed) {
  let state = hashSeed(seed) || 1;
  return () => {
    state = Math.imul(1664525, state) + 1013904223;
    return (state >>> 0) / 4294967296;
  };
}

/**
 * Mezcla aleatoriamente un array usando Fisher-Yates shuffle
 * @param {Array} items - Array a mezclar
 * @param {Function} random - Función generadora de números aleatorios
 * @returns {Array} Nuevo array mezclado
 */
function shuffle(items, random) {
  const list = [...items];
  for (let index = list.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [list[index], list[swapIndex]] = [list[swapIndex], list[index]];
  }
  return list;
}

/**
 * Reserva un área circular alrededor de un punto en el mapa
 * Se usa para evitar que los pellets aparezcan cerca de Pacman o fantasmas
 * @param {Set} reserved - Set de coordenadas ya reservadas
 * @param {Object} point - Punto central {x, y}
 * @param {number} radius - Radio del área a reservar
 * @param {number} width - Ancho del mapa
 * @param {number} height - Alto del mapa
 */
function reserveArea(reserved, point, radius, width, height) {
  for (let y = Math.max(0, point.y - radius); y <= Math.min(height - 1, point.y + radius); y += 1) {
    for (let x = Math.max(0, point.x - radius); x <= Math.min(width - 1, point.x + radius); x += 1) {
      reserved.add(`${x},${y}`);
    }
  }
}

/**
 * Genera el mapa del nivel con pellets colocados aleatoriamente según la densidad
 * @param {Object} level - Configuración del nivel
 * @param {string|number} seed - Semilla para reproducibilidad
 * @returns {Array<string>} Mapa materializado con pellets colocados
 */
function materializeLevel(level, seed) {
  const rows = level.map.map((row) => row.split(''));
  const openCells = [];
  const ghostStarts = [];
  let pacmanStart = { x: 1, y: 1 };

  // Parsear mapa inicial para encontrar posiciones de Pacman, fantasmas y celdas abiertas
  rows.forEach((row, y) => {
    row.forEach((cell, x) => {
      if (cell === '#') return; // Pared
      if (cell === 'P') {
        pacmanStart = { x, y };
        return;
      }
      if (cell === 'G') {
        ghostStarts.push({ x, y });
        return;
      }
      openCells.push({ x, y });
      row[x] = ' '; // Limpiar celda
    });
  });

  // Crear generador aleatorio seeded
  const random = createSeededRandom(`${level.id}:${seed}`);
  const reserved = new Set();
  
  // Reservar áreas alrededor de Pacman y fantasmas
  reserveArea(reserved, pacmanStart, 2, rows[0]?.length || 0, rows.length);
  ghostStarts.forEach((ghost) => reserveArea(reserved, ghost, 1, rows[0]?.length || 0, rows.length));

  // Obtener candidatos para pellets y mezclarlos
  const candidates = shuffle(openCells.filter((cell) => !reserved.has(`${cell.x},${cell.y}`)), random);
  const pelletDensity = Number(level.pelletDensity ?? 0.6);
  const powerRatio = Number(level.powerPelletRatio ?? 0.03);
  const maxPowerPellets = Math.max(2, Math.round(candidates.length * powerRatio));
  const maxPellets = Math.max(18, Math.round(candidates.length * pelletDensity));
  let pelletsPlaced = 0;
  let powerPelletsPlaced = 0;

  // Colocar pellets de poder y normales
  for (const cell of candidates) {
    if (pelletsPlaced >= maxPellets && powerPelletsPlaced >= maxPowerPellets) break;
    const key = `${cell.x},${cell.y}`;
    if (reserved.has(key)) continue;
    const row = rows[cell.y];
    if (powerPelletsPlaced < maxPowerPellets && random() > 0.78) {
      row[cell.x] = 'o'; // Pellet de poder
      powerPelletsPlaced += 1;
      continue;
    }
    if (pelletsPlaced < maxPellets) {
      row[cell.x] = '.'; // Pellet normal
      pelletsPlaced += 1;
    }
  }

  // Rellenar pellets faltantes si es necesario
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

/**
 * Parsea un nivel y extrae información del juego
 * @param {Object} level - Configuración del nivel
 * @param {string|number} seed - Semilla para reproducibilidad (por defecto es el ID del nivel)
 * @returns {Object} Objeto con información del nivel: width, height, walls, pellets, powerPellets, pacmanStart, ghostStarts
 */
function parseLevel(level, seed = level.id) {
  // Generar mapa con pellets randomizados o usar mapa predefinido
  const mapRows = level.randomizeObjects === false ? level.map : materializeLevel(level, seed);
  const walls = new Set();
  const pellets = [];
  const powerPellets = [];
  const ghosts = [];
  let pacmanStart = { x: 1, y: 1 };

  // Extraer elementos del mapa
  mapRows.forEach((row, y) => {
    [...row].forEach((cell, x) => {
      if (cell === '#') walls.add(`${x},${y}`); // Pared
      if (cell === '.') pellets.push({ x, y }); // Pellet normal
      if (cell === 'o') powerPellets.push({ x, y }); // Pellet de poder
      if (cell === 'P') pacmanStart = { x, y }; // Posición inicial de Pacman
      if (cell === 'G') ghosts.push({ x, y }); // Posiciones de fantasmas
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

// Exportar funciones y constantes
module.exports = {
  ROOM_CODE_CHARS,
  DIRECTIONS,
  LEVELS,
  parseLevel
};
