class Pointer {
  constructor(options = {}) {
    const defaults = {
      id: '0',
      event: false,
    };
    this.options = _.extend({}, defaults, options);
    this.init();
  }

  init() {
    this.id = this.options.id;
    this.isPrimary = false;
    if (this.options.event && this.options.event.originalEvent) {
      this.isPrimary = this.options.event.originalEvent.isPrimary;
    }
    this.reset();
  }

  onEnd(event) {
    this.reset();
  }

  onStart(event) {
    this.isActive = true;
    this.lastEvent = event;
  }

  reset() {
    this.isActive = false;
    this.lastEvent = false;
    this.currentTargetId = false;
  }

  setCurrentTargetId(id) {
    this.currentTargetId = id;
  }
}
