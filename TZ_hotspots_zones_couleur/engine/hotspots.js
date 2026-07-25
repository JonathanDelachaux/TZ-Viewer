/*
  TZ Viewer — hotspots basés sur les GRANDES ZONES COLORÉES
  de l'image de repérage 360° fournie par Jonathan/Zoé.

  Les coordonnées sont normalisées (0 à 1) : elles restent valables
  quelle que soit la résolution exacte de 00-galerie.png.

  Correspondance :
  01 -> scène 0
  02 -> scène 1
  03 -> scène 2
  04 -> scène 3
  05 -> scène 4 (zone rouge coupée entre les deux bords)
  06 -> scène 5 (beige clair)
  07 -> scène 6 (ocre)
  08 -> scène 7 (bleu)
  09 -> scène 8 (vert)
  10 -> scène 9 (rose)
*/

const REFERENCE_WIDTH = 1367;
const REFERENCE_HEIGHT = 683;

const p = (x, y) => [x / REFERENCE_WIDTH, y / REFERENCE_HEIGHT];

const ZONES = [
  // 01 — grande zone cyan centrale
  {
    scene: 0,
    polygons: [[
      p(548, 279), p(621, 267), p(688, 267), p(749, 282),
      p(751, 407), p(717, 430), p(589, 430), p(541, 409)
    ]]
  },

  // 02 — zone jaune
  {
    scene: 1,
    polygons: [[
      p(749, 281), p(794, 282), p(811, 290), p(816, 408),
      p(794, 438), p(755, 424)
    ]]
  },

  // 03 — zone brune
  {
    scene: 2,
    polygons: [[
      p(817, 286), p(861, 268), p(903, 292), p(918, 321),
      p(919, 392), p(897, 430), p(850, 456), p(819, 424)
    ]]
  },

  // 04 — grande zone verte
  {
    scene: 3,
    polygons: [[
      p(966, 267), p(1062, 242), p(1164, 257), p(1211, 274),
      p(1235, 403), p(1193, 440), p(1004, 430), p(954, 411)
    ]]
  },

  // 05 — grande zone rouge traversant la couture du panorama
  {
    scene: 4,
    polygons: [
      [
        p(1245, 278), p(1367, 266), p(1367, 453),
        p(1284, 452), p(1277, 421), p(1238, 410)
      ],
      [
        p(0, 268), p(77, 273), p(86, 420),
        p(50, 454), p(0, 454)
      ]
    ]
  },

  // 06 — zone beige clair, étroite
  {
    scene: 5,
    polygons: [[
      p(78, 274), p(91, 267), p(105, 272),
      p(106, 388), p(95, 423), p(84, 414)
    ]]
  },

  // 07 — zone ocre, juste à droite du 06
  {
    scene: 6,
    polygons: [[
      p(105, 272), p(139, 278), p(141, 413),
      p(124, 449), p(106, 389)
    ]]
  },

  // 08 — grande zone bleue
  {
    scene: 7,
    polygons: [[
      p(143, 278), p(230, 260), p(362, 257), p(376, 389),
      p(351, 420), p(174, 440), p(139, 414)
    ]]
  },

  // 09 — zone verte étroite
  {
    scene: 8,
    polygons: [[
      p(392, 282), p(423, 274), p(478, 296),
      p(478, 408), p(447, 432), p(408, 416)
    ]]
  },

  // 10 — zone rose
  {
    scene: 9,
    polygons: [[
      p(488, 276), p(520, 277), p(538, 296),
      p(539, 414), p(512, 438), p(486, 409), p(479, 347)
    ]]
  }
];

function pointInPolygon(u, imageY, polygon) {
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];

    const crosses =
      (yi > imageY) !== (yj > imageY) &&
      u < ((xj - xi) * (imageY - yi)) / (yj - yi) + xi;

    if (crosses) inside = !inside;
  }

  return inside;
}

export class HotspotStore {
  constructor(sceneCount) {
    this.sceneCount = sceneCount;
    this.points = [];
  }

  load() {
    return [];
  }

  save() {}

  clear() {
    this.points = [];
    try {
      localStorage.removeItem("tz-viewer-hotspots-v2");
      localStorage.removeItem("tz-viewer-hotspots-v3");
    } catch {}
  }

  add() {
    return false;
  }

  undo() {}

  nearest(uv) {
    if (!uv) return null;

    const u = uv.u;
    const imageY = 1 - uv.v;

    for (const zone of ZONES) {
      if (zone.scene >= this.sceneCount) continue;

      for (const polygon of zone.polygons) {
        if (pointInPolygon(u, imageY, polygon)) {
          return zone.scene;
        }
      }
    }

    return null;
  }

  export() {}
}
