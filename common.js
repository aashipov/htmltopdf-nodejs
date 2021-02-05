import Busboy from 'busboy';
import path from 'path';
import fs from 'fs-extra';

import { viaWkhtmltopdf } from './wkhtmltopdf.js';
import { PrinterOptions } from './printeroptions.js';
import { PaperSize } from './papersize.js';
import { lauchChromiumHeadless, viaPuppeteer } from './chromium.js'

export const slash = '/';
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
    return false;
}

const mkdirSync = (dir) => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
    }
}

const teapot = (res, printerOptions) => {
    res.statusCode = 418;
    res.write('No index.html');
    fs.remove(printerOptions.workDir);
    res.end();
}

const unknownConverter = (res, printerOptions) => {
    res.statusCode = 500;
    res.write('Unknown converter');
    fs.remove(printerOptions.workDir);
    res.end();
}

export const healthCheck = (res) => {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.write('{"status":"UP"}');
    res.end();
}

export const htmlToPdf = async (req, res) => {
    let printerOptions = new PrinterOptions(path.join(tmpDir, '' + Math.random() + '-' + Math.random()), [], req.url, A4, 'portrait', defaultMargin, defaultMargin, defaultMargin, defaultMargin);
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

export const sendPdf = (response, currentPdfFile) => {
    response.writeHead(200, {
        'Content-Type': 'application/pdf',
        'Content-Length': fs.statSync(currentPdfFile).size
    });
    let readStream = fs.createReadStream(currentPdfFile);
    readStream.pipe(response);
}
