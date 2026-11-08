import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { mockHumanBrowser, mockQuizApi } from './fixtures';

const metadata = JSON.parse(readFileSync(new URL('../src/publicDocumentMetadata.json', import.meta.url), 'utf8')) as Record<string, { heading: string; title: string; url: string }>;
const details = JSON.parse(readFileSync(new URL('../src/publicSiteDetails.json', import.meta.url), 'utf8')) as { contactDetailsApproved: boolean; projectBrand: string; contactEmail: string };

for (const [path, data] of Object.entries(metadata)) {
  test(`${path} is public, has metadata and works without starting a game`, async ({ page }) => {
    const calls = await mockQuizApi(page);
    await page.goto(`/${path}`);
    await expect(page.getByRole('heading', { level:1, name:data.heading, exact:true })).toBeVisible();
    await expect(page).toHaveTitle(data.title);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href',data.url);
    await expect(page.getByRole('dialog')).toHaveCount(0);
    const footer=page.getByRole('navigation',{name:'Site information'});
    for (const label of ['About','Privacy Policy','Contact','How to play']) await expect(footer.getByRole('link',{name:label,exact:true})).toHaveCount(1);
    expect(calls.filter(call=>/quiz_start|start_daily_session|ta_start|tt_start/.test(call.name))).toEqual([]);
    if (!details.contactDetailsApproved) await expect(page.locator('a[href^="mailto:"]')).toHaveCount(0);
    else {
      const contact = page.locator('.hq-info-contact-address');
      await expect(contact).toContainText(`Hard Quiz is a ${details.projectBrand} project.`);
      await expect(contact).toContainText(`For general enquiries and privacy requests, contact ${details.contactEmail}.`);
      await expect(contact.getByRole('link', {name: details.contactEmail, exact: true})).toHaveAttribute('href', new RegExp('^mailto:sound\\.media\\.ai%40gmail\\.com\\?subject='));
    }
  });
}

test('footer links, back navigation and contents anchors keep the right page and focus',async ({page})=>{
  await mockQuizApi(page);
  await page.goto('/about');
  await page.getByRole('navigation',{name:'Site information'}).getByRole('link',{name:'Contact',exact:true}).click();
  await page.getByRole('navigation',{name:'On this page'}).getByRole('link',{name:'Privacy requests',exact:true}).click();
  await expect(page).toHaveURL(/\/contact#privacy-requests$/);
  await expect(page.getByRole('heading',{name:'Privacy requests',exact:true})).toBeFocused();
  await page.goBack(); await page.goBack();
  await expect(page.getByRole('heading',{name:'About Hard Quiz',exact:true})).toBeVisible();
});

test('the privacy page stays unmeasured and its settings link opens choices without granting',async({page})=>{
  await mockHumanBrowser(page); await mockQuizApi(page);
  let optional=0;
  await page.route('**/rest/v1/rpc/site_visit_heartbeat',route=>{optional++;return route.fulfill({status:204});});
  await page.route('**/rest/v1/rpc/site_record_page_view',route=>{optional++;return route.fulfill({status:204});});
  await page.goto('/privacy');
  await expect(page.locator('.hq-info-choice [role="status"]').first()).toContainText('Analytics is off on this policy page');
  expect(optional).toBe(0);
  await page.getByRole('button',{name:'Turn off analytics',exact:true}).click();
  expect(await page.evaluate(()=>localStorage.getItem('hq_analytics_opt_out'))).toBe('1');
  expect(await page.locator('#hq-google-cmp, script[src*="googletagmanager"]').count()).toBe(0);
  await page.locator('.hq-info-choice').getByRole('link',{name:'Privacy settings',exact:true}).click();
  await expect(page).toHaveURL(/\/\?privacy=settings$/);
  await expect(page.getByRole('dialog')).toBeVisible();
  expect(optional).toBe(0);
});

test('the sign-in form links to privacy without sending a sign-in request', async({page})=>{
  const calls=await mockQuizApi(page);
  await page.goto('/login');
  await page.locator('.hq-login-form').getByRole('link',{name:'Privacy Policy',exact:true}).click();
  await expect(page).toHaveURL(/\/privacy$/);
  await expect(page.getByRole('heading',{name:'Privacy Policy',exact:true})).toBeVisible();
  expect(calls.filter(call=>/sign|token/.test(call.name))).toEqual([]);
});

for (const width of [320,390,1440]) for (const theme of ['light','dark','christmas']) {
  test(`documents and footer fit ${width}px in ${theme}`,async({page})=>{
    await mockQuizApi(page);
    await page.setViewportSize({width,height:900});
    await page.addInitScript(value=>localStorage.setItem('hard-quiz-theme',value),theme);
    for(const path of ['/about','/privacy','/contact']) {
      await page.goto(path);
      await expect(page.locator('.hq-info-page')).toBeVisible();
      await expect(page.locator('html')).toHaveAttribute('data-theme',theme);
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
      const links=page.getByRole('navigation',{name:'Site information'}).getByRole('link');
      for(const link of await links.all()) {const box=await link.boundingBox();expect(box?.height).toBeGreaterThanOrEqual(44);}
    }
  });
}
