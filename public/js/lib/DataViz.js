class DataViz {
  constructor(options = {}) {
    const defaults = {
      features: [],
      parent: '#app',
      template: '#dataviz-template',
    };
    this.options = _.extend({}, defaults, options);
    this.init();
  }

  init() {
    this.$parent = $(this.options.parent);
    this.loadUI();
  }

  loadUI() {
    const features = this.options.features.map((name) => ({ name }));
    const html = StringUtil.loadTemplateFromElement(this.options.template, Mustache, { features });
    const $el = $(html);
    this.$parent.append($el);
    this.features = features.map((feature) => {
      const f = {};
      f.name = feature.name;
      f.$el = $(`#feature-${feature.name}`);
      return f;
    });
  }

  onChange(features) {
    this.features.forEach((feature) => {
      const { $el } = feature;
      const $bar = $el.find('.bar');
      const $label = $el.find('.value');
      const value = features[feature.name];
      const green = Math.round(value * 255);
      $bar.css('width', `${(value * 100)}%`);
      $bar.css('background-color', `rgba(255, ${green}, 0, 0.4)`);
      $label.text(value);
    });
  }
}
