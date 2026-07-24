/*
  TZ Viewer — hotspots recalés sur l'image 00-galerie.png actuelle
  Dimensions réelles de l'image : 2048 × 1024

  Correspondances :
  01 Atelier de Malkos
  02 Argyrisme vs Vitiligo
  03 Mardi Gras
  04 Autour de Malkos
  05 Fresque de Malkos
  06 Au-dessus de la piscine
  07 Dans la piscine
  08 Bassin de la Boussole — deux peintures, une seule animation
  09 Place des Mascarades
  10 La Forêt
*/

const IMAGE_WIDTH = 2048;
const IMAGE_HEIGHT = 1024;

const POLYGONS = [
  // 01
  { scene: 0, polygons: [
    [[705,363],[929,358],[937,494],[708,505]]
  ]},

  // 02
  { scene: 1, polygons: [
    [[952,407],[1000,403],[1002,440],[953,444]]
  ]},

  // 03
  { scene: 2, polygons: [
    [[1052,404],[1118,398],[1122,445],[1049,447]]
  ]},

  // 04
  { scene: 3, polygons: [
    [[1256,331],[1528,348],[1530,507],[1260,500]]
  ]},

  // 05 — zone de droite
  { scene: 4, polygons: [
    [[1593,354],[2048,327],[2048,527],[1596,513]]
  ]},

  // 06 — Au-dessus de la piscine
  { scene: 5, polygons: [
    [[145,401],[194,397],[195,466],[145,470]]
  ]},

  // 07 — Dans la piscine
  { scene: 6, polygons: [
    [[270,365],[500,355],[503,494],[268,494]]
  ]},

  // 08 — Bassin de la Boussole
  // Les deux peintures superposées ouvrent la même animation.
  { scene: 7, polygons: [
    [[551,398],[606,392],[608,449],[551,450]],
    [[620,400],[657,399],[658,446],[619,446]]
  ]},

  // 09 — Place des Mascarades
  { scene: 8, polygons: [
    [[0,357],[99,355],[100,510],[0,514]]
  ]},

  // 10 — La Forêt
  { scene: 9, polygons: [
    [[204,405],[306,401],[307,439],[204,440]]
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
      if (pointInPolygon(x, y, polygon)) {
        return hotspot.scene;
      }
    }
  }

  return null;
}

export class HotspotStore {
  constructor(sceneCount) {
    this.sceneCount = sceneCount;
    this.storageKey = "tz-viewer-hotspots-v3";
    this.points = [];
  }

  load() {
    return [];
  }

  save() {}

  clear() {
    this.points = [];
    localStorage.removeItem("tz-viewer-hotspots-v2");
    localStorage.removeItem("tz-viewer-hotspots-v3");
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
