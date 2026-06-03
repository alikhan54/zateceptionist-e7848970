
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

const programId=body.training_program_id; const tenantId=body.tenant_id;
if(!programId||!tenantId) return [{json:{success:false,error:'training_program_id + tenant_id required'}}];
const tcfg=(await get('/rest/v1/tenant_config?id=eq.'+encodeURIComponent(tenantId)+'&select=features'))[0]||{};
const heygenKey=(tcfg.features||{}).heygen_api_key;
if(!heygenKey) return [{json:{success:false,error:'No HeyGen key'}}];
const chs=await get('/rest/v1/hr_course_chapters?training_program_id=eq.'+programId+'&status=eq.generating&select=id,heygen_video_id,tenant_id,video_url');
const updated=[];
for(const ch of (chs||[])){
  if(!ch.heygen_video_id) continue;
  try{
    const st=await this.helpers.httpRequest({method:'GET',url:'https://api.heygen.com/v1/video_status.get?video_id='+encodeURIComponent(ch.heygen_video_id),headers:{'X-Api-Key':heygenKey},json:true,timeout:15000});
    const d=(st&&st.data)||{};
    if(d.status==='completed'&&d.video_url){
      let vurl=d.video_url,turl=d.video_url,emsg=null;
      if(ch.video_url&&ch.video_url.indexOf('/training-videos/')>=0){ vurl=ch.video_url; }
      else { const r=await rehost(ch.tenant_id,ch.id,d.video_url); vurl=r.video_url; turl=r.heygen_temp_url; if(r.error) emsg='rehost_failed: '+r.error; }
      await patch('/rest/v1/hr_course_chapters?id=eq.'+ch.id,{status:'ready',video_url:vurl,heygen_temp_url:turl,error_message:emsg,updated_at:now()});
      updated.push({id:ch.id,status:'ready',rehosted:vurl.indexOf('/training-videos/')>=0});
    }
    else if(d.status==='failed'){ await patch('/rest/v1/hr_course_chapters?id=eq.'+ch.id,{status:'failed',error_message:'render failed',updated_at:now()}); updated.push({id:ch.id,status:'failed'}); }
    else updated.push({id:ch.id,status:d.status||'pending'});
  }catch(e){ updated.push({id:ch.id,error:String(e&&e.message||e).slice(0,80)}); }
}
const all=await get('/rest/v1/hr_course_chapters?training_program_id=eq.'+programId+'&select=status');
const counts={}; (all||[]).forEach(a=>counts[a.status]=(counts[a.status]||0)+1);
return [{json:{success:true,program_id:programId,polled:(chs||[]).length,updated,counts}}];
