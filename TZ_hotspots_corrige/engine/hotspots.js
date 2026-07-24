/*
  TZ Viewer — hotspots corrigés pour le panorama 360°.

  Ordre réel de gauche à droite dans l'image équirectangulaire :
  06 → 07 → 08 → 09 → 10 → 01 → 02 → 03 → 04 → 05

  Le tableau 05 traverse la couture du panorama :
  sa zone est donc divisée entre le bord droit et le bord gauche.
*/

const WIDTH = 2048;
const HEIGHT = 1024;

// Zones non chevauchantes correspondant aux panneaux colorés de la galerie.
// Format : [x1, y1, x2, y2] dans l'image 00-galerie.png.
const ZONES = [
  // 01 — grand tableau cyan, au centre
  { scene: 0, rects: [[803, 390, 1124, 610]] },

  // 02 — petit tableau jaune
  { scene: 1, rects: [[1124, 390, 1226, 610]] },

  // 03 — deux petites œuvres brunes
  { scene: 2, rects: [[1226, 390, 1374, 610]] },

  // 04 — grand tableau vert
  { scene: 3, rects: [[1374, 375, 1857, 620]] },

  // 05 — grand tableau rouge, coupé par la couture du 360°
  { scene: 4, rects: [[1857, 390, 2048, 610], [0, 390, 113, 610]] },

  // 06 — panneau beige clair
  { scene: 5, rects: [[113, 390, 210, 610]] },

  // 07 — panneau ocre
  { scene: 6, rects: [[210, 390, 312, 610]] },

  // 08 — grand panneau bleu
  { scene: 7, rects: [[312, 375, 588, 620]] },

  // 09 — panneau vert
  { scene: 8, rects: [[588, 390, 720, 610]] },

  // 10 — panneau rose
  { scene: 9, rects: [[720, 390, 803, 610]] }
];

function uvToPixel(uv) {
  return {
    x: uv.u * WIDTH,
    y: (1 - uv.v) * HEIGHT
  };
}

function contains(rect, x, y, margin = 8) {
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
