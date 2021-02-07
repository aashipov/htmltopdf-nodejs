import path from 'path';
import fs from 'fs-extra';
import Busboy from 'busboy';

import { buildCurrentPdfFilePath, buildPrinterOptions, removeWorkDir } from './printeroptions.js';
import { viaPuppeteer } from './chromium.js';
import { viaWkhtmltopdf } from './wkhtmltopdf.js';

export const html = 'html';
export const indexHtml = 'index.' + html;
export const resultPdf = 'result.pdf';
export const chromium = 'chromium';

const receiveFiles = (file, filename, printerOptions) => {
    printerOptions.fileNames.push(filename);
    let fstream = fs.createWriteStream(path.join(printerOptions.workDir, filename));
    file.pipe(fstream);
};

const isIndexHtml = (fileNames) => {
    for (let i = 0; i < fileNames.length; i++) {
        if (indexHtml === fileNames[i]) {
            return true;
        }
    }
    return false;
};

const teapot = (res, printerOptions) => {
    res.statusCode = 418;
    res.write(`No ${indexHtml} or URL does not include words such as ${html} or ${chromium}`);
    removeWorkDir(printerOptions);
    res.end();
};

export const healthCheck = (res) => {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json;charset=utf-8');
    res.write(JSON.stringify({ "status": "UP" }));
    res.end();
};

export const sendPdf = (response, printerOptions) => {
    let currentPdfFile = buildCurrentPdfFilePath(printerOptions);
    response.writeHead(
        200, {
        'Content-Type': 'application/pdf',
        'Content-Length': fs.statSync(currentPdfFile).size
    }
    );
    fs.createReadStream(currentPdfFile).pipe(response);
    // no response.end(); to send PDF properly
};

export const htmlToPdf = async (req, res) => {
    let printerOptions = buildPrinterOptions(req);
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
                }
            } else {
                teapot(res, printerOptions);
            }
        });
};
