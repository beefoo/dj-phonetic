class DataViz {
  constructor(options = {}) {
    const defaults = {
      features: [],
      parent: '#app',
    };
    this.options = _.extend({}, defaults, options);
    this.init();
  }

  init() {
    this.$parent = $(this.options.parent);
    this.loadUI();
  }

  loadUI() {
    const { features } = this.options;
    let html = '';
    html += '<div class="dataviz">';
    features.forEach((feature) => {
      html += '<div class="feature">';
      html += `  <div id="feature-${feature}" class="value"></div>`;
      html += `  <div class="label">${feature}</div>`;
      html += '</div>';
    });
    html += '</div>';
    const $el = $(html);
    this.$parent.append($el);
    this.features = features.map((feature) => {
      const f = {};
      f.name = feature;
      f.$el = $(`#feature-${feature}`);
      return f;
    });
  }

  onChange(features) {
    this.features.forEach((feature) => {
      const value = features[feature.name];
      const green = Math.round(value * 255);
      feature.$el.css('height', `${(value * 100)}%`);
      feature.$el.css('background-color', `rgb(255, ${green}, 0)`);
      feature.$el.html(`<span>${value}</span>`);
    });
  }
}
