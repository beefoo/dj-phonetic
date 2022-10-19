class App {
  constructor(options = {}) {
    const defaults = {};
    this.options = _.extend({}, defaults, options);
  }

  init() {
    this.initialized = true;
    this.$el = $('#app');
  }
}
