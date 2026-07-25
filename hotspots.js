/*
  TZ Viewer — zones de clic fixes pour la galerie 360°.

  Ordre correct dans le panorama :
  06 → 07 → 08 → 09 → 10 → 01 → 02 → 03 → 04 → 05

  Le tableau 05 traverse la couture du panorama :
  sa zone existe donc à droite ET à gauche de l'image.
*/

const WIDTH = 2048;
const HEIGHT = 1024;

const ZONES = [
  // 01 — L’Atelier de Malkos : grand tableau central
  { scene: 0, rects: [[706, 365, 932, 500]] },

  // 02 — Argyrisme vs Vitiligo : petit tableau jaune
  { scene: 1, rects: [[952, 397, 1002, 447]] },

  // 03 — Mardi Gras : les deux petites œuvres brunes
  { scene: 2, rects: [[1058, 393, 1120, 449]] },

  // 04 — Autour de Malkos : grand tableau vert
  { scene: 3, rects: [[1260, 337, 1528, 503]] },

  // 05 — Fresque de Malkos : tableau rouge traversant la couture 360°
  { scene: 4, rects: [[1600, 350, 2048, 525], [0, 350, 90, 525]] },

  // 06 — Au-dessus de la piscine : tableau beige clair
  { scene: 5, rects: [[120, 392, 170, 462]] },

  // 07 — Dans la piscine : petit tableau ocre horizontal
  { scene: 6, rects: [[195, 395, 268, 452]] },

  // 08 — Le Bassin de la Boussole : grand tableau bleu
  { scene: 7, rects: [[260, 355, 435, 475]] },

  // 09 — Place des Mascarades : petit tableau vert
  { scene: 8, rects: [[545, 390, 607, 458]] },

  // 10 — La Forêt : petit tableau rose
  { scene: 9, rects: [[612, 390, 665, 458]] }
];

function uvToPixel(uv) {
  return {
    x: uv.u * WIDTH,
    y: (1 - uv.v) * HEIGHT
  };
}

function contains(rect, x, y, margin = 22) {
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
