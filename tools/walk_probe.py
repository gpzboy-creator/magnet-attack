"""Walk the photographer around given spots and report jumps / stuck directions.

usage: python3 tools/walk_probe.py "x,y;x,y;..." [base_url]
  e.g. python3 tools/walk_probe.py "675,240;455,236;-420,420"
For each spot: load ?phase=dancing&spawn=x,y, hold W, D, S, A (twice, in two orders) for ~1 s each,
sample window.__player every 60 ms. Prints the largest step between samples (normal walking ≈ 16;
much more = a jump — or a headless frame stall, re-run to check) and the keys that didn't move him
(stuck). Used for the 19.11 walking fixes (src/game/playerMovement.ts). Needs Playwright (see
browser_shots.py) and `npx vite preview --port 4173`.
"""
import asyncio
import sys

from playwright.async_api import async_playwright

spots = [tuple(float(v) for v in s.split(',')) for s in sys.argv[1].split(';')]
base = sys.argv[2] if len(sys.argv) > 2 else 'http://localhost:4173/'
POS = '()=>[window.__player.x, window.__player.y]'


async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(args=['--no-sandbox'])
        for sx, sy in spots:
            page = await browser.new_page(viewport={'width': 1280, 'height': 720})
            await page.goto(f'{base}?phase=dancing&spawn={sx:g},{sy:g}')
            await page.wait_for_timeout(1500)
            await page.keyboard.press('Enter')
            await page.wait_for_timeout(3500)
            worst, stuck = 0.0, []
            for key in ['KeyW', 'KeyD', 'KeyS', 'KeyA', 'KeyW', 'KeyA', 'KeyS', 'KeyD']:
                await page.keyboard.down(key)
                last = start = await page.evaluate(POS)
                for _ in range(14):
                    await page.wait_for_timeout(60)
                    cur = await page.evaluate(POS)
                    worst = max(worst, ((cur[0] - last[0]) ** 2 + (cur[1] - last[1]) ** 2) ** 0.5)
                    last = cur
                await page.keyboard.up(key)
                if ((last[0] - start[0]) ** 2 + (last[1] - start[1]) ** 2) ** 0.5 < 3:
                    stuck.append(key)
            print((sx, sy), 'max step', round(worst, 1), 'stuck on', stuck)
            await page.close()
        await browser.close()


asyncio.run(main())
