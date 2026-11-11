import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const routes = [
  { path: '/', heading: 'About me', nav: 'About', title: 'Justin Clagg' },
  { path: '/contact/', heading: 'Contact me', nav: 'Contact', title: 'Contact | Justin Clagg' },
] as const;

for (const route of routes) {
  test(`${route.path} has prerendered content, accessible navigation, and canonical metadata`, async ({ browser }) => {
    const page = await browser.newPage({ javaScriptEnabled: false });
    const response = await page.goto(route.path);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1, name: route.heading })).toBeVisible();
    if (route.path === '/') {
      await expect(page.locator('.intro p')).toHaveCount(1);
      await expect(page.locator('.lead')).toHaveText('I’m a System Architect working at GDIT.');
      await expect(page.getByRole('main')).not.toContainText('What I work on');
      await expect(page.getByRole('main').getByRole('link')).toHaveCount(1);
      await expect(page.getByRole('main').getByRole('link', { name: 'Reach out' })).toHaveAttribute('href', '/contact/');
      await expect(page.locator('meta[name=description]')).toHaveAttribute('content', 'Justin Clagg is a System Architect working at GDIT.');
    } else {
      await expect(page.getByRole('main').getByRole('link')).toHaveCount(3);
      await expect(page.getByRole('main')).not.toContainText('Email is the easiest way to reach me.');
      await expect(page.getByRole('main')).not.toContainText('Find me online');
    }
    await expect(page.getByRole('navigation').getByRole('link', { name: route.nav })).toHaveAttribute('aria-current', 'page');
    await expect(page).toHaveTitle(route.title);
    await expect(page.locator('link[rel=canonical]')).toHaveAttribute('href', `https://www.justinclagg.com${route.path}`);
    await expect(page.locator('meta[property="og:url"]')).toHaveAttribute('content', `https://www.justinclagg.com${route.path}`);
    await expect(page.locator('meta[name=description]')).toHaveAttribute('content', /Justin Clagg/);
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('main')).toBeFocused();
    await page.close();
  });

  test(`${route.path} passes automated accessibility checks at mobile width`, async ({ page, baseURL }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    const browserErrors: string[] = [];
    page.on('pageerror', (error) => browserErrors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') browserErrors.push(message.text());
    });

    const externalRequests: string[] = [];
    page.on('request', (request) => {
      if (!request.url().startsWith(`${baseURL}/`)) externalRequests.push(request.url());
    });
    await page.goto(route.path, { waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { level: 1, name: route.heading })).toBeVisible();
    await expect(page).toHaveURL(route.path);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);
    expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()).violations).toEqual([]);
    expect(browserErrors).toEqual([]);
    expect(externalRequests).toEqual([]);
  });
}

test('main navigation and contact links work with JavaScript disabled', async ({ browser }) => {
  const page = await browser.newPage({ javaScriptEnabled: false });
  await page.goto('/');
  await page.getByRole('navigation').getByRole('link', { name: 'Contact' }).click();
  await expect(page).toHaveURL('/contact/');
  await expect(page.getByRole('button', { name: 'Copy work@justinclagg.com to clipboard' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Open work@justinclagg.com in email client' })).toHaveAttribute('href', 'mailto:work@justinclagg.com');
  await expect(page.getByRole('link', { name: 'GitHub' })).toHaveAttribute('href', 'https://github.com/justinclagg');
  await expect(page.getByRole('link', { name: 'LinkedIn' })).toHaveAttribute('href', 'https://www.linkedin.com/in/justinclagg');
  await expect(page.getByRole('list', { name: 'Online profiles' })).toBeVisible();
  await expect(page.getByRole('main')).not.toContainText('Find me online');
  await page.getByRole('navigation').getByRole('link', { name: 'About' }).click();
  await expect(page).toHaveURL('/');
  await page.close();
});

test('contact email copies to clipboard on click with visual feedback', async ({ context, page }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/contact/');
  const copyBtn = page.getByRole('button', { name: 'Copy work@justinclagg.com to clipboard' });
  await expect(copyBtn).toBeVisible();
  await expect(page.getByRole('link', { name: 'Open work@justinclagg.com in email client' })).toHaveAttribute('href', 'mailto:work@justinclagg.com');
  await copyBtn.click();
  await expect(copyBtn.locator('.contact-email-feedback')).toHaveText('Copied!');
  const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
  expect(clipboardText).toBe('work@justinclagg.com');
});

test('legacy addresses reach their canonical destinations', async ({ page, request }) => {
  const bareContact = await request.get('/contact', { maxRedirects: 0 });
  expect(bareContact.status()).toBe(301);
  expect(bareContact.headers()['location']).toBe('/contact/');

  for (const [legacy, canonical] of [['/contact.html', '/contact/'], ['/construction.html', '/']]) {
    const response = await request.get(legacy);
    expect(response.ok()).toBeTruthy();
    expect(await response.text()).toContain(`href="${canonical}"`);
    await page.goto(legacy);
    await expect(page).toHaveURL(canonical);
  }
});

test('unknown URLs return 404 and give visitors a way home', async ({ page }) => {
  const response = await page.goto('/missing/deep/path');
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
  await expect(page.locator('meta[name=robots]')).toHaveAttribute('content', 'noindex');
  await page.getByRole('link', { name: 'Back to Justin Clagg’s home page' }).click();
  await expect(page).toHaveURL('/');
});

test('deployment metadata and font license are included', async ({ request }) => {
  const robots = await request.get('/robots.txt');
  const sitemap = await request.get('/sitemap.xml');
  const cname = await request.get('/CNAME');
  const noJekyll = await request.get('/.nojekyll');
  const license = await request.get('/licenses/alegreya-sans/LICENSE');

  expect(await robots.text()).toContain('Sitemap: https://www.justinclagg.com/sitemap.xml');
  expect(await sitemap.text()).toContain('<loc>https://www.justinclagg.com/contact/</loc>');
  expect((await cname.text()).trim()).toBe('www.justinclagg.com');
  expect(noJekyll.ok()).toBeTruthy();
  expect(await license.text()).toContain('SIL OPEN FONT LICENSE');
});

test('the Angular client fallback is excluded from the public artifact', async ({ request }) => {
  expect((await request.get('/index.csr.html')).status()).toBe(404);
});

test('internal links and browser history keep the same running flow field and update page metadata', async ({ page }) => {
  await page.goto('/');
  const canvas = page.locator('site-flow-field[data-flow-state="running"] canvas');
  await canvas.evaluate((element) => element.setAttribute('data-initial-canvas', ''));
  const nav = page.getByRole('navigation', { name: 'Main' });

  async function verifyPage(route: (typeof routes)[number]) {
    await expect(page).toHaveURL(route.path);
    await expect(page.getByRole('heading', { level: 1, name: route.heading })).toBeVisible();
    await expect(page).toHaveTitle(route.title);
    await expect(page.locator('link[rel=canonical]')).toHaveAttribute('href', `https://www.justinclagg.com${route.path}`);
    await expect(nav.locator('[aria-current="page"]')).toHaveText(route.nav);
    await expect(canvas).toHaveAttribute('data-initial-canvas', '');
  }

  await page.getByRole('link', { name: 'Reach out' }).click();
  await verifyPage(routes[1]);
  await page.goBack();
  await verifyPage(routes[0]);
  await page.goForward();
  await verifyPage(routes[1]);
  await page.getByRole('link', { name: 'Justin Clagg', exact: true }).click();
  await verifyPage(routes[0]);
  await nav.getByRole('link', { name: 'Contact' }).click();
  await verifyPage(routes[1]);
  await nav.getByRole('link', { name: 'About' }).click();
  await verifyPage(routes[0]);
});

test('the deferred flow field draws an accessible decorative canvas without browser errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.goto('/');
  const field = page.locator('site-flow-field[data-flow-state="running"]');
  await expect(field).toHaveAttribute('aria-hidden', 'true');
  const canvas = field.locator('canvas[aria-hidden="true"]');
  await expect(canvas).toHaveCount(1);
  await page.waitForTimeout(2000);
  await expect.poll(() => canvas.evaluate((element: HTMLCanvasElement) => {
    const ctx = element.getContext('2d')!;
    return ctx.getImageData(0, 0, element.width, element.height).data.some((value, index) => index % 4 === 3 && value > 0);
  })).toBe(true);
  await expect(page.locator('site-flow-lab')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('the flow field follows reduced-motion preferences', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator('site-flow-field')).toHaveAttribute('data-flow-state', 'still');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect(page.locator('site-flow-field')).toHaveAttribute('data-flow-state', 'running');
});

test('the flow field resumes after loading in a hidden tab', async ({ page }) => {
  await page.addInitScript(() => {
    const visibility = window as Window & { flowHidden: boolean };
    visibility.flowHidden = true;
    Object.defineProperties(document, {
      hidden: { get: () => visibility.flowHidden },
      visibilityState: { get: () => visibility.flowHidden ? 'hidden' : 'visible' },
    });
  });
  await page.goto('/');
  const field = page.locator('site-flow-field');
  // Let the deferred field initialize and its first synchronization effect settle.
  await expect(field.locator('canvas')).toHaveAttribute('width', /\d+/);
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await expect(field).toHaveAttribute('data-flow-state', 'paused');
  await page.evaluate(() => {
    (window as Window & { flowHidden: boolean }).flowHidden = false;
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(field).toHaveAttribute('data-flow-state', 'running');
});

test('the flow field resumes when a hidden page becomes visible without a visibility event', async ({ page }) => {
  await page.addInitScript(() => {
    const visibility = window as Window & { flowHidden: boolean };
    visibility.flowHidden = true;
    Object.defineProperties(document, {
      hidden: { get: () => visibility.flowHidden },
      visibilityState: { get: () => visibility.flowHidden ? 'hidden' : 'visible' },
    });
  });
  await page.goto('/');
  const field = page.locator('site-flow-field');
  await expect(field.locator('canvas')).toHaveAttribute('width', /\d+/);
  await expect(field).toHaveAttribute('data-flow-state', 'paused');
  await page.evaluate(() => { (window as Window & { flowHidden: boolean }).flowHidden = false; });
  await page.mouse.move(200, 300);
  await expect(field).toHaveAttribute('data-flow-state', 'running');
});

test('the flow field starts cleanly in a zero-size viewport and draws once it has room', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  await page.addInitScript(() => {
    const view = window as Window & { flowCollapsed: boolean };
    view.flowCollapsed = true;
    const width = Object.getOwnPropertyDescriptor(window, 'innerWidth')!.get!;
    const height = Object.getOwnPropertyDescriptor(window, 'innerHeight')!.get!;
    Object.defineProperties(window, {
      innerWidth: { get: () => (view.flowCollapsed ? 0 : width.call(window)), configurable: true },
      innerHeight: { get: () => (view.flowCollapsed ? 0 : height.call(window)), configurable: true },
    });
  });
  await page.goto('/');
  const field = page.locator('site-flow-field');
  await expect(field).toHaveAttribute('data-flow-state', 'running');
  await expect(field.locator('canvas')).toHaveAttribute('width', '0');
  await page.evaluate(() => {
    (window as Window & { flowCollapsed: boolean }).flowCollapsed = false;
    window.dispatchEvent(new Event('resize'));
  });
  await expect(field.locator('canvas')).not.toHaveAttribute('width', '0');
  expect(errors).toEqual([]);
});

const pageColors = (page: Page) => page.evaluate(() => {
  const channels = getComputedStyle(document.documentElement).backgroundColor.match(/\d+/g)!.slice(0, 3);
  const background = `#${channels.map((n) => Number(n).toString(16).padStart(2, '0')).join('')}`;
  return { background, theme: document.querySelector('meta[name=theme-color]')?.getAttribute('content') };
});

test('the browser theme color matches each page background, before and after navigation', async ({ page, request }) => {
  const colors = { '/': '#006a6a', '/contact/': '#38569d' };
  for (const [path, color] of Object.entries(colors)) {
    const html = await (await request.get(path)).text();
    expect(html.match(/<meta[^>]*name="theme-color"[^>]*>/g)).toEqual([expect.stringContaining(color)]);
  }

  async function expectColor(path: keyof typeof colors) {
    await expect(page).toHaveURL(path);
    await expect.poll(() => pageColors(page)).toEqual({ background: colors[path], theme: colors[path] });
  }

  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.getByRole('navigation').getByRole('link', { name: 'Contact' }).click();
  await expectColor('/contact/');
  await page.getByRole('navigation').getByRole('link', { name: 'About' }).click();
  await expectColor('/');
});

for (const viewport of [{ width: 375, height: 667 }, { width: 320, height: 568 }]) {
  for (const route of routes) {
    test(`${route.path} fits a ${viewport.width}x${viewport.height} screen without scrolling`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto(route.path);
      await expect(page.locator('html')).toHaveAttribute('data-touch-steer');
      const height = await page.evaluate(() => document.documentElement.scrollHeight);
      expect(height).toBeLessThanOrEqual(viewport.height);
      await expect(page.locator('html')).toHaveCSS('touch-action', 'pinch-zoom');
    });
  }
}

test('a page taller than the screen keeps normal scrolling', async ({ page }) => {
  await page.setViewportSize({ width: 667, height: 375 });
  await page.goto('/contact/');
  await expect(page.locator('site-flow-field')).toHaveAttribute('data-flow-state', 'running');
  await expect(page.locator('html')).not.toHaveAttribute('data-touch-steer');
  const { scrollHeight, clientHeight } = await page.evaluate(() => {
    const { scrollHeight, clientHeight } = document.documentElement;
    return { scrollHeight, clientHeight };
  });
  expect(scrollHeight).toBeGreaterThan(clientHeight);
  await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
  await expect(page.getByRole('link', { name: 'LinkedIn' })).toBeInViewport();
});

test('a touch drag keeps reaching the flow field instead of panning the page', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, hasTouch: true, viewport: { width: 375, height: 667 } });
  const page = await context.newPage();
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-touch-steer');
  await page.evaluate(() => {
    const seen = { move: 0, cancel: 0, up: 0 };
    Object.assign(window, { seen });
    addEventListener('pointermove', () => seen.move++);
    addEventListener('pointercancel', () => seen.cancel++);
    addEventListener('pointerup', () => seen.up++);
  });

  const touch = await context.newCDPSession(page);
  await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 180, y: 560 }] });
  for (let step = 1; step <= 12; step++) {
    await touch.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 180, y: 560 - step * 30 }] });
  }
  await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });

  await expect.poll(() => page.evaluate(() => (window as unknown as { seen: object }).seen))
    .toEqual({ move: expect.any(Number), cancel: 0, up: 1 });
  expect(await page.evaluate(() => (window as unknown as { seen: { move: number } }).seen.move)).toBeGreaterThan(5);
  await context.close();
});

test('the production JavaScript excludes the development lab', async () => {
  const { readdir, readFile } = await import('node:fs/promises');
  const { join } = await import('node:path');
  const root = 'dist/website/browser';
  let files = 0;
  async function scan(directory: string) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) await scan(path);
      else if (entry.name.endsWith('.js')) {
        files++;
        const script = await readFile(path, 'utf8');
        expect(script, path).not.toContain('site-flow-lab');
        expect(script, path).not.toContain('Copy as site default');
      }
    }
  }
  await scan(root);
  expect(files).toBeGreaterThan(0);
});
