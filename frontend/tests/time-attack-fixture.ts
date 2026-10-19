import type { Page } from '@playwright/test';
import type { AttackGame, AttackRound } from '../src/timeAttack/api';
import { mockQuizApi, mockSignedIn } from './fixtures';
import { gameAnswers } from './game-fixtures';
export { gameAnswers as attackAnswers };
const epoch=new Date('2026-10-19T12:00:00Z');
export async function attackFixture(page: Page, options: {signedIn?:boolean;size?:number;resume?:AttackGame;games?:Map<string,AttackGame>}={}) {
  await page.clock.install({time:epoch});await page.clock.pauseAt(new Date(epoch.getTime()+1000));
  const calls=await mockQuizApi(page);if(options.signedIn)await mockSignedIn(page);
  const games=options.games??new Map<string,AttackGame>();if(options.resume)games.set(options.resume.id,options.resume);
  const data={calls,games,accepted:0,failAction:false,loseActionResponse:false,failNext:false,failFinish:false,failCatalog:false,holdAction:null as Promise<void>|null,
    ranking:{total:0,top:[],me:null} as unknown,serverTime:null as number|null};
  const now=async()=>data.serverTime??await page.evaluate(()=>Date.now());
  function round(number:number,t:number):AttackRound{return{id:`00000000-0000-4000-8000-${String(number).padStart(12,'0')}`,number,question_id:9000+number,image_url:`https://quiz-fixture.supabase.co/ta-image-${number}.svg`,options:gameAnswers,issued_at:new Date(t).toISOString(),next_at:null,selected:null,outcome:null};}
  function finish(g:AttackGame,t:number,reason:'time-up'|'completed'|'exit'){
    if(g.status==='finished')return;g.status='finished';g.finish_reason=reason;g.elapsed_ms=Math.max(0,t-Date.parse(g.started_at));g.version++;
    g.score_time_ms??=g.elapsed_ms;if(g.round&&!g.round.outcome){g.round.outcome='abandoned';g.round.next_at=new Date(t+500).toISOString();}
    if(g.owner&&g.bank_size){g.record_outcome='first';g.personal_best={score:g.score,score_time_ms:g.score_time_ms};}
  }
  await page.route('**/ta-image-*.svg',route=>route.fulfill({contentType:'image/png',path:'tests/assets/question-frame.png'}));
  await page.route('**/rest/v1/rpc/time_attack_*',async route=>{
    const name=new URL(route.request().url()).pathname.split('/').pop()!;
    const p=route.request().postDataJSON()??{};calls.push({name,payload:p});
    if(name==='time_attack_catalog')return data.failCatalog?route.fulfill({status:503,body:'{}'}):route.fulfill({json:{categories:[{id:1,name:'All movies',bank_size:100},{id:2,name:'Actors',bank_size:200}],levels:[{key:'easy',name:'Easy',duration_secs:120},{key:'medium',name:'Medium',duration_secs:90},{key:'hard',name:'Hard',duration_secs:60}]}});
    if(name==='time_attack_leaderboard')return route.fulfill({json:data.ranking});
    const t=await now();
    if(name==='time_attack_active'){const g=[...games.values()].find(g=>g.status==='active');return route.fulfill({json:g??null});}
    let g=games.get(p.p_session);
    if(name==='time_attack_start'&&!g){
      const duration=p.p_level==='hard'?60:p.p_level==='medium'?90:120;
      g={id:p.p_session,owner:options.signedIn?'fixture-user':null,category_id:p.p_category_id,level:p.p_level,duration_secs:duration,
        score:0,correct:0,wrong:0,skipped:0,version:1,bank_size:options.size??20,started_at:new Date(t).toISOString(),deadline_at:new Date(t+duration*1000).toISOString(),server_now:new Date(t).toISOString(),elapsed_ms:0,score_time_ms:null,status:'active',finish_reason:null,
        previous_best:null,personal_best:null,record_outcome:null,round:round(1,t)};
      games.set(g.id,g);
    }
    if(!g)return route.fulfill({status:403,json:{message:'Time Attack unavailable'}});
    g.server_now=new Date(t).toISOString();if(g.status==='active'&&t>=Date.parse(g.deadline_at))finish(g,Date.parse(g.deadline_at),'time-up');
    if(name==='time_attack_action'){
      if(data.holdAction)await data.holdAction;
      if(data.failAction)return route.fulfill({status:503,json:{message:'Fixture action unavailable'}});
      if(g.status==='active'&&g.round?.id===p.p_round&&!g.round.outcome){
        data.accepted++;g.version++;g.round.selected=p.p_answer;g.round.next_at=new Date(t+500).toISOString();
        if(p.p_action==='skip'){g.round.outcome='skipped';g.skipped++;g.deadline_at=new Date(Math.max(t,Date.parse(g.deadline_at)-3000)).toISOString();}
        else{g.round.outcome=p.p_answer===gameAnswers[0]?'correct':'wrong';if(g.round.outcome==='correct'){g.correct++;g.score+=2;}else{g.wrong++;g.score--;}g.score_time_ms=t-Date.parse(g.started_at);}
        if(t>=Date.parse(g.deadline_at))finish(g,t,'time-up');else if(g.round.number===g.bank_size)finish(g,t,'completed');
      }
      if(data.loseActionResponse){data.loseActionResponse=false;return route.abort();}
    }
    if(name==='time_attack_next'){
      if(data.failNext)return route.fulfill({status:503,body:'{}'});
      if(g.status==='active'&&g.round?.id===p.p_round&&g.round.outcome&&t>=Date.parse(g.round.next_at!)){g.round=round(g.round.number+1,t);g.version++;}
    }
    if(name==='time_attack_finish'){
      if(data.failFinish)return route.fulfill({status:503,body:'{}'});finish(g,t,'exit');
    }
    return route.fulfill({json:g});
  });
  return data;
}
