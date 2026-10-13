'use strict';
/* =========================================================
   Nuvem da família: GitHub (repositório privado de dados) + contas
   ---------------------------------------------------------
   - config.js traz o token do GitHub CIFRADO com o código da família
   - cada aparelho guarda o token depois de digitar o código (ou abrir o link de convite)
   - users/<usuario>/auth.json  → chave de dados embrulhada pela senha e pela chave de recuperação
   - users/<usuario>/dados.json → dados do usuário, cifrados (ilegíveis sem a senha)
   ========================================================= */
const CFG=window.FIN_CONFIG||{};
const DEV_KEY='fin-device';
let device=null;try{device=JSON.parse(localStorage.getItem(DEV_KEY))}catch(e){}
const configured=()=>!!(CFG.owner&&CFG.repo&&CFG.tok);
const hasDevice=()=>!!(device&&device.token&&device.repo===CFG.owner+'/'+CFG.repo);
const deviceName=()=>/Android|iPhone|iPad/i.test(navigator.userAgent)?'celular':'computador';

function ghFetch(path,opt={}){
  return fetch('https://api.github.com/repos/'+CFG.owner+'/'+CFG.repo+path,{cache:'no-store',...opt,headers:{Authorization:'Bearer '+device.token,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28',...(opt.body?{'Content-Type':'application/json'}:{}),...(opt.headers||{})}});
}
async function ghErr(r){
  let m='';try{m=(await r.json()).message}catch(e){}
  if(r.status===401)return'O acesso da família à nuvem expirou ou foi trocado (401). Peça um novo link de convite para quem administra o app.';
  if(r.status===403)return'Sem permissão na nuvem (403). '+m;
  if(r.status===404)return'Repositório de dados não encontrado (404).';
  return'GitHub '+r.status+': '+m;
}
const encPath=p=>p.split('/').map(encodeURIComponent).join('/');
async function ghGet(path){
  const r=await ghFetch('/contents/'+encPath(path)+'?ref='+encodeURIComponent(CFG.branch||'main')+'&_='+Date.now());
  if(r.status===404)return{json:null,sha:null};
  if(!r.ok)throw new Error(await ghErr(r));
  const j=await r.json();
  let txt;
  if(j.content)txt=b64dec(j.content);
  else{const raw=await ghFetch('/contents/'+encPath(path)+'?ref='+encodeURIComponent(CFG.branch||'main'),{headers:{Accept:'application/vnd.github.raw+json'}});if(!raw.ok)throw new Error(await ghErr(raw));txt=await raw.text()}
  return{json:JSON.parse(txt),sha:j.sha};
}
// devolve a Response: quem chama trata 409/422 (conflito / arquivo já existe)
function ghPut(path,obj,sha,message){
  return ghFetch('/contents/'+encPath(path),{method:'PUT',body:JSON.stringify({message,content:b64enc(JSON.stringify(obj,null,1)),branch:CFG.branch||'main',...(sha?{sha}:{})})});
}
async function ghDelete(path,sha,message){
  const r=await ghFetch('/contents/'+encPath(path),{method:'DELETE',body:JSON.stringify({message,sha,branch:CFG.branch||'main'})});
  if(!r.ok&&r.status!==404)throw new Error(await ghErr(r));
}

/* ---------- Código da família ---------- */
async function unlockFamily(code){
  code=String(code||'').trim();
  if(!code)throw new Error('Digite o código da família.');
  let token;
  try{token=await openText(code,CFG.tok)}catch(e){throw new Error('Código da família incorreto.')}
  device={token,repo:CFG.owner+'/'+CFG.repo};
  const r=await ghFetch('');
  if(!r.ok){const m=await ghErr(r);device=null;throw new Error(m)}
  localStorage.setItem(DEV_KEY,JSON.stringify(device));
}
function forgetDevice(){device=null;localStorage.removeItem(DEV_KEY)}

/* ---------- Contas ---------- */
const normUser=u=>String(u||'').trim().toLowerCase();
const validUser=u=>/^[a-z0-9][a-z0-9._-]{2,23}$/.test(u);
const authPath=u=>'users/'+u+'/auth.json';
const dataPath=u=>'users/'+u+'/dados.json';
const AUTH_CACHE='fin-auth:';
const cacheAuth=(u,a)=>{try{localStorage.setItem(AUTH_CACHE+u,JSON.stringify(a))}catch(e){}};
const cachedAuth=u=>{try{return JSON.parse(localStorage.getItem(AUTH_CACHE+u))}catch(e){return null}};
const knownUsers=()=>{try{return JSON.parse(localStorage.getItem('fin-users'))||[]}catch(e){return[]}};
const rememberUser=u=>localStorage.setItem('fin-users',JSON.stringify([u,...knownUsers().filter(x=>x!==u)].slice(0,6)));
const forgetUser=u=>{localStorage.setItem('fin-users',JSON.stringify(knownUsers().filter(x=>x!==u)));localStorage.removeItem(AUTH_CACHE+u);localStorage.removeItem(LOCAL_PREFIX+u)};
const REC_ITER=100000; // a chave de recuperação já é aleatória e longa

async function createAccount(u,pw){
  u=normUser(u);
  if(!validUser(u))throw new Error('O usuário deve ter de 3 a 24 caracteres: letras minúsculas, números, ponto, hífen ou _.');
  if(String(pw).length<8)throw new Error('A senha precisa ter pelo menos 8 caracteres.');
  const ex=await ghGet(authPath(u));
  if(ex.json)throw new Error('Esse usuário já existe. Escolha outro nome ou entre com a senha.');
  const raw=await newDataKeyRaw(),rec=newRecoveryKey();
  const auth={v:1,user:u,createdAt:new Date().toISOString(),pwd:await wrapRaw(pw,raw),rec:await wrapRaw(rec.replace(/-/g,''),raw,REC_ITER)};
  const r=await ghPut(authPath(u),auth,null,'nova conta: '+u);
  if(r.status===422||r.status===409)throw new Error('Esse usuário já existe. Escolha outro nome.');
  if(!r.ok)throw new Error(await ghErr(r));
  cacheAuth(u,auth);rememberUser(u);
  return{key:await importDataKey(raw),rec,user:u};
}
async function fetchAuth(u){
  try{
    const{json,sha}=await ghGet(authPath(u));
    if(json){cacheAuth(u,json);return{auth:json,sha}}
    return{auth:null,sha:null};
  }catch(e){
    const c=cachedAuth(u);if(c)return{auth:c,sha:null,offline:true}; // sem internet: entra com a cópia do aparelho
    throw e;
  }
}
async function login(u,pw){
  u=normUser(u);
  if(!u||!pw)throw new Error('Informe usuário e senha.');
  const{auth}=await fetchAuth(u);
  if(!auth)throw new Error('Usuário não encontrado. Confira o nome ou crie uma conta.');
  let raw;try{raw=await unwrapRaw(pw,auth.pwd)}catch(e){throw new Error('Senha incorreta.')}
  rememberUser(u);
  return{key:await importDataKey(raw),user:u};
}
async function rewriteAuth(u,fn,msg){
  for(let i=0;i<4;i++){
    const{json:auth,sha}=await ghGet(authPath(u));
    if(!auth)throw new Error('Usuário não encontrado.');
    const out=await fn(auth);
    const r=await ghPut(authPath(u),out.auth,sha,msg);
    if(r.status===409||r.status===422){await new Promise(z=>setTimeout(z,500));continue}
    if(!r.ok)throw new Error(await ghErr(r));
    cacheAuth(u,out.auth);
    return out;
  }
  throw new Error('Não consegui gravar (conflito). Tente de novo.');
}
function changePassword(u,oldPw,newPw){
  if(String(newPw).length<8)throw new Error('A nova senha precisa ter pelo menos 8 caracteres.');
  return rewriteAuth(u,async a=>{
    let raw;try{raw=await unwrapRaw(oldPw,a.pwd)}catch(e){throw new Error('Senha atual incorreta.')}
    return{auth:{...a,pwd:await wrapRaw(newPw,raw)}};
  },'troca de senha: '+u);
}
async function recoverAccount(u,recKey,newPw){
  u=normUser(u);
  if(String(newPw).length<8)throw new Error('A nova senha precisa ter pelo menos 8 caracteres.');
  const out=await rewriteAuth(u,async a=>{
    let raw;try{raw=await unwrapRaw(normRecovery(recKey).replace(/-/g,''),a.rec)}catch(e){throw new Error('Chave de recuperação incorreta.')}
    return{auth:{...a,pwd:await wrapRaw(newPw,raw)},raw};
  },'recuperação de acesso: '+u);
  rememberUser(u);
  return{key:await importDataKey(out.raw),user:u};
}
function newRecoveryFor(u,pw){
  return rewriteAuth(u,async a=>{
    let raw;try{raw=await unwrapRaw(pw,a.pwd)}catch(e){throw new Error('Senha incorreta.')}
    const rec=newRecoveryKey();
    return{auth:{...a,rec:await wrapRaw(rec.replace(/-/g,''),raw,REC_ITER)},rec};
  },'nova chave de recuperação: '+u);
}
async function deleteAccount(u,pw){
  const{json:auth,sha}=await ghGet(authPath(u));
  if(!auth)throw new Error('Usuário não encontrado.');
  try{await unwrapRaw(pw,auth.pwd)}catch(e){throw new Error('Senha incorreta.')}
  const d=await ghGet(dataPath(u));
  if(d.sha)await ghDelete(dataPath(u),d.sha,'conta excluída: '+u);
  await ghDelete(authPath(u),sha,'conta excluída: '+u);
  forgetUser(u);
}

/* ---------- Sessão neste aparelho (a chave fica no IndexedDB, não extraível) ---------- */
function idb(){return new Promise((res,rej)=>{const r=indexedDB.open('fin-db',1);r.onupgradeneeded=()=>r.result.createObjectStore('kv');r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
async function idbGet(k){try{const db=await idb();return await new Promise(r=>{const q=db.transaction('kv').objectStore('kv').get(k);q.onsuccess=()=>r(q.result);q.onerror=()=>r(null)})}catch(e){return null}}
async function idbSet(k,v){try{const db=await idb();await new Promise(r=>{const t=db.transaction('kv','readwrite');t.objectStore('kv').put(v,k);t.oncomplete=()=>r();t.onerror=()=>r()})}catch(e){}}
async function idbDel(k){try{const db=await idb();await new Promise(r=>{const t=db.transaction('kv','readwrite');t.objectStore('kv').delete(k);t.oncomplete=()=>r();t.onerror=()=>r()})}catch(e){}}
async function rememberSession(u,key,keep){
  await idbSet('key:'+u,key);
  localStorage.setItem('fin-last',JSON.stringify({u,keep:!!keep}));
  sessionStorage.setItem('fin-sess',u);
}
async function resumeSession(){
  let last=null;try{last=JSON.parse(localStorage.getItem('fin-last'))}catch(e){}
  if(!last||!last.u)return null;
  const key=await idbGet('key:'+last.u);
  if(!key)return null;
  if(!last.keep&&sessionStorage.getItem('fin-sess')!==last.u){await idbDel('key:'+last.u);return null}
  return{user:last.u,key};
}
async function endSession(u){
  await idbDel('key:'+u);
  localStorage.removeItem('fin-last');sessionStorage.removeItem('fin-sess');
}
