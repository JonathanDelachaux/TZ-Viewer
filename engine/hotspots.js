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

  nearest(uv, radius = 0.085) {
    if (this.points.length !== this.sceneCount) return null;

    let best = null;

    for (const point of this.points) {
      const direct = Math.abs(uv.u - point.u);
      const wrapped = 1 - direct;
      const du = Math.min(direct, wrapped);
      const dv = Math.abs(uv.v - point.v);
      const distance = Math.hypot(du, dv);

      if (!best || distance < best.distance) {
        best = { scene: point.scene, distance };
      }
    }

    return best && best.distance < radius ? best.scene : null;
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
