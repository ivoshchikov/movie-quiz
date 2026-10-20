import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { attackFixture, attackAnswers as answers } from './time-attack-fixture';
async function start(page:Page,level='Easy · 120 s'){
 await page.goto('/time-attack');await page.getByRole('radio',{name:level,exact:true}).click();await page.getByRole('button',{name:'Start Time Attack',exact:true}).click();
 await expect(page.getByRole('button',{name:answers[0],exact:true})).toBeEnabled();
}
async function end(page:Page){await page.getByRole('button',{name:'End run',exact:true}).click();await page.getByRole('button',{name:'End run & save'}).click();await expect(page.getByRole('heading',{name:'Time Attack result'})).toBeVisible();}
test('a guest can discover Time Attack, choose its own time pressure and save a negative result',async({page})=>{
 const d=await attackFixture(page);await page.goto('/');await page.getByRole('radio',{name:'Time Attack',exact:true}).click();await page.getByRole('radio',{name:'Hard · 60 s',exact:true}).click();await page.getByRole('button',{name:'Start Time Attack',exact:true}).click();
 await expect(page.getByRole('button',{name:answers[1],exact:true})).toBeEnabled();await page.keyboard.press('2');await expect(page.getByText('Incorrect. −1 point',{exact:true})).toBeVisible();expect(d.accepted).toBe(1);
 await page.clock.runFor(600);await expect(page.getByText('Question 2',{exact:true})).toBeVisible();await end(page);await expect(page.getByLabel('Score -1',{exact:true})).toBeVisible();await expect(page.getByText('Guest result.',{exact:false})).toBeVisible();
 expect(d.calls.find(c=>c.name==='time_attack_start')?.payload.p_level).toBe('hard');expect(d.calls.some(c=>['upsert_user_best','touch_question_stats'].includes(c.name))).toBe(false);
});
test('double clicks and an answer/skip race issue only one action; skip changes the single overall timer',async({page})=>{
 const d=await attackFixture(page);await start(page);await page.getByRole('button',{name:answers[0],exact:true}).evaluate(b=>{(b as HTMLButtonElement).click();(b as HTMLButtonElement).click();document.querySelector<HTMLButtonElement>('.hq-attack-skip')?.click();});
 await expect(page.getByText('Correct! +2 points')).toBeVisible();expect(d.accepted).toBe(1);await expect(page.locator('.hq-game-stat strong')).toHaveText('2');
 await page.clock.runFor(600);await expect(page.getByText('Question 2',{exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Skip · −3 s'})).toBeEnabled();await page.getByRole('button',{name:'Skip · −3 s'}).dblclick();
 await expect(page.getByText('Skipped. −3 seconds')).toBeVisible();await expect(page.locator('.hq-game-timer-label strong')).toHaveText('117 s');expect(d.accepted).toBe(2);
 await page.clock.runFor(600);await expect(page.getByText('Question 3',{exact:true})).toBeVisible();
});
test('the server clock expires during image loading and unanswered expiry costs no points',async({page})=>{
 const d=await attackFixture(page);let release=()=>{};const held=new Promise<void>(r=>release=r);
 await page.route('**/ta-image-1.svg',async route=>{await held;await route.fallback();});
 await page.goto('/time-attack');await page.getByRole('radio',{name:'Hard · 60 s',exact:true}).click();await page.getByRole('button',{name:'Start Time Attack',exact:true}).click();
 await expect(page.getByText('Loading image… The clock keeps running.',{exact:true})).toBeVisible();await page.clock.runFor(61000);await expect(page.getByRole('heading',{name:'Time Attack result'})).toBeVisible();await expect(page.getByLabel('Score 0',{exact:true})).toBeVisible();expect(d.accepted).toBe(0);release();
});
test('reload restores the original run, accepted answers and deadline without creating another attempt',async({page})=>{
 const d=await attackFixture(page);await start(page);await page.getByRole('button',{name:answers[0],exact:true}).click();await expect(page.getByText('Correct! +2 points')).toBeVisible();
 const g=[...d.games.values()][0], starts=d.calls.filter(c=>c.name==='time_attack_start').length;d.serverTime=Date.parse(g.started_at)+20000;
 page.once('dialog',dialog=>dialog.accept());await page.reload();await expect(page.locator('.hq-game-stat strong')).toHaveText('2');await expect(page.locator('.hq-game-timer-label strong')).toHaveText('100 s');
 expect([...d.games.keys()]).toEqual([g.id]);expect(d.calls.filter(c=>c.name==='time_attack_start')).toHaveLength(starts);expect(d.calls.some(c=>c.name==='time_attack_status'&&c.payload.p_session===g.id)).toBe(true);
});
test('lost action responses reconcile to the accepted result and never award points twice',async({page})=>{
 const d=await attackFixture(page);await start(page);d.loseActionResponse=true;await page.getByRole('button',{name:answers[0],exact:true}).click();
 await expect(page.getByText('Correct! +2 points')).toBeVisible();expect(d.accepted).toBe(1);await expect(page.locator('.hq-game-stat strong')).toHaveText('2');
});
test('a failed action stays locked and retry sends the same answer',async({page})=>{
 const d=await attackFixture(page);await start(page);d.failAction=true;await page.getByRole('button',{name:answers[1],exact:true}).click();await expect(page.getByRole('button',{name:'Retry Time Attack'})).toBeVisible();
 await expect(page.getByRole('button',{name:answers[0],exact:true})).toBeDisabled();d.failAction=false;await page.getByRole('button',{name:'Retry Time Attack'}).click();await expect(page.getByText('Incorrect. −1 point',{exact:true})).toBeVisible();
 const actions=d.calls.filter(c=>c.name==='time_attack_action');expect(actions.map(c=>c.payload.p_answer)).toEqual([answers[1],answers[1]]);expect(d.accepted).toBe(1);
});
test('signed-in results use server records and top ten plus own rank without exposing capability IDs to analytics',async({page})=>{
 const d=await attackFixture(page,{signedIn:true,size:1});
 const top=Array.from({length:10},(_,i)=>({rank:i+1,user_id:`player-${i}`,nickname:`Player ${i+1}`,score:20-i,score_time_ms:1000+i,updated_at:'2026-10-19T12:00:00Z'}));
 d.ranking={total:40,top,me:{rank:32,user_id:'fixture-user',nickname:'MovieFan',score:-1,score_time_ms:33000,updated_at:'2026-10-19T12:00:00Z'}};
 await page.goto('/time-attack');await page.getByText('Time Attack leaderboard',{exact:true}).first().click();await expect(page.getByRole('row')).toHaveCount(12);await expect(page.getByRole('row').last()).toContainText('32');
 await page.getByRole('button',{name:'Start Time Attack',exact:true}).click();await expect(page.getByRole('button',{name:answers[0],exact:true})).toBeEnabled();await page.getByRole('button',{name:answers[0],exact:true}).click();
 await expect(page.getByRole('heading',{name:'Time Attack result'})).toBeVisible();await expect(page.getByText('Saved with your account. Your first record!')).toBeVisible();await expect(page.getByText('Personal best: 2 points',{exact:false})).toBeVisible();
 const g=[...d.games.values()][0];const analytics=await page.evaluate(()=>JSON.stringify(window.dataLayer));expect(analytics).not.toContain(g.id);expect(analytics).not.toContain(g.round!.id);
});
test('a failed next request can recover the current question instead of getting stuck on feedback',async({page})=>{
 const d=await attackFixture(page);await start(page);await page.getByRole('button',{name:answers[0],exact:true}).click();await expect(page.getByText('Correct! +2 points')).toBeVisible();d.failNext=true;
 await page.clock.runFor(1000);await expect(page.getByRole('button',{name:'Retry Time Attack'})).toBeVisible();d.failNext=false;await page.getByRole('button',{name:'Retry Time Attack'}).click();await expect(page.getByText('Correct! +2 points')).toBeVisible();await page.clock.runFor(1000);await expect(page.getByText('Question 2',{exact:true})).toBeVisible();
});
test('image failure can be retried or skipped while the same server timer runs',async({page})=>{
 const d=await attackFixture(page);await page.route('**/ta-image-1.svg',route=>route.abort());await page.goto('/time-attack');await page.getByRole('button',{name:'Start Time Attack',exact:true}).click();
 await expect(page.getByRole('button',{name:'Retry image'})).toBeVisible();await page.clock.runFor(5000);await expect(page.locator('.hq-game-timer-label strong')).toHaveText('115 s');await page.getByRole('button',{name:'Skip · −3 s'}).click();await expect(page.getByText('Skipped. −3 seconds')).toBeVisible();expect(d.accepted).toBe(1);
});
for(const viewport of [{width:1440,height:900},{width:390,height:844},{width:320,height:568},{width:844,height:390}])test(`Time Attack is usable without clipped controls at ${viewport.width}x${viewport.height}`,async({page})=>{
 await page.setViewportSize(viewport);await attackFixture(page);await start(page);
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);expect(overflow).toBe(false);
 const answer=page.getByRole('button',{name:answers[0],exact:true});const box=await answer.boundingBox();expect(box!.width).toBeGreaterThan(100);expect(box!.height).toBeGreaterThanOrEqual(43);await expect(answer).toBeInViewport();await expect(page.getByRole('button',{name:'Skip · −3 s'})).toBeInViewport();
 const brand=await page.locator('.hq-play-header .hq-brand').boundingBox(), actions=await page.locator('.hq-play-actions').boundingBox();expect(brand!.x+brand!.width).toBeLessThanOrEqual(actions!.x);
 await page.screenshot({path:`../ui08-verification/time-attack-${viewport.width}.png`,fullPage:true});
});
test('Time Attack is indexed with initial HTML and its live route is noindex',async({page})=>{
 await attackFixture(page);await page.goto('/time-attack');await expect(page.getByRole('button',{name:'Start Time Attack',exact:true})).toBeEnabled();await page.clock.runFor(50);await expect(page).toHaveTitle('Movie & Actor Time Attack Quiz | Hard Quiz');await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href','https://hard-quiz.com/time-attack');
 await page.getByRole('button',{name:'Start Time Attack',exact:true}).click();await expect(page.getByRole('button',{name:answers[0],exact:true})).toBeEnabled();await page.clock.runFor(50);await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content','noindex, nofollow');
});

test('two tabs share the same run, accepted score and shortened deadline',async({page,context})=>{
 const d=await attackFixture(page);await start(page);const second=await context.newPage();await attackFixture(second,{games:d.games});await second.goto('/time-attack/play');
 await expect(second.getByRole('button',{name:answers[0],exact:true})).toBeEnabled();
 await page.getByRole('button',{name:answers[0],exact:true}).click();await expect(page.getByText('Correct! +2 points')).toBeVisible();await expect(second.locator('.hq-game-stat strong')).toHaveText('2');
 await page.clock.runFor(600);await expect(page.getByText('Question 2',{exact:true})).toBeVisible();await second.clock.runFor(600);
 await page.getByRole('button',{name:'Skip · −3 s'}).click();await expect(page.getByText('Skipped. −3 seconds')).toBeVisible();
 const remaining=await page.locator('.hq-game-timer-label strong').textContent();await expect(second.locator('.hq-game-timer-label strong')).toHaveText(remaining!);expect(d.games.size).toBe(1);await second.close();
});
test('a receipt finished in another tab replaces the active view after reconciliation',async({page})=>{
 const d=await attackFixture(page,{signedIn:true});await start(page);const g=[...d.games.values()][0];g.status='finished';g.finish_reason='exit';g.score_time_ms=0;g.elapsed_ms=0;g.version++;
 await page.evaluate(()=>window.dispatchEvent(new StorageEvent('storage',{key:'hq:quiz:activity:fixture-user',newValue:'another-run'})));
 await expect(page.getByRole('heading',{name:'Time Attack result'})).toBeVisible();await expect(page.getByText('Run ended.',{exact:true})).toBeVisible();await expect(page.getByRole('button',{name:answers[0],exact:true})).toHaveCount(0);
});
