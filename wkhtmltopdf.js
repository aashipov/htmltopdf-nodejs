import { spawn } from 'child_process';

import { indexHtml, resultPdf, sendPdf } from './handler.js';
import { removeWorkDir } from './printeroptions.js';

const buildSpawnOptions = (printerOptions) => (['--enable-local-file-access', '--print-media-type', '--no-stop-slow-scripts', '--disable-smart-shrinking',
    '--margin-bottom', printerOptions.bottom, '--margin-left', printerOptions.left, '--margin-right', printerOptions.right, '--margin-top', printerOptions.top,
    '--page-width', printerOptions.paperSize.widthMm, '--page-height', printerOptions.paperSize.heightMm, '--orientation', printerOptions.orientation,
    indexHtml, resultPdf]);

const wkhtmltopdf = 'wkhtmltopdf';

export const viaWkhtmltopdf = async (res, printerOptions) => {
    let osCmd = spawn(wkhtmltopdf, buildSpawnOptions(printerOptions), { cwd: printerOptions.workDir });
    osCmd.on('close', () => {
        sendPdf(res, printerOptions);
        removeWorkDir(printerOptions);
    });
    osCmd.on('error', (error) => {
        const msg = `Error calling wkhtmltopdf ${error}`;
        console.log(msg);
        res.statusCode = 500;
        res.write(msg);
        removeWorkDir(printerOptions);
        res.end();
    });
}
