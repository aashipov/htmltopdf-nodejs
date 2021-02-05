import puppeteer from 'puppeteer-core';
import ReadWriteLock from 'rwlock';
import path from 'path';
import fs from 'fs-extra';
import { indexHtml, landscape, resultPdf, sendPdf } from './common.js';

const mm = 'mm';
const browserLock = new ReadWriteLock();
const browserTimeout = 30000;
const defaultEvents = ['load', 'domcontentloaded', 'networkidle0', 'networkidle2'];
let browser;

const launchSuccess = () => console.log(`Chromium (re)started`);
const launchFailure = (reason) => console.error(`Chromium failed to (re)start ${reason}`)
const launchBrowser = async () => browser = await puppeteer.launch({
    executablePath: '/usr/bin/chromium',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-notifications', '--disable-geolocation', '--disable-infobars',
        '--disable-session-crashed-bubble', '--disable-dev-shm-usage', '--disable-gpu', '--disable-translate', '--disable-extensions',
        '--disable-background-networking', '--disable-sync', '--disable-default-apps', '--hide-scrollbars', '--metrics-recording-only',
        '--mute-audio', '--no-first-run', '--unlimited-storage', '--safebrowsing-disable-auto-update', '--font-render-hinting=none']
});

export const lauchChromiumHeadless = async () => {
    await launchBrowser().then(launchSuccess, launchFailure);
}

const buildFileUrl = (workDir) => (`file://${path.join(workDir, indexHtml)}`);

export const viaPuppeteer = async (res, printerOptions) => {
    browserLock.readLock(async (release) => {
        if (!browser.isConnected()) {
            lauchChromiumHeadless();
        }
        const page = await browser.newPage();
        await page.goto(buildFileUrl(printerOptions.workDir), {
            waitUntil: defaultEvents
        });
        let currentPdfFile = path.join(printerOptions.workDir, resultPdf);
        // page.pdf() is currently supported only in headless mode.
        // @see https://bugs.chromium.org/p/chromium/issues/detail?id=753118
        await page.pdf({
            path: currentPdfFile,
            width: printerOptions.paperSize.widthMm + mm,
            height: printerOptions.paperSize.heightMm + mm,
            landscape: printerOptions.orientation.includes(landscape),
            margin: {
                top: printerOptions.top + mm,
                right: printerOptions.right + mm,
                bottom: printerOptions.bottom + mm,
                left: printerOptions.left + mm
            }
        });
        await page.close();
        sendPdf(res, currentPdfFile);
        fs.remove(printerOptions.workDir);
        release();
        setTimeout(function () {
            release();
        }, browserTimeout);
    })
}
