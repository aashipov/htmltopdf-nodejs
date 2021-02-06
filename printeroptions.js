import path from 'path';
import {landscape, tmpDir} from './common.js';

export class PrinterOptions {
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

class PaperSize {
    constructor(widthMm, heightMm) {
        this.widthMm = widthMm;
        this.heightMm = heightMm;
    }
}

const A4 = new PaperSize('210', '297');
const A3 = new PaperSize('297', '420');
const a3 = 'a3';
const defaultMargin = '20'
const left = 'left';
const right = 'right';
const top = 'top';
const bottom = 'bottom';
const portrait = 'portrait';

const oneOrMoreDigitsRe = new RegExp(/\d+/);

const fillMarginNameReMap = () => {
    let m = new Map();
    m.set(left, new RegExp(/left\d+/));
    m.set(right, new RegExp(/right\d+/));
    m.set(top, new RegExp(/top\d+/));
    m.set(bottom, new RegExp(/bottom\d+/));
    return m;
};

const marginNameReMap = fillMarginNameReMap();

export const buildPrinterOptions = (req) => {
    let printerOptions =
        new PrinterOptions(
            path.join(tmpDir, '' + Math.random() + '-' + Math.random()),
            [],
            req.url,
            A4,
            portrait,
            defaultMargin, defaultMargin, defaultMargin, defaultMargin);
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
            if (left === marginName) {
                printerOptions.left = marginDigits;
            }
            if (right === marginName) {
                printerOptions.right = marginDigits;
            }
            if (top === marginName) {
                printerOptions.top = marginDigits;
            }
            if (bottom === marginName) {
                printerOptions.bottom = marginDigits;
            }
        }
    }
    return printerOptions;
}