import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || '/opt/codex/cua_node/lib/node_modules/playwright');
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));
const base = process.env.TEST_URL || 'http://127.0.0.1:4178';
try {
    await page.goto(base);
    await page.waitForSelector('#stage-title');
    await page.getByRole('heading', { name: 'Native OpenMPI results, not Docker' }).waitFor();
    assert.equal(await page.locator('tbody tr').count(), 12);
    const raw = page.locator('.raw-link').first();
    assert.ok((await page.request.get(new URL(await raw.getAttribute('href'), base).href)).ok(), 'raw output is served');
    await page.locator('#ranks').selectOption('1');
    await page.locator('#step').click();
    const fits = await page.locator('.rank-node').evaluate(node => { const rect = node.querySelector('rect').getBBox(); return [...node.querySelectorAll('text')].every(text => { const b = text.getBBox(); return b.x >= rect.x && b.x + b.width <= rect.x + rect.width; }); });
    assert.ok(fits, 'rank values fit within the process card');
    for (const ranks of ['1', '2', '4']) {
        await page.locator('#ranks').selectOption(ranks);
        assert.equal(await page.locator('.rank-node').count(), Number(ranks));
        await page.locator('#step').click();
        assert.match(await page.locator('#stage-title').innerText(), /Scatter/);
        await page.locator('#step').click();
        assert.match(await page.locator('#stage-title').innerText(), /Compute/);
        await page.locator('#step').click();
        assert.match(await page.locator('#stage-copy').innerText(), /1496/);
        await page.locator('#reset').click();
        assert.equal(await page.locator('#stage-title').innerText(), 'Ready');
    }
    await page.locator('#play').click();
    assert.equal(await page.locator('#play').getAttribute('aria-pressed'), 'true');
    await page.waitForTimeout(1500);
    await page.locator('#play').click();
    const paused = await page.locator('#stage-title').innerText();
    await page.waitForTimeout(1500);
    assert.equal(await page.locator('#stage-title').innerText(), paused);
    await page.locator('#reset').click();
    await page.locator('[data-stage="3"]').focus();
    await page.keyboard.press('Enter');
    assert.match(await page.locator('#stage-title').innerText(), /Gather/);
    for (const width of [320, 375, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `no overflow at ${width}`);
        if (width <= 375) {
            const values = page.locator('#rank-values');
            assert.ok(await values.isVisible(), 'mobile values are readable without zoom');
            assert.ok(await values.evaluate(el => parseFloat(getComputedStyle(el).fontSize) >= 12));
            assert.match(await values.innerText(), /256/);
            assert.equal(await values.locator('[data-rank-values]').count(), 4);
        }
        await page.screenshot({ path: `/tmp/c18-final-${width}.png`, fullPage: true });
    }
    for (const ranks of [1, 2, 4]) {
        await page.setViewportSize({ width: 375, height: 900 });
        await page.locator('#ranks').selectOption(String(ranks));
        for (const stage of [0, 1, 2, 3]) {
            await page.locator(`[data-stage="${stage}"]`).click();
            for (let rank = 0; rank < ranks; rank++) {
                const chunk = Array.from({ length: 16 / ranks }, (_, i) => rank * 16 / ranks + i + 1);
                const expected = stage === 0 ? 'Waiting for input' : chunk.map(n => stage >= 2 ? n * n : n).join(', ');
                assert.equal(await page.locator(`[data-rank-values="${rank}"] p`).innerText(), expected);
            }
        }
    }
    await page.locator('#reset').click();
    await page.locator('#play').click();
    await page.waitForFunction(() => document.querySelector('#stage-title').textContent.includes('complete'));
    assert.equal(await page.locator('#play').getAttribute('aria-pressed'), 'false');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.locator('[data-stage="1"]').click();
    assert.equal(await page.locator('.flow').first().evaluate(el => getComputedStyle(el).animationName), 'none');
    await page.route('**/results.json', route => route.fulfill({ status: 200, contentType: 'application/json', body: '{"invalid":true}' }));
    await page.reload();
    await page.getByText('No verified measurements loaded').waitFor();
    await page.unroute('**/results.json');
    await page.route('**/results.json', route => route.fulfill({ status: 404, body: 'Missing' }));
    await page.reload();
    await page.getByText('No verified measurements loaded').waitFor();
    assert.deepEqual(errors, []);
    console.log('PASS: rank layout, 1/2/4 computation, reset, play/pause, keyboard, 320/375/1440 viewport, reduced motion, invalid-data fallback, no JS errors');
}
finally {
    await browser.close();
}
