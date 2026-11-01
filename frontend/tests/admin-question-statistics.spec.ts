import { test, expect, type Page } from "@playwright/test";
import { mockQuizApi, mockSignedIn } from "./fixtures";
const owner="112743d7-f683-4bbb-8117-068e89a00f22";
const panel=(p:Page)=>p.getByRole("region",{name:"Question statistics overview"});
const sample=()=>({rows:[
 {id:60,image_url:"general/g_00060.webp",correct_answer:"Test film 60",category_id:1,difficulty_level_id:1,admin_revision:1,shown:10,correct:4,accuracy:40},
 {id:61,image_url:"general/g_00061.webp",correct_answer:"Test film 61",category_id:2,difficulty_level_id:2,admin_revision:2,shown:0,correct:0,accuracy:null},
 {id:62,image_url:"general/g_00062.webp",correct_answer:"Test film 62",category_id:1,difficulty_level_id:1,admin_revision:1,shown:3,correct:1,accuracy:33.3},
],total:3,page:1,page_size:25,shown:13,correct:5,since:"2026-10-15T22:19:10Z",updated_at:"2026-11-02T12:00:00Z"});
async function fixture(page:Page,account=owner){
 const calls=await mockQuizApi(page);if(account)await mockSignedIn(page,account);
 const state={value:sample() as unknown,fail:false,reads:[] as Record<string,unknown>[],delay:null as Promise<void>|null};
 await page.route("**/rest/v1/rpc/is_admin",r=>r.fulfill({json:account===owner}));
 await page.route("**/rest/v1/rpc/admin_question_statistics",async r=>{
  state.reads.push(r.request().postDataJSON());const {value,fail,delay}=state;if(delay)await delay;
  await r.fulfill({status:fail?503:200,json:fail?{}:value});
 });
 await page.route("**/rest/v1/rpc/admin_question_bank",r=>r.fulfill({json:{rows:[],total:0,bank_total:0,page:1,page_size:25,summary:[]}}));
 return {state,calls};
}
const row=(p:Page,id:number)=>panel(p).getByRole("row").filter({has:p.getByRole("link",{name:new RegExp(`^View question ${id}:`)})});
test("third admin tab opens a private per-question table, with precise percentages and no gameplay writes",async({page})=>{
 const {state,calls}=await fixture(page);await page.goto("/admin/questions");
 const nav=page.getByRole("navigation",{name:"Administration"});await expect(nav.getByRole("link")).toHaveCount(3);
 await nav.getByRole("link",{name:"Question statistics",exact:true}).click();
 await expect(row(page,60)).toContainText("40%");await expect(row(page,62)).toContainText("33.3%");await expect(row(page,61)).toContainText("—");
 await expect(nav.getByRole("link",{name:"Question statistics",exact:true})).toHaveAttribute("aria-current","page");
 await expect(nav.getByRole("link",{name:"Question bank",exact:true})).not.toHaveAttribute("aria-current","page");
 expect(state.reads[0]).toEqual({p_expected_owner:owner,p_search:"",p_category_id:null,p_difficulty_id:null,p_mode:"all",p_versions:"all",p_sort:"shown_desc",p_page:1});
 await panel(page).getByText("How statistics work",{exact:true}).click();await expect(panel(page)).toContainText("correct answers ÷ shown × 100");
 expect(calls.filter(c=>/quiz_start|daily_begin|touch_question|submit_daily|time_attack_start/.test(c.name))).toEqual([]);
});
for(const account of ["","fixture-user"])test(`${account||"guest"} cannot see or request question statistics`,async({page})=>{
 const {state}=await fixture(page,account);await page.goto("/admin/question-statistics");
 await expect(page.getByRole("heading",{name:account?"Access denied":"Administration",exact:true})).toBeVisible();
 expect(state.reads).toHaveLength(0);await expect(panel(page)).toHaveCount(0);await expect(page.getByText("Test film 60")).toHaveCount(0);
});
test("filters and search are sent to the server, survive reload, and reset pending input",async({page})=>{
 const {state}=await fixture(page);await page.goto("/admin/question-statistics");await expect(row(page,60)).toBeVisible();
 await panel(page).getByLabel("Mode",{exact:true}).selectOption("time_attack");await panel(page).getByLabel("Versions",{exact:true}).selectOption("current");
 await panel(page).getByLabel("Category",{exact:true}).selectOption("2");await panel(page).getByLabel("Difficulty",{exact:true}).selectOption("2");
 await panel(page).getByLabel("Sort",{exact:true}).selectOption("accuracy_asc");await panel(page).getByLabel("Search",{exact:true}).fill("#60");
 await expect(page).toHaveURL(/q=%2360/);await expect.poll(()=>state.reads.at(-1)?.p_search).toBe("#60");
 expect(state.reads.at(-1)).toMatchObject({p_mode:"time_attack",p_versions:"current",p_category_id:2,p_difficulty_id:2,p_sort:"accuracy_asc"});
 await page.reload();await expect(row(page,60)).toBeVisible();await expect(panel(page).getByLabel("Search",{exact:true})).toHaveValue("#60");
 await panel(page).getByLabel("Search",{exact:true}).fill("pending text");await panel(page).getByRole("button",{name:"Reset filters"}).click();
 await expect(panel(page).getByLabel("Search",{exact:true})).toHaveValue("");await expect(page).toHaveURL(/\/admin\/question-statistics$/);
});
test("question bank link and browser Back preserve statistics filters",async({page})=>{
 await fixture(page);await page.goto("/admin/question-statistics?mode=daily&sort=id_asc");await expect(row(page,60)).toBeVisible();
 await row(page,60).getByRole("link").click();await expect(page).toHaveURL(/\/admin\/questions\?question=60$/);
 await page.goBack();await expect(page).toHaveURL(/mode=daily&sort=id_asc/);await expect(row(page,60)).toBeVisible();
 await expect(panel(page).getByLabel("Mode",{exact:true})).toHaveValue("daily");
});
test("initial and stale errors recover without fabricated zero data",async({page})=>{
 const {state}=await fixture(page);state.fail=true;await page.goto("/admin/question-statistics");
 await expect(panel(page).getByRole("alert")).toContainText("unavailable");await expect(row(page,60)).toHaveCount(0);
 state.fail=false;await panel(page).getByRole("button",{name:"Retry statistics"}).click();await expect(row(page,60)).toBeVisible();
 state.fail=true;await panel(page).getByRole("button",{name:"Refresh statistics"}).click();
 await expect(panel(page).getByRole("alert")).toContainText("last confirmed");await expect(row(page,60)).toContainText("40%");
});
for(const [index,value] of [{...sample(),shown:1},{...sample(),rows:[{...sample().rows[0],accuracy:99},...sample().rows.slice(1)]},{...sample(),since:"invalid"}].entries())test(`invalid statistics are not displayed case ${index}`,async({page})=>{
 const {state}=await fixture(page);state.value=value;await page.goto("/admin/question-statistics");
 await expect(panel(page).getByRole("alert")).toContainText("unavailable");await expect(row(page,60)).toHaveCount(0);
});
test("empty results remain usable and do not hide errors or navigation",async({page})=>{
 const {state}=await fixture(page);state.value={...sample(),rows:[],total:0,shown:0,correct:0};await page.goto("/admin/question-statistics?q=none");
 await expect(panel(page).getByRole("heading",{name:"No questions match these filters"})).toBeVisible();
 state.value=sample();await panel(page).getByRole("button",{name:"Show all questions"}).click();await expect(row(page,60)).toBeVisible();
});
test("late old reads cannot replace new filters or restore private data after logout",async({page})=>{
 const {state}=await fixture(page);let release=()=>{};state.delay=new Promise<void>(r=>{release=r;});
 await page.goto("/admin/question-statistics");await expect.poll(()=>state.reads.length).toBe(1);
 state.delay=null;state.value={...sample(),rows:[],total:0,shown:0,correct:0};await panel(page).getByLabel("Mode",{exact:true}).selectOption("daily");
 await expect(panel(page).getByRole("heading",{name:"No questions match these filters"})).toBeVisible();release();await expect(row(page,60)).toHaveCount(0);
 let late=()=>{};state.delay=new Promise<void>(r=>{late=r;});await panel(page).getByRole("button",{name:"Refresh statistics"}).click();
 await expect.poll(()=>state.reads.length).toBe(3);await page.getByRole("button",{name:"Account menu"}).click();await page.getByRole("menuitem",{name:"Log out"}).click();
 await expect(page.getByRole("link",{name:"Log in to administration"})).toBeVisible();late();await expect(panel(page)).toHaveCount(0);
});
test("pagination uses the returned server page and sends only the requested page",async({page})=>{
 const {state}=await fixture(page);const many=Array.from({length:25},(_,i)=>({...sample().rows[0],id:i+100}));
 state.value={...sample(),rows:many,total:26,shown:260,correct:104};await page.goto("/admin/question-statistics");
 await expect(panel(page).getByText("Page 1 of 2",{exact:true})).toBeVisible();state.value={...sample(),rows:[sample().rows[0]],total:26,page:2,shown:260,correct:104};
 await panel(page).getByRole("button",{name:"Next",exact:true}).click();await expect.poll(()=>state.reads.at(-1)?.p_page).toBe(2);
 await expect(panel(page).getByText("Page 2 of 2",{exact:true})).toBeVisible();await expect(panel(page).getByRole("button",{name:"Next",exact:true})).toBeDisabled();
});
for(const theme of ["light","dark","christmas"])for(const width of [320,1440])test(`${theme} statistics and three tabs fit at ${width}px`,async({page},info)=>{
 await page.addInitScript(t=>localStorage.setItem("hard-quiz-theme",t),theme);await page.setViewportSize({width,height:900});await fixture(page);
 await page.goto("/admin/question-statistics");await expect(row(page,60)).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await expect(panel(page).getByLabel("Mode",{exact:true})).toHaveCSS("appearance","none");
 expect(await panel(page).getByLabel("Mode",{exact:true}).evaluate(el=>el.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
 for(const link of await page.getByRole("navigation",{name:"Administration"}).getByRole("link").all())await expect(link).toBeInViewport();
 await page.screenshot({path:info.outputPath("statistics.png"),fullPage:true});
});

test("owner sign-in returns to the statistics filters instead of the home page",async({page})=>{
 await fixture(page,"");await page.goto("/admin/question-statistics?mode=daily");
 await page.getByRole("link",{name:"Log in to administration"}).click();
 await expect(page).toHaveURL(/\/login\?redirect=/);
 await mockSignedIn(page,owner);await page.route("**/rest/v1/rpc/is_admin",r=>r.fulfill({json:true}));
 await page.reload();await expect(page).toHaveURL(/\/admin\/question-statistics\?mode=daily$/);
 await expect(row(page,60)).toBeVisible();
});
