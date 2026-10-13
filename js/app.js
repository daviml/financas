'use strict';
/* =========================================================
   Entrada (convite, login, criar conta, recuperar acesso)
   ========================================================= */
let inviteCode=null;
{const m=location.hash.match(/convite=([^&]+)/);if(m){inviteCode=decodeURIComponent(m[1]);history.replaceState(null,'',location.pathname+location.search)}}
const AUTH={mode:'login',err:'',busy:false,user:'',rec:null};
function showAuth(mode,err=''){
  AUTH.mode=mode;AUTH.err=err;AUTH.busy=false;
  $('#auth').classList.add('on');document.body.style.overflow='hidden';
  renderAuth();
}
function hideAuth(){$('#auth').classList.remove('on');document.body.style.overflow=''}
function renderAuth(){
  if(AUTH.mode==='install'){renderInstall();return}
  const A=AUTH,users=knownUsers();
  const errH=A.err?`<div class="banner warn auth-err">⚠ ${esc(A.err)}</div>`:'';
  const btn=(id,label)=>`<button class="btn primary" id="${id}" ${A.busy?'disabled':''}>${A.busy?'<span class="spin"></span> Aguarde…':label}</button>`;
  let body='';
  if(A.mode==='setup')body=`<div class="card"><h3>⚙️ App ainda não configurado</h3><div class="t2">Quem administra o app precisa abrir <b>tools/setup.html</b>, gerar o arquivo <b>config.js</b> com o token do repositório de dados e publicar.</div></div>`;
  else if(A.mode==='family')body=`<div class="card"><h3>👨‍👩‍👧 Código da família</h3>
    <div class="t2">Peça o código (ou o link de convite) para quem administra o app. Só é preciso digitar uma vez neste aparelho.</div>
    <label class="f">Código da família</label><input class="in" id="aFam" type="password" autocomplete="off">
    ${errH}${btn('aFamGo','Continuar')}</div>`;
  else if(A.mode==='login')body=`<div class="card"><h3>Entrar</h3>
    ${users.length?`<div class="t2">Contas neste aparelho:</div><div class="auth-users">${users.map(u=>`<button class="chip ${u===A.user?'on':''}" data-u="${esc(u)}">👤 ${esc(u)}</button>`).join('')}</div>`:''}
    <label class="f">Usuário</label><input class="in" id="aUser" value="${esc(A.user||users[0]||'')}" autocapitalize="none" autocomplete="username" spellcheck="false">
    <label class="f">Senha</label><input class="in" id="aPw" type="password" autocomplete="current-password">
    <label class="check"><input type="checkbox" id="aKeep" checked> Manter conectado neste aparelho</label>
    ${errH}${btn('aGo','Entrar')}
    <div class="auth-links"><button class="link" data-auth="signup">Primeiro acesso? Criar conta</button><button class="link" data-auth="recover">Esqueci a senha</button></div></div>`;
  else if(A.mode==='signup')body=`<div class="card"><h3>Criar minha conta</h3>
    <div class="t2">Cada pessoa da família tem a sua conta. Seus dados ficam cifrados com a sua senha — ninguém mais consegue ver.</div>
    <label class="f">Escolha um usuário</label><input class="in" id="sUser" value="${esc(A.user||'')}" autocapitalize="none" autocomplete="username" spellcheck="false" placeholder="ex.: maria, joao.silva">
    <div class="hint">Letras minúsculas, números, ponto, hífen ou _ (3 a 24 caracteres).</div>
    <label class="f">Senha (mínimo 8 caracteres)</label><input class="in" id="sPw" type="password" autocomplete="new-password">
    <label class="f">Repita a senha</label><input class="in" id="sPw2" type="password" autocomplete="new-password">
    <label class="check"><input type="checkbox" id="sKeep" checked> Manter conectado neste aparelho</label>
    ${errH}${btn('sGo','Criar conta')}
    <div class="auth-links"><button class="link" data-auth="login">Já tenho conta · Entrar</button></div></div>`;
  else if(A.mode==='recover')body=`<div class="card"><h3>Recuperar acesso</h3>
    <div class="t2">Use a <b>chave de recuperação</b> que apareceu quando você criou a conta para definir uma nova senha.</div>
    <label class="f">Usuário</label><input class="in" id="rUser" value="${esc(A.user||knownUsers()[0]||'')}" autocapitalize="none" spellcheck="false">
    <label class="f">Chave de recuperação</label><input class="in" id="rKey" autocapitalize="characters" spellcheck="false" placeholder="XXXX-XXXX-XXXX-XXXX-XXXX" style="font-family:ui-monospace,monospace">
    <label class="f">Nova senha</label><input class="in" id="rPw" type="password" autocomplete="new-password">
    <label class="f">Repita a nova senha</label><input class="in" id="rPw2" type="password" autocomplete="new-password">
    ${errH}${btn('rGo','Definir nova senha e entrar')}
    <div class="auth-links"><button class="link" data-auth="login">← Voltar</button></div></div>`;
  else if(A.mode==='reckey')body=`<div class="card"><h3>🧾 Sua chave de recuperação</h3>
    <div class="t2">Anote ou imprima e guarde num lugar seguro. Se esquecer a senha, é <b>só com ela</b> que você recupera seus dados. Ela não aparece de novo.</div>
    <div class="reckey" style="margin-top:14px">${esc(A.rec)}</div>
    <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap"><button class="btn sm" id="kCopy" style="width:auto;margin:0">📋 Copiar</button><button class="btn sm" id="kSave" style="width:auto;margin:0">⬇ Baixar arquivo</button><button class="btn sm" id="kPrint" style="width:auto;margin:0">🖨 Imprimir</button></div>
    <label class="check"><input type="checkbox" id="kOk"> Guardei a chave de recuperação</label>
    <button class="btn primary" id="kGo" disabled>Continuar</button></div>`;
  else if(A.mode==='loading')body=`<div class="card" style="text-align:center"><span class="spin"></span> Abrindo seus dados…</div>`;
  $('#auth').innerHTML=`<div class="auth-box"><div class="auth-logo"><span class="dot">R$</span> Finanças</div><div class="t2">Controle de gastos, contas, dívidas e metas da família.</div>${body}</div>`;
  const q=x=>$('#auth').querySelector(x);
  $('#auth').querySelectorAll('[data-auth]').forEach(b=>b.onclick=()=>{AUTH.user=(q('#aUser')||q('#sUser')||q('#rUser'))?.value||'';showAuth(b.dataset.auth)});
  $('#auth').querySelectorAll('[data-u]').forEach(b=>b.onclick=()=>{AUTH.user=b.dataset.u;renderAuth();q('#aPw').focus()});
  const enter=(sel,fn)=>$('#auth').querySelectorAll(sel).forEach(i=>i.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();fn()}}));
  const run=async fn=>{if(AUTH.busy)return;AUTH.busy=true;AUTH.err='';const keep={};$('#auth').querySelectorAll('input').forEach(i=>keep[i.id]=i.type==='checkbox'?i.checked:i.value);renderAuth();
    try{await fn(keep)}catch(e){AUTH.busy=false;AUTH.err=e.message||String(e);renderAuth();Object.entries(keep).forEach(([k,v])=>{const el=q('#'+k);if(el){if(el.type==='checkbox')el.checked=v;else el.value=v}})}};
  if(A.mode==='family'){const go=()=>run(async k=>{await unlockFamily(k.aFam);showAuth('login')});q('#aFamGo').onclick=go;enter('#aFam',go);setTimeout(()=>{if(!$('#auth').contains(document.activeElement))q('#aFam')?.focus()},30)}
  if(A.mode==='login'){const go=()=>run(async k=>{const r=await login(k.aUser,k.aPw);await rememberSession(r.user,r.key,k.aKeep);await enterApp(r.user,r.key)});q('#aGo').onclick=go;enter('#aUser,#aPw',go);setTimeout(()=>{const u=q('#aUser');if(u&&!$('#auth').contains(document.activeElement))(u.value?q('#aPw'):u).focus()},30)}
  if(A.mode==='signup'){const go=()=>run(async k=>{if(k.sPw!==k.sPw2)throw new Error('As senhas não são iguais.');const r=await createAccount(k.sUser,k.sPw);await rememberSession(r.user,r.key,k.sKeep);AUTH.pending=r;AUTH.rec=r.rec;showAuth('reckey')});q('#sGo').onclick=go;enter('#sUser,#sPw,#sPw2',go);setTimeout(()=>{if(!$('#auth').contains(document.activeElement))q('#sUser')?.focus()},30)}
  if(A.mode==='recover'){const go=()=>run(async k=>{if(k.rPw!==k.rPw2)throw new Error('As senhas não são iguais.');const r=await recoverAccount(k.rUser,k.rKey,k.rPw);await rememberSession(r.user,r.key,true);await enterApp(r.user,r.key);toast('Nova senha definida ✓')});q('#rGo').onclick=go;enter('#rUser,#rKey,#rPw,#rPw2',go)}
  if(A.mode==='reckey'){
    q('#kOk').onchange=e=>q('#kGo').disabled=!e.target.checked;
    q('#kCopy').onclick=()=>navigator.clipboard?.writeText(A.rec).then(()=>toast('Chave copiada'));
    q('#kSave').onclick=()=>downloadText('chave-recuperacao-'+AUTH.pending.user+'.txt',`Finanças — chave de recuperação\n\nUsuário: ${AUTH.pending.user}\nChave: ${A.rec}\n\nGuarde este arquivo em lugar seguro. Com ele você define uma nova senha se esquecer a atual.\n`);
    q('#kPrint').onclick=()=>{const w=open('','_blank');if(!w)return;w.document.write(`<pre style="font:18px monospace;padding:30px">Finanças — chave de recuperação\n\nUsuário: ${esc(AUTH.pending.user)}\nChave:   ${esc(A.rec)}\n\nGuarde em lugar seguro.</pre>`);w.document.close();w.print()};
    q('#kGo').onclick=async()=>{const r=AUTH.pending;AUTH.pending=null;AUTH.rec=null;await enterApp(r.user,r.key,true)};
  }
}
function downloadText(name,text,type='text/plain'){
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),2000);
}

async function enterApp(u,key,fresh){
  USER=u;DKEY=key;syncState='off';lastSyncAt=null;syncErr='';remoteSeen=false;undoSnap=null;
  showAuth('loading');
  let data=fresh?null:await loadLocal(u,key);
  if(!data&&!fresh){
    try{const{json:box}=await ghGet(dataPath(u));if(box)data=await decryptJSON(key,box)}
    catch(e){
      USER=null;DKEY=null;AUTH.user=u;
      showAuth('login',!navigator.onLine?'Sem internet e sem cópia dos seus dados neste aparelho. Conecte-se e tente de novo.':'Não consegui abrir seus dados: '+(e.message||e));
      return;
    }
  }
  S=normalize(data||seed());
  snapRecs();ensureWindow();
  try{Object.assign(UI,JSON.parse(sessionStorage.getItem('fin-ui')||'{}'))}catch(e){}
  {const h=location.hash.slice(1);if(TABS.includes(h))UI.tab=h}
  UI.month=clampMonth(UI.month&&!fresh?UI.month:todayYM());
  if(fresh){UI.tab='inicio';UI.wiz=null}
  hideAuth();applyTheme();
  save();render();sync();
}
async function logout(){
  const u=USER;
  clearTimeout(syncTimer);
  if(S&&USER){persistLocal(true);await localBusy}
  await endSession(u);
  USER=null;DKEY=null;S=null;document.body.classList.remove('wiz');
  $('#view').innerHTML='';closeModal();
  AUTH.user=u;showAuth('login');
}

/* =========================================================
   Assistente de primeira configuração
   ========================================================= */
function wizState(){
  if(!UI.wiz){
    const sal=salaryItem();
    UI.wiz={step:0,made:{},
      sal:{v:sal?planned(sal,todayYM())||sal.rec?.amount||0:0,due:sal?.due||5,t13:!S.items.some(i=>i.kind==='13')},
      other:[{name:'',v:0}],
      fixa:FIXA_PRESETS.map(([n,ic],k)=>({name:n,icon:ic,on:false,v:0,due:null})),
      dia:DIA_PRESETS.map(([n,ic],k)=>({name:n,icon:ic,on:k<7||n==='Outros',v:0}))};
  }
  return UI.wiz;
}
const exists=(g,name)=>S.items.some(i=>i.group===g&&i.name.toLowerCase()===name.toLowerCase()&&!Object.values(UI.wiz?.made||{}).flat().includes(i.id));
function vWizard(){
  const W=wizState(),s=W.step;
  const steps=`<div class="wiz-steps">${[0,1,2,3].map(i=>`<i class="${i<=s?'on':''}"></i>`).join('')}</div>`;
  const nav=(next='Próximo →')=>`<div class="wiz-nav">${s>0?'<button class="btn" data-wiz="back">← Voltar</button>':'<span></span>'}<button class="btn primary" data-wiz="next">${next}</button></div>`;
  let h='';
  if(s===0)h=`<h2 class="title">👋 Olá, ${esc(USER)}! Vamos montar seu orçamento</h2>
    <p class="sub">São 4 passos rápidos. Tudo pode ser mudado depois — e você pode pular o que não souber agora.</p>${steps}
    <div class="card"><h3>💰 Quanto você recebe</h3>
      <div class="two"><div><label class="f">Salário líquido (o que cai na conta)</label><input class="in num" id="wSal" inputmode="decimal" value="${numIn(W.sal.v)}" placeholder="0,00"></div>
      <div><label class="f">Dia em que cai</label><input class="in" id="wSalDue" type="number" min="1" max="31" value="${W.sal.due||''}"></div></div>
      <label class="check"><input type="checkbox" id="wT13" ${W.sal.t13?'checked':''}> Recebo 13º salário (em dezembro)</label>
      <label class="f" style="margin-top:16px">Outras rendas todo mês (aposentadoria, pensão, aluguel que recebe…)</label>
      ${W.other.map((o,k)=>`<div class="row" style="margin-top:6px"><input class="in" data-on="${k}" value="${esc(o.name)}" placeholder="Nome (opcional)"><input class="in num" data-ov="${k}" inputmode="decimal" value="${numIn(o.v)}" placeholder="0,00" style="max-width:140px"></div>`).join('')}
      <button class="link" data-wiz="addOther" style="margin-top:8px">+ outra renda</button>
      <div class="hint">Não tem salário fixo? Deixe em branco — depois é só lançar as entradas em “Entradas”.</div>
      ${nav()}</div>`;
  else if(s===1)h=`<h2 class="title">🧾 Contas fixas</h2><p class="sub">Marque as contas que você paga todo mês e informe um valor aproximado e o dia do vencimento.</p>${steps}
    <div class="card">${W.fixa.map((f,k)=>{const ex=exists('fixa',f.name);return`<div class="wiz-row"><input type="checkbox" data-fon="${k}" ${f.on&&!ex?'checked':''} ${ex?'disabled':''}><input class="in" data-fname="${k}" value="${esc(f.name)}" ${ex?'disabled':''}>${ex?'<span class="muted" style="grid-column:span 2">já cadastrada</span>':`<input class="in num" data-fv="${k}" inputmode="decimal" value="${numIn(f.v)}" placeholder="valor"><input class="in" data-fd="${k}" type="number" min="1" max="31" value="${f.due||''}" placeholder="dia">`}</div>`}).join('')}
      <button class="link" data-wiz="addFixa" style="margin-top:8px">+ outra conta</button>
      ${nav()}</div>`;
  else if(s===2)h=`<h2 class="title">🛒 Gastos do dia a dia</h2><p class="sub">Escolha as categorias para lançar seus gastos. O orçamento por mês é opcional — sem orçamento, o gasto sai da sobra.</p>${steps}
    <div class="card">${W.dia.map((f,k)=>{const ex=exists('diadia',f.name);return`<div class="wiz-row" style="grid-template-columns:auto 1fr 120px"><input type="checkbox" data-don="${k}" ${f.on&&!ex?'checked':''} ${ex?'disabled':''}><input class="in" data-dname="${k}" value="${esc(f.icon+' '+f.name)}" ${ex?'disabled':''}>${ex?'<span class="muted">já existe</span>':`<input class="in num" data-dv="${k}" inputmode="decimal" value="${numIn(f.v)}" placeholder="orçamento">`}</div>`}).join('')}
      <button class="link" data-wiz="addDia" style="margin-top:8px">+ outra categoria</button>
      ${nav()}</div>`;
  else{
    const debts=byGroup('parcela'),cards=S.cards||[],goals=S.goals||[];
    h=`<h2 class="title">🏦 Dívidas, cartões e metas</h2><p class="sub">Opcional. Cadastre o que já tiver — dá para fazer depois pela tela de Ajustes ou pelo botão +.</p>${steps}
    <div class="grid2">
      <div class="card span-4"><h3>🏦 Dívidas e parcelamentos</h3>${debts.map(d=>`<div class="added"><span class="nm">${esc(d.name)}</span><span class="num">${fmt(d.rec?.amount||debtInfo(d).parcela)}</span></div>`).join('')}<button class="btn sm" style="margin-top:10px" data-action="newDebt">+ Adicionar dívida</button><div class="hint">Empréstimos, financiamentos, carnês, consignados ou dinheiro que alguém te emprestou.</div></div>
      <div class="card span-4"><h3>💳 Cartões de crédito</h3>${cards.map(c=>`<div class="added"><span class="nm">${c.icon} ${esc(c.name)}</span><span class="t2">vence dia ${c.vence}</span></div>`).join('')}<button class="btn sm" style="margin-top:10px" data-action="newCard">+ Adicionar cartão</button><div class="hint">Para acompanhar faturas e compras parceladas.</div></div>
      <div class="card span-4"><h3>🎯 Metas</h3>${goals.map(g=>`<div class="added"><span class="nm">${g.icon} ${esc(g.name)}</span><span class="num">${g.alvo?fmt(g.alvo):''}</span></div>`).join('')}<button class="btn sm" style="margin-top:10px" data-action="newGoal">+ Criar meta</button><div class="hint">Reserva de emergência, viagem, casa… com quanto guardar por mês.</div></div>
    </div>
    <div class="card" style="margin-top:14px">${nav('Concluir ✓')}</div>`;
  }
  return `<div style="max-width:760px;margin:0 auto">${h}</div>`;
}
vWizard.after=()=>{
  const W=UI.wiz,v=$('#view'),q=x=>v.querySelector(x);
  const read=()=>{
    if(W.step===0){W.sal.v=parseMoney(q('#wSal').value);W.sal.due=clampDay(q('#wSalDue').value);W.sal.t13=q('#wT13').checked;W.other.forEach((o,k)=>{o.name=v.querySelector(`[data-on="${k}"]`).value.trim();o.v=parseMoney(v.querySelector(`[data-ov="${k}"]`).value)})}
    if(W.step===1)W.fixa.forEach((f,k)=>{const c=v.querySelector(`[data-fon="${k}"]`);if(c.disabled)return;f.on=c.checked;f.name=v.querySelector(`[data-fname="${k}"]`).value.trim()||f.name;f.v=parseMoney(v.querySelector(`[data-fv="${k}"]`).value);f.due=clampDay(v.querySelector(`[data-fd="${k}"]`).value)});
    if(W.step===2)W.dia.forEach((f,k)=>{const c=v.querySelector(`[data-don="${k}"]`);if(c.disabled)return;f.on=c.checked;const raw=v.querySelector(`[data-dname="${k}"]`).value.trim();const m=raw.match(/^(\p{Extended_Pictographic}️?)\s*(.*)$/u);if(m){f.icon=m[1];f.name=m[2]||f.name}else if(raw)f.name=raw;f.v=parseMoney(v.querySelector(`[data-dv="${k}"]`).value)});
  };
  // marca automaticamente a linha quando a pessoa digita um valor
  v.querySelectorAll('[data-fv],[data-fd]').forEach(i=>i.addEventListener('input',()=>{const k=i.dataset.fv??i.dataset.fd;const c=v.querySelector(`[data-fon="${k}"]`);if(i.value)c.checked=true}));
  v.querySelectorAll('[data-dv]').forEach(i=>i.addEventListener('input',()=>{const c=v.querySelector(`[data-don="${i.dataset.dv}"]`);if(i.value)c.checked=true}));
  const apply=()=>{
    const step=W.step,mk=(o)=>{const it={id:uid(),values:{},...o};S.items.push(it);materialize(it);(W.made[step]=W.made[step]||[]).push(it.id);return it};
    const start=todayYM();
    S.items=S.items.filter(i=>!(W.made[step]||[]).includes(i.id));W.made[step]=[];
    if(step===0){
      if(W.sal.v){mk({name:'Salário',group:'receita',kind:'salario',icon:'💰',due:W.sal.due,rec:{freq:'m',amount:W.sal.v,start}});
        if(W.sal.t13){const y=+start.slice(0,4);mk({name:'13º salário',group:'receita',kind:'13',icon:'🎄',due:20,rec:{freq:'y',amount:W.sal.v,start:y+'-12'}})}}
      W.other.filter(o=>o.v).forEach(o=>mk({name:o.name||'Outra renda',group:'receita',kind:'outra',icon:'💵',due:null,rec:{freq:'m',amount:o.v,start}}));
    }
    if(step===1)W.fixa.filter(f=>f.on&&f.v&&!exists('fixa',f.name)).forEach(f=>mk({name:f.name,group:'fixa',icon:f.icon,due:f.due,rec:{freq:'m',amount:f.v,start}}));
    if(step===2)W.dia.filter(f=>f.on&&!exists('diadia',f.name)).forEach(f=>mk({name:f.name,group:'diadia',icon:f.icon,rec:{freq:'m',amount:f.v||0,start:S.settings.start}}));
    save();
  };
  v.querySelectorAll('[data-wiz]').forEach(b=>b.onclick=()=>{
    const a=b.dataset.wiz;read();
    if(a==='addOther')W.other.push({name:'',v:0});
    if(a==='addFixa')W.fixa.push({name:'Nova conta',icon:'🧾',on:true,v:0,due:null});
    if(a==='addDia')W.dia.push({name:'Nova categoria',icon:'•',on:true,v:0});
    if(a==='back')W.step=Math.max(0,W.step-1);
    if(a==='next'){
      if(W.step<3){apply();W.step++}
      else{S.settings.onboarded=true;UI.wiz=null;UI.tab='inicio';save();toast('Tudo pronto! 🎉 Use o botão + para lançar gastos.')}
    }
    render();scrollTo(0,0);
  });
};

/* =========================================================
   Backup: exportar / importar (inclui o formato do app antigo)
   ========================================================= */
async function exportJson(){
  if(!await uiConfirm('Exportar backup','O arquivo de backup <b>não é cifrado</b>: quem tiver o arquivo consegue ver seus dados. Guarde em lugar seguro.','Exportar'))return;
  const body={...S};DEVICE_ONLY.forEach(k=>{if(k!=='savedAt')delete body[k]});
  downloadText('financas-'+USER+'-'+todayISO()+'.json',JSON.stringify(body,null,1),'application/json');
}
function exportCsv(){
  const rows=[['Data','Valor','Categoria','Forma','Cartão','Parcelas','Descrição']].concat([...S.tx].sort((a,b)=>a.date.localeCompare(b.date)).map(t=>[t.date,String(t.amount).replace('.',','),itemById(t.cat)?.name||'',methodLabel(t.method),cardById(t.card)?.name||'',parcOf(t),t.desc||'']));
  downloadText('gastos-'+todayISO()+'.csv','﻿'+rows.map(r=>r.map(c=>'"'+String(c).replace(/"/g,'""')+'"').join(';')).join('\r\n'),'text/csv');
}
// converte valores mês a mês em regra de recorrência quando eles são iguais e seguidos
function toRec(it,planEnd,isDebt){
  const ks=Object.keys(it.values||{}).filter(k=>it.values[k]).sort();
  if(!ks.length)return;
  const v=it.values[ks[0]];
  for(let k=0;k<ks.length;k++)if(ks[k]!==ymAdd(ks[0],k)||Math.abs(it.values[ks[k]]-v)>.005)return;
  it.rec={freq:'m',amount:v,start:ks[0]};
  if(isDebt)it.rec.count=ks.length;else if(ks[ks.length-1]<planEnd)it.rec.end=ks[ks.length-1];
}
function migrateV1(d){
  d=JSON.parse(JSON.stringify(d));
  d.items=(d.items||[]).filter(i=>i.group!=='va');
  const end=d.settings?.end||todayYM();
  d.items.forEach(i=>{
    if(i.defMethod==='va')delete i.defMethod;
    if(i.group==='receita'){i.kind=i.salary?'salario':i.extra?'extra':/13/.test(i.name)?'13':'outra';delete i.salary;delete i.extra;if(i.kind!=='extra')toRec(i,end)}
    if(i.group==='fixa'||i.group==='reserva')toRec(i,end);
    if(i.group==='diadia'&&Object.keys(i.values||{}).length)toRec(i,end);
    if(i.group==='parcela'){
      const n=Object.keys(i.values||{}).filter(k=>i.values[k]).length;
      i.debt={tipo:/consignado/i.test(i.name)||i.consig?'consignado':'outro',credor:'',total:n+((i.payoffs||[]).reduce((s,p)=>s+(p.removed||0),0)),pagasAntes:0};
      delete i.consig;
      if(!(i.payoffs||[]).length)toRec(i,end,true);
    }
  });
  if(d.settings){
    const g=d.settings.goal;delete d.settings.goal;delete d.settings.vaInReport;
    if(g&&g.amount){const id=uid();d.goals=[{id,name:g.name||'Meta',icon:'🎯',alvo:g.amount}];d.items.forEach(i=>{if(i.group==='reserva')i.goal=id});(d.resAdj||[]).forEach(a=>a.goal=id)}
    d.settings.onboarded=true;
  }
  if(d.lastMethod==='va')d.lastMethod='debito';
  d.v=2;
  return d;
}
function importBackupFile(f){
  const r=new FileReader();
  r.onload=async()=>{
    let d;try{d=JSON.parse(r.result);if(!d.items)throw 0}catch(x){uiAlert('Arquivo inválido','Este arquivo não é um backup do app.');return}
    const old=!d.v||d.v<2;
    if(!await uiConfirm('Restaurar backup?',`Substituir <b>todos</b> os seus dados atuais pelo backup${d.savedAt?' de '+new Date(d.savedAt).toLocaleString('pt-BR'):''}?${old?'<br><br>É um backup do app antigo — ele será convertido (dívidas, recorrências e meta).':''}`,'Substituir',true))return;
    snap();
    if(old)d=migrateV1(d);
    const keepDel=S.del;
    S=normalize(d);S.del={...(S.del||{}),...keepDel};S.settings.onboarded=true;
    ensureWindow();UI.month=clampMonth(UI.month);save();applyTheme();render();toast('Backup restaurado',true);
  };
  r.readAsText(f);
}

/* =========================================================
   Ações
   ========================================================= */
function applyTheme(){
  const t=S?.settings.theme||'auto';
  if(t==='auto')document.documentElement.removeAttribute('data-theme');else document.documentElement.dataset.theme=t;
}
function togglePaid(it,ym){
  snap();
  const k=ym+'|'+it.id,s=S.status[k];
  if(isPaid(it,ym)){
    if(autoPaid(it,ym))S.status[k]={amount:s?.amount??null,paid:false,manual:true,date:null};
    else if(s&&s.amount!=null)S.status[k]={...s,paid:false,date:null};else delete S.status[k];
    save();render();toast(it.name+' desmarcada',true)}
  else{const{manual,...rest}=s||{amount:null};S.status[k]={...rest,paid:true,date:todayISO()};save();render();toast('✓ '+it.name+' '+(it.group==='receita'?'recebido':it.group==='reserva'?'guardado':'paga')+' · '+fmt(val(it,ym)),true)}
}
async function passwordFlow(kind){
  if(kind==='change'){
    openModal(`<div class="m-hd"><h3>Trocar senha</h3><button class="x" data-close>×</button></div><div class="m-bd">
      <label class="f">Senha atual</label><input class="in" id="pOld" type="password" autocomplete="current-password">
      <label class="f">Nova senha (mínimo 8)</label><input class="in" id="pNew" type="password" autocomplete="new-password">
      <label class="f">Repita a nova senha</label><input class="in" id="pNew2" type="password" autocomplete="new-password"><div id="pMsg"></div></div>
      <div class="m-ft"><button class="btn" data-close>Cancelar</button><button class="btn primary" id="pGo">Trocar senha</button></div>`,m=>{
      const q=x=>m.querySelector(x);setTimeout(()=>q('#pOld').focus(),30);
      q('#pGo').onclick=async()=>{
        if(q('#pNew').value!==q('#pNew2').value){q('#pMsg').innerHTML='<div class="banner warn" style="margin-top:10px">As senhas não são iguais.</div>';return}
        q('#pGo').disabled=true;q('#pGo').innerHTML='<span class="spin"></span>';
        try{await changePassword(USER,q('#pOld').value,q('#pNew').value);closeModal();toast('Senha trocada ✓')}
        catch(e){q('#pGo').disabled=false;q('#pGo').textContent='Trocar senha';q('#pMsg').innerHTML='<div class="banner warn" style="margin-top:10px">'+esc(e.message)+'</div>'}
      };
    });
  }
  if(kind==='rec'){
    const pw=await uiPrompt('Nova chave de recuperação','Sua senha',"",{type:'password',text:'A chave antiga deixa de funcionar.',ok:'Gerar nova chave'});
    if(pw==null)return;
    try{const r=await newRecoveryFor(USER,pw);
      openModal(`<div class="m-hd"><h3>🧾 Nova chave de recuperação</h3><button class="x" data-close>×</button></div><div class="m-bd"><div class="t2">Anote e guarde em lugar seguro. Ela não aparece de novo.</div><div class="reckey" style="margin-top:12px">${esc(r.rec)}</div></div>
        <div class="m-ft"><button class="btn" id="rkSave">⬇ Baixar</button><button class="btn primary" data-close>Guardei</button></div>`,m=>{m.querySelector('#rkSave').onclick=()=>downloadText('chave-recuperacao-'+USER+'.txt',`Finanças — chave de recuperação\n\nUsuário: ${USER}\nChave: ${r.rec}\n`)});
    }catch(e){uiAlert('Não foi possível',esc(e.message))}
  }
  if(kind==='delete'){
    const pw=await uiPrompt('Excluir minha conta','Digite sua senha para confirmar',"",{type:'password',text:'<b class="neg">Isso apaga sua conta e seus dados da nuvem.</b> Exporte um backup antes se quiser guardar algo.',ok:'Excluir para sempre'});
    if(pw==null)return;
    try{await deleteAccount(USER,pw);const u=USER;await logout();forgetUser(u);AUTH.user='';showAuth('login');toast('Conta excluída')}
    catch(e){uiAlert('Não foi possível',esc(e.message))}
  }
}

document.addEventListener('click',async e=>{
  if(!S)return;
  if(e.target.closest('[data-close]')){closeModal();return}
  if(e.target.closest('#bottomNav [data-more]')){$('#moreSheet').classList.toggle('open');$('#fabMenu').classList.remove('open');return}
  if(e.target.closest('.fab')){if(!S.settings.onboarded)return;$('#fabMenu').classList.toggle('open');$('#moreSheet').classList.remove('open');return}
  if(!e.target.closest('#moreSheet'))$('#moreSheet').classList.remove('open');
  if(!e.target.closest('#fabMenu'))$('#fabMenu').classList.remove('open');
  const tabB=e.target.closest('#tabs [data-tab],#bottomNav [data-tab],#moreSheet [data-tab]');
  if(tabB){UI.tab=tabB.dataset.tab;render();scrollTo(0,0);return}
  const el=e.target.closest('[data-action]');if(!el)return;
  $('#fabMenu').classList.remove('open');
  const a=el.dataset.action,id=el.dataset.id,m=el.dataset.m;
  switch(a){
    case 'prevMonth':{const ms=monthsList();const i=ms.indexOf(UI.month);if(i>0){UI.month=ms[i-1];render()}break}
    case 'nextMonth':{const ms=monthsList();const i=ms.indexOf(UI.month);if(i<ms.length-1){UI.month=ms[i+1];render()}break}
    case 'todayMonth':UI.month=clampMonth(todayYM());render();break;
    case 'goMonth':UI.month=m;UI.tab='inicio';render();scrollTo(0,0);break;
    case 'goMonthTab':UI.month=m;UI.tab=el.dataset.tab;render();scrollTo(0,0);break;
    case 'tab':UI.tab=el.dataset.tab;render();scrollTo(0,0);break;
    case 'theme':{const order=['auto','light','dark'];S.settings.theme=order[(order.indexOf(S.settings.theme||'auto')+1)%3];applyTheme();save();toast('Tema: '+{auto:'automático',light:'claro',dark:'escuro'}[S.settings.theme]);if(UI.tab==='ajustes')render();break}
    case 'setTheme':S.settings.theme=el.dataset.v;applyTheme();save();render();break;
    case 'addTx':txModal();break;
    case 'addCardTx':txModal(null,{method:'credito',card:id||S.lastCard});break;
    case 'editTx':{const t=S.tx.find(t=>t.id===id);if(t)txModal(t);break}
    case 'filterCat':UI.filterCat=id;UI.tab='lanc';render();break;
    case 'togglePaid':if(e.target.closest('.edit'))return;{const it=itemById(id);if(it)togglePaid(it,m)}break;
    case 'editBill':e.stopPropagation();{const it=itemById(id);if(it)billModal(it,m)}break;
    case 'cell':cellModal(itemById(id),m);break;
    case 'editItem':editItem(itemById(id));break;
    case 'newBill':newBillModal();break;
    case 'newIncome':incomeModal();break;
    case 'newRecurring':recurringModal(el.dataset.g);break;
    case 'newDebt':debtModal();break;
    case 'newCard':cardModal();break;
    case 'editCard':e.stopPropagation();cardModal(cardById(id));break;
    case 'cardView':UI.cardView=id;render();break;
    case 'newGoal':goalModal();break;
    case 'newConsorcio':consorcioModal();break;
    case 'editConsorcio':consorcioModal(consorcioById(id));break;
    case 'editGoal':goalModal(goalById(id));break;
    case 'goalView':UI.goalView=id;render();break;
    case 'payoff':payoffModal(itemById(id));break;
    case 'quote':quoteModal(itemById(id));break;
    case 'payToSend':{const who=el.dataset.who,ym=UI.month;snap();let tot=0;
      byGroup('parcela').filter(i=>i.payTo===who&&planned(i,ym)>0&&!isPaid(i,ym)).forEach(i=>{const k=ym+'|'+i.id;const{manual,...r}=S.status[k]||{amount:null};S.status[k]={...r,paid:true,date:todayISO()};tot+=val(i,ym)});
      byGroup('receita').filter(i=>i.payFrom===who&&planned(i,ym)>0&&!isPaid(i,ym)).forEach(i=>{const k=ym+'|'+i.id;S.status[k]={...(S.status[k]||{amount:null}),paid:true,date:todayISO()};tot-=val(i,ym)});
      save();render();toast('✓ '+fmt(tot)+' enviado para '+who,true);break}
    case 'resBank':resBankModal(id||undefined);break;
    case 'syncNow':sync();break;
    case 'install':if(installEvt){installEvt.prompt();installEvt.userChoice.finally(()=>{installEvt=null;$('#installBtn').style.display='none'})}break;
    case 'resAdjDel':if(await uiConfirm('Excluir este ajuste?','','Excluir',true)){snap();S.resAdj=(S.resAdj||[]).filter(x=>x.id!==id);save();render();toast('Ajuste excluído',true)}break;
    case 'payAll':{snap();const c=calc(UI.month);c.bills.filter(i=>!isPaid(i,UI.month)).forEach(i=>{const k=UI.month+'|'+i.id;S.status[k]={...(S.status[k]||{amount:null}),paid:true,date:todayISO()}});save();render();toast('Todas marcadas como pagas',true);break}
    case 'exportJson':exportJson();break;
    case 'importJson':$('#importFile').click();break;
    case 'exportCsv':exportCsv();break;
    case 'changePw':passwordFlow('change');break;
    case 'newRecKey':passwordFlow('rec');break;
    case 'deleteAccount':passwordFlow('delete');break;
    case 'logout':if(await uiConfirm('Sair da conta?','Para entrar de novo neste aparelho, use seu usuário e senha.','Sair')){closeModal();logout()}break;
    case 'rerunWizard':S.settings.onboarded=false;UI.wiz=null;save();render();scrollTo(0,0);break;
    case 'resetAll':if(await uiConfirm('Apagar todos os seus dados?','Gastos, contas, dívidas, cartões e metas serão apagados e o assistente começa de novo. Faça um backup antes.','Apagar tudo',true)){snap();const keep=S.del;S=seed();S.del=keep;UI.wiz=null;ensureWindow();save();applyTheme();render();toast('Dados apagados',true)}break;
    case 'delItem':deleteItemFlow(itemById(id));break;
  }
});
document.addEventListener('keydown',e=>{
  if(!S||!USER||anyModalOpen()||!S.settings.onboarded)return;
  if(['INPUT','SELECT','TEXTAREA'].includes(document.activeElement.tagName))return;
  if(e.ctrlKey||e.metaKey||e.altKey)return;
  if(e.key==='n'||e.key==='N'){e.preventDefault();txModal()}
  else if(e.key==='ArrowLeft')document.querySelector('[data-action="prevMonth"]').click();
  else if(e.key==='ArrowRight')document.querySelector('[data-action="nextMonth"]').click();
});
// Gesto no Início: arrastar o dedo para os lados troca o mês (como as setas do topo)
{let sx=0,sy=0,stt=0,ok=false;
  const view=$('#view');
  view.addEventListener('touchstart',e=>{
    ok=UI.tab==='inicio'&&e.touches.length===1&&!anyModalOpen()&&!e.target.closest('input,select,textarea,.chart,.gridwrap');
    if(!ok)return;sx=e.touches[0].clientX;sy=e.touches[0].clientY;stt=Date.now();
  },{passive:true});
  view.addEventListener('touchend',e=>{
    if(!ok)return;ok=false;
    const t=e.changedTouches[0],dx=t.clientX-sx,dy=t.clientY-sy;
    if(Date.now()-stt>700||Math.abs(dx)<60||Math.abs(dx)<Math.abs(dy)*1.5)return;
    document.querySelector(dx<0?'[data-action="nextMonth"]':'[data-action="prevMonth"]').click();
  },{passive:true});
}
let rz;addEventListener('resize',()=>{clearTimeout(rz);rz=setTimeout(()=>{if(S&&['dividas','metas','orc','entradas'].includes(UI.tab)&&!anyModalOpen())render()},150)});
// Outra aba alterou os dados deste usuário → recarrega
addEventListener('storage',async e=>{
  if(!USER||e.key!==LOCAL_PREFIX+USER||!e.newValue)return;
  try{const d=await decryptJSON(DKEY,JSON.parse(e.newValue));S=normalize(d);snapRecs();if(!anyModalOpen())render()}catch(x){}
});
addEventListener('pagehide',()=>{if(S&&USER)persistLocal(true)});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&USER){if(S&&ymAdd(todayYM(),24)>S.settings.end){ensureWindow();save()}sync()}});
addEventListener('online',()=>{if(USER)sync()});
setInterval(()=>{if(USER&&document.visibilityState==='visible'&&!syncBusy)sync()},60000);

// PWA: instalável e abre sem internet (só quando servido por http/https, ex.: GitHub Pages)
let installEvt=null;
addEventListener('beforeinstallprompt',e=>{e.preventDefault();installEvt=e;$('#installBtn').style.display='';if(AUTH.mode==='install'&&$('#auth').classList.contains('on'))renderInstall()});
addEventListener('appinstalled',()=>{$('#installBtn').style.display='none';INSTALL.done=true;if(AUTH.mode==='install'&&$('#auth').classList.contains('on'))renderInstall();else toast('App instalado ✓')});
if('serviceWorker' in navigator&&location.protocol.startsWith('http'))navigator.serviceWorker.register('sw.js').catch(()=>{});

/* ---------- No celular, a primeira coisa é oferecer a instalação do app ---------- */
const UA=navigator.userAgent;
const isIOS=/iPhone|iPad|iPod/i.test(UA)||(/Macintosh/.test(UA)&&navigator.maxTouchPoints>1);
const isMobile=isIOS||/Android|Mobi/i.test(UA);
const isStandalone=()=>matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
const INSTALL={done:false,resolve:null};
function offerInstall(){
  if(!isMobile||isStandalone()||sessionStorage.getItem('fin-noinstall'))return Promise.resolve();
  return new Promise(res=>{INSTALL.resolve=res;showAuth('install');});
}
function renderInstall(){
  const iosSafari=isIOS&&!/CriOS|FxiOS|EdgiOS/i.test(UA);
  let how;
  if(INSTALL.done)how=`<div class="banner info" style="margin-top:14px;display:block">✅ App instalado! Feche esta página e abra o <b>Finanças</b> pelo ícone na tela inicial.</div>`;
  else if(installEvt)how=`<button class="btn primary" id="iGo">📲 Instalar o app</button>`;
  else if(isIOS)how=`<ol class="t2" style="padding-left:20px;line-height:1.7;margin:14px 0 0">
      ${iosSafari?'':'<li>Abra este endereço no <b>Safari</b>.</li>'}
      <li>Toque em <b>Compartilhar</b> (o quadrado com a seta para cima, na barra de baixo).</li>
      <li>Escolha <b>Adicionar à Tela de Início</b> e toque em <b>Adicionar</b>.</li>
      <li>Abra o app pelo ícone <b>Finanças</b> na tela inicial.</li></ol>
    ${inviteCode?`<div class="banner info" style="margin-top:12px;display:block">Se o app instalado pedir o <b>código da família</b>, digite: <b style="user-select:all">${esc(inviteCode)}</b></div>`:''}`;
  else how=`<ol class="t2" style="padding-left:20px;line-height:1.7;margin:14px 0 0">
      <li>Toque no menu do navegador <b>⋮</b> (no canto de cima).</li>
      <li>Escolha <b>Instalar app</b> ou <b>Adicionar à tela inicial</b>.</li>
      <li>Abra o app pelo ícone <b>Finanças</b> na tela inicial.</li></ol>
    <div class="hint">Se aparecer um aviso do navegador oferecendo instalar, aceite.</div>`;
  $('#auth').innerHTML=`<div class="auth-box"><div class="auth-logo"><span class="dot">R$</span> Finanças</div><div class="t2">Controle de gastos, contas, dívidas e metas da família.</div>
    <div class="card"><h3>📲 Instale o app no seu celular</h3>
      <div class="t2">Fica com ícone na tela inicial, abre em tela cheia e funciona até sem internet. Leva poucos segundos.</div>
      ${how}
      <div class="auth-links" style="justify-content:center;margin-top:18px"><button class="link" id="iSkip">Agora não, continuar no navegador</button></div>
    </div></div>`;
  const go=$('#iGo');if(go)go.onclick=async()=>{installEvt.prompt();const c=await installEvt.userChoice.catch(()=>null);installEvt=null;if(c&&c.outcome==='accepted')INSTALL.done=true;renderInstall()};
  $('#iSkip').onclick=()=>{sessionStorage.setItem('fin-noinstall','1');const r=INSTALL.resolve;INSTALL.resolve=null;hideAuth();r&&r()};
}

/* =========================================================
   Início
   ========================================================= */
(async function boot(){
  if(!window.crypto||!crypto.subtle){showAuth('setup');$('#auth .card').innerHTML='<h3>Navegador sem suporte</h3><div class="t2">Abra o app pelo endereço https (GitHub Pages) num navegador atualizado.</div>';return}
  if(!configured()){showAuth('setup');return}
  // o convite é aplicado antes de oferecer a instalação: no Android o app instalado já herda o acesso
  let famErr='';
  if(!hasDevice()&&inviteCode){try{await unlockFamily(inviteCode)}catch(e){famErr=e.message}}
  await offerInstall();
  if(!hasDevice()){showAuth('family',famErr);return}
  try{
    const sess=await resumeSession();
    if(sess){await enterApp(sess.user,sess.key);return}
  }catch(e){console.warn(e)}
  showAuth(knownUsers().length||!inviteCode?'login':'signup');
})();
