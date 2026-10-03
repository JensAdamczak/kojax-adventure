import { levelText, biomeText } from "./text.js";

// Text belongs in text.js. Terrain is a compact occupancy mask, not a route.
// Bit (row * size + column) is 1 for safe ground; bit zero is the top-left.
// This is a data format, not encryption. Standing objects are defined separately.
export const key = (position) => position.join(",");
const specs = [
  {
    biome: "water",
    size: 4,
    terrain: "36c8",
    start: [0, 3],
    end: [3, 0],
    objects: [],
    prop: null,
    jump: false,
  },
  {
    biome: "water",
    size: 5,
    terrain: "721c3f",
    start: [0, 4],
    end: [4, 0],
    objects: [],
    prop: null,
    jump: false,
  },
  {
    biome: "beach",
    size: 5,
    terrain: "13881c",
    start: [0, 4],
    end: [4, 0],
    objects: [
      [0, 2],
      [2, 2],
      [3, 3],
    ],
    prop: "driftwood",
    jump: false,
  },
  {
    biome: "beach",
    size: 6,
    terrain: "4708003c",
    start: [0, 5],
    end: [5, 0],
    objects: [
      [0, 3],
      [2, 3],
      [3, 4],
    ],
    prop: "driftwood",
    jump: true,
  },
  {
    biome: "jungle",
    size: 7,
    terrain: "1059039d06168",
    start: [0, 6],
    end: [6, 0],
    objects: [
      [4, 1],
      [1, 2],
      [3, 4],
      [4, 4],
    ],
    prop: "palm",
    jump: true,
  },
  {
    biome: "jungle",
    size: 7,
    terrain: "10748124449c0",
    start: [0, 6],
    end: [6, 0],
    objects: [
      [5, 1],
      [5, 2],
      [1, 4],
      [5, 4],
    ],
    prop: "palm",
    jump: true,
  },
  {
    biome: "lava",
    size: 7,
    terrain: "2e20c23041da",
    start: [0, 6],
    end: [6, 0],
    objects: [
      [3, 2],
      [5, 2],
      [1, 5],
      [5, 5],
    ],
    prop: "basalt",
    jump: true,
  },
  {
    biome: "lava",
    size: 8,
    terrain: "18364069c8284d0",
    start: [0, 7],
    end: [7, 0],
    objects: [
      [5, 1],
      [6, 1],
      [2, 2],
      [4, 4],
      [5, 4],
    ],
    prop: "basalt",
    jump: true,
  },
  {
    biome: "snow",
    size: 8,
    terrain: "116f700804700486",
    start: [0, 7],
    end: [7, 0],
    objects: [
      [3, 1],
      [5, 1],
      [6, 1],
      [1, 2],
      [3, 5],
    ],
    prop: "ice",
    jump: true,
  },
  {
    biome: "snow",
    size: 9,
    terrain: "1c1b4804241109b0100",
    start: [0, 8],
    end: [8, 0],
    objects: [
      [2, 1],
      [6, 2],
      [4, 3],
      [6, 3],
      [2, 5],
      [6, 5],
    ],
    prop: "ice",
    jump: true,
  },
];

export const levels = specs.map((spec, id) => {
  const mask = BigInt(`0x${spec.terrain}`);
  const ground = [];
  for (let cell = 0; cell < spec.size * spec.size; cell++) {
    if ((mask & (1n << BigInt(cell))) !== 0n) {
      ground.push([cell % spec.size, Math.floor(cell / spec.size)]);
    }
  }
  return {
    ...spec,
    id,
    name: levelText[id + 1].name,
    story: levelText[id + 1].story,
    ground,
    objects: spec.objects.map((at) => ({ at, movable: true })),
  };
});
export const biomeNames = biomeText;
