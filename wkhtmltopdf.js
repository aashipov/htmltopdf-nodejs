import path from 'path';
import fs from 'fs-extra';
import { spawn } from 'child_process';
import { wkhtmltopdf, indexHtml, resultPdf, sendPdf, http500 } from './common.js';

const closeEvt = 'close';
const errorEvt = 'error';
const errorCallingWkhtmltopdf = 'Error calling wkhtmltopdf';

const buildSpawnOptions = (printerOptions) => (['--enable-local-file-access', '--print-media-type', '--no-stop-slow-scripts', '--disable-smart-shrinking',
    '--margin-bottom', printerOptions.bottom, '--margin-left', printerOptions.left, '--margin-right', printerOptions.right, '--margin-top', printerOptions.top,
    '--page-width', printerOptions.paperSize.widthMm, '--page-height', printerOptions.paperSize.heightMm, '--orientation', printerOptions.orientation,
    indexHtml, resultPdf]);

export const viaWkhtmltopdf = async (res, printerOptions) => {
    let osCmd = spawn(wkhtmltopdf, buildSpawnOptions(printerOptions), { cwd: printerOptions.workDir });
    osCmd.on(closeEvt, () => {
        sendPdf(res, path.join(printerOptions.workDir, resultPdf));
        fs.remove(printerOptions.workDir);
    });
    osCmd.on(errorEvt, (error) => {
        const msg = `${errorCallingWkhtmltopdf} ${error}`;
        console.log(msg);
        res.statusCode = http500;
        res.write(msg);
        fs.remove(printerOptions.workDir);
        res.end();
    });
}
