/*
  TZ Viewer — zones cliquables corrigées
  01 à 06 inchangés.
  07 = Dans la piscine
  08 = Bassin de la Boussole (deux peintures superposées, une seule animation)
  09 = Place des Mascarades
  10 = La Forêt
*/

const IMAGE_WIDTH = 1365;
const IMAGE_HEIGHT = 683;

const POLYGONS = [
  { scene: 0, polygons: [
    [[544,277],[621,260],[706,266],[748,299],[751,385],[694,423],[619,433],[548,395]]
  ]},
  { scene: 1, polygons: [
    [[749,282],[802,286],[823,315],[827,387],[791,417],[751,389]]
  ]},
  { scene: 2, polygons: [
    [[824,304],[860,267],[894,291],[921,320],[921,383],[884,420],[835,424],[822,389]]
  ]},
  { scene: 3, polygons: [
    [[965,263],[1063,245],[1179,262],[1220,300],[1228,386],[1185,425],[1039,430],[958,399]]
  ]},
  { scene: 4, polygons: [
    [[1238,278],[1365,266],[1365,454],[1289,443],[1242,393]],
    [[0,269],[78,276],[87,426],[40,458],[0,455]]
  ]},
  { scene: 5, polygons: [
    [[70,278],[105,282],[110,354],[99,384],[82,406],[67,375]]
  ]},

  // 07 — Dans la piscine
  { scene: 6, polygons: [
    [[101,272],[145,276],[143,365],[126,409],[102,397],[91,340]]
  ]},

  // 08 — Bassin de la Boussole
  // Les deux peintures superposées ouvrent la même animation.
  { scene: 7, polygons: [
    [[144,264],[258,254],[368,260],[379,350],[364,421],[306,446],[178,440],[136,386]],
    [[155,286],[261,278],[359,282],[365,346],[347,401],[297,424],[188,418],[149,374]]
  ]},

  // 09 — Place des Mascarades
  { scene: 8, polygons: [
    [[388,245],[432,239],[469,258],[478,350],[470,404],[443,431],[404,409],[387,351]]
  ]},

  // 10 — La Forêt
  { scene: 9, polygons: [
    [[475,260],[518,260],[535,294],[536,371],[518,408],[490,421],[473,382]]
  ]}
];

function pointInPolygon(x, y, polygon) {
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];

    const intersects =
      (yi > y) !== (yj > y) &&
      x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;

    if (intersects) inside = !inside;
  }

  return inside;
}

function sceneAtPixel(x, y) {
  for (const hotspot of POLYGONS) {
    for (const polygon of hotspot.polygons) {
      if (pointInPolygon(x, y, polygon)) return hotspot.scene;
    }
  }
  return null;
}

export class HotspotStore {
  constructor(sceneCount) {
    this.sceneCount = sceneCount;
    this.storageKey = "tz-viewer-hotspots-v2";
    this.points = this.load();
  }

  load() {
    try {
      const value = JSON.parse(localStorage.getItem(this.storageKey) || "[]");
      return Array.isArray(value)
        ? value.filter(point =>
            Number.isInteger(point.scene) &&
            Number.isFinite(point.u) &&
            Number.isFinite(point.v)
          ).slice(0, this.sceneCount)
        : [];
    } catch {
      return [];
    }
  }

  save() {
    localStorage.setItem(this.storageKey, JSON.stringify(this.points));
  }

  clear() {
    this.points = [];
    localStorage.removeItem(this.storageKey);
  }

  add(uv) {
    if (this.points.length >= this.sceneCount) return false;
    this.points.push({
      scene: this.points.length,
      u: uv.u,
      v: uv.v
    });
    return true;
  }

  undo() {
    this.points.pop();
  }

  nearest(uv) {
    if (!uv) return null;

    // Orientation correspondant à l’image panoramique actuellement utilisée.
    // On ne teste plus les versions miroir, qui provoquaient les décalages.
    const x = uv.u * IMAGE_WIDTH;
    const y = (1 - uv.v) * IMAGE_HEIGHT;

    return sceneAtPixel(x, y);
  }

  export() {
    const blob = new Blob(
      [JSON.stringify(this.points, null, 2)],
      { type: "application/json" }
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "hotspots.json";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }
}
