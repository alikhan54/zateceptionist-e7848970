
const SUPA='https://fncfbywkemsxwuiowxxe.supabase.co';
// T23: inline service-key follows existing platform pattern (same as the avatar workflow).
const SVC='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZuY2ZieXdrZW1zeHd1aW93eHhlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Njg2ODI3NSwiZXhwIjoyMDgyNDQ0Mjc1fQ.Q_Z47LEXi7WtYPAL4M18LIVUy7oTvq2VR79nVEIL4FE';
const SB={apikey:SVC,Authorization:'Bearer '+SVC};
const SBW=Object.assign({},SB,{'Content-Type':'application/json'});
const get=async(p)=>await this.helpers.httpRequest({method:'GET',url:SUPA+p,headers:SB,json:true});
const post=async(p,b)=>await this.helpers.httpRequest({method:'POST',url:SUPA+p,headers:Object.assign({},SBW,{Prefer:'return=representation'}),body:JSON.stringify(b),json:true});
const patch=async(p,b)=>await this.helpers.httpRequest({method:'PATCH',url:SUPA+p,headers:Object.assign({},SBW,{Prefer:'return=minimal'}),body:JSON.stringify(b),json:true});
const now=()=>new Date().toISOString();
// --- RE-HOST: download temp HeyGen url -> upload to Supabase 'training-videos' -> permanent public url ---
const rehost=async(tenantId,chapterId,heygenUrl)=>{
  try{
    const https=require('https');
    const dl=await this.helpers.httpRequest({method:'GET',url:heygenUrl,encoding:'arraybuffer',timeout:120000});
    const buf=Buffer.isBuffer(dl)?dl:(dl&&dl.data?Buffer.from(dl.data):Buffer.from(dl));
    const path=encodeURIComponent(tenantId)+'/'+encodeURIComponent(chapterId)+'.mp4';
    await new Promise((resolve,reject)=>{
      const rq=https.request({hostname:'fncfbywkemsxwuiowxxe.supabase.co',path:'/storage/v1/object/training-videos/'+path,method:'POST',headers:{apikey:SVC,Authorization:'Bearer '+SVC,'Content-Type':'video/mp4','x-upsert':'true','Content-Length':buf.length}},res=>{let d='';res.on('data',x=>d+=x);res.on('end',()=>{(res.statusCode>=200&&res.statusCode<300)?resolve(d):reject(new Error('upload HTTP '+res.statusCode+' '+String(d).slice(0,150)));});});
      rq.on('error',reject); rq.write(buf); rq.end();
    });
    return {video_url:SUPA+'/storage/v1/object/public/training-videos/'+path,heygen_temp_url:heygenUrl,error:null};
  }catch(e){ return {video_url:heygenUrl,heygen_temp_url:heygenUrl,error:String(e&&e.message||e).slice(0,160)}; }
};
const raw=$input.first().json; const body=raw.body||raw;

const evt=body.event_type||body.type||'';
const data=body.event_data||body.data||body;
const videoId=data.video_id||data.videoId||null;
const callbackId=data.callback_id||data.callbackId||null;
const url=data.url||data.video_url||null;
if(!videoId&&!callbackId) return [{json:{success:false,error:'no video_id/callback_id in payload',got:JSON.stringify(body).slice(0,200)}}];
const q=callbackId?('/rest/v1/hr_course_chapters?id=eq.'+encodeURIComponent(callbackId)+'&select=id,status,tenant_id,video_url'):('/rest/v1/hr_course_chapters?heygen_video_id=eq.'+encodeURIComponent(videoId)+'&select=id,status,tenant_id,video_url');
const rows=await get(q); const row=Array.isArray(rows)&&rows[0];
if(!row) return [{json:{success:false,error:'no chapter matched',video_id:videoId,callback_id:callbackId}}];
const failed=/fail/i.test(evt);
const ready=(!failed)&&!!url;
const upd={status:ready?'ready':(failed?'failed':row.status),error_message:failed?('heygen: '+evt):null,updated_at:now()};
if(ready&&url){
  if(row.video_url&&row.video_url.indexOf('/training-videos/')>=0){ upd.video_url=row.video_url; }
  else { const r=await rehost(row.tenant_id,row.id,url); upd.video_url=r.video_url; upd.heygen_temp_url=r.heygen_temp_url; if(r.error) upd.error_message='rehost_failed: '+r.error; }
}
await patch('/rest/v1/hr_course_chapters?id=eq.'+row.id,upd);
return [{json:{success:true,chapter_id:row.id,event:evt,status:upd.status,video_url:upd.video_url||url,rehosted:!!(upd.video_url&&upd.video_url.indexOf('/training-videos/')>=0)}}];
