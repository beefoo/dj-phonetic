class KeyboardManager {
  constructor(options = {}) {
    const defaults = {
      keyMap: {},
    };
    this.options = _.extend({}, defaults, options);
    this.init();
  }

  init() {
    this.keyMap = this.options.keyMap;
    this.loadListeners();
  }

  loadListeners() {
    const $el = $(document);

    $el.on('keydown', (e) => this.onKeydown(e));
  }

  onKeydown(event) {
    const { key } = event;
    const { keyMap } = this;

    if (!_.has(keyMap, key)) return;

    keyMap[key]();
  }
}
