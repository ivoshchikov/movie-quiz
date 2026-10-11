import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { webcrypto } from 'node:crypto';
import { createHandler } from '../functions/admin-questions/handler.js';
import { imageHeader, decodeWebp, sha256 } from '../functions/admin-questions/image.js';
if(!globalThis.crypto)globalThis.crypto=webcrypto;
const image=new Uint8Array(await readFile(new URL('./assets/question.webp',import.meta.url)));
const owner='112743d7-f683-4bbb-8117-068e89a00f22';
const id='00000000-0000-4000-8000-000000000001';
const data={id,category_id:1,difficulty_level_id:1,options:['One','Two','Three','Four'],correct_index:0,source_hash:'a'.repeat(64)};
const request=(question=data,bytes=image)=>{const form=new FormData();form.append('question',JSON.stringify(question));form.append('image',new Blob([bytes],{type:'image/webp'}),'question.webp');return new Request('https://fixture.test/admin-questions',{method:'POST',headers:{Origin:'https://hard-quiz.com'},body:form});};
function fixture(){
  const objects=new Map(),jobs=new Map(),uploads=[],calls=[];let number=100,questionId=300;
  const state={denied:false,loseUpload:false,loseCommit:false,failCleanup:false,collision:false,duplicate:false,decodeCount:0};
  const handler=createHandler({
    authorize:async()=>state.denied?null:owner,
    decode:async bytes=>{state.decodeCount++;return decodeWebp(bytes);},
    rpc:async(name,p)=>{
      calls.push(name);
      const j=jobs.get(p.p_id);
      if(name==='admin_import_reserve'){
        if(j){if(j.fingerprint!==p.p_fingerprint)throw Error('Import data changed');return j;}
        if(state.duplicate&&!p.p_allow_duplicate)return {status:'duplicate',question_id:71};
        const job={id:p.p_id,status:'reserved',image_path:`general/g_${String(++number).padStart(5,'0')}.webp`,fingerprint:p.p_fingerprint,file_hash:p.p_hash};jobs.set(p.p_id,job);return job;
      }
      if(name==='admin_import_claim'){if(j.status==='committed')return j;if(j.lease_token)return {status:'busy'};j.lease_token=crypto.randomUUID();return {...j};}
      if(name==='admin_import_object'){
        if(state.collision&&!objects.has(`movies/${p.p_path}`)){state.collision=false;objects.set(`movies/${p.p_path}`,{bytes:new Uint8Array([1]),metadata:{external:true}});}
        const object=objects.get(`movies/${p.p_path}`);return object?{user_metadata:object.metadata}:null;
      }
      if(name==='admin_import_repath'){j.image_path=`general/g_${String(++number).padStart(5,'0')}.webp`;return j.image_path;}
      if(name==='admin_import_finish'){
        if(j.status==='committed')return j;
        const object=objects.get(`movies/${j.image_path}`);assert.equal(object.metadata.sha256,p.p_hash);assert.equal(object.metadata.hq_import_id,p.p_id);
        j.status='committed';j.question_id=++questionId;
        if(state.loseCommit){state.loseCommit=false;throw Error('Connection lost after commit');}
        return {...j};
      }
      if(name==='admin_import_release'){if(j.status!=='committed')j.lease_token=null;return null;}
      if(name==='admin_import_cleanup_ack')return null;
      if(name==='admin_import_cleanup')return [];
      throw Error(name);
    },
    storage:{
      download:async(bucket,path)=>objects.get(`${bucket}/${path}`)?.bytes??null,
      upload:async(bucket,path,bytes,metadata)=>{
        assert.equal(objects.has(`${bucket}/${path}`),false,'never overwrite');uploads.push(`${bucket}/${path}`);objects.set(`${bucket}/${path}`,{bytes,metadata});
        if(bucket==='movies'&&state.loseUpload){state.loseUpload=false;throw Error('Timeout after file persisted');}
      },
      remove:async(bucket,path)=>{if(state.failCleanup)throw Error('Cleanup unavailable');objects.delete(`${bucket}/${path}`);},
    },
  });return {handler,state,objects,jobs,uploads,calls};
}
test('decode the complete WebP and validate dimensions; headers alone are insufficient',async()=>{
 const header=imageHeader(image,1920),decoded=await decodeWebp(image);assert.deepEqual(header,{width:1920,height:960});assert.equal(decoded.width,header.width);assert.equal(decoded.height,header.height);
 await assert.rejects(decodeWebp(image.subarray(0,30)));assert.throws(()=>imageHeader(image,1600),/dimensions/);
 const metadata=new Uint8Array(image.length+8);metadata.set(image);metadata.set(new TextEncoder().encode('EXIF'),image.length);new DataView(metadata.buffer).setUint32(4,metadata.length-8,true);assert.throws(()=>imageHeader(metadata,1920),/metadata/);
});
test('authorization happens before image parsing, decoding, SQL writes or Storage',async()=>{
 const f=fixture();f.state.denied=true;const response=await f.handler(request());assert.equal(response.status,403);assert.equal(f.state.decodeCount,0);assert.equal(f.calls.length,0);assert.equal(f.uploads.length,0);
});
test('four distinct valid answers and real image bytes are required',async()=>{
 for(const changed of [{options:['One','one','Three','Four']},{options:['One','Two','Three','\u0000']},{correct_index:4},{category_id:8}]){
  const f=fixture();assert.equal((await f.handler(request({...data,...changed}))).status,400);assert.equal(f.uploads.length,0);
 }
 const f=fixture();assert.equal((await f.handler(request(data,new Uint8Array(50)))).status,400);assert.equal(f.uploads.length,0);
 const invalid=new Request('https://fixture.test',{method:'POST',headers:{'Content-Type':'application/json'},body:'{'});assert.equal((await f.handler(invalid)).status,400);
 for(const value of [null,[],42,'question']) {
  assert.equal((await f.handler(request(value))).status,400);
  const invalidAction=new Request('https://fixture.test',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(value)});
  assert.equal((await f.handler(invalidAction)).status,400);
 }
});
test('the streamed request size is bounded even without a Content-Length header',async()=>{
 const f=fixture();const stream=new ReadableStream({start(c){c.enqueue(new Uint8Array(1200001));c.close();}});
 const response=await f.handler(new Request('https://fixture.test',{method:'POST',body:stream,duplex:'half'}));assert.equal(response.status,413);assert.equal(f.state.decodeCount,0);
});
test('both persisted file and SQL result are confirmed; repeating the same ID adds one question',async()=>{
 const f=fixture();const first=await (await f.handler(request())).json(),second=await (await f.handler(request())).json();
 assert.equal(first.status,'committed');assert.equal(first.question_id,301);assert.equal(second.question_id,301);assert.equal(f.jobs.size,1);assert.equal(f.uploads.filter(p=>p.startsWith('movies/')).length,1);
 assert.equal(await sha256(f.objects.get(`movies/${first.image_path}`).bytes),await sha256(image));
 assert.equal(f.objects.has(`question-staging/${owner}/${id}.webp`),false);
 assert.ok(f.calls.every(name=>!['start_daily_session','submit_daily_result','touch_question_stats'].includes(name)));
});
test('a lost upload response reuses the confirmed object; no second filename is allocated',async()=>{
 const f=fixture();f.state.loseUpload=true;const result=await f.handler(request());assert.equal(result.status,200);assert.equal(f.uploads.filter(p=>p.startsWith('movies/')).length,1);
});
test('a lost SQL response is reconciled by the same immutable operation ID',async()=>{
 const f=fixture();f.state.loseCommit=true;assert.equal((await f.handler(request())).status,503);const result=await (await f.handler(request())).json();assert.equal(result.question_id,301);assert.equal(f.uploads.filter(p=>p.startsWith('movies/')).length,1);
 assert.equal((await f.handler(request({...data,correct_index:1}))).status,400);
});
test('a public path occupied by another object is skipped and never overwritten',async()=>{
 const f=fixture();f.state.collision=true;const result=await (await f.handler(request())).json();assert.equal(result.image_path,'general/g_00102.webp');assert.deepEqual(f.objects.get('movies/general/g_00101.webp').metadata,{external:true});
});
test('duplicate detection asks for an explicit choice; cleanup failure cannot undo Added',async()=>{
 const f=fixture();f.state.duplicate=true;const duplicate=await f.handler(request());assert.equal(duplicate.status,409);assert.equal((await duplicate.json()).question_id,71);assert.equal(f.uploads.length,0);
 f.state.failCleanup=true;const response=await f.handler(request({...data,allow_duplicate:true}));assert.equal(response.status,200);assert.equal((await response.json()).status,'committed');
});

test('replacement uploads carry an immutable target and expected revision through the guarded service RPC',async()=>{
 const calls=[];
 const handler=createHandler({authorize:async()=>owner,decode:decodeWebp,storage:{},rpc:async(name,args)=>{
  calls.push({name,args});assert.equal(name,'admin_edit_import_reserve');assert.equal(args.p_question_id,42);assert.equal(args.p_revision,3);
  return {status:'committed',question_id:42,image_path:'general/g_00401.webp'};
 }});
 const response=await handler(request({...data,edit_question_id:42,edit_revision:3}));assert.equal(response.status,200);assert.equal((await response.json()).question_id,42);
 assert.equal(calls.length,1);
 assert.equal((await handler(request({...data,edit_question_id:42,edit_revision:0}))).status,400);assert.equal(calls.length,1);
 const conflicting=createHandler({authorize:async()=>owner,decode:decodeWebp,storage:{},rpc:async()=>{throw Error('Question changed. Reload before editing.');}});
 const conflict=await conflicting(request({...data,edit_question_id:42,edit_revision:3}));assert.equal(conflict.status,409);assert.equal((await conflict.json()).status,'conflict');
});
