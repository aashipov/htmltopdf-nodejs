import express from 'express';

import { chromium, healthcheck, html, htmlToPdf, setUp } from './common.js';

const app = express();


app.route('/')
  .get((req, res, next) => healthcheck(req, res, next));
app.route('/health')
  .get((req, res, next) => healthcheck(req, res, next));

app.route('/' + chromium)
  .post((req, res, next) => htmlToPdf(req, res, next));
app.route('/' + chromium + '*')
  .post((req, res, next) => htmlToPdf(req, res, next));
app.route('/' + html)
  .post((req, res, next) => htmlToPdf(req, res, next));
app.route('/' + html + '*')
  .post((req, res, next) => htmlToPdf(req, res, next));

let server = app.listen(8080, () => {
  setUp();
  console.log('Listening on port %d', server.address().port);
});
