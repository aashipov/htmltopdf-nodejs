import { spawn } from 'child_process';

import { indexHtml, resultPdf, sendPdf } from './handler.js';
import { removeWorkDir } from './printeroptions.js';

const getWkhtmltopdfExecutable = () => {
    const os = process.platform;
    if ('win32' === os) {
        return 'wkhtmltopdf.exe';
    }
    if ('linux' === os) {
        return 'wkhtmltopdf';
    }
    return 'OS not supported';
}
const wkhtmltopdfExecutable = getWkhtmltopdfExecutable();

const buildSpawnOptions = (printerOptions) => (['--enable-local-file-access', '--print-media-type', '--no-stop-slow-scripts', '--disable-smart-shrinking',
    '--margin-bottom', printerOptions.bottom, '--margin-left', printerOptions.left, '--margin-right', printerOptions.right, '--margin-top', printerOptions.top,
    '--page-width', printerOptions.paperSize.widthMm, '--page-height', printerOptions.paperSize.heightMm, '--orientation', printerOptions.orientation,
    indexHtml, resultPdf]);

export const viaWkhtmltopdf = async (res, printerOptions) => {
    let osCmd = spawn(wkhtmltopdfExecutable, buildSpawnOptions(printerOptions), { cwd: printerOptions.workDir });
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
