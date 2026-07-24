/*
  TZ Viewer — hotspots fixes, identiques sur PC et smartphone.

  Aucun localStorage n'est utilisé.
  Les zones sont directement liées aux tableaux visibles dans 00-galerie.png.

  Ordre :
  01 Atelier de Malkos
  02 Argyrisme vs Vitiligo
  03 Mardi Gras
  04 Autour de Malkos
  05 Fresque de Malkos
  06 Au-dessus de la piscine
  07 Dans la piscine
  08 Bassin de la Boussole — les deux petites peintures
  09 Place des Mascarades
  10 La Forêt
*/

// Coordonnées en pixels dans l'image 00-galerie.png (2048 × 1024).
// Une zone peut contenir plusieurs rectangles.
const WIDTH = 2048;
const HEIGHT = 1024;

const ZONES = [
  // 01 — grand tableau central
  { scene: 0, rects: [[706, 365, 932, 500]] },

  // 02 — petit tableau à droite du 01
  { scene: 1, rects: [[952, 397, 1002, 447]] },

  // 03 — deux petites œuvres voisines
  { scene: 2, rects: [[1058, 396, 1088, 449], [1090, 393, 1120, 449]] },

  // 04 — grand tableau avec Malkos
  { scene: 3, rects: [[1260, 337, 1528, 503]] },

  // 05 — grand tableau à l'extrême droite
  // La zone traverse la couture du panorama.
  { scene: 4, rects: [[1600, 367, 2048, 510], [0, 366, 86, 510]] },

  // 06 — deux tableaux superposés à gauche
  { scene: 5, rects: [[126, 407, 163, 451]] },

  // 07 — grand paysage
  { scene: 6, rects: [[270, 377, 423, 459]] },

  // 08 — les deux petites peintures : une seule animation
  { scene: 7, rects: [[553, 405, 599, 446], [620, 407, 655, 445]] },

  // 09 — petit tableau horizontal
  { scene: 8, rects: [[204, 410, 260, 438]] },

  // 10 — grand tableau à l'extrême gauche
  { scene: 9, rects: [[0, 369, 84, 507]] }
];

function uvToPixel(uv) {
  return {
    x: uv.u * WIDTH,
    y: (1 - uv.v) * HEIGHT
  };
}

function contains(rect, x, y, margin = 14) {
  const [x1, y1, x2, y2] = rect;
  return (
    x >= x1 - margin &&
    x <= x2 + margin &&
    y >= y1 - margin &&
    y <= y2 + margin
  );
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

    const { x, y } = uvToPixel(uv);

    for (const zone of ZONES) {
      if (zone.scene >= this.sceneCount) continue;

      for (const rect of zone.rects) {
        if (contains(rect, x, y)) {
          return zone.scene;
        }
      }
    }

    return null;
  }

  export() {}
}
