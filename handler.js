import path from 'path';
import fs from 'fs-extra';

import { buildCurrentPdfFilePath, buildPrinterOptions } from './printeroptions.js';
import { viaPuppeteer } from './chromium-puppeteer.js';
import { viaWkhtmltopdf } from './wkhtmltopdf.js';
import Formidable from 'formidable';

export const html = 'html';
export const indexHtml = 'index.' + html;
export const resultPdf = 'result.pdf';
export const chromium = 'chromium';

const isIndexHtml = (fileNames) => {
    for (let i = 0; i < fileNames.length; i++) {
        if (indexHtml === fileNames[i]) {
            return true;
        }
    }
    return false;
};

const internalServerError = (res, printerOptions, err) => {
    res.statusCode = 500;
    res.write(err.message);
    printerOptions.removeWorkDir();
    res.end();
};

export const healthCheck = (res) => {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json;charset=utf-8');
    res.write(JSON.stringify({ "status": "UP" }));
    res.end();
};

export const sendPdf = (response, printerOptions) => {
    const currentPdfFile = buildCurrentPdfFilePath(printerOptions);
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
    const printerOptions = buildPrinterOptions(req);
    const formidable = new Formidable({ multiples: true, uploadDir: printerOptions.workDir });
    formidable
        .on('file',
            (fieldName, currentFile) => {
                printerOptions.fileNames.push(currentFile.name);
                fs.renameSync(currentFile.path, path.join(printerOptions.workDir, currentFile.name));
            }
        )
        .on('end',
            () => {
                if (isIndexHtml(printerOptions.fileNames)) {
                    if (printerOptions.originalUrl.includes(chromium)) {
                        viaPuppeteer(res, printerOptions);
                    } else if (printerOptions.originalUrl.includes(html)) {
                        viaWkhtmltopdf(res, printerOptions);
                    }
                } else {
                    throw new Error(`No ${indexHtml}`);
                }
            }
        ).on('error',
            (err) => {
                internalServerError(res, printerOptions, err);
            })

        ;
    formidable.parse(req);
};
