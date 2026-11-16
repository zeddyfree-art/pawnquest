// Browser-level canvas checks against the Vite dev server. No game/model downloads needed.
// npm run dev -- --host 127.0.0.1
// node tools/art/check-hero.mjs [http://localhost:5173] [/tmp/hero-preview.png]
import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 880, height: 950 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('response', (r) => { if (r.status() >= 400 && r.url().includes('/art/')) errors.push(`${r.status()} ${r.url()}`); });
  await page.goto(process.argv[2] ?? 'http://localhost:5173');
  const result = await page.evaluate(async () => {
    const { heroArtUrl } = await import('/src/ui/heroArt.ts');
    const { CLASSES, ITEMS, SKINS, EYES, HAIR_STYLES, newHero, outfitOf } = await import('/src/data/gear.ts');
    const look = { skin: SKINS[2], hair: '#5a3a22', hairStyle: 'messy', eyes: EYES[0] };
    const render = async (hero, mood = 'idle') => {
      const start = performance.now();
      for (;;) {
        const url = heroArtUrl(hero.look, outfitOf(hero), mood);
        if (url) return url;
        if (performance.now() - start > 15_000) throw new Error(`Missing painted layers: ${JSON.stringify(hero)} ${mood}`);
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
    };
    const grid = document.createElement('main');
    grid.style = 'display:grid;grid-template-columns:repeat(4,192px);gap:12px;padding:20px;background:#eee2cc;color:#432e22;font:14px sans-serif';
    const add = async (hero, label, mood) => {
      const box = document.createElement('div'); box.style = 'text-align:center';
      const img = new Image(192, 256); img.src = await render(hero, mood); await img.decode();
      box.append(img, document.createTextNode(label)); grid.append(box);
    };
    let items = 0;
    for (const body of ['male', 'female']) {
      for (const cls of CLASSES) await add(newHero(cls.name, cls.id, { ...look, body }), `${body} · ${cls.name}`);
      for (const item of ITEMS) {
        const hero = newHero('Check', 'squire', { ...look, body });
        hero.equip[item.art.slot] = item.id;
        await render(hero); items++;
      }
      for (const hair of HAIR_STYLES) await render(newHero('Hair', 'bard', { ...look, body, hairStyle: hair.id }));
      const original = await render(newHero('Palette', 'squire', { ...look, body }));
      const recolouredHair = await render(newHero('Palette', 'squire', { ...look, body, hair: '#d4ad55' }));
      const recolouredEyes = await render(newHero('Palette', 'squire', { ...look, body, eyes: EYES[1] }));
      if (original === recolouredHair || original === recolouredEyes) throw new Error('Hair/eye colour must change the painted result');
      for (const skin of SKINS) for (const eyes of EYES) {
        await render(newHero('Colours', 'ranger', { ...look, body, skin, eyes }));
      }
      const hero = newHero('Stress', 'bard', { ...look, body, hairStyle: 'long', skin: SKINS[5] });
      hero.equip.body = 'ranger-cloak'; hero.equip.off = 'wooden-shield';
      await add(hero, `${body} · cloak / lute / shield`);
      hero.equip.head = 'guard-helmet';
      await add(hero, `${body} · helmet / long hair`);
      delete hero.equip.head;
      const moods = [];
      for (const mood of ['happy', 'sad']) {
        moods.push(await render(hero, mood));
        await add(hero, `${body} · ${mood}`, mood);
      }
      if (moods[0] === moods[1]) throw new Error('Expressions must differ');
    }
    const legacy = newHero('Legacy', 'squire', look);
    if (await render(legacy) !== await render({ ...legacy, look: { ...look, body: 'male' } })) throw new Error('Legacy body default differs');
    document.body.replaceChildren(grid);
    return { items, bodies: 2, skinEyeCombinations: SKINS.length * EYES.length * 2, hairChecks: HAIR_STYLES.length * 2 };
  });
  assert.deepEqual(errors, []);
  await page.screenshot({ path: process.argv[3] ?? '/tmp/hero-preview.png', fullPage: true });
  console.log(JSON.stringify({ ...result, errors }, null, 2));
} finally {
  await browser.close();
}
