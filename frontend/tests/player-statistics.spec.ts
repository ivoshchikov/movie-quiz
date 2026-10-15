import { test, expect } from '@playwright/test';
import { mockQuizApi, mockSignedIn } from './fixtures';
const stats = { tracking_since:'2026-10-15T12:00:00Z',normal:{games:8,correct:12,wrong:3,timeouts:1,abandoned:2,average_ms:2450,best_streak:7,unique_questions:14},
 breakdown:[{category_id:1,difficulty_id:1,correct:12,wrong:3,timeouts:1,abandoned:2,average_ms:2450}],trend:[{d:'2026-10-15',correct:12,wrong:3,timeouts:1}],
 daily_calendar:[{d:'2026-10-13',outcome:'correct',time_spent:8},{d:'2026-10-14',outcome:'missed',time_spent:null},{d:'2026-10-15',outcome:'wrong',time_spent:5}] };
for(const theme of ['light','dark','halloween'])for(const width of [320,1440])test(`private statistics render in ${theme} at ${width}px`,async({page},info)=>{
 await mockQuizApi(page);await mockSignedIn(page);await page.setViewportSize({width,height:900});await page.addInitScript(theme=>localStorage.setItem('hard-quiz-theme',theme),theme);
 await page.route('**/rest/v1/rpc/my_game_stats',r=>r.fulfill({contentType:'application/json',body:JSON.stringify(stats)}));
 await page.goto('/profile');await expect(page.locator('html')).toHaveAttribute('data-theme',theme);const section=page.getByRole('region',{name:'Playing statistics'});await expect(section.getByText('75%',{exact:true}).first()).toBeVisible();await expect(section.getByText('2.5 s',{exact:true})).toBeVisible();await expect(page.getByRole('list',{name:'Daily result calendar'}).locator('li')).toHaveCount(3);
 await expect(section.locator('img')).toHaveCount(0);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await section.screenshot({path:info.outputPath('statistics.png')});
});
test('private statistics failures retry without hiding existing best records',async({page})=>{
 await mockQuizApi(page);await mockSignedIn(page);let fail=true;
 await page.route('**/rest/v1/rpc/my_game_stats',r=>r.fulfill({status:fail?503:200,contentType:'application/json',body:JSON.stringify(fail?{message:'unavailable'}:stats)}));
 await page.goto('/profile');await expect(page.getByRole('alert').filter({hasText:'Statistics could not be loaded'})).toBeVisible();await expect(page.getByRole('heading',{name:'Personal bests'})).toBeVisible();fail=false;await page.getByRole('button',{name:'Retry statistics'}).click();await expect(page.getByText('2.5 s',{exact:true})).toBeVisible();
});
