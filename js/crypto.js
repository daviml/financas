'use strict';
/* =========================================================
   Criptografia (Web Crypto): PBKDF2-SHA256 + AES-GCM 256
   - a senha (ou o código da família) vira uma chave pelo PBKDF2
   - os dados de cada usuário são cifrados com uma "chave de dados" aleatória,
     que fica guardada embrulhada pela senha e pela chave de recuperação
   ========================================================= */
const CRYPTO_ITER=600000;
const te=new TextEncoder(),td=new TextDecoder();
function u8ToB64(u){let s='';for(let i=0;i<u.length;i+=0x8000)s+=String.fromCharCode.apply(null,u.subarray(i,i+0x8000));return btoa(s)}
const b64ToU8=b=>Uint8Array.from(atob(String(b).replace(/\s/g,'')),c=>c.charCodeAt(0));
const b64enc=str=>u8ToB64(te.encode(str));
const b64dec=b=>td.decode(b64ToU8(b));
const randBytes=n=>crypto.getRandomValues(new Uint8Array(n));

async function deriveKey(secret,saltB64,iter=CRYPTO_ITER){
  const base=await crypto.subtle.importKey('raw',te.encode(secret),'PBKDF2',false,['deriveKey']);
  return crypto.subtle.deriveKey({name:'PBKDF2',salt:b64ToU8(saltB64),iterations:iter,hash:'SHA-256'},base,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
}
async function aesEncrypt(key,bytes){
  const iv=randBytes(12);
  const ct=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv},key,bytes));
  return{iv:u8ToB64(iv),ct:u8ToB64(ct)};
}
async function aesDecrypt(key,box){
  return new Uint8Array(await crypto.subtle.decrypt({name:'AES-GCM',iv:b64ToU8(box.iv)},key,b64ToU8(box.ct)));
}
const encryptJSON=async(key,obj)=>({v:1,...await aesEncrypt(key,te.encode(JSON.stringify(obj)))});
const decryptJSON=async(key,box)=>JSON.parse(td.decode(await aesDecrypt(key,box)));

// Texto com segredo (ex.: token do GitHub cifrado com o código da família)
async function sealText(secret,text){
  const salt=u8ToB64(randBytes(16));
  const key=await deriveKey(secret,salt);
  return{salt,iter:CRYPTO_ITER,...await aesEncrypt(key,te.encode(text))};
}
async function openText(secret,box){
  const key=await deriveKey(secret,box.salt,box.iter||CRYPTO_ITER);
  return td.decode(await aesDecrypt(key,box));
}

// Chave de dados do usuário
async function newDataKeyRaw(){return randBytes(32)}
const importDataKey=(raw,extractable=false)=>crypto.subtle.importKey('raw',raw,{name:'AES-GCM'},extractable,['encrypt','decrypt']);
async function wrapRaw(secret,raw,iter=CRYPTO_ITER){
  const salt=u8ToB64(randBytes(16));
  const key=await deriveKey(secret,salt,iter);
  return{salt,iter,...await aesEncrypt(key,raw)};
}
async function unwrapRaw(secret,box){
  const key=await deriveKey(secret,box.salt,box.iter||CRYPTO_ITER);
  return aesDecrypt(key,box); // lança erro se a senha estiver errada
}

// Chave de recuperação: 20 caracteres fáceis de ler (sem 0/O/1/I), em grupos de 4
function newRecoveryKey(){
  const A='ABCDEFGHJKLMNPQRSTUVWXYZ23456789',b=randBytes(20);
  let s='';for(let i=0;i<20;i++)s+=A[b[i]%A.length];
  return s.match(/.{4}/g).join('-');
}
const normRecovery=s=>String(s||'').toUpperCase().replace(/[^A-Z0-9]/g,'').match(/.{1,4}/g)?.join('-')||'';
