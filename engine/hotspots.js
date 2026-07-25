/*
  TZ Viewer — nouvelle galerie simplifiée.

  Les 10 zones sont disposées de gauche à droite, exactement comme
  sur la nouvelle image de galerie :

  1 rouge, 2 vert, 3 violet, 4 jaune, 5 magenta,
  6 cyan, 7 gris clair, 8 rouille, 9 noir, 10 blanc.

  Les zones sont volontairement très larges pour être faciles à toucher
  sur ordinateur, tablette et smartphone.
*/

const WIDTH = 2048;
const HEIGHT = 1024;

/*
  Limites horizontales relevées sur l'image
  galerie-couleurs-et-numéros.png.

  Chaque bande correspond à une scène :
  scène 0 = tableau 1, scène 1 = tableau 2, etc.
*/
const ZONES = [
  { scene: 0, x1:    0, x2:  284 }, // 1 rouge
  { scene: 1, x1:  284, x2:  394 }, // 2 vert
  { scene: 2, x1:  394, x2:  612 }, // 3 violet
  { scene: 3, x1:  612, x2: 1016 }, // 4 jaune
  { scene: 4, x1: 1016, x2: 1303 }, // 5 magenta
  { scene: 5, x1: 1303, x2: 1373 }, // 6 cyan
  { scene: 6, x1: 1373, x2: 1446 }, // 7 gris clair
  { scene: 7, x1: 1446, x2: 1768 }, // 8 rouille
  { scene: 8, x1: 1768, x2: 1932 }, // 9 noir
  { scene: 9, x1: 1932, x2: 2048 }  // 10 blanc
];

// Grande hauteur cliquable : mur, tableau, couleur et numéro au sol.
const Y_MIN = 315;
const Y_MAX = 650;

function uvToPixel(uv) {
  return {
    x: uv.u * WIDTH,
    y: (1 - uv.v) * HEIGHT
  };
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

    if (y < Y_MIN || y > Y_MAX) {
      return null;
    }

    for (const zone of ZONES) {
      if (
        zone.scene < this.sceneCount &&
        x >= zone.x1 &&
        x < zone.x2
      ) {
        return zone.scene;
      }
    }

    return null;
  }

  export() {}
}
