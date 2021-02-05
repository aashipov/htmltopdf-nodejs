import path from 'path';
import fs from 'fs-extra';
import { spawn } from 'child_process';
import {wkhtmltopdf, indexHtml, resultPdf} from './common.js';

export const viaWkhtmltopdf = async (res, printerOptions) => {
    let osCmd = spawn(wkhtmltopdf, ['--enable-local-file-access', '--print-media-type', '--no-stop-slow-scripts', '--disable-smart-shrinking',
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
