import Busboy from 'busboy';
import path from 'path';
import fs from 'fs-extra';

import { viaWkhtmltopdf } from './wkhtmltopdf.js';
import { PrinterOptions } from './printeroptions.js';
import { PaperSize } from './papersize.js';
import { lauchChromiumHeadless, viaPuppeteer } from './chromium.js'

export const html = 'html';
export const indexHtml = 'index.' + html;
export const resultPdf = 'result.pdf';
export const chromium = 'chromium';
export const wkhtmltopdf = 'wkhtmltopdf';
export const landscape = 'landscape';

const A4 = new PaperSize('210', '297');
const A3 = new PaperSize('297', '420');
const a3 = 'a3';
const defaultMargin = '20'
const left = 'left';
const right = 'right';
const top = 'top';
const bottom = 'bottom';
const oneOrMoreDigitsRe = new RegExp(/\d+/);

const tmpDir = path.join(path.resolve(), '/tmp/');

const fillMarginNameReMap = () => {
    let m = new Map();
    m.set(left, new RegExp(/left\d+/));
    m.set(right, new RegExp(/right\d+/));
    m.set(top, new RegExp(/top\d+/));
    m.set(bottom, new RegExp(/bottom\d+/));
    return m;
}
const marginNameReMap = fillMarginNameReMap();

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

export const healthcheck = (req, res, next) => {
    res.setHeader('content-type', 'application/json; charset=utf-8');
    res.send('{"status":"UP"}');
}

export const htmlToPdf = async (req, res, next) => {
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

export const setUp = () => {
    mkdirSync(tmpDir);
    lauchChromiumHeadless();
}
