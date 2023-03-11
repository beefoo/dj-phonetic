class Pointer {
  constructor(options = {}) {
    const defaults = {
      id: '0',
      event: false,
      onSwipe: (vector, pointer, $el) => {},
      swipeRange: [1.0, 5],
    };
    this.options = _.extend({}, defaults, options);
    this.init();
  }

  init() {
    this.id = this.options.id;
    this.isPrimary = false;
    this.lastTargetId = false;
    if (this.options.event && this.options.event.originalEvent) {
      this.isPrimary = this.options.event.originalEvent.isPrimary;
    }
    this.reset();
  }

  getDirection(xvalue = true, yvalue = true) {
    const direction = {
      up: false,
      down: false,
      left: false,
      right: false,
    };
    if (!this.vector) return direction;
    const { x, y } = this.vector;
    if (x > 0) direction.right = xvalue;
    else direction.left = xvalue;
    if (y > 0) direction.down = yvalue;
    else direction.up = yvalue;
    return direction;
  }

  static getEvent(event) {
    return _.extend({}, event, { time: Date.now() });
  }

  onEnd(event) {
    if (this.vector !== false) {
      const [swipeMin, swipeMax] = this.options.swipeRange;
      const { x, y } = this.vector;
      const absX = Math.abs(x);
      const absY = Math.abs(y);
      if (absX >= swipeMin || absY >= swipeMin) {
        const $el = this.lastTargetId !== false ? $(`#${this.lastTargetId}`) : false;
        const nx = MathUtil.clamp(MathUtil.norm(absX, swipeMin, swipeMax));
        const ny = MathUtil.clamp(MathUtil.norm(absY, swipeMax, swipeMax));
        const swipe = this.getDirection(nx, ny);
        this.options.onSwipe(swipe, this, $el);
      }
    }
    this.reset();
  }

  onMove(event) {
    const e = this.constructor.getEvent(event);
    this.setVector(e, this.lastEvent);
    this.lastEvent = e;
  }

  onStart(event) {
    const e = this.constructor.getEvent(event);
    this.isActive = true;
    this.lastTargetId = false;
    this.lastEvent = e;
  }

  reset() {
    this.isActive = false;
    this.lastEvent = false;
    this.vector = false;
    this.currentTargetId = false;
  }

  setCurrentTargetId(id) {
    this.currentTargetId = id;
    if (id !== false) this.lastTargetId = id;
  }

  setVector(e1, e0) {
    const { clientX, clientY, time } = e1;
    const clientX0 = e0.clientX;
    const clientY0 = e0.clientY;
    const time0 = e0.time;
    const dt = time - time0;
    const vx = (clientX - clientX0) / dt;
    const vy = (clientY - clientY0) / dt;
    this.vector = { x: vx, y: vy };
  }
}
