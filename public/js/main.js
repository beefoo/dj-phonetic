(function initApp() {
  const transcripts = _.map(MANIFEST.rows, (row) => _.object(MANIFEST.cols, row));
  const config = _.extend({}, CONFIG, { transcripts });
  const app = new App(config);
}());
