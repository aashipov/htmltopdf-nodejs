import puppeteer from 'puppeteer-core';
import path from 'path';

import { indexHtml, sendPdf } from './handler.js';
import { buildCurrentPdfFilePath, landscape } from './printeroptions.js';

const getChromiumExecutable = () => {
    const os = process.platform;
    if ('win32' === os) {
        return 'chrome.exe';
    }
    if ('linux' === os) {
        return 'chromium';
    }
    return 'OS not supported';
}

const mm = 'mm';
const browserTimeout = 600_000;

const chromiumEvents = ['load', 'domcontentloaded', 'networkidle0', 'networkidle2'];
const chromiumExecutable = getChromiumExecutable();
const chromiumArgsString = '--headless --remote-debugging-address=0.0.0.0 --remote-debugging-port=9222 --no-sandbox --no-zygote --disable-setuid-sandbox --disable-notifications --disable-geolocation --disable-infobars --disable-session-crashed-bubble --disable-dev-shm-usage --disable-gpu --disable-translate --disable-extensions --disable-features=site-per-process --disable-hang-monitor --disable-popup-blocking --disable-prompt-on-repost --disable-background-networking --disable-breakpad --disable-client-side-phishing-detection --disable-sync --disable-default-apps --hide-scrollbars --metrics-recording-only --mute-audio --no-first-run --enable-automation --password-store=basic --use-mock-keychain --unlimited-storage --safebrowsing-disable-auto-update --font-render-hinting=none --disable-sync-preferences --user-data-dir=/dummy/.config/headless_shell';
const chromiumArgs = chromiumArgsString.split(' ');
let browser;

const launchSuccess = () => console.log(`Chromium (re)started`);
const launchFailure = (reason) => {
    console.error(`Chromium failed to (re)start ${reason}`);
    process.exit(1);
}
const launchBrowser = async () => browser = await puppeteer.launch({
    executablePath: chromiumExecutable,
    args: chromiumArgs
});

export const launchChromiumHeadless = async () => {
    await launchBrowser().then(launchSuccess, launchFailure);
}

const buildFileUrl = (printerOptions) => `file://${path.join(printerOptions.workDir, indexHtml)}`;
const buildPdfOpts = (printerOptions) => (
    {
        preferCSSPageSize: false,
        path: buildCurrentPdfFilePath(printerOptions),
        width: printerOptions.paperSize.widthMm + mm,
        height: printerOptions.paperSize.heightMm + mm,
        landscape: printerOptions.orientation.includes(landscape),
        margin: {
            top: printerOptions.top + mm,
            right: printerOptions.right + mm,
            bottom: printerOptions.bottom + mm,
            left: printerOptions.left + mm
        }
    }
);

export const viaPuppeteer = async (res, printerOptions) => {
    if (!browser.isConnected()) {
        await launchChromiumHeadless();
    }
    const page = await browser.newPage();
    await page.setOfflineMode(true);
    await page.goto(
        buildFileUrl(printerOptions),
        {
            waitUntil: chromiumEvents, 
            timeout: browserTimeout
        }
    );
    // page.pdf() is currently supported only in headless mode.
    // @see https://bugs.chromium.org/p/chromium/issues/detail?id=753118
    await page.pdf(buildPdfOpts(printerOptions));
    await page.close();
    sendPdf(res, printerOptions);
    printerOptions.removeWorkDir();
}
