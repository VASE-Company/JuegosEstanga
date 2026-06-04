const LEVELS = [
  {
    id: 1,
    name: "Nivel 1 - Monumental",
    mapName: "Más Monumental / tranquilo",
    background: "assets/images/backgrounds/fondo1.png",
    speed: 1.02,
    ghostSpeed: 0.52,
    powerPelletDuration: 8200,
    lives: 3,
    map: [
      "#####################",
      "#P...o....#...o....G#",
      "#.###.###.#.###.###.#",
      "#o#.....#...#.....#o#",
      "#.###.#.#####.#.###.#",
      "#.....#...G...#.....#",
      "#.###.###.#.###.###.#",
      "#....o......#....o..#",
      "######################"
    ]
  },
  {
    id: 2,
    name: "Nivel 2 - Monumental de noche",
    mapName: "Más Monumental / noche",
    background: "assets/images/backgrounds/fondo2.jpg",
    speed: 1.08,
    ghostSpeed: 0.9,
    powerPelletDuration: 6200,
    lives: 3,
    map: [
      "#######################",
      "#P..o.#...o...#..o...G#",
      "#.###.#.#####.#.####..#",
      "#...#..o#...#..o#.....#",
      "###.#####.#.#####.###.#",
      "#o..#.....#.....#...#o#",
      "#.#.#.### G ###.#.#.#.#",
      "#.#..o..#...#..o..#...#",
      "#.#####.#####.#####.#.#",
      "#.......G.....#.......#",
      "#######################"
    ]
  },
  {
    id: 3,
    name: "Nivel 3 - Túneles",
    mapName: "Más Monumental / túneles",
    background: "assets/images/backgrounds/hero-pacman.jpg",
    speed: 1.16,
    ghostSpeed: 1.04,
    powerPelletDuration: 5600,
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
      "#..G.................#...#",
      "#########################"
    ]
  },
  {
    id: 4,
    name: "Nivel 4 - Presión",
    mapName: "Más Monumental / presión",
    background: "assets/images/backgrounds/hero-pacman.jpg",
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
    mapName: "Más Monumental / final",
    background: "assets/images/backgrounds/hero-pacman.jpg",
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


