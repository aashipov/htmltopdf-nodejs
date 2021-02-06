import http from 'http';
import {chromium, createTmpDir, healthCheck, html, htmlToPdf, tmpDir} from './common.js';
import {lauchChromiumHeadless} from './chromium.js';

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

createTmpDir(tmpDir);
lauchChromiumHeadless();
