import http from 'http';
import Busboy from 'busboy';

import {
  chromium,
  createTmpDir,
  healthCheck,
  html,
  isIndexHtml,
  mkdirSync, receiveFiles,
  teapot
} from './common.js';
import {buildPrinterOptions} from './printeroptions.js';
import {lauchChromiumHeadless, viaPuppeteer} from './chromium.js';
import {viaWkhtmltopdf} from './wkhtmltopdf.js';

const fileEvt = 'file';
const finishEvt = 'finish';

const htmlToPdf = async (req, res) => {
  let printerOptions = buildPrinterOptions(req);
  mkdirSync(printerOptions.workDir);
  let busboy = new Busboy({
    headers: req.headers
  });
  req.pipe(busboy);
  busboy
      .on(fileEvt, (fieldname, file, filename) => receiveFiles(file, filename, printerOptions))
      .on(finishEvt, () => {
        if (isIndexHtml(printerOptions.fileNames)) {
          if (printerOptions.originalUrl.includes(chromium)) {
            viaPuppeteer(res, printerOptions);
          } else if (printerOptions.originalUrl.includes(html)) {
            viaWkhtmltopdf(res, printerOptions);
          }
        } else {
          teapot(res, printerOptions);
        }
      });
};

const defaultPort = 8080;
http.createServer((request, response) => {
  const { url } = request;
  if (url.includes(chromium) || url.includes(html)) {
    htmlToPdf(request, response).catch((error) => console.log(error));
  } else {
    healthCheck(response);
  }
}
).listen(defaultPort);

createTmpDir();
lauchChromiumHeadless().catch((error) => console.log(error));
