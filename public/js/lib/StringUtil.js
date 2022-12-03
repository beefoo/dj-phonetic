class StringUtil {
  static loadTemplateFromElement(id, renderer, data) {
    const templateString = document.getElementById(id.replace('#', '')).innerHTML;
    return StringUtil.loadTemplateFromString(templateString, renderer, data);
  }

  static loadTemplateFromString(templateString, renderer, data) {
    return renderer.render(templateString, data);
  }

  static queryParams() {
    const searchString = window.location.search;
    if (searchString.length <= 0) return {};
    const search = searchString.substring(1);
    const jsonFormatted = search.replace(/&/g, '","').replace(/=/g, '":"');
    const parsed = JSON.parse(`{"${jsonFormatted}"}`, (key, value) => (key === '' ? value : decodeURIComponent(value)));
    _.each(parsed, (value, key) => {
      const dkey = decodeURIComponent(key);
      parsed[dkey] = value;
    });
    return parsed;
  }
}
