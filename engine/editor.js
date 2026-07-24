export class HotspotEditor {
  constructor(viewer, store, sceneCount) {
    this.viewer = viewer;
    this.store = store;
    this.sceneCount = sceneCount;
    this.active = false;

    this.panel = document.querySelector("#editorPanel");
    this.instruction = document.querySelector("#editorInstruction");
    this.layer = document.querySelector("#hotspotLayer");

    document
      .querySelector("#undoHotspotButton")
      .addEventListener("click", () => {
        this.store.undo();
        this.render();
      });

    document
      .querySelector("#saveHotspotsButton")
      .addEventListener("click", () => {
        if (this.store.points.length !== this.sceneCount) {
          alert(`Il faut placer exactement ${this.sceneCount} liens.`);
          return;
        }

        this.store.save();
        alert("Les liens sont enregistrés sur cet appareil.");
        this.close();
      });

    document
      .querySelector("#exportHotspotsButton")
      .addEventListener("click", () => {
        if (this.store.points.length !== this.sceneCount) {
          alert(`Il faut placer exactement ${this.sceneCount} liens.`);
          return;
        }

        this.store.save();
        this.store.export();
      });

    document
      .querySelector("#clearHotspotsButton")
      .addEventListener("click", () => {
        if (!confirm("Effacer tous les liens enregistrés ?")) return;
        this.store.clear();
        this.render();
      });

    document
      .querySelector("#closeEditorButton")
      .addEventListener("click", () => this.close());

    window.addEventListener("keydown", event => {
      if (event.key === "F2") {
        event.preventDefault();
        this.active ? this.close() : this.open();
      }
    });

    this.viewer.onFrame(() => this.updateMarkerPositions());
  }

  open() {
    this.active = true;
    this.panel.hidden = false;
    this.render();
  }

  close() {
    this.active = false;
    this.panel.hidden = true;
    this.layer.replaceChildren();
  }

  handleClick(clientX, clientY) {
    if (!this.active) return false;
    if (this.store.points.length >= this.sceneCount) return true;

    const uv = this.viewer.screenToUV(clientX, clientY);
    if (!uv) return true;

    this.store.add(uv);
    this.render();
    return true;
  }

  render() {
    this.layer.replaceChildren();

    const next = this.store.points.length + 1;

    this.instruction.innerHTML =
      this.store.points.length < this.sceneCount
        ? `Clique au centre de la zone <strong>${String(next).padStart(2, "0")}</strong>.`
        : `Les ${this.sceneCount} liens sont placés. Clique sur <strong>Enregistrer</strong> ou <strong>Exporter</strong>.`;

    for (let index = 0; index < this.store.points.length; index++) {
      const marker = document.createElement("div");
      marker.className = "hotspot-marker";
      marker.textContent = String(index + 1).padStart(2, "0");
      marker.dataset.index = String(index);
      this.layer.appendChild(marker);
    }

    this.updateMarkerPositions();
  }

  updateMarkerPositions() {
    if (!this.active) return;

    const markers = [...this.layer.children];

    markers.forEach((marker, index) => {
      const point = this.store.points[index];
      const screen = this.viewer.uvToScreen(point);

      if (!screen) {
        marker.style.display = "none";
        return;
      }

      marker.style.display = "grid";
      marker.style.left = `${screen.x}px`;
      marker.style.top = `${screen.y}px`;
    });
  }
}
