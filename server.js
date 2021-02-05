import http from 'http';
import { chromium, healthCheck, html, htmlToPdf, setUp, slash } from './common.js';

http.createServer((request, response) => {
  const { url } = request;
  if (slash === url || slash + 'health' === url) {
    healthCheck(response);
  }
  if (url.startsWith(slash + chromium) || url.startsWith(slash + html)) {
    htmlToPdf(request, response);
  }
}
).listen(8080)

setUp();
