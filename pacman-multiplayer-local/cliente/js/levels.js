const LEVELS = [
  {
    id: 1,
    name: "Nivel 1 - Monumental",
    mapName: "Más Monumental",
    background: "assets/fondo1.png",
    speed: 1.02,
    ghostSpeed: 0.76,
    powerPelletDuration: 6500,
    lives: 3,
    map: [
      "#####################",
      "#P........#........G#",
      "#.###.###.#.###.###.#",
      "#o#.....#...#.....#o#",
      "#.###.#.#####.#.###.#",
      "#.....#...G...#.....#",
      "#.###.###.#.###.###.#",
      "#...........#.......#",
      "#####################"
    ]
  },
  {
    id: 2,
    name: "Nivel 2 - Monumental de noche",
    mapName: "Más Monumental",
    background: "assets/fondo2.jpg",
    speed: 1.08,
    ghostSpeed: 1,
    powerPelletDuration: 6000,
    lives: 3,
    map: [
      "#######################",
      "#P....#.......#......G#",
      "#.###.#.#####.#.####..#",
      "#...#...#...#...#.....#",
      "###.#####.#.#####.###.#",
      "#o..#.....#.....#...#o#",
      "#.#.#.### G ###.#.#.#.#",
      "#.#.....#...#.....#...#",
      "#.#####.#####.#####.#.#",
      "#.......G.....#.......#",
      "#######################"
    ]
  },
  {
    id: 3,
    name: "Nivel 3 - Tuneles",
    mapName: "Más Monumental",
    background: "assets/hero-pacman.jpg",
    speed: 1.16,
    ghostSpeed: 1.1,
    powerPelletDuration: 5500,
    lives: 3,
    map: [
      "#########################",
      "#P......#.........#....G#",
      "#.####..#.#######.#.###.#",
      "#o...#....#.....#...#...#",
      "####.#.####.###.#####.#.#",
      "#....#......# #.......#.#",
      "#.#########.#G#.#######.#",
      "#.....#.....# #.....#...#",
      "#.###.#.#######.###.#.###",
      "#...#...#..G..#...#....o#",
      "#.#.#####.###.#####.###.#",
      "#G#.................#...#",
      "#########################"
    ]
  },
  {
    id: 4,
    name: "Nivel 4 - Presion",
    mapName: "Más Monumental",
    background: "assets/hero-pacman.jpg",
    speed: 1.22,
    ghostSpeed: 1.18,
    powerPelletDuration: 5000,
    lives: 3,
    map: [
      "###########################",
      "#P..#.......#.......#....G#",
      "###.#.#####.#.#####.#.###.#",
      "#...#.#...#...#...#.#...#.#",
      "#.###.#.#.#####.#.#.###.#.#",
      "#.....#.#...o...#.#.....#.#",
      "#.#####.#### ####.#####.#.#",
      "#.#.....#...G...#.....#...#",
      "#.#.###.#.#####.#.###.###.#",
      "#...#...#...G...#...#.....#",
      "#.###.#####.#.#####.###.#.#",
      "#o......G...#.........#...#",
      "###########################"
    ]
  },
  {
    id: 5,
    name: "Nivel 5 - Final",
    mapName: "Más Monumental",
    background: "assets/hero-pacman.jpg",
    speed: 1.28,
    ghostSpeed: 1.28,
    powerPelletDuration: 4500,
    lives: 3,
    map: [
      "#############################",
      "#P....#.........#.........G.#",
      "#.###.#.#######.#.#######.#.#",
      "#...#.#...#.....#.....#...#.#",
      "###.#.###.#.#########.#.###.#",
      "#...#.....#.....o.....#.....#",
      "#.#######.##### # #####.###.#",
      "#.#.....#.....#G#.....#...#.#",
      "#.#.###.#####.# #.###.###.#.#",
      "#...#...#...G.# #...#.....#.#",
      "#.###.###.#.#######.#.#####.#",
      "#.....#...#....G....#.....#o#",
      "#.#####.###########.#####.#.#",
      "#G..........................#",
      "#############################"
    ]
  }
];

function parseLevel(level) {
  const walls = new Set();
  const pellets = [];
  const powerPellets = [];
  const ghostStarts = [];
  let pacmanStart = { x: 1, y: 1 };
  level.map.forEach((row, y) => {
    [...row].forEach((cell, x) => {
      if (cell === "#") walls.add(`${x},${y}`);
      if (cell === ".") pellets.push({ x, y });
      if (cell === "o") powerPellets.push({ x, y });
      if (cell === "P") pacmanStart = { x, y };
      if (cell === "G") ghostStarts.push({ x, y });
    });
  });
  return {
    width: Math.max(...level.map.map((row) => row.length)),
    height: level.map.length,
    walls,
    pellets,
    powerPellets,
    pacmanStart,
    ghostStarts
  };
}

