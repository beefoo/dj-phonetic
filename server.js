const express = require('express');

let port = 2222;
const app = express();

if (process.argv.length > 2) port = parseInt(process.argv[2], 10);
app.use(express.urlencoded({ extended: true }));
app.use(express.static('./public/'));
app.listen(port, () => console.log(`Listening on port ${port}`));
