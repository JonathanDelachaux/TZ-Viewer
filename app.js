import { GALLERY, SCENES } from "./data/scenes.js";
import { Viewer360 } from "./engine/viewer.js";
import { GyroscopeController } from "./engine/gyro.js";
import { HotspotStore } from "./engine/hotspots.js";
import { HotspotEditor } from "./engine/editor.js";

const viewerElement = document.querySelector("#viewer");
const fade = document.querySelector("#fade");
const title = document.querySelector("#sceneTitle");
const gyroButton = document.querySelector("#gyroButton");
const previousButton = document.querySelector("#previousButton");
const galleryButton = document.querySelector("#galleryButton");
const nextButton = document.querySelector("#nextButton");
const loadingMessage = document.querySelector("#loadingMessage");
const errorBox = document.querySelector("#errorBox");

const viewer = new Viewer360(viewerElement);
new GyroscopeController(viewer, gyroButton);

const hotspotStore = new HotspotStore(SCENES.length);
const editor = new HotspotEditor(
  viewer,
  hotspotStore,
  SCENES.length
);

let currentIndex = 0;
let mode = "gallery";
let loading = false;

function showError(message) {
  errorBox.hidden = false;
  errorBox.textContent = message;
}

function setLoading(value) {
  loading = value;
  previousButton.disabled = value;
  nextButton.disabled = value;
  galleryButton.disabled = value || mode === "gallery";
  loadingMessage.style.opacity = value ? "1" : "0";
}

async function loadConfiguration(config, newMode) {
  if (loading) return;

  setLoading(true);
  fade.style.opacity = "1";

  await new Promise(resolve => setTimeout(resolve, 430));

  mode = newMode;
  title.textContent = config.title;
  document.title = `${config.title} — TZ Viewer`;

  try {
    await viewer.load(config);
    errorBox.hidden = true;
  } catch (error) {
    showError(
      `${error.message}\n\nVérifie que le fichier existe exactement sous ce nom dans le dossier « media ».`
    );
  } finally {
    fade.style.opacity = "0";
    setLoading(false);
    galleryButton.disabled = mode === "gallery";
  }
}

async function loadArtwork(index) {
  currentIndex = (index + SCENES.length) % SCENES.length;
  await loadConfiguration(SCENES[currentIndex], "artwork");
}

async function loadGallery() {
  await loadConfiguration(GALLERY, "gallery");
}

previousButton.addEventListener("click", () => {
  if (editor.active) return;

  if (mode === "gallery") {
    loadArtwork(SCENES.length - 1);
  } else {
    loadArtwork(currentIndex - 1);
  }
});

nextButton.addEventListener("click", () => {
  if (editor.active) return;

  if (mode === "gallery") {
    loadArtwork(0);
  } else {
    loadArtwork(currentIndex + 1);
  }
});

galleryButton.addEventListener("click", () => {
  if (!editor.active) loadGallery();
});

viewer.onClick((clientX, clientY) => {
  if (editor.active) {
    editor.handleClick(clientX, clientY);
    return;
  }

  if (mode !== "gallery") return;

  const uv = viewer.screenToUV(clientX, clientY);
  if (!uv) return;

  const sceneIndex = hotspotStore.nearest(uv);
  if (sceneIndex !== null) {
    loadArtwork(sceneIndex);
  }
});

window.addEventListener("error", event => {
  showError(
    `Une erreur JavaScript empêche le viewer de fonctionner.\n\n${event.message}`
  );
});

window.addEventListener("unhandledrejection", event => {
  const message =
    event.reason?.message ||
    String(event.reason || "Erreur inconnue");

  showError(
    `Une erreur de chargement empêche le viewer de fonctionner.\n\n${message}`
  );
});

loadGallery();
