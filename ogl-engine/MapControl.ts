import type { Camera, Mat4, Vec3 } from "ogl";
import { Vec2 } from "ogl";
import { MouseButton, Orbit, STATE, tempVec3 } from "./Orbit";

const dPos = 3;
const dScale = 0.2;
const dRotation = 200;
const keymap = {
  KeyW: { x: 0, y: dPos },
  ArrowUp: { x: 0, y: dPos },
  KeyS: { x: 0, y: -dPos },
  ArrowDown: { x: 0, y: -dPos },
  KeyA: { x: dPos, y: 0 },
  ArrowLeft: { x: dPos, y: 0 },
  KeyD: { x: -dPos, y: 0 },
  ArrowRight: { x: -dPos, y: 0 },
  KeyQ: { rotate: Math.PI / dRotation },
  KeyE: { rotate: -Math.PI / dRotation },
  KeyX: { scale: -dScale },
  Equal: { scale: -dScale },
  KeyZ: { scale: dScale },
  Minus: { scale: dScale },
};

export class MapControl extends Orbit {
  camera: Camera;
  keysPressed = new Set<string>();

  dragPrev: Vec2 | null = null;
  mouse: Vec2 = new Vec2();
  cursorMoved = false;
  mouseButtons = {
    ORBIT: MouseButton.Right,
    ZOOM: null,
    PAN: MouseButton.Middle,
  };

  onPointerUp:
    | ((_position: Vec2, _button: MouseButton, _isTarget: boolean) => void)
    | null = null;
  onPointerDown:
    | ((_position: Vec2, _button: MouseButton, _isTarget: boolean) => void)
    | null = null;
  onKeyDown: ((_event: KeyboardEvent) => void) | null = null;
  onRightClick: ((_event: MouseEvent) => void) | null = null;
  // eslint-disable-next-line class-methods-use-this
  isFocused: () => boolean = () => true;

  constructor(camera: Camera, element: HTMLElement) {
    super(camera, element);

    this.minDistance = 0.1;
    this.maxDistance = 80;

    document.addEventListener("pointerup", (event) => {
      this.onPointerUp?.(
        this.mouse,
        event.button,
        event.target === this.element
      );
    });

    document.body.addEventListener("keydown", (event) => {
      if (event.target !== document.body) return;
      if (event.code in keymap) {
        event.stopPropagation();
      }
      this.onKeyDown?.(event);
      this.keysPressed.add(event.code);
    });
    document.body.addEventListener("keyup", (event) => {
      this.keysPressed.delete(event.code);
    });
    document.addEventListener("mousemove", this.onMouseMovePersistent);
  }

  lookAt = (position: Vec3) => {
    tempVec3.copy(this.camera.position).sub(position);
    this.target.copy(position);
    this.camera.position.copy(position).add(tempVec3);
  };

  override panUp = (distance: number, m: Mat4) => {
    const i = 0;
    tempVec3.set(m[i], m[i + 1], m[i + 2]);
    tempVec3.cross(this.camera.up);
    tempVec3.multiply(-distance);
    this.panDelta.add(tempVec3);
  };

  override onMouseDown = (e: MouseEvent) => {
    if (this.keysPressed.has("ShiftLeft") && e.button === MouseButton.Left) {
      this.setState(STATE.ROTATE);
      this.rotateStart.set(e.clientX, e.clientY);

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
    } else {
      this.onPointerDown?.(this.mouse, e.button, e.target === this.element);
      super.onMouseDown(e);
    }
  };

  override onMouseUp(e: MouseEvent) {
    if (!this.moved && e.button === MouseButton.Right) this.onRightClick?.(e);
    super.onMouseUp(e);
  }

  override update = () => {
    super.update();

    if (!this.isFocused()) {
      return;
    }

    this.keysPressed.forEach((key) => {
      const action = keymap[key];
      if (!action) return;

      if (action.x || action.y) {
        this.pan(action.x, action.y);
      }
    });
  };

  onMouseMovePersistent = (e: MouseEvent) => {
    this.cursorMoved = false;
    const bb = this.element.getBoundingClientRect();
    const x = e.clientX - bb.left;
    const y = e.clientY - bb.top;

    if (x !== this.mouse.x || y !== this.mouse.y) {
      this.cursorMoved = true;
      this.mouse.set(x, y);
    }
  };
}
