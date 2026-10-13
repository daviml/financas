'use strict';
/* =========================================================
   Estado do usuário, recorrências, persistência e sincronização
   ========================================================= */
const LOCAL_PREFIX='fin-data:';
let S=null,USER=null,DKEY=null;
const UI={tab:'inicio',month:null,filterCat:'',filterMethod:'',search:'',sheetMode:'plan'};
const TABS=['inicio','entradas','lanc','contas','orc','dividas','cartoes','metas','ajustes'];

function seed(){
  const start=todayYM();
  return{v:2,settings:{start,end:ymAdd(start,24),theme:'auto',savingsRate:0.6,folhaFecha:20,onboarded:false},
    items:[],status:{},tx:[],resAdj:[],cards:[],goals:[],del:{}};
}
const DIA_PRESETS=[['Mercado','🛒'],['Combustível / transporte','⛽'],['Alimentação fora / delivery','🍔'],['Farmácia / saúde','💊'],['Casa / manutenção','🏠'],['Lazer','🎉'],['Compras / pessoal','🛍️'],['Filhos / escola','🎒'],['Pets','🐾'],['Presentes','🎁'],['Outros','📦']];
const FIXA_PRESETS=[['Aluguel / prestação da casa','🏠'],['Condomínio','🏢'],['Energia','💡'],['Água','🚿'],['Internet','🌐'],['Celular','📱'],['Gás','🔥'],['Plano de saúde','🩺'],['Escola / faculdade','🎓'],['Streaming / assinaturas','📺'],['Academia','🏋️'],['Seguro','🛡️']];

function normalize(D){
  D.v=2;D.settings=D.settings||{};
  const s=D.settings;
  if(!s.start)s.start=todayYM();
  if(!s.end)s.end=ymAdd(todayYM(),24);
  if(s.savingsRate==null)s.savingsRate=0.6;
  if(s.folhaFecha==null)s.folhaFecha=20;
  if(!s.theme)s.theme='auto';
  D.items=D.items||[];D.status=D.status||{};D.tx=D.tx||[];D.resAdj=D.resAdj||[];D.cards=D.cards||[];D.goals=D.goals||[];D.del=D.del||{};
  D.items.forEach(i=>{i.values=i.values||{}});
  return D;
}

/* ---------- Recorrências ----------
   it.rec = {freq:'m'|'y'|'n', n, amount, start:'YYYY-MM', end?, count?, adj?:{pct,month}, changes?:[{from,amount}]}
   it.over = {'YYYY-MM': valor}  (0 = sem valor naquele mês)
   Os valores mensais (it.values) são gerados a partir da regra, então a planilha e os cálculos não mudam. */
const recStep=r=>r.freq==='y'?12:r.freq==='n'?Math.max(1,parseInt(r.n)||1):1;
function recAmountAt(r,m){
  let base=r.amount,from=r.start;
  [...(r.changes||[])].sort((a,b)=>a.from.localeCompare(b.from)).forEach(c=>{if(c.from<=m){base=c.amount;from=c.from}});
  if(r.adj&&r.adj.pct){
    let n=0;for(let x=ymAdd(from,1),g=0;x<=m&&g<1200;x=ymAdd(x,1),g++)if(+x.slice(5)===+r.adj.month)n++;
    base=base*Math.pow(1+r.adj.pct/100,n);
  }
  return round2(base);
}
function recMonths(r,until){
  const out=[],step=recStep(r);let k=0;
  for(let m=r.start,g=0;m<=until&&g<1200;m=ymAdd(m,step),g++){
    if(r.end&&m>r.end)break;
    if(r.count&&k>=r.count)break;
    out.push(m);k++;
  }
  return out;
}
const recLast=r=>r.count?ymAdd(r.start,(r.count-1)*recStep(r)):r.end||null;
function materialize(it){
  if(!it.rec)return;
  const ms=monthsList(),a=ms[0],b=ms[ms.length-1],vals={};
  recMonths(it.rec,b).forEach(m=>{if(m>=a){const v=recAmountAt(it.rec,m);if(v)vals[m]=v}});
  Object.entries(it.over||{}).forEach(([m,v])=>{if(m<a||m>b)return;if(v)vals[m]=v;else delete vals[m]});
  const sorted=Object.fromEntries(Object.entries(vals).sort((x,y)=>x[0].localeCompare(y[0])));
  if(JSON.stringify(sorted)!==JSON.stringify(it.values))it.values=sorted;
}
function materializeAll(){S.items.forEach(materialize)}
// muda o valor previsto de um item: só neste mês, ou deste mês em diante
function setPlanned(it,ym,v,fwd){
  v=round2(v||0);
  if(it.rec){
    it.over=it.over||{};
    if(fwd){
      it.rec.changes=(it.rec.changes||[]).filter(c=>c.from<ym);
      Object.keys(it.over).forEach(m=>{if(m>=ym)delete it.over[m]});
      if(!v){if(ym<=it.rec.start){it.over={};it.rec.end=ymAdd(it.rec.start,-1)}else{it.rec.end=ymAdd(ym,-1);delete it.rec.count}}
      else if(ym<=it.rec.start){it.rec.amount=v}
      else it.rec.changes.push({from:ym,amount:v});
      if(!it.rec.changes.length)delete it.rec.changes;
    }else{
      if(it.rec.start<=ym&&recMonths(it.rec,ym).includes(ym)&&recAmountAt(it.rec,ym)===v)delete it.over[ym];
      else it.over[ym]=v;
    }
    if(!Object.keys(it.over).length)delete it.over;
    materialize(it);
  }else{
    monthsList().filter(x=>x===ym||(fwd&&x>ym)).forEach(x=>{if(v)it.values[x]=v;else delete it.values[x]});
  }
}
// garante que o plano sempre vai até 24 meses à frente
function ensureWindow(){
  const want=ymAdd(todayYM(),24);
  if(S.settings.end<want)S.settings.end=want;
  materializeAll();
}

/* ---------- Versões por registro (para juntar dados de vários aparelhos) ---------- */
function recs(D){
  const o={};
  (D.items||[]).forEach(x=>o['it:'+x.id]=x);
  (D.tx||[]).forEach(x=>o['tx:'+x.id]=x);
  (D.resAdj||[]).forEach(x=>o['ra:'+x.id]=x);
  (D.cards||[]).forEach(x=>o['cd:'+x.id]=x);
  (D.goals||[]).forEach(x=>o['go:'+x.id]=x);
  Object.entries(D.status||{}).forEach(([k,x])=>o['st:'+k]=x);
  if(D.settings)o.set=D.settings;
  return o;
}
const bare=x=>{const{_u,...r}=x;return JSON.stringify(r)};
let prevRecs={};
function snapRecs(){prevRecs={};const r=recs(S);for(const k in r)prevRecs[k]=bare(r[k])}
function stamp(){
  const now=Date.now(),cur=recs(S);S.del=S.del||{};
  for(const k in cur){if(prevRecs[k]!==bare(cur[k])){cur[k]._u=now;delete S.del[k]}}
  for(const k in prevRecs)if(!(k in cur))S.del[k]=now;
  snapRecs();
}
function mergeData(L,R){
  const del={...(R.del||{})};
  for(const k in (L.del||{}))del[k]=Math.max(del[k]||0,L.del[k]);
  const a=recs(L),b=recs(R),out={};
  for(const k of new Set([...Object.keys(a),...Object.keys(b)])){
    const x=a[k],y=b[k];
    const w=!x?y:!y?x:((y._u||0)>(x._u||0)?y:x);
    if(del[k]&&del[k]>=(w._u||0))continue;
    out[k]=w;
  }
  for(const k in del)if(out[k])delete del[k];
  const M={...L,items:[],tx:[],resAdj:[],cards:[],goals:[],status:{},del};
  const keep=(arr,p,dst)=>{const seen=new Set();arr.forEach(i=>{const k=p+i.id;if(out[k]&&!seen.has(k)){seen.add(k);dst.push(out[k])}})};
  keep([...(L.items||[]),...(R.items||[])],'it:',M.items);
  keep([...(L.cards||[]),...(R.cards||[])],'cd:',M.cards);
  keep([...(L.goals||[]),...(R.goals||[])],'go:',M.goals);
  for(const k in out){
    if(k.startsWith('tx:'))M.tx.push(out[k]);
    else if(k.startsWith('ra:'))M.resAdj.push(out[k]);
    else if(k.startsWith('st:'))M.status[k.slice(3)]=out[k];
    else if(k==='set')M.settings=out[k];
  }
  if(!M.settings)M.settings=L.settings||R.settings;
  return JSON.parse(JSON.stringify(M));
}
// campos que são só deste aparelho e não entram na comparação
const DEVICE_ONLY=['savedAt','lastMethod','lastCat','lastCard'];
const syncView=D=>{const r={...D};DEVICE_ONLY.forEach(k=>delete r[k]);return JSON.stringify(r)};

/* ---------- Cópia local (cifrada) ---------- */
let localTimer=null,localBusy=Promise.resolve();
function persistLocal(now){
  clearTimeout(localTimer);
  const go=()=>{const u=USER,k=DKEY,snapshot=JSON.parse(JSON.stringify(S));localBusy=localBusy.then(async()=>{if(!u||!k)return;try{localStorage.setItem(LOCAL_PREFIX+u,JSON.stringify(await encryptJSON(k,snapshot)))}catch(e){console.warn('cópia local',e)}})};
  if(now)go();else localTimer=setTimeout(go,250);
}
async function loadLocal(u,key){
  try{const box=JSON.parse(localStorage.getItem(LOCAL_PREFIX+u));if(!box)return null;return await decryptJSON(key,box)}catch(e){return null}
}
function save(){
  S.savedAt=new Date().toISOString();
  stamp();
  persistLocal();
  setSaveState();
  scheduleSync();
}

/* ---------- Sincronização com a nuvem ---------- */
let syncState='off',syncTimer=null,syncBusy=false,syncAgain=false,lastSyncAt=null,syncErr='',remoteSeen=false;
function scheduleSync(ms=2500){clearTimeout(syncTimer);if(USER)syncTimer=setTimeout(sync,ms)}
async function sync(){
  if(!USER||!DKEY||!hasDevice())return;
  if(syncBusy){syncAgain=true;return}
  if(!navigator.onLine){syncState='offline';setSaveState();return}
  const u=USER,key=DKEY;
  syncBusy=true;syncState='busy';setSaveState();
  try{
    let done=false;
    for(let attempt=0;attempt<5&&!done;attempt++){
      const{json:box,sha}=await ghGet(dataPath(u));
      if(u!==USER)return; // saiu da conta no meio
      let remote=null;
      if(box){try{remote=await decryptJSON(key,box)}catch(e){throw new Error('Não consegui abrir os dados da nuvem com esta senha. Saia e entre de novo.')}}
      const merged=normalize(remote&&remote.items?mergeData(S,remote):JSON.parse(JSON.stringify(S)));
      DEVICE_ONLY.forEach(k=>{if(S[k]!==undefined)merged[k]=S[k]});
      if(syncView(merged)!==syncView(S)){
        S=merged;snapRecs();ensureWindow();stamp();
        persistLocal(true);UI.month=clampMonth(UI.month);applyTheme();
        if(!anyModalOpen())render();
      }
      remoteSeen=true;
      if(!remote||syncView(S)!==syncView(remote)){
        const body={...S,savedAt:new Date().toISOString()};DEVICE_ONLY.filter(k=>k!=='savedAt').forEach(k=>delete body[k]);
        const put=await ghPut(dataPath(u),await encryptJSON(key,body),sha,u+': atualização pelo '+deviceName()+' em '+new Date().toLocaleString('pt-BR'));
        if(put.status===409||put.status===422){await new Promise(r=>setTimeout(r,400+attempt*600));continue} // outro aparelho gravou antes: busca de novo e junta
        if(!put.ok)throw new Error(await ghErr(put));
      }
      done=true;
    }
    if(!done)throw new Error('Não consegui gravar depois de várias tentativas (conflito). Tente de novo.');
    syncState='ok';lastSyncAt=Date.now();syncErr='';
  }catch(e){syncState=navigator.onLine?'error':'offline';syncErr=e.message||String(e)}
  finally{
    syncBusy=false;setSaveState();
    if(UI.tab==='ajustes'&&!anyModalOpen()&&document.activeElement?.tagName!=='INPUT')render();
    if(syncAgain){syncAgain=false;scheduleSync(300)}
  }
}
function setSaveState(msg){
  const el=$('#saveState');if(!el)return;
  if(msg){el.textContent=msg;return}
  const t=lastSyncAt?new Date(lastSyncAt).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}):'';
  const st={busy:['⟳','sincronizando…'],ok:['☁️','sincronizado '+t],error:['⚠️','<span class="neg">erro ao sincronizar</span>'],offline:['📴','sem internet · salvo no aparelho'],off:['☁️','conectando…']}[syncState]||['',''];
  el.innerHTML=`<i class="st-ic">${st[0]}</i><span class="st-txt"> ${st[1]}</span>`;
  el.title=syncState==='error'?syncErr:(syncState==='ok'?'Sincronizado '+t+' · toque para sincronizar agora':'Toque para sincronizar agora');
  el.style.cursor='pointer';
}

/* desfazer */
let undoSnap=null,toastTimer=null;
function snap(){undoSnap=JSON.stringify(S)}
function undo(){if(undoSnap){S=JSON.parse(undoSnap);undoSnap=null;save();render();$('#toast').style.display='none'}}
