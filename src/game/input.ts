export class InputManager {
  enabled = false;
  keys: Record<string, boolean> = {};
  pointerActive = false;
  pointerX = 0;
  pointerY = 0;
  pointerMode: "none" | "mouse" | "touch" = "none";
  skillPressed = false;
  ultPressed = false;
  evadePressed = false;
  pausePressed = false;
  private el: HTMLElement;
  private toVirtual: (x: number, y: number) => { x: number; y: number };
  private handlers: [string, EventListener, any?][] = [];

  constructor(el: HTMLElement, toVirtual: (x: number, y: number) => { x: number; y: number }) {
    this.el = el;
    this.toVirtual = toVirtual;
    this.bind();
  }

  private on(target: EventTarget, type: string, fn: EventListener, opts?: AddEventListenerOptions) {
    target.addEventListener(type, fn, opts);
    this.handlers.push([type, fn, target]);
  }

  private bind() {
    this.on(window, "keydown", ((e: KeyboardEvent) => {
      if (!this.enabled || (e.target instanceof Element && e.target.closest("input, select, textarea"))) return;
      const k = e.key.toLowerCase();
      if ([" ", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(k)) e.preventDefault();
      if (!this.keys[k]) {
        if (k === " ") this.skillPressed = true;
        if (k === "shift") this.ultPressed = true;
        if (k === "e" || k === "q") this.evadePressed = true;
        if (k === "escape" || k === "p") this.pausePressed = true;
      }
      this.keys[k] = true;
    }) as EventListener);
    this.on(window, "keyup", ((e: KeyboardEvent) => { this.keys[e.key.toLowerCase()] = false; }) as EventListener);
    this.on(window, "blur", (() => { this.keys = {}; this.pointerActive = false; }) as EventListener);

    const down = (e: PointerEvent) => {
      if (!this.enabled) return;
      if ((e.target as HTMLElement)?.dataset?.uibtn) return;
      this.pointerMode = e.pointerType === "mouse" ? "mouse" : "touch";
      this.pointerActive = true;
      const v = this.toVirtual(e.clientX, e.clientY);
      this.pointerX = v.x; this.pointerY = v.y;
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      if (!this.enabled || (e.target instanceof Element && e.target.closest("[data-uibtn]"))) return;
      const v = this.toVirtual(e.clientX, e.clientY);
      if (e.pointerType === "mouse") { this.pointerMode = "mouse"; this.pointerActive = true; this.pointerX = v.x; this.pointerY = v.y; return; }
      if (!this.pointerActive) return;
      this.pointerX = v.x; this.pointerY = v.y;
    };
    const up = () => { if (this.pointerMode !== "mouse") this.pointerActive = false; };
    this.on(this.el, "pointerdown", down as EventListener);
    this.on(window, "pointermove", move as EventListener);
    this.on(window, "pointerup", up as EventListener);
    this.on(window, "pointercancel", up as EventListener);
    this.on(this.el, "touchmove", ((e: Event) => e.preventDefault()) as EventListener, { passive: false });
    this.on(this.el, "contextmenu", ((e: Event) => e.preventDefault()) as EventListener);
  }

  axis(): { x: number; y: number } {
    const k = this.keys;
    let x = 0, y = 0;
    if (k["a"] || k["arrowleft"]) x -= 1;
    if (k["d"] || k["arrowright"]) x += 1;
    if (k["w"] || k["arrowup"]) y -= 1;
    if (k["s"] || k["arrowdown"]) y += 1;
    const l = Math.hypot(x, y);
    return l > 0 ? { x: x / l, y: y / l } : { x: 0, y: 0 };
  }

  consumeSkill() { const v = this.skillPressed; this.skillPressed = false; return v; }
  consumeUlt() { const v = this.ultPressed; this.ultPressed = false; return v; }
  consumeEvade() { const v = this.evadePressed; this.evadePressed = false; return v; }
  triggerEvade() { this.evadePressed = true; }
  consumePause() { const v = this.pausePressed; this.pausePressed = false; return v; }
  triggerSkill() { this.skillPressed = true; }
  triggerUlt() { this.ultPressed = true; }

  reset() {
    this.keys = {};
    this.pointerActive = false;
    this.pointerMode = "none";
    this.skillPressed = this.ultPressed = this.evadePressed = this.pausePressed = false;
  }

  destroy() {
    for (const [type, fn, target] of this.handlers) (target as EventTarget).removeEventListener(type, fn);
    this.handlers = [];
  }
}
