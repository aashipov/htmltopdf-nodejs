import http from 'http';
import { chromium, healthCheck, html, htmlToPdf, setUp } from './common.js';

const defaultPort = 8080;

http.createServer((request, response) => {
  const { url } = request;
  if (url.includes(chromium) || url.includes(html)) {
    htmlToPdf(request, response);
  } else {
    healthCheck(response);
  }
}
).listen(defaultPort);

setUp();
