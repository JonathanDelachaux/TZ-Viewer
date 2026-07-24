import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { GALLERY, SCENES } from "./scenes.js";

const viewer = document.querySelector("#viewer");
const fade = document.querySelector("#fade");
const title = document.querySelector("#sceneTitle");
const gyroButton = document.querySelector("#gyroButton");
const previousButton = document.querySelector("#previousButton");
const galleryButton = document.querySelector("#galleryButton");
const nextButton = document.querySelector("#nextButton");
const loadingMessage = document.querySelector("#loadingMessage");
const errorBox = document.querySelector("#errorBox");

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ antialias: true });
} catch (error) {
  showFatalError("Le navigateur n’a pas pu démarrer l’affichage 3D.", error);
  throw error;
}

renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
viewer.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const rig = new THREE.Object3D();
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.01,
  2000
);
rig.add(camera);
scene.add(rig);

const geometry = new THREE.SphereGeometry(100, 64, 40);
geometry.scale(-1, 1, 1);

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

let sphere = null;
let texture = null;
let video = null;
let currentIndex = 0;
let mode = "gallery";
let loading = false;

let yaw = 0;
let pitch = 0;
let dragging = false;
let pointerStartX = 0;
let pointerStartY = 0;
let previousX = 0;
let previousY = 0;
let pointerMoved = false;
let pinchDistance = 0;

let gyroEnabled = false;
let deviceOrientation = null;
let screenAngle = 0;

const zee = new THREE.Vector3(0, 0, 1);
const euler = new THREE.Euler();
const q0 = new THREE.Quaternion();
const q1 = new THREE.Quaternion(
  -Math.sqrt(0.5),
  0,
  0,
  Math.sqrt(0.5)
);

/*
  Centres horizontaux des dix numéros visibles dans 00-galerie.png.
  La détection utilise également la position miroir afin de rester
  compatible avec l’orientation interne de la sphère.
*/
const GALLERY_IMAGE_WIDTH = 2048;
const GALLERY_IMAGE_HEIGHT = 1024;

/*
  Zones mesurées sur l’image annotée fournie par Jonathan.
  Coordonnées en pixels sur le panorama 2048 × 1024.
  Les zones 05 traversent la couture gauche/droite du panorama.
*/
const GALLERY_POLYGONS = [
  {
    scene: 0,
    polygons: [
      [[825,409],[948,389],[1135,390],[1141,593],[974,640],[829,592]]
    ]
  },
  {
    scene: 1,
    polygons: [
      [[1135,414],[1218,430],[1237,618],[1178,630],[1138,582]]
    ]
  },
  {
    scene: 2,
    polygons: [
      [[1244,476],[1299,403],[1353,442],[1398,480],[1397,580],[1298,638],[1243,608]]
    ]
  },
  {
    scene: 3,
    polygons: [
      [[1474,370],[1605,362],[1774,390],[1848,459],[1865,589],[1774,636],[1459,604]]
    ]
  },
  {
    scene: 4,
    polygons: [
      [[1914,400],[2048,390],[2048,632],[1944,619]],
      [[0,400],[114,405],[129,625],[0,632]]
    ]
  },
  {
    scene: 5,
    polygons: [
      [[111,400],[208,414],[207,480],[113,480]],
      [[118,573],[184,573],[184,612],[118,612]]
    ]
  },
  {
    scene: 6,
    polygons: [
      [[111,480],[208,480],[210,557],[179,600],[121,589]],
      [[282,573],[339,573],[339,612],[282,612]]
    ]
  },
  {
    scene: 7,
    polygons: [
      [[218,430],[291,394],[550,382],[571,580],[508,653],[319,670],[212,598]],
      [[563,573],[623,573],[623,612],[563,612]]
    ]
  },
  {
    scene: 8,
    polygons: [
      [[593,365],[645,354],[729,394],[733,558],[779,625],[683,642],[618,597]],
      [[630,573],[690,573],[690,612],[630,612]]
    ]
  },
  {
    scene: 9,
    polygons: [
      [[744,409],[789,408],[817,466],[814,585],[784,624],[739,580],[728,498]],
      [[777,573],[848,573],[848,612],[777,612]]
    ]
  }
];

function pointInPolygon(x, y, polygon) {
  let inside = false;

  for (
    let i = 0, j = polygon.length - 1;
    i < polygon.length;
    j = i++
  ) {
    const xi = polygon[i][0];
    const yi = polygon[i][1];
    const xj = polygon[j][0];
    const yj = polygon[j][1];

    const intersects =
      yi > y !== yj > y &&
      x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;

    if (intersects) inside = !inside;
  }

  return inside;
}

function galleryArtworkFromUV(uv) {
  if (!uv) return null;

  const x = uv.x * GALLERY_IMAGE_WIDTH;
  const y = (1 - uv.y) * GALLERY_IMAGE_HEIGHT;

  for (const hotspot of GALLERY_POLYGONS) {
    for (const polygon of hotspot.polygons) {
      if (pointInPolygon(x, y, polygon)) {
        return hotspot.scene;
      }
    }
  }

  return null;
}

function showFatalError(message, error = null) {
  const details = error?.message ? `\n\nDétail : ${error.message}` : "";
  errorBox.hidden = false;
  errorBox.textContent = message + details;
  loadingMessage.style.display = "none";
}

window.addEventListener("error", event => {
  showFatalError("Une erreur JavaScript empêche le viewer de fonctionner.", event.error);
});

window.addEventListener("unhandledrejection", event => {
  showFatalError("Une erreur de chargement empêche le viewer de fonctionner.", event.reason);
});

function setLoading(value) {
  loading = value;
  previousButton.disabled = value;
  nextButton.disabled = value;
  galleryButton.disabled = value || mode === "gallery";
  loadingMessage.style.opacity = value ? "1" : "0";
}

function disposeCurrentMedia() {
  if (video) {
    video.pause();
    video.removeAttribute("src");
    video.load();
    video = null;
  }

  if (texture) {
    texture.dispose();
    texture = null;
  }

  if (sphere) {
    scene.remove(sphere);
    sphere.material.dispose();
    sphere = null;
  }
}

function loadPhoto(file) {
  return new Promise((resolve, reject) => {
    new THREE.TextureLoader().load(
      file,
      loadedTexture => {
        loadedTexture.colorSpace = THREE.SRGBColorSpace;
        resolve(loadedTexture);
      },
      undefined,
      () => reject(new Error(`Impossible de charger la photo : ${file}`))
    );
  });
}

function loadVideo(file) {
  return new Promise((resolve, reject) => {
    const element = document.createElement("video");
    element.src = file;
    element.crossOrigin = "anonymous";
    element.loop = true;
    element.muted = true;
    element.defaultMuted = true;
    element.volume = 0;
    element.playsInline = true;
    element.preload = "auto";

    const ready = async () => {
      try {
        await element.play();
      } catch {
        // Une interaction ultérieure relancera la lecture si le navigateur la bloque.
      }

      const loadedTexture = new THREE.VideoTexture(element);
      loadedTexture.colorSpace = THREE.SRGBColorSpace;
      loadedTexture.minFilter = THREE.LinearFilter;
      loadedTexture.magFilter = THREE.LinearFilter;
      video = element;
      resolve(loadedTexture);
    };

    element.addEventListener("canplay", ready, { once: true });
    element.addEventListener(
      "error",
      () => reject(new Error(`Impossible de charger la vidéo : ${file}`)),
      { once: true }
    );
    element.load();
  });
}

async function loadConfiguration(configuration, newMode) {
  if (loading) return;

  setLoading(true);
  fade.style.opacity = "1";
  await new Promise(resolve => setTimeout(resolve, 430));

  disposeCurrentMedia();
  mode = newMode;
  yaw = THREE.MathUtils.degToRad(configuration.startYaw || 0);
  pitch = 0;
  title.textContent = configuration.title;
  document.title = `${configuration.title} — Galerie 360`;

  try {
    texture =
      configuration.type === "video"
        ? await loadVideo(configuration.file)
        : await loadPhoto(configuration.file);

    sphere = new THREE.Mesh(
      geometry,
      new THREE.MeshBasicMaterial({ map: texture })
    );
    scene.add(sphere);

    errorBox.hidden = true;
  } catch (error) {
    showFatalError(
      `${error.message}\n\nVérifie que le fichier existe exactement sous ce nom dans le dossier « media ».`,
      error
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
  const returnYaw =
    mode === "artwork" ? SCENES[currentIndex].galleryYaw || 0 : GALLERY.startYaw || 0;

  await loadConfiguration(
    { ...GALLERY, startYaw: returnYaw },
    "gallery"
  );
}

function openGalleryArtworkAt(clientX, clientY) {
  if (mode !== "gallery" || !sphere || loading) return false;

  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);
  const intersection = raycaster.intersectObject(sphere, false)[0];

  if (!intersection) return false;

  const artworkIndex = galleryArtworkFromUV(intersection.uv);
  if (artworkIndex === null) return false;

  loadArtwork(artworkIndex);
  return true;
}

function setObjectQuaternion(quaternion, alpha, beta, gamma, orient) {
  euler.set(beta, alpha, -gamma, "YXZ");
  quaternion.setFromEuler(euler);
  quaternion.multiply(q1);
  quaternion.multiply(q0.setFromAxisAngle(zee, -orient));
}

function updateCameraOrientation() {
  rig.rotation.set(pitch, yaw, 0, "YXZ");

  if (!gyroEnabled || !deviceOrientation) {
    camera.quaternion.identity();
    return;
  }

  const alpha = deviceOrientation.alpha
    ? THREE.MathUtils.degToRad(deviceOrientation.alpha)
    : 0;
  const beta = deviceOrientation.beta
    ? THREE.MathUtils.degToRad(deviceOrientation.beta)
    : 0;
  const gamma = deviceOrientation.gamma
    ? THREE.MathUtils.degToRad(deviceOrientation.gamma)
    : 0;
  const orient = screenAngle
    ? THREE.MathUtils.degToRad(screenAngle)
    : 0;

  setObjectQuaternion(camera.quaternion, alpha, beta, gamma, orient);
}

function onDeviceOrientation(event) {
  deviceOrientation = event;
}

function updateScreenOrientation() {
  screenAngle =
    window.screen?.orientation?.angle ??
    window.orientation ??
    0;
}

async function enableGyroscope() {
  try {
    if (
      typeof DeviceOrientationEvent !== "undefined" &&
      typeof DeviceOrientationEvent.requestPermission === "function"
    ) {
      const permission = await DeviceOrientationEvent.requestPermission();
      if (permission !== "granted") {
        throw new Error("L’autorisation du mouvement a été refusée.");
      }
    }

    window.addEventListener("deviceorientation", onDeviceOrientation, true);
    gyroEnabled = true;
    gyroButton.classList.add("active");
    gyroButton.textContent = "Gyroscope activé";
  } catch (error) {
    gyroEnabled = false;
    gyroButton.classList.remove("active");
    gyroButton.textContent = "Activer le gyroscope";
    alert(error.message || "Le gyroscope n’a pas pu être activé.");
  }
}

function disableGyroscope() {
  gyroEnabled = false;
  deviceOrientation = null;
  window.removeEventListener("deviceorientation", onDeviceOrientation, true);
  camera.quaternion.identity();
  gyroButton.classList.remove("active");
  gyroButton.textContent = "Activer le gyroscope";
}

gyroButton.addEventListener("click", () => {
  if (gyroEnabled) {
    disableGyroscope();
  } else {
    enableGyroscope();
  }
});

previousButton.addEventListener("click", () => {
  if (mode === "gallery") {
    loadArtwork(SCENES.length - 1);
  } else {
    loadArtwork(currentIndex - 1);
  }
});

nextButton.addEventListener("click", () => {
  if (mode === "gallery") {
    loadArtwork(0);
  } else {
    loadArtwork(currentIndex + 1);
  }
});

galleryButton.addEventListener("click", loadGallery);

renderer.domElement.addEventListener("pointerdown", event => {
  dragging = true;
  pointerMoved = false;
  pointerStartX = event.clientX;
  pointerStartY = event.clientY;
  previousX = event.clientX;
  previousY = event.clientY;

  renderer.domElement.setPointerCapture(event.pointerId);

  if (video?.paused) {
    video.play().catch(() => {});
  }
});

renderer.domElement.addEventListener("pointermove", event => {
  if (!dragging) return;

  const dx = event.clientX - previousX;
  const dy = event.clientY - previousY;

  if (
    Math.hypot(
      event.clientX - pointerStartX,
      event.clientY - pointerStartY
    ) > 8
  ) {
    pointerMoved = true;
  }

  previousX = event.clientX;
  previousY = event.clientY;

  yaw -= dx * 0.0045;
  pitch -= dy * 0.0045;
  pitch = THREE.MathUtils.clamp(
    pitch,
    -Math.PI / 2.05,
    Math.PI / 2.05
  );
});

renderer.domElement.addEventListener("pointerup", event => {
  const wasClick =
    !pointerMoved &&
    Math.hypot(
      event.clientX - pointerStartX,
      event.clientY - pointerStartY
    ) <= 8;

  dragging = false;

  try {
    renderer.domElement.releasePointerCapture(event.pointerId);
  } catch {
    // Aucun problème si le pointeur a déjà été libéré.
  }

  if (wasClick) {
    openGalleryArtworkAt(event.clientX, event.clientY);
  }
});

renderer.domElement.addEventListener("pointercancel", () => {
  dragging = false;
  pointerMoved = false;
});

renderer.domElement.addEventListener(
  "wheel",
  event => {
    camera.fov = THREE.MathUtils.clamp(
      camera.fov + event.deltaY * 0.035,
      35,
      100
    );
    camera.updateProjectionMatrix();
  },
  { passive: true }
);

renderer.domElement.addEventListener(
  "touchstart",
  event => {
    if (event.touches.length === 2) {
      pinchDistance = Math.hypot(
        event.touches[0].clientX - event.touches[1].clientX,
        event.touches[0].clientY - event.touches[1].clientY
      );
    }
  },
  { passive: true }
);

renderer.domElement.addEventListener(
  "touchmove",
  event => {
    if (event.touches.length === 2) {
      const distance = Math.hypot(
        event.touches[0].clientX - event.touches[1].clientX,
        event.touches[0].clientY - event.touches[1].clientY
      );
      const delta = pinchDistance - distance;
      pinchDistance = distance;

      camera.fov = THREE.MathUtils.clamp(
        camera.fov + delta * 0.08,
        35,
        100
      );
      camera.updateProjectionMatrix();
    }
  },
  { passive: true }
);

window.addEventListener("orientationchange", updateScreenOrientation);
window.screen?.orientation?.addEventListener?.(
  "change",
  updateScreenOrientation
);
updateScreenOrientation();

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

function animate() {
  requestAnimationFrame(animate);
  updateCameraOrientation();
  renderer.render(scene, camera);
}

animate();
loadGallery();
