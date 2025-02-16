/**
 * Orbit control for 3D objects. Copied and tweaked from ogl.
 */
import type { Camera, Mat4 } from "ogl";
import { Vec2, Vec3 } from "ogl";

export const MouseButton = {
  Left: 0,
  Middle: 1,
  Right: 2,
};
// eslint-disable-next-line no-redeclare
export type MouseButton = (typeof MouseButton)[keyof typeof MouseButton];
export const STATE = { NONE: -1, ROTATE: 0, DOLLY: 1, PAN: 2, DOLLY_PAN: 3 };
export const tempVec3 = new Vec3();
const tempVec2a = new Vec2();
const tempVec2b = new Vec2();

export class Orbit {
  camera: Camera;
  element: HTMLElement;
  enabled = true;
  initialized = false;

  autoRotate = false;
  autoRotateSpeed = 1.0;
  ease = 0.25;
  enablePan = true;
  enableRotate = true;
  enableZoom = true;
  inertia = 0.5;

  minDistance = 10;
  maxDistance = 80;

  minAzimuthAngle = -Infinity;
  maxAzimuthAngle = Infinity;
  minPolarAngle = 0;
  maxPolarAngle = Math.PI;

  panSpeed = 0.8;
  rotateSpeed = 0.35;
  target: Vec3;

  zoomSpeed = 1;
  zoomStyle = "dolly";

  sphericalDelta: { radius: number; phi: number; theta: number };
  sphericalTarget: { radius: number; phi: number; theta: number };
  spherical: { radius: number; phi: number; theta: number };
  panDelta: Vec3;
  offset: Vec3;

  rotateStart: Vec2;
  panStart: Vec2;
  dollyStart: Vec2;

  moved = false;
  state = STATE.NONE;
  onPan: (() => void) | null = null;
  onStateChange: ((_prevState: number, _state: number) => void) | null = null;
  mouseButtons = {
    ORBIT: MouseButton.Middle,
    ZOOM: null,
    PAN: MouseButton.Left,
  };

  // eslint-disable-next-line class-methods-use-this
  cleanupListeners: () => void = () => {};

  constructor(camera: Camera, element: HTMLElement) {
    this.camera = camera;
    this.element = element;

    this.target = new Vec3();

    this.sphericalDelta = { radius: 1, phi: 0, theta: 0 };
    this.sphericalTarget = { radius: 1, phi: 0, theta: 0 };
    this.spherical = { radius: 1, phi: 0, theta: 0 };
    this.panDelta = new Vec3();

    this.rotateStart = new Vec2();
    this.panStart = new Vec2();
    this.dollyStart = new Vec2();
    this.offset = new Vec3();

    this.forcePosition();
  }

  public setState(state: number) {
    if (this.onStateChange) {
      this.onStateChange(this.state, state);
    }
    this.state = state;
  }

  public update() {
    if (!this.initialized) {
      this.addHandlers();
      this.initialized = true;
    }
    if (this.autoRotate) {
      this.handleAutoRotate();
    }

    // apply delta
    this.sphericalTarget.radius *= this.sphericalDelta.radius;
    this.sphericalTarget.theta += this.sphericalDelta.theta;
    this.sphericalTarget.phi += this.sphericalDelta.phi;

    // apply boundaries
    this.sphericalTarget.theta = Math.max(
      this.minAzimuthAngle,
      Math.min(this.maxAzimuthAngle, this.sphericalTarget.theta)
    );
    this.sphericalTarget.phi = Math.max(
      this.minPolarAngle,
      Math.min(this.maxPolarAngle, this.sphericalTarget.phi)
    );
    this.sphericalTarget.radius = Math.max(
      this.minDistance,
      Math.min(this.maxDistance, this.sphericalTarget.radius)
    );

    // ease values
    this.spherical.phi +=
      (this.sphericalTarget.phi - this.spherical.phi) * this.ease;
    this.spherical.theta +=
      (this.sphericalTarget.theta - this.spherical.theta) * this.ease;
    this.spherical.radius +=
      (this.sphericalTarget.radius - this.spherical.radius) * this.ease;

    // apply pan to target. As offset is relative to target, it also shifts
    this.target.add(this.panDelta);

    // apply rotation to offset
    const sinPhiRadius =
      this.spherical.radius * Math.sin(Math.max(0.000001, this.spherical.phi));
    this.offset.x = sinPhiRadius * Math.sin(this.spherical.theta);
    this.offset.y = this.spherical.radius * Math.cos(this.spherical.phi);
    this.offset.z = sinPhiRadius * Math.cos(this.spherical.theta);

    // Apply updated values to object
    this.camera.position.copy(this.target).add(this.offset);
    this.camera.lookAt(this.target);

    // Apply inertia to values
    this.sphericalDelta.theta *= this.inertia;
    this.sphericalDelta.phi *= this.inertia;
    this.panDelta.multiply(this.inertia);

    // Reset scale every frame to avoid applying scale multiple times
    this.sphericalDelta.radius = 1;
  }

  // Updates internals with new position
  forcePosition() {
    this.offset.copy(this.camera.position).sub(this.target);
    this.sphericalTarget.radius = this.offset.distance();
    this.spherical.radius = this.sphericalTarget.radius;
    this.sphericalTarget.theta = Math.atan2(this.offset.x, this.offset.z);
    this.spherical.theta = this.sphericalTarget.theta;
    this.sphericalTarget.phi = Math.acos(
      Math.min(Math.max(this.offset.y / this.sphericalTarget.radius, -1), 1)
    );
    this.spherical.phi = this.sphericalTarget.phi;
    this.camera.lookAt(this.target);
  }

  getZoomScale = () => 0.95 ** this.zoomSpeed;

  panLeft = (distance: number, m: Mat4) => {
    const i = 0;
    tempVec3.set(m[i], m[i + 1], m[i + 2]);
    tempVec3.multiply(-distance);
    this.panDelta.add(tempVec3);
  };

  panUp = (distance: number, m: Mat4) => {
    const i = 4;
    tempVec3.set(m[i], m[i + 1], m[i + 2]);
    tempVec3.multiply(distance);
    this.panDelta.add(tempVec3);
  };

  pan = (deltaX: number, deltaY: number) => {
    tempVec3.copy(this.camera.position).sub(this.target);
    let targetDistance = tempVec3.distance();
    targetDistance *= Math.tan(
      (((this.camera.fov || 45) / 2) * Math.PI) / 180.0
    );
    this.panLeft(
      (2 * deltaX * targetDistance) / this.element.clientHeight,
      this.camera.worldMatrix
    );
    this.panUp(
      (2 * deltaY * targetDistance) / this.element.clientHeight,
      this.camera.worldMatrix
    );

    this.onPan?.();
  };

  dolly = (dollyScale: number) => {
    if (this.zoomStyle === "dolly") this.sphericalDelta.radius /= dollyScale;
    else {
      this.camera.fov /= dollyScale;
      if (this.camera.type === "orthographic") this.camera.orthographic();
      else this.camera.perspective();
    }
  };

  handleAutoRotate = () => {
    const angle = ((2 * Math.PI) / 60 / 60) * this.autoRotateSpeed;
    this.sphericalDelta.theta -= angle;
  };

  handleMoveRotate(x: number, y: number) {
    tempVec2a.set(x, y);
    tempVec2b.sub(tempVec2a, this.rotateStart).multiply(this.rotateSpeed);
    this.sphericalDelta.theta -=
      (2 * Math.PI * tempVec2b.x) / this.element.clientHeight;
    this.sphericalDelta.phi -=
      (2 * Math.PI * tempVec2b.y) / this.element.clientHeight;
    this.rotateStart.copy(tempVec2a);
  }

  handleMouseMoveDolly = (e: MouseEvent) => {
    tempVec2a.set(e.clientX, e.clientY);
    tempVec2b.sub(tempVec2a, this.dollyStart);
    if (tempVec2b.y > 0) {
      this.dolly(this.getZoomScale());
    } else if (tempVec2b.y < 0) {
      this.dolly(1 / this.getZoomScale());
    }
    this.dollyStart.copy(tempVec2a);
  };

  handleMovePan = (x: number, y: number) => {
    tempVec2a.set(x, y);
    tempVec2b.sub(tempVec2a, this.panStart).multiply(this.panSpeed);
    this.pan(tempVec2b.x, tempVec2b.y);
    this.panStart.copy(tempVec2a);
  };

  //   handleTouchStartDollyPan = (e) => {
  //     if (this.enableZoom) {
  //       const dx = e.touches[0].pageX - e.touches[1].pageX;
  //       const dy = e.touches[0].pageY - e.touches[1].pageY;
  //       const distance = Math.sqrt(dx * dx + dy * dy);
  //       this.dollyStart.set(0, distance);
  //     }

  //     if (this.enablePan) {
  //       const x = 0.5 * (e.touches[0].pageX + e.touches[1].pageX);
  //       const y = 0.5 * (e.touches[0].pageY + e.touches[1].pageY);
  //       this.panStart.set(x, y);
  //     }
  //   };

  //   handleTouchMoveDollyPan = (e: TouchEvent) => {
  //     if (this.enableZoom) {
  //       const dx = e.touches[0].pageX - e.touches[1].pageX;
  //       const dy = e.touches[0].pageY - e.touches[1].pageY;
  //       const distance = Math.sqrt(dx * dx + dy * dy);
  //       tempVec2a.set(0, distance);
  //       tempVec2b.set(0, (tempVec2a.y / this.dollyStart.y) ** this.zoomSpeed);
  //       this.dolly(tempVec2b.y);
  //       this.dollyStart.copy(tempVec2a);
  //     }

  //     if (this.enablePan) {
  //       const x = 0.5 * (e.touches[0].pageX + e.touches[1].pageX);
  //       const y = 0.5 * (e.touches[0].pageY + e.touches[1].pageY);
  //       this.handleMovePan(x, y);
  //     }
  //   };

  onMouseDown(e: MouseEvent) {
    if (!this.enabled) return;

    // eslint-disable-next-line default-case
    switch (e.button) {
      case this.mouseButtons.ORBIT:
        if (this.enableRotate === false) return;
        this.rotateStart.set(e.clientX, e.clientY);
        this.setState(STATE.ROTATE);
        break;
      case this.mouseButtons.ZOOM:
        if (this.enableZoom === false) return;
        this.dollyStart.set(e.clientX, e.clientY);
        this.setState(STATE.DOLLY);
        break;
      case this.mouseButtons.PAN:
        if (this.enablePan === false) return;
        this.panStart.set(e.clientX, e.clientY);
        this.setState(STATE.PAN);
        break;
    }

    if (this.state !== STATE.NONE) {
      const onMouseMove = this.onMouseMove.bind(this);
      const onMouseUp = this.onMouseUp.bind(this);
      window.addEventListener("mousemove", onMouseMove, false);
      window.addEventListener("mouseup", onMouseUp, false);
      this.cleanupListeners = () => {
        window.removeEventListener("mousemove", onMouseMove, false);
        window.removeEventListener("mouseup", onMouseUp, false);
      };
    }
  }

  onMouseMove = (e: MouseEvent) => {
    if (!this.enabled) return;

    // eslint-disable-next-line default-case
    switch (this.state) {
      case STATE.ROTATE:
        if (this.enableRotate === false) return;
        this.moved = true;
        this.handleMoveRotate(e.clientX, e.clientY);
        break;
      case STATE.DOLLY:
        if (this.enableZoom === false) return;
        this.moved = true;
        this.handleMouseMoveDolly(e);
        break;
      case STATE.PAN:
        if (this.enablePan === false) return;
        this.moved = true;
        this.handleMovePan(e.clientX, e.clientY);
        break;
    }
  };

  onMouseUp(_e: MouseEvent) {
    this.cleanupListeners();
    this.cleanupListeners = () => {};
    this.setState(STATE.NONE);
    this.moved = false;
  }

  onMouseWheel = (e: WheelEvent) => {
    if (
      !this.enabled ||
      !this.enableZoom ||
      (this.state !== STATE.NONE && this.state !== STATE.ROTATE)
    )
      return;
    e.stopPropagation();
    e.preventDefault();

    if (e.deltaY < 0) {
      this.dolly(1 / this.getZoomScale());
    } else if (e.deltaY > 0) {
      this.dolly(this.getZoomScale());
    }
  };

  //   onTouchStart = (e) => {
  //     if (!this.enabled) return;
  //     e.preventDefault();

  //     switch (e.touches.length) {
  //       case 1:
  //         if (enableRotate === false) return;
  //         rotateStart.set(e.touches[0].pageX, e.touches[0].pageY);
  //         state = STATE.ROTATE;
  //         break;
  //       case 2:
  //         if (enableZoom === false && enablePan === false) return;
  //         handleTouchStartDollyPan(e);
  //         state = STATE.DOLLY_PAN;
  //         break;
  //       default:
  //         state = STATE.NONE;
  //     }
  //   };

  //   onTouchMove = (e) => {
  //     if (!this.enabled) return;
  //     e.preventDefault();
  //     e.stopPropagation();

  //     switch (e.touches.length) {
  //       case 1:
  //         if (enableRotate === false) return;
  //         handleMoveRotate(e.touches[0].pageX, e.touches[0].pageY);
  //         break;
  //       case 2:
  //         if (enableZoom === false && enablePan === false) return;
  //         handleTouchMoveDollyPan(e);
  //         break;
  //       default:
  //         state = STATE.NONE;
  //     }
  //   };

  //   onTouchEnd = () => {
  //     if (!this.enabled) return;
  //     this.state = STATE.NONE;
  //   };

  onContextMenu = (e: MouseEvent) => {
    if (!this.enabled) return;
    e.preventDefault();
  };

  addHandlers() {
    this.element.addEventListener(
      "contextmenu",
      this.onContextMenu.bind(this),
      false
    );
    this.element.addEventListener(
      "mousedown",
      this.onMouseDown.bind(this),
      false
    );
    this.element.addEventListener("wheel", this.onMouseWheel.bind(this), {
      passive: false,
    });
    // this.element.addEventListener("touchstart", this.onTouchStart, {
    //   passive: false,
    // });
    // this.element.addEventListener("touchend", this.onTouchEnd, false);
    // this.element.addEventListener("touchmove", this.onTouchMove, { passive: false });
  }

  remove = () => {
    this.element.removeEventListener("contextmenu", this.onContextMenu);
    this.element.removeEventListener("mousedown", this.onMouseDown);
    this.element.removeEventListener("wheel", this.onMouseWheel);
    // this.element.removeEventListener("touchstart", this.onTouchStart);
    // this.element.removeEventListener("touchend", this.onTouchEnd);
    // this.element.removeEventListener("touchmove", this.onTouchMove);
    window.removeEventListener("mousemove", this.onMouseMove);
    window.removeEventListener("mouseup", this.onMouseUp);
  };
}
