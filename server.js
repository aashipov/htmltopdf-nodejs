class PaperSize {
  constructor(widthMm, widthIn, heightMm, heightIn) {
    this.widthMm = widthMm;
    this.widthIn = widthIn;
    this.heightMm = heightMm;
    this.heightIn = heightIn
  }
}

class PrinterOptions {
  constructor(workDir, fileNames, originalUrl, paperSize, orientation) {
    this.workDir = workDir;
    this.fileNames = fileNames;
    this.originalUrl = originalUrl;
    this.paperSize = paperSize;
    this.orientation = orientation
  }
}

const express = require('express');
const Busboy = require('busboy');
const path = require('path');
const fs = require('fs-extra');
const {
  spawn
} = require('child_process');
const puppeteer = require('puppeteer');
const locks = require('locks');
const app = express();

const tmpDir = path.join(__dirname + '/tmp/');
const html = 'html';
const indexHtml = 'index.' + html;
const resultPdf = 'result.pdf';
const wkhtmltopdf = 'wkhtmltopdf';
const chromium = 'chromium';

const A4 = new PaperSize('210', '8.5in', '297', '11.71in');
const A3 = new PaperSize('297', '11.71in', '420', '16.54in');
const a3 = 'a3';
const landscape = 'landscape'

const snooze = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const receiveFiles = (file, filename, printerOptions) => {
  printerOptions.fileNames.push(filename);
  let fstream = fs.createWriteStream(path.join(printerOptions.workDir, filename));
  file.pipe(fstream);
}

const isIndexHtml = (fileNames) => {
  for (let i = 0; i < fileNames.length; i++) {
    if (indexHtml === fileNames[i]) {
      return true;
    }
  }
  return false
}

const mkdirSync = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }
}

const teapot = (res, printerOptions) => {
  res.status(418)
  res.send('No index.html');
  fs.remove(printerOptions.workDir);
}

const unknownConverter = (res, printerOptions) => {
  res.status(500);
  res.send('Unknown converter');
  fs.remove(printerOptions.workDir);
}

const viaWkhtmltopdf = async (res, printerOptions) => {
  let osCmd = spawn(wkhtmltopdf, ['--enable-local-file-access', '--print-media-type', '--no-stop-slow-scripts',
    '--margin-bottom', '0', '--margin-left', '0', '--margin-right', '0', '--margin-top', '0',
    '--page-width', printerOptions.paperSize.widthMm, '--page-height', printerOptions.paperSize.heightMm, '--orientation', printerOptions.orientation,
    indexHtml, resultPdf], {
    cwd: printerOptions.workDir
  });
  osCmd.on('close', () => {
    res.download(path.join(printerOptions.workDir, resultPdf), () => {
      fs.remove(printerOptions.workDir);
    });
  });
  osCmd.on('error', (error) => {
    console.log(`Error calling ${wkhtmltopdf} ${error}`)
    res.status(500)
    res.send('Error calling ' + err);
    fs.remove(printerOptions.workDir);
  });
}

const viaPuppeteer = async (res, printerOptions) => {
  if (!browser.isConnected()) {
    await launchBrowser().then(launchSuccess, launchFailure);
  }
  while (true) {
    if (browserMutex.isLocked) {
      snooze(10);
    } else {
      browserMutex.lock(() => { });
      break;
    }
  }
  const page = await browser.newPage();
  await page.goto(`file://${path.join(printerOptions.workDir, indexHtml)}`, {
    waitUntil: ['load', 'domcontentloaded', 'networkidle0', 'networkidle2']
  });
  let currentPdfFile = path.join(printerOptions.workDir, resultPdf);
  // page.pdf() is currently supported only in headless mode.
  // @see https://bugs.chromium.org/p/chromium/issues/detail?id=753118
  await page.pdf({
    path: currentPdfFile,
    width: printerOptions.paperSize.widthIn,
    height: printerOptions.paperSize.heightIn,
    landscape: printerOptions.orientation.includes(landscape),
    margin: {
      top: 0,
      right: 0,
      bottom: 0,
      left: 0
    }
  });
  await page.close();
  browserMutex.unlock();
  res.download(currentPdfFile, () => {
    fs.remove(printerOptions.workDir)
  });
}

const healthcheck = (req, res, next) => {
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.send('{"status":"UP"}');
}

const launchBrowser = async () => browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
const launchSuccess = () => console.log(`Chromium (re)started`);
const launchFailure = (reason) => console.error(`Chromium failed to (re)start ${reason}`)

const htmlToPdf = async (req, res, next) => {
  let printerOptions = new PrinterOptions(path.join(tmpDir, '' + Math.random() + '-' + Math.random()), [], req.originalUrl, A4, 'portrait');
  if (printerOptions.originalUrl.includes(a3)) {
    printerOptions.paperSize = A3;
  }
  if (printerOptions.originalUrl.includes(landscape)) {
    printerOptions.orientation = landscape
  }
  mkdirSync(printerOptions.workDir);
  let busboy = new Busboy({
    headers: req.headers
  });
  req.pipe(busboy);
  busboy
    .on('file', (fieldname, file, filename) => receiveFiles(file, filename, printerOptions))
    .on('finish', () => {
      if (isIndexHtml(printerOptions.fileNames)) {
        if (printerOptions.originalUrl.includes(chromium)) {
          viaPuppeteer(res, printerOptions);
        } else if (printerOptions.originalUrl.includes(html)) {
          viaWkhtmltopdf(res, printerOptions);
        } else {
          unknownConverter(res, printerOptions);
        }
      } else {
        teapot(res, printerOptions);
      }
    });
}

const browserMutex = locks.createMutex();
let browser;

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
  launchBrowser().then(launchSuccess, launchFailure);
  mkdirSync(tmpDir);
  console.log('Listening on port %d', server.address().port);
});
