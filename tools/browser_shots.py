"""Screenshots of the game at several moments, from one page load (Playwright + `vite preview`).

usage: python3 tools/browser_shots.py "<url>" <out_prefix> <seconds,seconds,...>
  e.g. python3 tools/browser_shots.py "http://localhost:4173/?phase=dancing&spawn=dj" /tmp/shot 6,12
Presses Enter on the title screen, then saves <out_prefix>0.png, 1.png… at each time and prints
any page errors. Headless game time runs slower than real time — use ?phase= / ?evening= and
generous waits. Needs: pip install playwright --break-system-packages && python3 -m playwright install chromium
"""
import asyncio
import sys

from playwright.async_api import async_playwright

url, prefix = sys.argv[1], sys.argv[2]
times = [float(t) for t in sys.argv[3].split(',')]


async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(args=['--no-sandbox'])
        page = await browser.new_page(viewport={'width': 1280, 'height': 720})
        errors = []
        page.on('pageerror', lambda e: errors.append(str(e)))
        await page.goto(url)
        await page.wait_for_timeout(1500)
        await page.keyboard.press('Enter')
        t0 = 0.0
        for i, t in enumerate(times):
            await page.wait_for_timeout(int((t - t0) * 1000))
            t0 = t
            await page.screenshot(path=f'{prefix}{i}.png')
        print('errors:', errors[:5])
        await browser.close()


asyncio.run(main())
