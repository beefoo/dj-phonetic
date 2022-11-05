class PointerManager {
  constructor(options = {}) {
    const defaults = {
      childSelector: false,
      onPointerDown: (pointer, $el) => {},
      onPointerEnter: (pointer, $el) => {},
      onPointerExit: (pointer, $el) => {},
      target: '#touchable',
    };
    this.options = _.extend({}, defaults, options);
    this.init();
  }

  init() {
    this.$target = $(this.options.target);
    [this.target] = this.$target;
    this.pointers = {};
    this.loadListeners();
  }

  checkForPointerExit(pointer, event) {
    if (pointer.currentTargetId === false) return;
    const $oldChild = $(`#${pointer.currentTargetId}`);
    this.options.onPointerExit(pointer, $oldChild);
    pointer.setCurrentTargetId(false);
  }

  getChildFromEvent(event) {
    const target = document.elementFromPoint(event.clientX, event.clientY);
    const $child = $(target).closest(this.options.childSelector);
    if ($child.length > 0) return $child;
    return false;
  }

  getPointer(event, mustExist = false) {
    const pointerId = this.constructor.getPointerId(event);

    let pointer = false;
    if (_.has(this.pointers, pointerId)) {
      pointer = this.pointers[pointerId];
    } else if (!mustExist) {
      const options = {
        id: pointerId,
        event,
      };
      pointer = new Pointer(options);
      this.pointers[pointerId] = pointer;
    }

    return pointer;
  }

  static getPointerId(event) {
    let { pointerId } = event;

    if (pointerId === undefined) pointerId = '0';
    else pointerId = String(pointerId);

    return pointerId;
  }

  isPointersActive() {
    return _.find(this.pointers, (pointer) => pointer.isActive);
  }

  loadListeners() {
    this.$target.on('pointerdown', (e) => this.onPointerDown(e));
    this.$target.on('pointerup', (e) => this.onPointerUp(e));
    this.$target.on('pointermove', (e) => this.onPointerMove(e));
  }

  onAllPointersEnd() {
    this.$target.removeClass('active');
  }

  onPointerDown(event) {
    if (!this.firstTouch) this.firstTouch = true;
    this.$target.addClass('active');
    this.target.setPointerCapture(event.pointerId);
    const pointer = this.getPointer(event);
    pointer.onStart(event);
    if (this.options.childSelector) {
      const $child = this.getChildFromEvent(event);
      if ($child) {
        pointer.setCurrentTargetId($child.attr('id'));
        this.options.onPointerDown(pointer, $child);
      }
    }
  }

  onPointerMove(event) {
    if (!this.options.childSelector) return;

    const pointer = this.getPointer(event, true);
    if (!pointer) return;

    const $child = this.getChildFromEvent(event);
    if ($child) {
      const childId = $child.attr('id');
      if (childId !== pointer.currentTargetId) {
        this.checkForPointerExit(pointer, event);
        pointer.setCurrentTargetId(childId);
        this.options.onPointerEnter(pointer, $child);
      }
    } else {
      this.checkForPointerExit(pointer, event);
    }
  }

  onPointerUp(event) {
    const pointer = this.getPointer(event);
    this.checkForPointerExit(pointer, event);
    pointer.onEnd(event);
    this.removePointers();
    if (!this.isPointersActive()) this.onAllPointersEnd();
  }

  removePointers() {
    const pointersToRemove = [];

    _.each(this.pointers, (pointer, pointerId) => {
      if (!pointer.isActive) pointersToRemove.push(pointerId);
    });

    if (pointersToRemove.length > 0) {
      this.pointers = _.omit(this.pointers, pointersToRemove);
    }
  }
}
