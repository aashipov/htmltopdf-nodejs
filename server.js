class PaperSize {
  constructor(widthMm, heightMm) {
    this.widthMm = widthMm;
    this.heightMm = heightMm;
  }
}

class PrinterOptions {
  constructor(workDir, fileNames, originalUrl, paperSize, orientation, left, right, top, bottom) {
    this.workDir = workDir;
    this.fileNames = fileNames;
    this.originalUrl = originalUrl;
    this.paperSize = paperSize;
    this.orientation = orientation;
    this.left = left;
    this.right = right;
    this.top = top;
    this.bottom = bottom;
  }
}

const express = require('express');
const Busboy = require('busboy');
const path = require('path');
const fs = require('fs-extra');
const {
  spawn
} = require('child_process');
const puppeteer = require('puppeteer-core');
const ReadWriteLock = require('rwlock');
const app = express();

const tmpDir = path.join(__dirname + '/tmp/');
const html = 'html';
const indexHtml = 'index.' + html;
const resultPdf = 'result.pdf';
const wkhtmltopdf = 'wkhtmltopdf';
const chromium = 'chromium';

const A4 = new PaperSize('210', '297');
const A3 = new PaperSize('297', '420');
const a3 = 'a3';
const mm = 'mm';
const landscape = 'landscape';
const defaultMargin = '20'
const left = 'left';
const right = 'right';
const top = 'top';
const bottom = 'bottom';
const oneOrMoreDigitsRe = new RegExp(/\d+/);

const fillMarginNameReMap = () => {
  let m = new Map();
  m.set(left, new RegExp(/left\d+/));
  m.set(right, new RegExp(/right\d+/));
  m.set(top, new RegExp(/top\d+/));
  m.set(bottom, new RegExp(/bottom\d+/));
  return m;
}
const marginNameReMap = fillMarginNameReMap();

const browserLock = new ReadWriteLock();
const browserTimeout = 30_000;
let browser;


const launchBrowser = async () => browser = await puppeteer.launch({executablePath: '/usr/bin/chromium',
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-notifications', '--disable-geolocation', '--disable-infobars',
    '--disable-session-crashed-bubble', '--disable-dev-shm-usage', '--disable-gpu', '--disable-translate', '--disable-extensions',
    '--disable-background-networking', '--disable-sync', '--disable-default-apps', '--hide-scrollbars', '--metrics-recording-only',
    '--mute-audio', '--no-first-run', '--unlimited-storage', '--safebrowsing-disable-auto-update', '--font-render-hinting=none']
});
const launchSuccess = () => console.log(`Chromium (re)started`);
const launchFailure = (reason) => console.error(`Chromium failed to (re)start ${reason}`)

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
    '--margin-bottom', printerOptions.bottom, '--margin-left', printerOptions.left, '--margin-right', printerOptions.right, '--margin-top', printerOptions.top,
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
  browserLock.readLock(async (release) => {
    if (!browser.isConnected()) {
      await launchBrowser().then(launchSuccess, launchFailure);
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
      width: printerOptions.paperSize.widthMm + mm,
      height: printerOptions.paperSize.heightMm + mm,
      landscape: printerOptions.orientation.includes(landscape),
      margin: {
        top: printerOptions.top,
        right: printerOptions.right,
        bottom: printerOptions.bottom,
        left: printerOptions.left
      }
    });
    await page.close();
    res.download(currentPdfFile, () => {
      fs.remove(printerOptions.workDir)
    });
    release();
    setTimeout(function () {
      release();
    }, browserTimeout);
  })
}

const healthcheck = (req, res, next) => {
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.send('{"status":"UP"}');
}

const htmlToPdf = async (req, res, next) => {
  let printerOptions = new PrinterOptions(path.join(tmpDir, '' + Math.random() + '-' + Math.random()), [], req.originalUrl, A4, 'portrait', defaultMargin, defaultMargin, defaultMargin, defaultMargin);
  if (printerOptions.originalUrl.includes(a3)) {
    printerOptions.paperSize = A3;
  }
  if (printerOptions.originalUrl.includes(landscape)) {
    printerOptions.orientation = landscape
  }
  for (let [marginName, re] of marginNameReMap.entries()) {
    let marginNameWithDigits = printerOptions.originalUrl.match(re);
    if (null != marginNameWithDigits) {
      let marginDigits = marginNameWithDigits[0].match(oneOrMoreDigitsRe)[0];
      if (left == marginName) {
        printerOptions.left = marginDigits;
      }
      if (right == marginName) {
        printerOptions.right = marginDigits;
      }
      if (top == marginName) {
        printerOptions.top = marginDigits;
      }
      if (bottom == marginName) {
        printerOptions.bottom = marginDigits;
      }
    }
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
