import { test, expect, type Page } from "@playwright/test";
import { mockQuizApi, mockSignedIn } from "./fixtures";
const owner="112743d7-f683-4bbb-8117-068e89a00f22";
const sample=()=>({hours24:45,days7:345,days30:12345,since:"2026-11-01T12:00:00Z",updated_at:"2026-11-01T18:00:00Z"});
const panel=(p:Page)=>p.getByRole("region",{name:"Page views",exact:true});
const count=(p:Page,label:string)=>panel(p).locator("dl > div").filter({has:p.getByText(label,{exact:true})}).locator("dd");
const nav=(p:Page,label:string)=>p.getByRole("navigation",{name:"Main navigation"}).getByRole("link",{name:label,exact:true});
async function telemetry(p:Page){
 const calls=await mockQuizApi(p),views:Record<string,string>[]=[],beats:Record<string,string>[]=[];
 await p.route("**/rest/v1/rpc/site_record_page_view",r=>{views.push(r.request().postDataJSON());return r.fulfill({status:204});});
 await p.route("**/rest/v1/rpc/site_visit_heartbeat",r=>{beats.push(r.request().postDataJSON());return r.fulfill({status:204});});
 return {calls,views,beats};
}
async function admin(p:Page,account=owner){
 const calls=await mockQuizApi(p);if(account)await mockSignedIn(p,account);
 const state={value:sample() as unknown,fail:false,reads:[] as unknown[],delay:null as Promise<void>|null};
 await p.route("**/rest/v1/rpc/is_admin",r=>r.fulfill({json:account===owner}));
 await p.route("**/rest/v1/rpc/admin_page_view_stats",async r=>{
  state.reads.push(r.request().postDataJSON());const {value,fail,delay}=state;if(delay)await delay;
  await r.fulfill({status:fail?503:200,json:fail?{}:value});
 });
 await p.route("**/rest/v1/rpc/admin_question_bank",r=>r.fulfill({json:{rows:[],total:0,bank_total:0,page:1,page_size:25,summary:[]}}));
 return {state,calls};
}
test("three page counters appear below visitors in every admin workspace",async({page})=>{
 const {state,calls}=await admin(page);
 for(const path of ["/admin/questions","/admin/questions/new","/admin/daily"]){
  await page.goto(path);await expect(count(page,"Last 24 hours")).toHaveText("45");
  await expect(count(page,"Last 7 days")).toHaveText("345");await expect(count(page,"Last 30 days")).toHaveText("12,345");
  const a=await page.getByRole("region",{name:"Visitor activity"}).boundingBox(),b=await panel(page).boundingBox();expect(b!.y).toBeGreaterThanOrEqual(a!.y+a!.height);
  await panel(page).getByText("How page views work",{exact:true}).click();
  await expect(panel(page)).toContainText("not ad impressions");await expect(panel(page)).toContainText("24, 168 and 720 hours");
 }
 expect(state.reads).toEqual(Array(3).fill({p_expected_owner:owner}));expect(calls.filter(c=>/quiz_start|daily_begin|submit|site_record/.test(c.name))).toEqual([]);
});
for(const account of ["","fixture-user"])test(`private counts stay hidden for ${account||"guest"}`,async({page})=>{
 const {state}=await admin(page,account);await page.goto("/admin/questions");
 await expect(page.getByRole("heading",{name:account?"Access denied":"Administration",exact:true})).toBeVisible();
 await expect(panel(page)).toHaveCount(0);expect(state.reads).toHaveLength(0);
});
test("independent errors recover, retain confirmed counts, and never invent zero",async({page})=>{
 const {state}=await admin(page);state.fail=true;await page.goto("/admin/questions");
 await expect(panel(page).getByRole("alert")).toContainText("unavailable");await expect(count(page,"Last 24 hours")).toHaveText("—");
 await expect(page.getByRole("region",{name:"Visitor activity"}).getByRole("alert")).toHaveCount(0);
 state.fail=false;await panel(page).getByRole("button",{name:"Retry page views"}).click();await expect(count(page,"Last 24 hours")).toHaveText("45");
 state.fail=true;await panel(page).getByRole("button",{name:"Refresh page views"}).click();
 await expect(panel(page).getByRole("alert")).toContainText("last confirmed counts");await expect(count(page,"Last 24 hours")).toHaveText("45");
 state.fail=false;state.value={...sample(),hours24:0,days7:0,days30:0};await panel(page).getByRole("button",{name:"Retry page views"}).click();
 await expect(count(page,"Last 24 hours")).toHaveText("0");
});
for(const bad of [{...sample(),hours24:-1},{...sample(),days7:"345"},{...sample(),days30:1},{...sample(),since:"2027-01-01T00:00:00Z"}])test(`reject malformed page counts ${JSON.stringify(bad)}`,async({page})=>{
 const {state}=await admin(page);state.value=bad;await page.goto("/admin/questions");
 await expect(panel(page).getByRole("alert")).toContainText("unavailable");await expect(count(page,"Last 24 hours")).toHaveText("—");
});
test("polling updates counts and a late response after logout cannot restore them",async({page})=>{
 await page.clock.install();const {state}=await admin(page);await page.goto("/admin/questions");await expect(count(page,"Last 24 hours")).toHaveText("45");
 state.value={...sample(),hours24:46};await page.clock.fastForward(31000);await expect(count(page,"Last 24 hours")).toHaveText("46");
 let release=()=>{};state.delay=new Promise<void>(r=>{release=r;});await panel(page).getByRole("button",{name:"Refresh page views"}).click();await expect.poll(()=>state.reads.length).toBe(3);
 await page.getByRole("button",{name:"Account menu"}).click();await page.getByRole("menuitem",{name:"Log out"}).click();
 await expect(page.getByRole("link",{name:"Log in to administration"})).toBeVisible();release();await expect(panel(page)).toHaveCount(0);
});
for(const theme of ["dark","light","christmas"])for(const width of [320,1440])test(`page views fit ${theme} at ${width}px`,async({page},info)=>{
 await page.addInitScript(t=>localStorage.setItem("hard-quiz-theme",t),theme);await page.setViewportSize({width,height:900});await admin(page);
 await page.goto("/admin/questions");await expect(count(page,"Last 30 days")).toHaveText("12,345");
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 const cards=await panel(page).locator("dl > div").evaluateAll(els=>els.map(el=>({x:el.getBoundingClientRect().x,y:el.getBoundingClientRect().y})));
 expect(width===320?new Set(cards.map(c=>c.x)).size:new Set(cards.map(c=>c.y)).size).toBe(1);
 await page.screenshot({path:info.outputPath("page-views.png"),fullPage:true});
});
test("loads, path transitions and Back count, filters and heartbeats do not",async({page})=>{
 await page.clock.install();const {views,beats,calls}=await telemetry(page);await page.goto("/?private=not-collected#secret");
 await expect(page.getByRole("button",{name:"Play Movie Stills"})).toBeEnabled();await expect.poll(()=>views.length).toBe(1);await expect.poll(()=>beats.length).toBe(1);
 expect(views[0].p_visitor).toBe(beats[0].p_visitor);expect(Object.keys(views[0]).sort()).toEqual(["p_view","p_visitor"]);
 await nav(page,"Blog").click();await expect.poll(()=>views.length).toBe(2);
 await page.getByRole("button",{name:/^Movie guides, /}).click();await expect(page).toHaveURL(/topic=streaming/);
 await page.evaluate(()=>{location.hash="not-another-view";});await page.clock.fastForward(61000);expect(views).toHaveLength(2);
 await page.locator(".hq-blog-card").first().getByRole("link").click();await expect.poll(()=>views.length).toBe(3);
 await page.goBack();await expect.poll(()=>views.length).toBe(4);expect(new Set(views.map(v=>v.p_view)).size).toBe(4);
 await page.reload();await expect.poll(()=>views.length).toBe(5);expect(new Set(views.map(v=>v.p_visitor)).size).toBe(1);
 expect(calls.filter(c=>/quiz_start|daily_begin|submit/.test(c.name))).toEqual([]);
});
test("lost confirmation retries the same view and preserves each queued route",async({page})=>{
 await page.clock.install();const {views}=await telemetry(page);let first=true,release=()=>{};const held=new Promise<void>(r=>{release=r;});
 await page.route("**/rest/v1/rpc/site_record_page_view",async r=>{views.push(r.request().postDataJSON());if(first){first=false;await held;}await r.fulfill({status:204});});
 await page.goto("/");await expect(page.getByRole("button",{name:"Play Movie Stills"})).toBeEnabled();await expect.poll(()=>views.length).toBe(1);
 await nav(page,"Blog").click();await expect(page.getByRole("heading",{name:"Blog",exact:true})).toBeVisible();
 await page.locator(".hq-blog-card").first().getByRole("link").click();await expect(page.getByRole("link",{name:"← Back to blog"}).first()).toBeVisible();
 const aborted=page.waitForEvent("requestfailed",r=>r.url().endsWith("/rpc/site_record_page_view"));await page.clock.fastForward(11000);await aborted;
 await page.clock.fastForward(5000);await expect.poll(()=>views.length).toBe(4);
 expect(views[0]).toEqual(views[1]);expect(new Set(views.map(v=>v.p_view)).size).toBe(3);release();
});
test("hidden and offline pages wait, then recover without recounting",async({page})=>{
 await page.clock.install();const {views}=await telemetry(page);
 await page.addInitScript(()=>Object.defineProperty(document,"visibilityState",{configurable:true,get:()=>"hidden"}));
 await page.goto("/");await expect(page.getByRole("button",{name:"Play Movie Stills"})).toBeEnabled();await page.clock.fastForward(61000);expect(views).toHaveLength(0);
 await page.evaluate(()=>{Object.defineProperty(document,"visibilityState",{configurable:true,get:()=>"visible"});document.dispatchEvent(new Event("visibilitychange"));});await expect.poll(()=>views.length).toBe(1);
 await page.evaluate(()=>Object.defineProperty(navigator,"onLine",{configurable:true,get:()=>false}));
 await nav(page,"Blog").click();await expect(page.getByRole("heading",{name:"Blog",exact:true})).toBeVisible();await page.clock.fastForward(61000);expect(views).toHaveLength(1);
 await page.evaluate(()=>{Object.defineProperty(navigator,"onLine",{configurable:true,get:()=>true});window.dispatchEvent(new Event("online"));document.dispatchEvent(new Event("visibilitychange"));});
 await expect.poll(()=>views.length).toBe(2);await page.clock.fastForward(61000);expect(views).toHaveLength(2);
});
for(const path of ["/?analytics=off","/admin/questions"])test(`collection excluded at ${path}`,async({page})=>{
 const {views}=await telemetry(page);await page.goto(path);
 await expect(page.getByRole(path.startsWith("/admin")?"heading":"button",{name:path.startsWith("/admin")?"Administration":"Play Movie Stills",exact:true})).toBeVisible();expect(views).toHaveLength(0);
});
test("owner and the owner's signed-out browser do not add views",async({page})=>{
 await page.clock.install();const {views}=await telemetry(page);await mockSignedIn(page,owner);await page.goto("/");await expect(page.getByRole("button",{name:"Account menu"})).toBeVisible();expect(views).toHaveLength(0);
 await page.getByRole("button",{name:"Account menu"}).click();await page.getByRole("menuitem",{name:"Log out"}).click();
 await nav(page,"Blog").click();await expect(page.getByRole("heading",{name:"Blog",exact:true})).toBeVisible();await page.clock.fastForward(61000);expect(views).toHaveLength(0);
});
test("preview pages never collect views",async({page})=>{
 const {views}=await telemetry(page);await page.route("http://preview.invalid:5173/**",async r=>{const response=await r.fetch({url:r.request().url().replace("preview.invalid","localhost")});await r.fulfill({response});});
 await page.goto("http://preview.invalid:5173/");await expect(page.getByRole("button",{name:"Play Movie Stills"})).toBeEnabled();expect(views).toHaveLength(0);
});
