/*
  TZ Viewer — zones cliquables de la galerie
  Image de référence : 00-galerie.png, 1365 × 683
  Numérotation mise à jour :
  01 Atelier, 02 Argyrisme, 03 Mardi Gras, 04 Autour,
  05 Fresque, 06 Au-dessus piscine, 07 Dans piscine,
  08 Bassin, 09 Mascarades, 10 Forêt.
*/

const IMAGE_WIDTH = 1365;
const IMAGE_HEIGHT = 683;

const POLYGONS = [
  {
    scene: 0,
    polygons: [
      [[544,277],[621,260],[706,266],[748,299],[751,385],[694,423],[619,433],[548,395]]
    ]
  },
  {
    scene: 1,
    polygons: [
      [[749,282],[802,286],[823,315],[827,387],[791,417],[751,389]]
    ]
  },
  {
    scene: 2,
    polygons: [
      [[824,304],[860,267],[894,291],[921,320],[921,383],[884,420],[835,424],[822,389]]
    ]
  },
  {
    scene: 3,
    polygons: [
      [[965,263],[1063,245],[1179,262],[1220,300],[1228,386],[1185,425],[1039,430],[958,399]]
    ]
  },
  {
    scene: 4,
    polygons: [
      [[1238,278],[1365,266],[1365,454],[1289,443],[1242,393]],
      [[0,269],[78,276],[87,426],[40,458],[0,455]]
    ]
  },
  {
    scene: 5,
    polygons: [
      [[73,282],[108,286],[109,355],[94,386],[79,401],[69,372]]
    ]
  },
  {
    scene: 6,
    polygons: [
      [[103,275],[143,278],[139,363],[123,405],[102,392],[92,341]]
    ]
  },
  {
    scene: 7,
    polygons: [
      [[143,273],[365,258],[376,361],[357,421],[302,443],[178,436],[137,385]]
    ]
  },
  {
    scene: 8,
    polygons: [
      [[392,250],[430,242],[466,260],[475,352],[469,400],[442,426],[406,405],[390,353]]
    ]
  },
  {
    scene: 9,
    polygons: [
      [[479,266],[514,264],[532,298],[532,369],[515,405],[492,416],[476,380]]
    ]
  }
];

function pointInPolygon(x, y, polygon) {
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0];
    const yi = polygon[i][1];
    const xj = polygon[j][0];
    const yj = polygon[j][1];

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
    this.storageKey = "tz-viewer-hotspots-v2";
    this.points = this.load();
  }

  load() {
    try {
      const value = JSON.parse(localStorage.getItem(this.storageKey) || "[]");
      return Array.isArray(value)
        ? value
            .filter(point =>
              Number.isInteger(point.scene) &&
              Number.isFinite(point.u) &&
              Number.isFinite(point.v)
            )
            .slice(0, this.sceneCount)
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

    /*
      Three.js peut présenter l'axe horizontal ou vertical inversé
      selon l'orientation de la sphère. On teste les quatre
      correspondances possibles avec l'image panoramique.
    */
    const candidates = [
      [uv.u * IMAGE_WIDTH, (1 - uv.v) * IMAGE_HEIGHT],
      [(1 - uv.u) * IMAGE_WIDTH, (1 - uv.v) * IMAGE_HEIGHT],
      [uv.u * IMAGE_WIDTH, uv.v * IMAGE_HEIGHT],
      [(1 - uv.u) * IMAGE_WIDTH, uv.v * IMAGE_HEIGHT]
    ];

    for (const [x, y] of candidates) {
      const scene = sceneAtPixel(x, y);
      if (scene !== null) return scene;
    }

    return null;
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
