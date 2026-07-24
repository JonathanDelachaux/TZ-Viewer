import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

export class GyroscopeController {
  constructor(viewer, button) {
    this.viewer = viewer;
    this.button = button;
    this.enabled = false;
    this.orientation = null;
    this.screenAngle = 0;

    this.zee = new THREE.Vector3(0, 0, 1);
    this.euler = new THREE.Euler();
    this.q0 = new THREE.Quaternion();
    this.q1 = new THREE.Quaternion(
      -Math.sqrt(0.5),
      0,
      0,
      Math.sqrt(0.5)
    );

    this.onOrientation = event => {
      this.orientation = event;
      this.update();
    };

    this.updateScreenAngle = () => {
      this.screenAngle =
        window.screen?.orientation?.angle ??
        window.orientation ??
        0;
    };

    this.button.addEventListener("click", () => {
      this.enabled ? this.disable() : this.enable();
    });

    window.addEventListener("orientationchange", this.updateScreenAngle);
    window.screen?.orientation?.addEventListener?.(
      "change",
      this.updateScreenAngle
    );
    this.updateScreenAngle();
  }

  async enable() {
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

      window.addEventListener(
        "deviceorientation",
        this.onOrientation,
        true
      );

      this.enabled = true;
      this.button.classList.add("active");
      this.button.textContent = "Gyroscope activé";
    } catch (error) {
      alert(error.message || "Le gyroscope n’a pas pu être activé.");
    }
  }

  disable() {
    this.enabled = false;
    this.orientation = null;
    window.removeEventListener(
      "deviceorientation",
      this.onOrientation,
      true
    );
    this.viewer.setGyroQuaternion(null);
    this.button.classList.remove("active");
    this.button.textContent = "Activer le gyroscope";
  }

  update() {
    if (!this.enabled || !this.orientation) return;

    const alpha = THREE.MathUtils.degToRad(this.orientation.alpha || 0);
    const beta = THREE.MathUtils.degToRad(this.orientation.beta || 0);
    const gamma = THREE.MathUtils.degToRad(this.orientation.gamma || 0);
    const orient = THREE.MathUtils.degToRad(this.screenAngle || 0);

    const quaternion = new THREE.Quaternion();
    this.euler.set(beta, alpha, -gamma, "YXZ");
    quaternion.setFromEuler(this.euler);
    quaternion.multiply(this.q1);
    quaternion.multiply(
      this.q0.setFromAxisAngle(this.zee, -orient)
    );

    this.viewer.setGyroQuaternion(quaternion);
  }
}
