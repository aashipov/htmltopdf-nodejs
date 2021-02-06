import Busboy from 'busboy';
import path from 'path';
import fs from 'fs-extra';

import {viaWkhtmltopdf} from './wkhtmltopdf.js';
import {buildPrinterOptions} from './printeroptions.js';
import {viaPuppeteer} from './chromium.js'

export const html = 'html';
export const indexHtml = 'index.' + html;
export const resultPdf = 'result.pdf';
export const chromium = 'chromium';
export const wkhtmltopdf = 'wkhtmltopdf';
export const landscape = 'landscape';

const fileEvt = 'file';
const finishEvt = 'finish';
const contentType = 'Content-Type';
const contentLenghtHeader = 'Content-Length';
const applicationPdf = 'application/pdf';
const applicationJsonUtf8 = 'application/json;charset=utf-8';
const statusUp = '{"status":"UP"}';
const tmp = 'tmp';
const noIndexHtml = 'No ' + indexHtml + ' or URL does not contain words like html or chromium';

export const http500 = 500;
const http418 = 418;
const http200 = 200;

export const tmpDir = path.join(path.resolve(), tmp);

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

const mkdirSync = (dir) => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
    }
};

const teapot = (res, printerOptions) => {
    res.statusCode = http418;
    res.write(noIndexHtml);
    removeWorkDir(printerOptions);
    res.end();
};

export const healthCheck = (res) => {
    res.statusCode = http200;
    res.setHeader(contentType, applicationJsonUtf8);
    res.write(statusUp);
    res.end();
};

export const htmlToPdf = async (req, res) => {
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

export const createTmpDir = (tmpDir) => mkdirSync(tmpDir);

export const removeWorkDir = (printerOptions) => fs.remove(printerOptions.workDir);

export const sendPdf = (response, printerOptions) => {
    let currentPdfFile = buildCurrentPdfFilePath(printerOptions);
    response.writeHead(
        http200,
        {
            contentType: applicationPdf,
            contentLenghtHeader: fs.statSync(currentPdfFile).size
        }
    );
    fs.createReadStream(currentPdfFile).pipe(response);
    // no response.end(); to send PDF properly
};
export const buildCurrentPdfFilePath = (printerOptions) => path.join(printerOptions.workDir, resultPdf);