import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

export class Viewer360 {
  constructor(container) {
    this.container = container;
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.rig = new THREE.Object3D();
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.01,
      2000
    );
    this.rig.add(this.camera);
    this.scene.add(this.rig);

    this.geometry = new THREE.SphereGeometry(100, 64, 40);
    this.geometry.scale(-1, 1, 1);

    this.sphere = null;
    this.texture = null;
    this.video = null;
    this.yaw = 0;
    this.pitch = 0;
    this.gyroQuaternion = null;

    this.dragging = false;
    this.lastX = 0;
    this.lastY = 0;
    this.pointerStartX = 0;
    this.pointerStartY = 0;
    this.pointerMoved = false;
    this.pinchDistance = 0;

    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();

    this.#bindInput();
    this.#bindResize();
    this.#animate();
  }

  async load(config) {
    this.disposeMedia();
    this.yaw = THREE.MathUtils.degToRad(config.startYaw || 0);
    this.pitch = 0;

    this.texture =
      config.type === "video"
        ? await this.#loadVideo(config.file)
        : await this.#loadPhoto(config.file);

    this.sphere = new THREE.Mesh(
      this.geometry,
      new THREE.MeshBasicMaterial({ map: this.texture })
    );
    this.scene.add(this.sphere);
  }

  disposeMedia() {
    if (this.video) {
      this.video.pause();
      this.video.removeAttribute("src");
      this.video.load();
      this.video = null;
    }

    if (this.texture) {
      this.texture.dispose();
      this.texture = null;
    }

    if (this.sphere) {
      this.scene.remove(this.sphere);
      this.sphere.material.dispose();
      this.sphere = null;
    }
  }

  setGyroQuaternion(quaternion) {
    this.gyroQuaternion = quaternion ? quaternion.clone() : null;
  }

  screenToUV(clientX, clientY) {
    if (!this.sphere) return null;

    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hit = this.raycaster.intersectObject(this.sphere, false)[0];

    if (!hit?.uv) return null;

    return {
      u: Number(hit.uv.x.toFixed(6)),
      v: Number(hit.uv.y.toFixed(6))
    };
  }

  uvToScreen(uv) {
    const phi = uv.u * Math.PI * 2;
    const theta = (1 - uv.v) * Math.PI;
    const radius = 99.5;

    const point = new THREE.Vector3(
      radius * Math.cos(phi) * Math.sin(theta),
      radius * Math.cos(theta),
      radius * Math.sin(phi) * Math.sin(theta)
    );

    point.project(this.camera);

    if (point.z < -1 || point.z > 1) return null;

    return {
      x: (point.x * 0.5 + 0.5) * window.innerWidth,
      y: (-point.y * 0.5 + 0.5) * window.innerHeight
    };
  }

  onClick(callback) {
    this.clickCallback = callback;
  }

  #bindInput() {
    const canvas = this.renderer.domElement;

    canvas.addEventListener("pointerdown", event => {
      this.dragging = true;
      this.pointerMoved = false;
      this.lastX = event.clientX;
      this.lastY = event.clientY;
      this.pointerStartX = event.clientX;
      this.pointerStartY = event.clientY;
      canvas.setPointerCapture(event.pointerId);

      if (this.video?.paused) {
        this.video.play().catch(() => {});
      }
    });

    canvas.addEventListener("pointermove", event => {
      if (!this.dragging) return;

      const dx = event.clientX - this.lastX;
      const dy = event.clientY - this.lastY;

      if (
        Math.hypot(
          event.clientX - this.pointerStartX,
          event.clientY - this.pointerStartY
        ) > 8
      ) {
        this.pointerMoved = true;
      }

      this.lastX = event.clientX;
      this.lastY = event.clientY;

      this.yaw -= dx * 0.0045;
      this.pitch -= dy * 0.0045;
      this.pitch = THREE.MathUtils.clamp(
        this.pitch,
        -Math.PI / 2.05,
        Math.PI / 2.05
      );
    });

    canvas.addEventListener("pointerup", event => {
      const wasClick =
        !this.pointerMoved &&
        Math.hypot(
          event.clientX - this.pointerStartX,
          event.clientY - this.pointerStartY
        ) <= 8;

      this.dragging = false;

      try {
        canvas.releasePointerCapture(event.pointerId);
      } catch {}

      if (wasClick && this.clickCallback) {
        this.clickCallback(event.clientX, event.clientY);
      }
    });

    canvas.addEventListener("pointercancel", () => {
      this.dragging = false;
      this.pointerMoved = false;
    });

    canvas.addEventListener(
      "wheel",
      event => {
        this.camera.fov = THREE.MathUtils.clamp(
          this.camera.fov + event.deltaY * 0.035,
          35,
          100
        );
        this.camera.updateProjectionMatrix();
      },
      { passive: true }
    );

    canvas.addEventListener(
      "touchstart",
      event => {
        if (event.touches.length === 2) {
          this.pinchDistance = Math.hypot(
            event.touches[0].clientX - event.touches[1].clientX,
            event.touches[0].clientY - event.touches[1].clientY
          );
        }
      },
      { passive: true }
    );

    canvas.addEventListener(
      "touchmove",
      event => {
        if (event.touches.length === 2) {
          const distance = Math.hypot(
            event.touches[0].clientX - event.touches[1].clientX,
            event.touches[0].clientY - event.touches[1].clientY
          );
          const delta = this.pinchDistance - distance;
          this.pinchDistance = distance;

          this.camera.fov = THREE.MathUtils.clamp(
            this.camera.fov + delta * 0.08,
            35,
            100
          );
          this.camera.updateProjectionMatrix();
        }
      },
      { passive: true }
    );
  }

  #bindResize() {
    window.addEventListener("resize", () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  #animate() {
    requestAnimationFrame(() => this.#animate());

    this.rig.rotation.set(this.pitch, this.yaw, 0, "YXZ");

    if (this.gyroQuaternion) {
      this.camera.quaternion.copy(this.gyroQuaternion);
    } else {
      this.camera.quaternion.identity();
    }

    this.renderer.render(this.scene, this.camera);
    this.frameCallback?.();
  }

  onFrame(callback) {
    this.frameCallback = callback;
  }

  #loadPhoto(file) {
    return new Promise((resolve, reject) => {
      new THREE.TextureLoader().load(
        file,
        texture => {
          texture.colorSpace = THREE.SRGBColorSpace;
          resolve(texture);
        },
        undefined,
        () => reject(new Error(`Impossible de charger la photo : ${file}`))
      );
    });
  }

  #loadVideo(file) {
    return new Promise((resolve, reject) => {
      const video = document.createElement("video");
      video.src = file;
      video.loop = true;
      video.muted = true;
      video.defaultMuted = true;
      video.volume = 0;
      video.playsInline = true;
      video.preload = "auto";

      video.addEventListener(
        "canplay",
        async () => {
          try {
            await video.play();
          } catch {}

          const texture = new THREE.VideoTexture(video);
          texture.colorSpace = THREE.SRGBColorSpace;
          texture.minFilter = THREE.LinearFilter;
          texture.magFilter = THREE.LinearFilter;
          this.video = video;
          resolve(texture);
        },
        { once: true }
      );

      video.addEventListener(
        "error",
        () => reject(new Error(`Impossible de charger la vidéo : ${file}`)),
        { once: true }
      );

      video.load();
    });
  }
}
