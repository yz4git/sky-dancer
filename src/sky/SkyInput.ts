export interface SkyInputCallbacks {
  onMove: (x: number, y: number) => void;
  onFire: (active: boolean) => void;
}

export class SkyInput {
  private readonly keys = new Set<string>();
  private windowTarget: Window | null = null;
  private callbacks: SkyInputCallbacks | null = null;
  private lastMove = "0,0";
  private lastFire = false;

  constructor(callbacks: SkyInputCallbacks) {
    this.callbacks = callbacks;
  }

  attach(windowTarget: Window): void {
    this.windowTarget = windowTarget;
    windowTarget.addEventListener("keydown", this.onKeyDown);
    windowTarget.addEventListener("keyup", this.onKeyUp);
    windowTarget.addEventListener("blur", this.clear);
  }

  detach(): void {
    this.windowTarget?.removeEventListener("keydown", this.onKeyDown);
    this.windowTarget?.removeEventListener("keyup", this.onKeyUp);
    this.windowTarget?.removeEventListener("blur", this.clear);
    this.clear();
    this.windowTarget = null;
  }

  update(): void {
    const x = (this.keys.has("ArrowRight") || this.keys.has("KeyD") ? 1 : 0)
      - (this.keys.has("ArrowLeft") || this.keys.has("KeyA") ? 1 : 0);
    const y = (this.keys.has("ArrowUp") || this.keys.has("KeyW") ? 1 : 0)
      - (this.keys.has("ArrowDown") || this.keys.has("KeyS") ? 1 : 0);
    const moveKey = `${x},${y}`;
    if (moveKey !== this.lastMove) {
      this.lastMove = moveKey;
      this.callbacks?.onMove(x, y);
    }
    const fire = this.keys.has("Space") || this.keys.has("Enter");
    if (fire !== this.lastFire) {
      this.lastFire = fire;
      this.callbacks?.onFire(fire);
    }
  }

  clear = (): void => {
    this.keys.clear();
    this.lastMove = "0,0";
    this.lastFire = false;
    this.callbacks?.onMove(0, 0);
    this.callbacks?.onFire(false);
  };

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space", "Enter", "KeyW", "KeyA", "KeyS", "KeyD"].includes(event.code)) {
      event.preventDefault();
      this.keys.add(event.code);
    }
  };

  private readonly onKeyUp = (event: KeyboardEvent): void => {
    this.keys.delete(event.code);
  };
}
