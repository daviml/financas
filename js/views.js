'use strict';
/* =========================================================
   Telas
   ========================================================= */
function render(){
  if(!S)return;
  document.querySelectorAll('#tabs button,#bottomNav button[data-tab],#moreSheet button[data-tab]').forEach(b=>b.classList.toggle('on',b.dataset.tab===UI.tab));
  $('#bottomNav [data-more]').classList.toggle('on',['entradas','orc','dividas','cartoes','ajustes'].includes(UI.tab));
  $('#moreSheet').classList.remove('open');$('#fabMenu').classList.remove('open');
  $('#mLbl').textContent=ymLong(UI.month);
  $('#mSub').textContent=UI.month===todayYM()?'mês atual':(UI.month<todayYM()?'mês passado':'planejamento');
  $('#userChip').textContent='👤 '+USER;
  if(location.hash!=='#'+UI.tab)history.replaceState(null,'','#'+UI.tab);
  sessionStorage.setItem('fin-ui',JSON.stringify({tab:UI.tab,month:UI.month,sheetMode:UI.sheetMode,sheetCompact:UI.sheetCompact,sheetStart:UI.sheetStart,goalView:UI.goalView,cardView:UI.cardView}));
  const v=$('#view');
  document.body.classList.toggle('wiz',!S.settings.onboarded);
  if(!S.settings.onboarded){v.innerHTML=vWizard();vWizard.after();setSaveState();return}
  const fn={inicio:vInicio,entradas:vEntradas,lanc:vLanc,contas:vContas,orc:vOrc,dividas:vDividas,cartoes:vCartoes,metas:vMetas,ajustes:vAjustes}[UI.tab]||vInicio;
  v.innerHTML=banners()+fn();
  if(fn.after)fn.after();
  setSaveState();
}
function banners(){
  let h='';
  if(syncState==='error'&&UI.tab!=='ajustes')h+=`<div class="banner warn">⚠ ${esc(syncErr)}<button class="btn sm" data-action="syncNow">Tentar de novo</button></div>`;
  return h;
}

/* ---------- Início ---------- */
function vInicio(){
  const c=calc(UI.month),ym=UI.month,isNow=ym===todayYM();
  const pend=[...c.bills,...c.invoices].filter(i=>!isPaid(i,ym)).sort((a,b)=>(a.due||99)-(b.due||99));
  const late=pend.filter(i=>dueInfo(i,ym).cls==='late').length;
  const todaySpent=S.tx.filter(t=>t.date===todayISO()).reduce((s,t)=>s+t.amount,0);
  const nPaid=c.bills.filter(i=>isPaid(i,ym)).length;
  const debtAll=byGroup('parcela').map(i=>({d:debtInfo(i),po:(i.payoffs||[]).reduce((s,p)=>s+p.amount+Math.max(0,p.saved||0),0)}));
  const debtAct=debtAll.map(x=>x.d).filter(d=>d.remaining>0);
  const debtRem=debtAct.reduce((s,d)=>s+d.remVal,0);
  // quitações/amortizações tiram parcelas do plano; o valor delas conta como pago
  const debtTot=debtAll.reduce((s,x)=>s+x.d.totalVal+x.po,0);
  const debtPct=debtTot?(debtTot-debtRem)/debtTot:1;
  const debtLast=debtAct.reduce((m,d)=>d.last>m?d.last:m,'');
  const debtFree=debtLast?ymAdd(debtLast,1):null;
  const cardRem=cardDebts().reduce((s,x)=>s+x.rem,0);

  const segs=[['Contas fixas',c.fixas,'var(--s1)'],['Dia a dia',c.diaProj,'var(--s2)'],['Parcelas e dívidas',c.parcelas+c.quit,'var(--s3)'],['Metas / reserva',Math.min(c.reserva,Math.max(0,c.sobra)),'var(--s4)']];
  const livre=Math.max(0,c.receita-segs.reduce((s,x)=>s+x[1],0));
  segs.push(['Livre',livre,'var(--s-free)']);
  const totSeg=segs.reduce((s,x)=>s+x[1],0)||1;
  const over=c.receita-segs.slice(0,4).reduce((s,x)=>s+x[1],0);
  const nRec=innerWidth>=1600?10:6,nBill=innerWidth>=1600?9:7;
  const recent=[...c.txs].sort((a,b)=>b.date.localeCompare(a.date)||b.ts-a.ts).slice(0,nRec);
  const recIn=byGroup('receita').filter(i=>isPaid(i,ym));

  return `
  <div class="grid2">
    <div class="card kpi hero span-3">
      <div class="k-lbl">Sobra prevista do mês</div>
      <div class="k-val num ${c.sobra<0?'neg':''}">${fmt(c.sobra)}</div>
      <div class="k-sub">Depois de guardar para as metas: <b class="num">${fmt(c.livre)}</b></div>
    </div>
    <div class="card kpi span-3 kpi-rec">
      <div class="k-lbl">Entradas do mês</div>
      <div class="k-val num">${fmt(c.receita)}</div>
      <div class="k-sub">${recIn.length?'recebido: '+fmt(recIn.reduce((s,i)=>s+val(i,ym),0)):'nada recebido ainda'}</div>
      <div style="margin-top:6px;display:flex;gap:12px;flex-wrap:wrap"><button class="link" data-action="newIncome">+ entrada extra</button><button class="link" data-action="tab" data-tab="entradas">ver entradas →</button></div>
    </div>
    <div class="card kpi span-3 kpi-out" style="cursor:pointer" data-action="tab" data-tab="dividas">
      <div class="k-lbl">Dívidas</div>
      <div class="k-val num">${fmt(debtRem)}</div>
      <div class="pbar"><i style="width:${debtPct*100}%"></i></div>
      <div class="k-sub"><b>${pct(debtPct)}</b> pago · ${debtFree?`livre de parcelas em <b>${ymLabel(debtFree)}</b>`:'nenhuma dívida ativa 🎉'}${cardRem?` · + ${fmt(cardRem)} parcelado no cartão`:''}</div>
    </div>
    <div class="card kpi span-3 kpi-bills" style="cursor:pointer" data-action="tab" data-tab="contas">
      <div class="k-lbl">Contas pagas</div>
      <div class="k-val num">${nPaid} <span class="muted" style="font-size:16px">de ${c.bills.length}</span></div>
      <div class="pbar"><i style="width:${c.bills.length?nPaid/c.bills.length*100:0}%"></i></div>
      <div class="k-sub">${late?`<span class="neg" style="font-weight:600">${late} atrasada${late>1?'s':''}</span>`:pend.length?pend.length+' pendente'+(pend.length>1?'s':''):'Tudo pago este mês 🎉'}</div>
    </div>

    <div class="card span-7 c-dia">
      <h3>🧾 Dia a dia <span class="right t2 num">${fmt(c.diaSpent)} no mês</span></h3>
      ${isNow?`<div class="hint" style="margin:-2px 0 6px">Gasto hoje: <b class="num">${fmt(todaySpent)}</b></div>`:''}
      ${c.cats.filter(x=>x.plan>0||x.spent>0).map(x=>catRow(x,c)).join('')||'<div class="empty">Nenhum gasto neste mês ainda.</div>'}
      ${c.cats.some(x=>!x.plan&&!x.spent)?`<div class="hint">Categorias sem orçamento e sem gastos ficam escondidas. Gastos em categorias sem orçamento reduzem a sobra.</div>`:''}
    </div>

    <div class="card span-5 c-bills">
      <h3>📅 Próximas contas <span class="right"><button class="link" data-action="tab" data-tab="contas">ver todas →</button></span></h3>
      ${pend.length?pend.slice(0,nBill).map(i=>billRow(i,ym,true)).join(''):'<div class="empty">✅ Todas as contas do mês estão pagas.</div>'}
      ${pend.length>nBill?`<div class="hint">+ ${pend.length-nBill} outras pendentes</div>`:''}
    </div>

    <div class="card span-12 c-stack">
      <h3>💸 Para onde vai o dinheiro do mês</h3>
      <div class="stack">${segs.filter(s=>s[1]>0).map(s=>`<span style="width:${s[1]/totSeg*100}%;background:${s[2]}" data-tip="<b>${s[0]}</b>${fmt(s[1])} · ${pct(s[1]/(c.receita||1))} da receita"></span>`).join('')}</div>
      <div class="legend">${segs.map(s=>`<div><i class="sw" style="background:${s[2]}"></i>${s[0]}</div><div class="num t2">${pct(s[1]/(c.receita||1))}</div><div class="num" style="text-align:right;font-weight:600">${fmt(s[1])}</div>`).join('')}</div>
      ${over<-0.005?`<div class="banner warn" style="margin:12px 0 0">As saídas previstas passam a receita em ${fmt(-over)}.</div>`:''}
      ${c.pctParc?`<div class="hint">Parcelas = ${pct(c.pctParc)} do salário.</div>`:''}
    </div>

    <div class="card span-12 c-recent">
      <h3>🕑 Últimos gastos <span class="right"><button class="link" data-action="tab" data-tab="lanc">ver todos →</button></span></h3>
      ${recent.length?recent.map(txRow).join(''):`<div class="empty">Nenhum gasto lançado em ${ymLong(ym)}. Use o botão <b>+</b> (ou aperte <b>N</b>).</div>`}
    </div>
  </div>`;
}
// Categoria sem orçamento: o limite é a sobra prevista do mês (antes desses gastos), dividida entre todas as sem orçamento.
function catRow(c,m){
  const free=!c.plan;
  const lim=free?m.sobra+m.semOrc:c.plan;
  const rest=free?m.sobra:c.plan-c.spent;
  const p=lim>0?c.spent/lim:(c.spent>0?1.01:0);
  const cls=rest<0?'over':(free?m.semOrc/lim:p)>.85?'warn':'';
  return `<div class="cat" data-action="filterCat" data-id="${c.item.id}" style="cursor:pointer">
    <div class="ic">${c.item.icon||'•'}</div>
    <div class="nm">${esc(c.item.name)}</div>
    <div class="vl num"><b>${fmt(c.spent)}</b> <span class="muted">/ ${fmt(Math.max(0,lim))}</span><br><span class="${rest<0?'neg':'t2'}" style="font-size:12px">${rest<0?'passou '+fmt(-rest):'restam '+fmt(rest)}${free?' da sobra':''}</span></div>
    <div class="bar"><i class="${cls}" style="width:${Math.min(100,p*100)}%"></i></div>
  </div>`;
}
function billRow(i,ym,compact){
  const d=dueInfo(i,ym),v=val(i,ym),pl=planned(i,ym);
  let extra='';
  if(i.group==='parcela'){const di=debtInfo(i);const idx=di.ms.indexOf(ym);if(idx>=0)extra=` · parcela ${idx+1+di.before}/${di.total}`}
  if(i.group==='fatura')extra=' · '+plural(cardInstallments(i._card).filter(x=>x.ym===ym).length,'compra');
  if(i.goal&&goalById(i.goal))extra=' · meta '+esc(goalById(i.goal).name);
  if(i.cons&&i.cons.role==='pay'){const c=consorcioById(i.cons.id);if(c){const x=consInfo(c),k=monthsDiff(x.first,ym);if(k>=0&&k<x.n)extra=` · ${k+1}/${x.n} do consórcio`}}
  if(i.cons&&i.cons.role==='get')extra=' · sua vez no consórcio';
  return `<div class="bill ${compact?'compact':''} ${d.cls} ${i.group==='fatura'?'fatura':''}" data-action="togglePaid" data-id="${i.id}" data-m="${ym}">
    <div class="chk">✓</div>
    <div class="info"><div class="nm">${i.icon&&i.group!=='diadia'?i.icon+' ':''}${esc(i.name)}</div><div class="meta">${d.text}${compact?'':extra}</div></div>
    <div class="amt num">${fmt(v)}${Math.abs(v-pl)>.005?`<small>previsto ${fmt(pl)}</small>`:''}</div>
    <button class="edit" data-action="editBill" data-id="${i.id}" data-m="${ym}" title="Editar valor, data, vencimento">✎</button>
  </div>`;
}
function txRow(t){
  const it=itemById(t.cat),card=t.method==='credito'&&cardById(t.card);
  const date=new Date(t.date+'T12:00');
  const parc=t._n?` · parcela ${t._k+1}/${t._n} de ${fmt(t._full)}`:(parcOf(t)>1?` · ${t.parc}x`:'');
  return `<div class="tx" data-action="editTx" data-id="${t.id}">
    <div class="ic">${it?.icon||'❔'}</div>
    <div class="info"><div class="nm">${esc(t.desc||it?.name||'Gasto')}</div>
      <div class="meta">${esc(it?.name||'Sem categoria')} · ${WD[date.getDay()]} ${dmy(t.date)} · ${card?'💳 '+esc(card.name):methodLabel(t.method)}${parc}</div></div>
    <div class="amt num">${fmt(t.amount)}</div>
  </div>`;
}

/* ---------- Entradas ---------- */
const incKind=i=>i.kind==='salario'||i.salary?'Salário':i.kind==='13'?'13º':i.kind==='outra'?'Outras':i.kind==='consorcio'?'Consórcio':'Extras';
const KINDS=['Salário','13º','Outras','Consórcio','Extras'];
function vEntradas(){
  const ym=UI.month,c=calc(ym);
  const list=byGroup('receita').filter(i=>planned(i,ym)>0||st(i,ym)).sort((a,b)=>KINDS.indexOf(incKind(a))-KINDS.indexOf(incKind(b))||isPaid(a,ym)-isPaid(b,ym));
  const rec=list.filter(i=>isPaid(i,ym)).reduce((s,i)=>s+val(i,ym),0);
  const ms=monthsList(),ci=Math.max(0,ms.indexOf(ym));
  const next=ms.slice(ci+1,ci+7);
  const byKind=m=>{const o=Object.fromEntries(KINDS.map(k=>[k,0]));byGroup('receita').forEach(i=>{o[incKind(i)]+=val(i,m)});return o};
  const kinds=KINDS.filter(k=>k==='Salário'||ms.some(m=>byKind(m)[k]));
  const yr=ym.slice(0,4);
  const extras=byGroup('receita').filter(i=>incKind(i)==='Extras').flatMap(i=>ms.filter(m=>planned(i,m)>0||st(i,m)).map(m=>({i,m}))).sort((a,b)=>b.m.localeCompare(a.m));
  const extraYear=extras.filter(x=>x.m.startsWith(yr)).reduce((s,x)=>s+val(x.i,x.m),0);
  const recurring=byGroup('receita').filter(i=>i.rec&&i.kind!=='extra'&&!i.cons);
  return `
  <h2 class="title">Entradas</h2>
  <p class="sub">Salário, 13º, outras rendas e qualquer dinheiro extra. Toque numa entrada para marcar como recebida; use ✎ para mudar o valor deste mês.</p>
  <div class="grid2">
    <div class="card kpi hero span-3"><div class="k-lbl">Previsto em ${ymLong(ym)}</div><div class="k-val num">${fmt(c.receita)}</div><div class="k-sub">${plural(list.length,'entrada')}</div></div>
    <div class="card kpi span-3"><div class="k-lbl">Já recebido</div><div class="k-val num pos">${fmt(rec)}</div><div class="pbar"><i style="width:${c.receita?Math.min(100,rec/c.receita*100):0}%"></i></div></div>
    <div class="card kpi span-3"><div class="k-lbl">Falta receber</div><div class="k-val num">${fmt(Math.max(0,c.receita-rec))}</div><div class="k-sub">${rec>=c.receita&&c.receita>0?'tudo recebido ✓':''}</div></div>
    <div class="card kpi span-3 full-m"><div class="k-lbl">Extras em ${yr}</div><div class="k-val num">${fmt(extraYear)}</div><div class="k-sub">fora salário, 13º e rendas fixas</div></div>

    <div class="card span-7">
      <h3>💰 Entradas de ${ymLong(ym)} <span class="right" style="display:flex;gap:6px"><button class="btn sm" data-action="newRecurring" data-g="receita">+ Recorrente</button><button class="btn sm primary" data-action="newIncome">+ Extra</button></span></h3>
      ${list.map(i=>billRow(i,ym)).join('')||'<div class="empty">Nenhuma entrada prevista neste mês.</div>'}
      <div class="hint"><b>Recorrente</b> = salário, aposentadoria, pensão, aluguel que você recebe… <b>Extra</b> = dinheiro que entra uma vez (freela, venda, reembolso).</div>
    </div>
    <div class="card span-5">
      <h3>📅 Próximos meses</h3>
      <div style="overflow:auto"><table class="items num"><thead><tr><th>Mês</th>${kinds.map(k=>`<th class="hide-m" style="text-align:right">${k}</th>`).join('')}<th style="text-align:right">Total</th></tr></thead>
      <tbody>${next.map(m=>{const k=byKind(m);return`<tr><td><button class="link" data-action="goMonthTab" data-m="${m}" data-tab="entradas">${ymLabel(m)}</button><span class="only-m muted" style="font-size:11px">${kinds.filter(x=>k[x]).map(x=>x+' '+fmt(k[x])).join(' · ')}</span></td>${kinds.map(x=>`<td style="text-align:right" class="hide-m ${k[x]?'':'muted'}">${k[x]?fmt(k[x]):'–'}</td>`).join('')}<td style="text-align:right"><b>${fmt(KINDS.reduce((s,x)=>s+k[x],0))}</b></td></tr>`}).join('')||'<tr><td colspan="6" class="muted">Fim do plano.</td></tr>'}</tbody></table></div>
    </div>

    <div class="card span-12"><h3>Entradas por mês <span class="right t2">clique numa barra para abrir o mês</span></h3><div class="chart" id="chInc"></div></div>

    ${recurring.length?`<div class="card span-6"><h3>🔁 Entradas recorrentes</h3>
      ${recurring.map(i=>`<div class="tx" data-action="editItem" data-id="${i.id}"><div class="ic">${i.icon||'💰'}</div><div class="info"><div class="nm">${esc(i.name)}</div><div class="meta">${recText(i)}</div></div><div class="amt num">${fmt(planned(i,ym)||i.rec.amount)}</div></div>`).join('')}
      <div class="hint">Toque para mudar valor, frequência ou reajuste.</div></div>`:''}

    <div class="card span-${recurring.length?6:12}">
      <h3>✨ Entradas extras</h3>
      ${extras.length?`<div style="overflow:auto"><table class="items num"><thead><tr><th>Mês</th><th>De onde veio</th><th style="text-align:right">Valor</th><th style="text-align:right">Situação</th></tr></thead><tbody>
        ${extras.map(({i,m})=>`<tr><td>${ymLabel(m)}</td><td>${esc(i.name)}</td><td style="text-align:right">${fmt(val(i,m))}</td><td style="text-align:right" class="${isPaid(i,m)?'pos':'muted'}">${isPaid(i,m)?'✓ recebido':'previsto'}</td></tr>`).join('')}
      </tbody></table></div>`:'<div class="empty">Nenhuma entrada extra ainda. Quando entrar um dinheiro a mais (freela, venda, reembolso…), use “+ Extra”.</div>'}
    </div>
  </div>`;
}
vEntradas.after=()=>{
  const ms=monthsList();
  const tot=ms.map(m=>byGroup('receita').reduce((s,i)=>s+val(i,m),0));
  barChart($('#chInc'),{labels:ms,values:tot,color:'var(--s3)',highlight:UI.month,
    tip:i=>{const o={};byGroup('receita').forEach(it=>{const k=incKind(it);o[k]=(o[k]||0)+val(it,ms[i])});return Object.entries(o).filter(x=>x[1]).map(([k,v])=>`<div class="r"><span>${k}</span><span class="num">${fmt(v)}</span></div>`).join('')+`<div class="r"><b>Total</b><b class="num">${fmt(tot[i])}</b></div>`},
    onClick:m=>{UI.month=m;render()}});
};
function recText(i){
  const r=i.rec;if(!r)return'';
  const f=r.freq==='y'?'todo ano em '+MN[+r.start.slice(5)-1]:r.freq==='n'?'a cada '+r.n+' meses':'todo mês';
  const last=recLast(r);
  return f+(i.due?' · dia '+i.due:'')+' · desde '+ymLabel(r.start)+(last?' até '+ymLabel(last):'')+(r.adj&&r.adj.pct?' · reajuste '+String(r.adj.pct).replace('.',',')+'% em '+MN[r.adj.month-1]:'');
}

/* ---------- Gastos do dia a dia ---------- */
function vLanc(){
  const c=calc(UI.month);
  let txs=[...c.txs];
  if(UI.filterCat)txs=txs.filter(t=>t.cat===UI.filterCat||(UI.filterCat==='_orf'&&!itemById(t.cat)));
  if(UI.filterMethod)txs=txs.filter(t=>UI.filterMethod.startsWith('card:')?t.method==='credito'&&t.card===UI.filterMethod.slice(5):t.method===UI.filterMethod);
  if(UI.search){const q=UI.search.toLowerCase();txs=txs.filter(t=>(t.desc||'').toLowerCase().includes(q)||(itemById(t.cat)?.name||'').toLowerCase().includes(q))}
  txs.sort((a,b)=>b.date.localeCompare(a.date)||(b.ts||0)-(a.ts||0));
  const days={};txs.forEach(t=>{const k=t._k>0?'_parc':t.date;(days[k]=days[k]||[]).push(t)});
  const keys=Object.keys(days).filter(k=>k!=='_parc');if(days._parc)keys.push('_parc');
  const total=txs.reduce((s,t)=>s+t.amount,0);
  const cards=S.cards||[];
  return `
  <h2 class="title">Gastos do dia a dia</h2>
  <p class="sub">${ymLong(UI.month)} · ${plural(txs.length,'lançamento')} · total ${fmt(total)}</p>
  <div class="grid2">
    <div class="card span-7">
      <div class="filters">
        <input id="fSearch" placeholder="🔎 Buscar descrição ou categoria…" value="${esc(UI.search)}">
        <select id="fCat"><option value="">Todas as categorias</option>${c.cats.map(x=>`<option value="${x.item.id}" ${UI.filterCat===x.item.id?'selected':''}>${x.item.icon||''} ${esc(x.item.name)}</option>`).join('')}</select>
        <select id="fMethod"><option value="">Todas as formas</option>${METHODS.map(([k,l])=>`<option value="${k}" ${UI.filterMethod===k?'selected':''}>${l}</option>`).join('')}${cards.map(cd=>`<option value="card:${cd.id}" ${UI.filterMethod==='card:'+cd.id?'selected':''}>💳 ${esc(cd.name)}</option>`).join('')}</select>
      </div>
      ${keys.length?keys.map(d=>{const list=days[d];if(d==='_parc')return`<div class="dayhdr"><span>Parcelas de compras anteriores</span><span class="num">${fmt(list.reduce((s,t)=>s+t.amount,0))}</span></div>${list.map(txRow).join('')}`;const dt=new Date(d+'T12:00');return `<div class="dayhdr"><span>${WD[dt.getDay()]}, ${dmy(d)}${d===todayISO()?' · hoje':''}</span><span class="num">${fmt(list.reduce((s,t)=>s+t.amount,0))}</span></div>${list.map(txRow).join('')}`}).join(''):`<div class="empty">Nenhum gasto encontrado.<br><br><button class="btn primary" data-action="addTx">+ Lançar gasto</button></div>`}
    </div>
    <div class="card span-5">
      <h3>Por categoria <span class="right"><button class="link" data-action="exportCsv">exportar CSV</button></span></h3>
      ${c.cats.filter(x=>x.plan||x.spent).map(x=>catRow(x,c)).join('')||'<div class="empty">Sem dados.</div>'}
      <div class="cat" style="border-top:1px solid var(--border);margin-top:4px"><div class="ic">Σ</div><div class="nm">Total</div><div class="vl num"><b>${fmt(c.diaSpent)}</b></div></div>
      <div class="hint">Toque numa categoria para filtrar a lista. O orçamento de cada categoria fica na aba Orçamento (ou em Ajustes). Compras parceladas no cartão contam uma parcela por mês.</div>
      <button class="btn sm" style="margin-top:10px" data-action="newRecurring" data-g="diadia">+ Nova categoria</button>
    </div>
  </div>`;
}
vLanc.after=()=>{
  const s=$('#fSearch');
  s.oninput=()=>{UI.search=s.value;const pos=s.selectionStart;render();const n=$('#fSearch');n.focus();n.setSelectionRange(pos,pos)};
  $('#fCat').onchange=e=>{UI.filterCat=e.target.value;render()};
  $('#fMethod').onchange=e=>{UI.filterMethod=e.target.value;render()};
};

/* ---------- Contas do mês ---------- */
function vContas(){
  const ym=UI.month,c=calc(ym);
  const all=c.bills;const nPaid=all.filter(i=>isPaid(i,ym)).length;
  const grp=(list,title,note='')=>{
    list=list.filter(i=>planned(i,ym)>0||st(i,ym)).sort((a,b)=>isPaid(a,ym)-isPaid(b,ym)||(a.due||99)-(b.due||99));
    if(!list.length)return'';
    const tot=list.reduce((s,i)=>s+val(i,ym),0),pd=list.filter(i=>isPaid(i,ym)).reduce((s,i)=>s+val(i,ym),0);
    return `<div class="groupttl"><span>${title}</span><span class="num">${fmt(pd)} de ${fmt(tot)}</span></div>${note}${list.map(i=>billRow(i,ym)).join('')}`;
  };
  return `
  <h2 class="title">Contas do mês</h2>
  <p class="sub">Toque numa conta para marcar como paga (fica verde). Toque de novo para desmarcar. Use ✎ para mudar valor, data ou vencimento.</p>
  <div class="grid2">
    <div class="card span-8">
      <div style="display:flex;justify-content:space-between;align-items:baseline;flex-wrap:wrap;gap:8px">
        <div><b style="font-size:18px">${nPaid} de ${all.length}</b> <span class="t2">pagas em ${ymLong(ym)}</span></div>
        <div class="num t2">${fmt(c.paidAmt)} de ${fmt(c.billsAmt)} (sem metas)</div>
      </div>
      <div class="pbar"><i style="width:${all.length?nPaid/all.length*100:0}%"></i></div>
      ${grp(byGroup('fixa'),'Contas fixas')}${grp(byGroup('parcela'),'Parcelas e dívidas')}${grp(byGroup('quitacao'),'Quitações antecipadas')}
      ${grp(c.invoices,'Faturas de cartão','<div class="hint" style="margin:-4px 0 8px">As compras do cartão já contam nos gastos do dia a dia — a fatura serve só para marcar o pagamento.</div>')}
      ${grp(byGroup('reserva'),'Guardar dinheiro (metas)')}
      ${!all.length&&!c.invoices.length?'<div class="empty">Nenhuma conta neste mês.</div>':''}
      <div style="margin-top:14px;display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn sm primary" data-action="newRecurring" data-g="fixa">+ Conta fixa (todo mês)</button>
        <button class="btn sm" data-action="newBill">+ Conta avulsa neste mês</button>
        ${nPaid<all.length?`<button class="btn sm" data-action="payAll">Marcar todas como pagas</button>`:''}
      </div>
    </div>
    <div class="card span-4">
      <h3>📌 Resumo <span class="right"><button class="link" data-action="tab" data-tab="entradas">💰 ver entradas →</button></span></h3>
      <div class="legend">
        <div>Entradas</div><div></div><div class="num" style="text-align:right">${fmt(c.receita)}</div>
        <div>Contas fixas</div><div></div><div class="num" style="text-align:right">− ${fmt(c.fixas)}</div>
        <div>Parcelas + quitações</div><div></div><div class="num" style="text-align:right">− ${fmt(c.parcelas+c.quit)}</div>
        <div>Dia a dia (previsto)</div><div></div><div class="num" style="text-align:right">− ${fmt(c.diaProj)}</div>
        <div><b>Sobra</b></div><div></div><div class="num ${c.sobra<0?'neg':'pos'}" style="text-align:right;font-weight:700">${fmt(c.sobra)}</div>
        <div>Guardar (metas)</div><div></div><div class="num" style="text-align:right">− ${fmt(c.reserva)}</div>
        <div><b>Livre</b></div><div></div><div class="num ${c.livre<0?'neg':''}" style="text-align:right;font-weight:700">${fmt(c.livre)}</div>
      </div>
    </div>
  </div>`;
}

/* ---------- Orçamento (planilha) ---------- */
function sheetWindow(){
  const all=monthsList();
  const W=Math.min(parseInt(getComputedStyle(document.documentElement).getPropertyValue('--maxw'))||1280,document.documentElement.clientWidth)-34;
  const compact=UI.sheetCompact??(W<700);
  const labelW=W<700?118:210;
  const colMin=compact?(W<700?60:62):86;
  const n=Math.max(2,Math.min(compact?18:12,all.length,Math.floor((W-labelW)/colMin)));
  let i=all.indexOf(UI.sheetStart);
  const ci=all.indexOf(UI.month);
  if(i<0||ci<i||ci>=i+n)i=ci;           // o mês selecionado sempre aparece
  i=Math.max(0,Math.min(i,all.length-n));
  UI.sheetStart=all[i];
  return{all,ms:all.slice(i,i+n),i,n,labelW,compact};
}
function vOrc(){
  const SW=sheetWindow(),ms=SW.ms,all=SW.all;
  const fN=SW.compact?(n=>n?Math.round(n).toLocaleString('pt-BR'):'–'):(n=>n?NUM.format(n):'–');
  const C=Object.fromEntries(ms.map(m=>[m,calc(m)]));
  const cur=UI.month;
  const cell=(it,m,opts={})=>{
    const v=opts.plan?planned(it,m):val(it,m),p=!opts.noPaid&&isPaid(it,m);
    let inner=fN(v),cls='c num ed'+(p?' paid':'')+(v?'':' zero')+(m===cur?' cur':'');
    if(opts.spent){const ov=opts.spent>v;inner+=`<span class="spent ${ov?'over':''}">gasto ${fN(opts.spent)}</span>`}
    return `<td class="${cls}" data-action="cell" data-id="${it.id}" data-m="${m}">${inner}</td>`;
  };
  const row=(it,opts={})=>`<tr class="${opts.cls||''}"><td class="rowh ed" title="${esc(it.name)} — clique para editar" data-action="editItem" data-id="${it.id}">${opts.debt?`<span class="lbl-debt">${esc(it.name)}</span>`:esc(it.name)}${it.rec?' <span class="muted" title="recorrente">🔁</span>':''}</td>${ms.map(m=>cell(it,m,{...opts,spent:opts.dd?C[m].cats.find(x=>x.item.id===it.id)?.spent:null})).join('')}</tr>`;
  const tot=(label,f,cls='sub',fm=fN)=>`<tr class="${cls}"><td class="rowh">${label}</td>${ms.map(m=>{const v=f(C[m],m);return`<td class="c num${m===cur?' cur':''}${typeof v==='number'&&v<0?' over':''}">${fm(v)}</td>`}).join('')}</tr>`;
  const sec=t=>`<tr class="sec"><td class="rowh">${t}</td><td colspan="${ms.length}"></td></tr>`;
  const ddItems=byGroup('diadia').filter(i=>UI.sheetMode==='all'||ms.some(m=>planned(i,m)>0||C[m].cats.find(x=>x.item.id===i.id)?.n));
  const RS=resSeries(),cp={},cpJ={},cr={};
  RS.rows.forEach(r=>{cp[r.m]=r.cp;cpJ[r.m]=r.cpJ;cr[r.m]=r.cr});
  const last=SW.i+SW.n>=all.length;
  return `
  <div style="display:flex;align-items:baseline;gap:12px;flex-wrap:wrap;margin-bottom:10px">
    <h2 class="title" style="margin:0">Orçamento</h2>
    <span class="t2">plano de ${ymLabel(all[0])} a ${ymLabel(all[all.length-1])}</span>
  </div>
  <div class="sheet-tools">
    <div class="winnav">
      <button data-action="sheetFirst" ${SW.i===0?'disabled':''} title="Início do plano">«</button>
      <button data-action="sheetPrev" ${SW.i===0?'disabled':''} title="Meses anteriores">‹</button>
      <span class="rng">${ymLabel(ms[0])} – ${ymLabel(ms[ms.length-1])}</span>
      <button data-action="sheetNext" ${last?'disabled':''} title="Próximos meses">›</button>
      <button data-action="sheetLast" ${last?'disabled':''} title="Fim do plano">»</button>
    </div>
    <label class="check" style="margin:0;font-size:13px"><input type="checkbox" id="sheetCompact" ${SW.compact?'checked':''}> sem centavos (cabem mais meses)</label>
    <label class="check" style="margin:0;font-size:13px"><input type="checkbox" id="showAllCats" ${UI.sheetMode==='all'?'checked':''}> mostrar categorias sem valor</label>
    <div class="legend-inline" style="margin-left:auto"><span style="--bg-sw:var(--paid-bg)">pago</span><span style="--bg-sw:var(--accent)">mês selecionado</span><span style="--bg-sw:var(--bad)">passou do orçado</span></div>
  </div>
  <div class="gridwrap" id="gridwrap"><table class="sheet ${SW.compact?'compact':''}">
    <colgroup><col style="width:${SW.labelW}px">${ms.map(()=>'<col>').join('')}</colgroup>
    <thead><tr><th class="rowh">Mês</th>${ms.map(m=>`<th class="${m===cur?'cur':''}" data-action="goMonth" data-m="${m}">${ymLabel(m)}</th>`).join('')}</tr></thead>
    <tbody>
      ${sec('ENTRADAS')}
      ${byGroup('receita').map(i=>row(i)).join('')}
      ${tot('Total de entradas',c=>c.receita)}
      ${sec('CONTAS FIXAS')}
      ${byGroup('fixa').map(i=>row(i)).join('')}
      ${tot('Subtotal contas fixas',c=>c.fixas)}
      ${sec('DIA A DIA')}
      ${ddItems.map(i=>row(i,{dd:true,plan:true,noPaid:true})).join('')}
      ${tot('Subtotal dia a dia (orçado)',c=>c.diaPlan)}
      ${tot('Gasto real dia a dia',c=>c.diaSpent,'ital')}
      ${sec('PARCELAS E DÍVIDAS')}
      ${byGroup('parcela').map(i=>row(i,{debt:true})).join('')}
      ${tot('Subtotal parcelas',c=>c.parcelas)}
      ${byGroup('quitacao').map(i=>row(i)).join('')}
      <tr><td class="rowh" style="border-bottom:0"></td><td colspan="${ms.length}" style="border-bottom:0"></td></tr>
      ${tot('TOTAL DE SAÍDAS',c=>c.saidas)}
      ${tot('SOBRA DO MÊS',c=>c.sobra,'big')}
      ${tot('% do salário em parcelas',c=>c.pctParc,'ital',v=>v?pct(v):'–')}
      ${sec('DESTINO DA SOBRA (METAS)')}
      ${byGroup('reserva').map(i=>row(i)).join('')}
      ${tot('TOTAL GUARDADO (plano)',(c,m)=>cp[m],'big')}
      ${tot('Com rendimento ('+String(S.settings.savingsRate??0.6).replace('.',',')+'% a.m.)',(c,m)=>cpJ[m],'ital')}
      ${tot('Guardado de verdade',(c,m)=>cr[m]==null?0:cr[m],'ital')}
    </tbody></table></div>
  <div class="hint">Clique numa célula para editar o valor ou marcar como pago · clique no nome de uma linha para editar o item (recorrência, dívida…) · clique no mês para abrir o painel dele · a sobra usa o maior valor entre o orçado e o gasto real de cada categoria do dia a dia.</div>`;
}
vOrc.after=()=>{
  document.documentElement.style.setProperty('--hdr',$('header.top').offsetHeight+'px');
  const shift=d=>{const all=monthsList(),SW=sheetWindow();const i=Math.max(0,Math.min(all.length-SW.n,SW.i+d));UI.sheetStart=all[i];if(UI.month<all[i]||UI.month>all[Math.min(all.length-1,i+SW.n-1)])UI.month=all[i];render()};
  document.querySelector('[data-action=sheetPrev]').onclick=()=>shift(-sheetWindow().n);
  document.querySelector('[data-action=sheetNext]').onclick=()=>shift(sheetWindow().n);
  document.querySelector('[data-action=sheetFirst]').onclick=()=>shift(-999);
  document.querySelector('[data-action=sheetLast]').onclick=()=>shift(999);
  $('#sheetCompact').onchange=e=>{UI.sheetCompact=e.target.checked;render()};
  $('#showAllCats').onchange=e=>{UI.sheetMode=e.target.checked?'all':'plan';render()};
};

/* ---------- Dívidas ---------- */
function vDividas(){
  const debts=byGroup('parcela').map(i=>({i,d:debtInfo(i)})).filter(x=>x.d.total>0||(x.i.payoffs||[]).length);
  const active=debts.filter(x=>x.d.remaining>0).sort((a,b)=>a.d.last.localeCompare(b.d.last));
  const done=debts.filter(x=>x.d.remaining===0);
  const remTotal=active.reduce((s,x)=>s+x.d.remVal,0);
  const cashTotal=active.reduce((s,x)=>s+debtCash(x.i).cash,0);
  const withRate=active.filter(x=>debtRate(x.i));
  const anyEst=withRate.some(x=>debtCash(x.i).src==='est');
  const lastAny=active.reduce((m,x)=>x.d.last>m?x.d.last:m,'');
  const freeMonth=lastAny?ymAdd(lastAny,1):null;
  const cur=calc(UI.month);
  const cds=cardDebts(),cdTot=cds.reduce((s,x)=>s+x.rem,0);
  return `
  <h2 class="title">Dívidas e parcelas</h2>
  <p class="sub">Acompanhe quanto falta e quando cada parcela termina. As parcelas pagas são as que você marca em “Contas do mês”.</p>
  <div class="grid2">
    <div class="card kpi hero span-3"><div class="k-lbl">Falta pagar (no plano)</div><div class="k-val num">${fmt(remTotal)}</div><div class="k-sub">${plural(active.length,'dívida ativa','dívidas ativas')}${cdTot?' · + '+fmt(cdTot)+' parcelado no cartão':''}</div>
      <button class="btn sm" data-action="newDebt" style="margin-top:10px;background:rgba(255,255,255,.14);border-color:rgba(255,255,255,.3);color:#fff">+ Nova dívida</button></div>
    <div class="card kpi span-3 full-m" style="border-color:var(--paid-strong)"><div class="k-lbl">Falta pagar (à vista)</div><div class="k-val num pos">${fmt(cashTotal)}</div><div class="k-sub">${withRate.length?`quitando tudo hoje: <b class="pos">${fmt(remTotal-cashTotal)}</b> a menos de juros · desconto em ${plural(withRate.length,'dívida')} com juros conhecidos${anyEst?' (parte estimada)':''}`:'informe os juros (ou o valor de quitação) de uma dívida para ver o desconto'}</div></div>
    <div class="card kpi span-3"><div class="k-lbl">Livre de parcelas em</div><div class="k-val">${freeMonth?ymLong(freeMonth):'—'}</div><div class="k-sub">${freeMonth?'faltam '+plural(Math.max(0,monthsDiff(todayYM(),freeMonth)),'mês','meses'):''}</div></div>
    <div class="card kpi span-3"><div class="k-lbl">Parcelas em ${ymLong(UI.month)}</div><div class="k-val num">${fmt(cur.parcelas)}</div><div class="k-sub">${cur.pctParc?pct(cur.pctParc)+' do salário':''}</div></div>
    ${payToCards()}
    <div class="card span-12">
      <h3>Total de parcelas por mês <span class="right t2">clique numa barra para abrir o mês</span></h3>
      <div class="chart" id="chParc"></div>
    </div>
    <div class="card span-7">
      <h3>Ativas <span class="right t2">em ordem de término</span></h3>
      ${active.map(x=>debtRow(x.i,x.d)).join('')||'<div class="empty">Nenhuma dívida ativa 🎉<br><br><button class="btn primary" data-action="newDebt">+ Cadastrar dívida</button></div>'}
    </div>
    <div class="card span-5">
      <h3>✅ Quitadas</h3>
      ${done.map(x=>debtRow(x.i,x.d)).join('')||'<div class="empty">Ainda nenhuma — marque as parcelas como pagas para acompanhar.</div>'}
    </div>
    ${cds.length?`<div class="card span-12"><h3>💳 Parcelado no cartão <span class="right t2">${fmt(cdTot)} em aberto</span></h3>
      ${cds.map(x=>{const paidN=x.list.length-x.open.length;return`<div class="debt"><div class="row1"><span class="nm">${esc(x.t.desc||itemById(x.t.cat)?.name||'Compra')} <span class="pill">${esc(x.card.name)}</span></span><span class="num"><b>${fmt(x.rem)}</b> <span class="muted">restante</span></span></div>
        <div class="pbar" style="height:8px"><i style="width:${paidN/x.list.length*100}%"></i></div>
        <div class="meta"><span>${paidN} de ${x.list.length} faturas pagas</span><span>${x.list.length}x de ${fmt(x.list[0].amount)}</span><span>compra em ${dmy(x.t.date)}/${x.t.date.slice(2,4)}</span><span>última fatura ${ymLabel(x.last)}</span><button class="link" data-action="editTx" data-id="${x.t.id}">editar compra</button></div></div>`}).join('')}
      <div class="hint">As parcelas do cartão já contam nos gastos do dia a dia de cada mês.</div></div>`:''}
  </div>`;
}
// Dívidas no nome de outra pessoa (ou com uma pessoa): você repassa o valor para ela todo mês (it.payTo = nome)
function payToCards(){
  const ym=UI.month,groups={};
  byGroup('parcela').filter(i=>i.payTo).forEach(i=>(groups[i.payTo]=groups[i.payTo]||[]).push(i));
  return Object.entries(groups).map(([who,list])=>{
    const cred=byGroup('receita').filter(i=>i.payFrom===who);
    const credMon=cred.filter(i=>planned(i,ym)>0||st(i,ym));
    const credTot=credMon.reduce((s,i)=>s+val(i,ym),0),credOpen=credMon.filter(i=>!isPaid(i,ym)).reduce((s,i)=>s+val(i,ym),0);
    const credAll=cred.reduce((s,i)=>s+monthsList().filter(m=>planned(i,m)>0&&!isPaid(i,m)).reduce((a,m)=>a+val(i,m),0),0);
    const mon=list.filter(i=>planned(i,ym)>0||st(i,ym));
    const monTot=mon.reduce((s,i)=>s+val(i,ym),0),sent=mon.filter(i=>isPaid(i,ym));
    const sentTot=sent.reduce((s,i)=>s+val(i,ym),0);
    const infos=list.map(i=>({i,d:debtInfo(i)}));
    const owed=infos.reduce((s,x)=>s+x.d.remVal,0);
    const last=infos.map(x=>x.d.last).filter(Boolean).sort().pop();
    const nx=ymAdd(ym,1),nxTot=list.reduce((s,i)=>s+val(i,nx),0)-cred.reduce((s,i)=>s+val(i,nx),0);
    const all=sent.length===mon.length&&mon.length>0&&!credOpen;
    const net=monTot-sentTot-credOpen;
    return `<div class="card span-12" style="border-color:#e0a030">
      <h3>🤝 Repasse para ${esc(who)} <span class="right t2">${plural(list.length,'dívida')} com ${esc(who)}</span></h3>
      <div class="grid2" style="gap:12px;margin-bottom:6px">
        <div class="kpi span-4"><div class="k-lbl">Mandar em ${ymLong(ym)}${credTot?' (líquido)':''}</div><div class="k-val num">${fmt(monTot-credTot)}</div>
          ${credTot?`<div class="k-sub">parcelas ${fmt(monTot)} − <b class="pos">${fmt(credTot)}</b> que ${esc(who)} te deve (${credMon.map(i=>esc(i.name)).join(', ')})</div>`:''}
          <div class="k-sub">${mon.length?(all?`<span class="pos" style="font-weight:700">✓ enviado</span>`:sent.length||credTot-credOpen?`${fmt(sentTot-(credTot-credOpen))} já acertado · falta <b>${fmt(net)}</b>`:'ainda não enviado'):'nada neste mês'}</div>
          ${mon.length&&!all?`<button class="btn sm good" style="margin-top:8px" data-action="payToSend" data-who="${esc(who)}">✓ Marcar ${fmt(net)} como enviado</button>`:''}</div>
        <div class="kpi span-4"><div class="k-lbl">Devo no total para ${esc(who)}</div><div class="k-val num">${fmt(owed-credAll)}</div><div class="k-sub">${credAll?`parcelas ${fmt(owed)} − ${fmt(credAll)} que ${esc(who)} te deve`:'parcelas ainda não enviadas, de todos os meses'}</div></div>
        <div class="kpi span-4"><div class="k-lbl">Último repasse</div><div class="k-val">${last?ymLong(last):'—'}</div><div class="k-sub">${last?'faltam '+plural(Math.max(0,monthsDiff(ym,last)+1),'mês','meses')+' (contando este) · próximo mês: '+fmt(nxTot):''}</div></div>
      </div>
      <div style="overflow:auto"><table class="items num"><thead><tr><th>Dívida</th><th style="text-align:right">${ymLabel(ym)}</th><th style="text-align:right">Restante</th><th class="hide-m" style="text-align:right">Termina</th></tr></thead><tbody>
        ${infos.sort((a,b)=>(a.d.last||'').localeCompare(b.d.last||'')).map(({i,d})=>`<tr><td>${isPaid(i,ym)?'✓ ':''}${esc(i.name)}</td><td style="text-align:right" class="${isPaid(i,ym)?'pos':planned(i,ym)?'':'muted'}">${planned(i,ym)||st(i,ym)?fmt(val(i,ym)):'–'}</td><td style="text-align:right">${d.remVal?fmt(d.remVal):'<span class="pos">quitada</span>'}</td><td style="text-align:right" class="t2 hide-m">${d.last?ymLabel(d.last):'–'}</td></tr>`).join('')}
        ${cred.map(i=>{const rest=monthsList().filter(m=>planned(i,m)>0&&!isPaid(i,m));return`<tr class="pos"><td>${isPaid(i,ym)?'✓ ':''}${esc(i.name)}</td><td style="text-align:right">${planned(i,ym)?'− '+fmt(val(i,ym)):'–'}</td><td style="text-align:right">${rest.length?'− '+fmt(rest.reduce((a,m)=>a+val(i,m),0)):'recebido'}</td><td style="text-align:right" class="t2 hide-m">${rest.length?ymLabel(rest[rest.length-1]):'–'}</td></tr>`}).join('')}
        <tr style="font-weight:700"><td>Total</td><td style="text-align:right">${fmt(monTot-credTot)}</td><td style="text-align:right">${fmt(owed-credAll)}</td><td class="hide-m"></td></tr>
      </tbody></table></div>
      <div class="hint">Para registrar algo que ${esc(who)} te paga de volta, crie uma entrada recorrente ou extra e escolha “${esc(who)} me paga” nas opções avançadas.</div>
    </div>`;
  }).join('');
}
function debtRow(i,d){
  const p=d.total?d.paid/d.total:0,tp=i.debt?.tipo;
  const R=d.remaining>0&&debtRate(i)?debtCash(i):null;
  return `<div class="debt ${d.remaining===0?'done':''}">
    <div class="row1"><span class="nm">${esc(i.name)}${tp?` <span class="pill">${debtTypeLabel(tp)}</span>`:''}${i.debt?.credor&&i.debt.credor!==i.payTo?` <span class="pill">${esc(i.debt.credor)}</span>`:''}${i.payTo?` <span class="pill" style="background:#fff0d4;color:#7a4b00">repasse ${esc(i.payTo)}</span>`:''}</span><span class="num" style="text-align:right"><b>${fmt(d.remVal)}</b> <span class="muted">restante</span>${R?`<br><b class="pos">${fmt(R.cash)}</b> <span class="muted">à vista</span>`:''}</span></div>
    <div class="pbar" style="height:8px"><i style="width:${p*100}%"></i></div>
    <div class="meta"><span>${d.paid} de ${d.total} pagas</span><span>parcela ${fmt(d.parcela)}</span>${d.last?`<span>termina em ${ymLabel(d.last)}</span>`:''}${d.nextUnpaid?`<span>próxima: ${ymLabel(d.nextUnpaid)}</span>`:''}${R&&R.rate!=null?`<span title="${R.src==='quote'?'calculada pelo valor de quitação que você informou'+(i.quote?' em '+dmy(i.quote.date):''):R.src==='info'?'taxa que você informou no cadastro':'estimada com a taxa de outro consignado — informe o valor real para ficar exato'}">juros ${pctRate(R.rate)} ${R.src==='quote'?'✓':R.src==='est'?'(estimado)':''}</span>`:''}
      <button class="link" data-action="editItem" data-id="${i.id}">✎ editar</button>
      ${d.remaining>0?`<button class="link" data-action="quote" data-id="${i.id}">informar valor de quitação</button><button class="link" data-action="payoff" data-id="${i.id}" style="margin-left:auto">💸 quitar / amortizar</button>`:''}</div>
    ${(i.payoffs||[]).map(po=>`<div class="meta" style="color:var(--paid-ink)">✓ ${po.mode==='total'?'Quitada':'Amortizada'} em ${dmy(po.date)}/${po.date.slice(2,4)} com ${fmt(po.amount)} · ${plural(po.removed,'parcela')} a menos${po.saved>0.005?' · economia de '+fmt(po.saved):''}</div>`).join('')}
  </div>`;
}
vDividas.after=()=>{
  const ms=monthsList();const cs=ms.map(calc);
  barChart($('#chParc'),{labels:ms,values:cs.map(c=>c.parcelas),highlight:UI.month,
    tip:i=>`<div class="r"><span>Parcelas</span><span class="num">${fmt(cs[i].parcelas)}</span></div>`+(cs[i].pctParc?`<div class="r"><span>% do salário</span><span class="num">${pct(cs[i].pctParc)}</span></div>`:''),
    onClick:m=>{UI.month=m;UI.tab='contas';render()}});
};

/* ---------- Cartões ---------- */
function vCartoes(){
  const cards=S.cards||[],ym=UI.month;
  if(!cards.length)return `
  <h2 class="title">Cartões de crédito</h2>
  <p class="sub">Cadastre seus cartões para ver as faturas, o limite usado e as compras parceladas.</p>
  <div class="card"><div class="empty">💳 Nenhum cartão cadastrado.<br><br><button class="btn primary" data-action="newCard">+ Adicionar cartão</button></div>
  <div class="hint">Depois, ao lançar um gasto, escolha <b>Crédito</b> e o cartão — dá para dividir em parcelas. O app calcula em qual fatura cada compra cai pelo dia de fechamento.</div></div>`;
  const sel=cardById(UI.cardView)||cards[0];
  const inv=invoiceItem(sel);
  const items=cardInstallments(sel).filter(x=>x.ym===ym).sort((a,b)=>b.t.date.localeCompare(a.t.date));
  const ms=monthsList(),ci=Math.max(0,ms.indexOf(ym)),next=ms.slice(ci,ci+6);
  return `
  <h2 class="title">Cartões de crédito</h2>
  <p class="sub">A fatura de cada mês é a que <b>vence</b> naquele mês. As compras já contam nos gastos do dia a dia; aqui você acompanha a fatura e o limite.</p>
  <div class="grid2">
    ${cards.map((c,k)=>{const iv=invoiceItem(c),v=val(iv,ym),used=cardUsed(c),paid=isPaid(iv,ym);return`<div class="span-4" style="cursor:pointer" data-action="cardView" data-id="${c.id}">
      <div class="ccard c${k%5}" style="${c.id===sel.id?'outline:3px solid var(--accent);outline-offset:2px':''}">
        <div style="display:flex;justify-content:space-between"><span class="cn">${c.icon||'💳'} ${esc(c.name)}</span><button class="link" style="color:#fff" data-action="editCard" data-id="${c.id}">✎</button></div>
        <div class="cs">Fatura de ${ymLabel(ym)} · vence dia ${c.vence}${paid?' · ✓ paga':''}</div>
        <div class="cv num">${fmt(v)}</div>
        ${c.limite?`<div class="pbar"><i style="width:${Math.min(100,used/c.limite*100)}%"></i></div><div class="cs">limite usado ${fmt(used)} de ${fmt(c.limite)} · livre ${fmt(Math.max(0,c.limite-used))}</div>`:`<div class="cs">em aberto (todas as faturas): ${fmt(used)}</div>`}
      </div></div>`}).join('')}
    <div class="span-4" style="display:flex;align-items:center;gap:8px;flex-wrap:wrap"><button class="btn" data-action="newCard">+ Adicionar cartão</button><button class="btn primary" data-action="addCardTx" data-id="${sel.id}">+ Compra no cartão</button></div>

    <div class="card span-7">
      <h3>${sel.icon||'💳'} ${esc(sel.name)} · fatura de ${ymLong(ym)} <span class="right">${planned(inv,ym)>0||st(inv,ym)?`<button class="btn sm ${isPaid(inv,ym)?'':'good'}" data-action="togglePaid" data-id="${inv.id}" data-m="${ym}">${isPaid(inv,ym)?'Desmarcar paga':'✓ Marcar como paga'}</button>`:''}</span></h3>
      <div class="t2" style="margin-bottom:8px">Fecha dia ${sel.fecha} · vence dia ${sel.vence} · ${dueInfo(inv,ym).text}</div>
      ${items.length?items.map(x=>{const it=itemById(x.t.cat);return`<div class="tx" data-action="editTx" data-id="${x.t.id}"><div class="ic">${it?.icon||'❔'}</div><div class="info"><div class="nm">${esc(x.t.desc||it?.name||'Compra')}</div><div class="meta">${dmy(x.t.date)}/${x.t.date.slice(2,4)} · ${esc(it?.name||'Sem categoria')}${x.n>1?` · parcela ${x.k+1}/${x.n}`:''}</div></div><div class="amt num">${fmt(x.amount)}</div></div>`}).join('')+`<div class="cat" style="border-top:1px solid var(--border);margin-top:4px"><div class="ic">Σ</div><div class="nm">Total da fatura</div><div class="vl num"><b>${fmt(planned(inv,ym))}</b></div></div>`:'<div class="empty">Nenhuma compra nesta fatura.</div>'}
    </div>
    <div class="card span-5">
      <h3>📅 Próximas faturas</h3>
      <div style="overflow:auto"><table class="items num"><thead><tr><th>Vence em</th>${cards.map(c=>`<th style="text-align:right">${esc(c.name)}</th>`).join('')}</tr></thead>
      <tbody>${next.map(m=>`<tr ${m===ym?'style="background:var(--accent-soft)"':''}><td><button class="link" data-action="goMonthTab" data-m="${m}" data-tab="cartoes">${ymLabel(m)}</button></td>${cards.map(c=>{const iv=invoiceItem(c);return`<td style="text-align:right" class="${isPaid(iv,m)?'pos':planned(iv,m)?'':'muted'}">${planned(iv,m)?(isPaid(iv,m)?'✓ ':'')+fmt(val(iv,m)):'–'}</td>`}).join('')}</tr>`).join('')}</tbody></table></div>
      <div class="hint">Só aparecem as compras lançadas no app. Se a fatura real vier diferente (anuidade, juros…), use ✎ na fatura em “Contas do mês” para informar o valor pago.</div>
    </div>
  </div>`;
}

/* ---------- Metas (reserva) ---------- */
function goalStats(g){
  const R=resSeries(g.id),eta=g.alvo?goalETA(R,g.alvo):null;
  const it=byGroup('reserva').find(i=>i.goal===g.id);
  const mon=it?planned(it,UI.month)||(it.rec?.amount||0):0;
  let need=null;
  if(g.prazo&&g.alvo>R.cur){const n=Math.max(1,monthsDiff(todayYM(),g.prazo)+1);need=(g.alvo-R.cur)/n}
  return{R,eta,it,mon,need};
}
function vMetas(){
  const ms=monthsList(),R=resSeries(),last=R.last,rate=S.settings.savingsRate??0.6;
  const annual=(Math.pow(1+rate/100,12)-1);
  const goals=S.goals||[];
  const loose=byGroup('reserva').some(i=>!i.goal||!goalById(i.goal))||(S.resAdj||[]).some(a=>!a.goal||!goalById(a.goal));
  const views=[['','Todas'],...goals.map(g=>[g.id,(g.icon||'🎯')+' '+g.name]),...(loose?[['_none','Sem meta']]:[])];
  const gv=views.some(v=>v[0]===UI.goalView)?UI.goalView:'';
  const gid=gv===''?undefined:gv==='_none'?null:gv;
  const RV=gv?resSeries(gid):R;
  const planNow=RV.rows[Math.max(0,RV.realUntil)]?.cpJ||0,diff=RV.cur-planNow;
  const adj=(S.resAdj||[]).filter(a=>inGoal(a,gid));
  return `
  <h2 class="title">Metas e dinheiro guardado</h2>
  <p class="sub">Crie metas (reserva de emergência, viagem, casa…). O valor mensal de cada meta aparece em “Contas do mês” para marcar quando guardar. De vez em quando, acerte com o saldo do banco.</p>
  <div class="grid2">
    <div class="card kpi hero span-3"><div class="k-lbl">Guardado de verdade (total)</div><div class="k-val num">${fmt(R.cur)}</div><div class="k-sub">${R.jrTot>0.005?'inclui '+fmt(R.jrTot)+' de rendimento':'em todas as metas'}</div>
      <button class="btn sm" data-action="newGoal" style="margin-top:10px;background:rgba(255,255,255,.14);border-color:rgba(255,255,255,.3);color:#fff">+ Nova meta</button></div>
    <div class="card kpi span-3"><div class="k-lbl">Guardando por mês</div><div class="k-val num">${fmt(calc(UI.month).reserva)}</div><div class="k-sub">planejado em ${ymLong(UI.month)}</div></div>
    <div class="card kpi span-3"><div class="k-lbl">Projeção em ${ymLabel(ms[ms.length-1])}</div><div class="k-val num">${fmt(last.proj)}</div><div class="k-sub">saldo de hoje + aportes do plano + rendimento</div></div>
    <div class="card kpi span-3"><div class="k-lbl">Rendimento estimado</div>
      <div style="display:flex;align-items:center;gap:8px;margin-top:4px"><input class="in num" id="resRate" inputmode="decimal" value="${String(rate).replace('.',',')}" style="width:80px;font-size:20px;font-weight:700;text-align:right"><span style="font-weight:600;white-space:nowrap">% ao mês</span></div>
      <div class="k-sub" style="margin-top:6px">≈ ${pct(annual)} ao ano · use o rendimento da sua aplicação (poupança, CDB…)</div></div>

    <div class="card span-12">
      <h3>🎯 Suas metas</h3>
      ${goals.length?goals.map(g=>{const x=goalStats(g),gp=g.alvo?Math.min(1,x.R.cur/g.alvo):0;return`<div class="goal">
        <div class="row1"><span class="nm">${g.icon||'🎯'} ${esc(g.name)}</span><span class="num"><b>${fmt(x.R.cur)}</b>${g.alvo?` <span class="muted">de ${fmt(g.alvo)}</span>`:''}</span></div>
        ${g.alvo?`<div class="pbar"><i style="width:${gp*100}%"></i></div>`:''}
        <div class="meta">
          ${g.alvo?(x.R.cur>=g.alvo?'<b class="pos">Meta atingida! 🎉</b>':`<span>falta <b>${fmt(g.alvo-x.R.cur)}</b></span>`):''}
          <span>guardando ${fmt(x.mon)}/mês</span>
          ${x.eta&&g.alvo&&x.R.cur<g.alvo?`<span>no ritmo atual chega em <b>${ymLabel(x.eta.m)}</b></span>`:''}
          ${g.prazo?`<span>prazo ${ymLabel(g.prazo)}${x.need!=null?` · precisa ~<b>${fmt(x.need)}</b>/mês${x.need>x.mon+0.005?' <span class="neg">(acima do que está guardando)</span>':''}`:''}</span>`:''}
          <button class="link" data-action="resBank" data-id="${g.id}">🏦 atualizar saldo</button>
          <button class="link" data-action="editGoal" data-id="${g.id}">✎ editar</button>
        </div></div>`}).join(''):'<div class="empty">Nenhuma meta ainda. Que tal começar por uma <b>reserva de emergência</b>?<br><br><button class="btn primary" data-action="newGoal">+ Criar meta</button></div>'}
    </div>

    ${consCard()}

    <div class="card span-12"><h3>Evolução <span class="right t2">comparado ao plano até agora: <b class="${diff<0?'neg':'pos'}">${diff>=0?'+':''}${fmt(diff)}</b></span></h3>
      <div class="chips" style="margin:-4px 0 10px">${views.map(([k,l])=>`<button class="chip ${gv===k?'on':''}" data-action="goalView" data-id="${k}">${esc(l)}</button>`).join('')}</div>
      <div style="display:flex;gap:16px;flex-wrap:wrap;font-size:12px;color:var(--text-2);margin:-4px 0 6px">
        <span><i style="display:inline-block;width:14px;height:0;border-top:2px dashed var(--s-free);vertical-align:middle;margin-right:6px"></i>Plano sem rendimento</span>
        <span><i style="display:inline-block;width:14px;height:3px;background:var(--s3);vertical-align:middle;margin-right:6px"></i>Plano com rendimento</span>
        <span><i style="display:inline-block;width:14px;height:3px;background:var(--s1);vertical-align:middle;margin-right:6px"></i>Real (com rendimento estimado)</span>
        <span><i style="display:inline-block;width:14px;height:0;border-top:2px dashed var(--s1);vertical-align:middle;margin-right:6px"></i>Projeção a partir do saldo de hoje</span></div>
      <div class="chart" id="chRes"></div></div>
    <div class="card span-12"><h3>🏦 Ajustes com o banco <span class="right"><button class="link" data-action="resBank" data-id="${gid||''}">+ novo ajuste</button></span></h3>
      ${adj.length?[...adj].sort((a,b)=>b.date.localeCompare(a.date)).map(a=>`<div class="tx" style="cursor:default"><div class="ic">${a.amount<0?'↘':'↗'}</div><div class="info"><div class="nm">${esc(a.note||'Ajuste')}${a.goal&&goalById(a.goal)?' · '+esc(goalById(a.goal).name):''}</div><div class="meta">${dmy(a.date)}/${a.date.slice(2,4)}${a.bank!=null?' · saldo informado '+fmt(a.bank):''}</div></div><div class="amt num ${a.amount<0?'neg':'pos'}">${a.amount>0?'+':''}${fmt(a.amount)}</div><button class="edit iconbtn" style="height:30px;min-width:30px;padding:0" data-action="resAdjDel" data-id="${a.id}" title="Excluir ajuste">🗑</button></div>`).join(''):'<div class="empty">Nenhum ajuste ainda. Informe o saldo do banco para o valor guardado ficar igual ao real.</div>'}
    </div>
    <div class="card span-12"><h3>Mês a mês</h3>
      <div style="overflow:auto"><table class="items num"><thead><tr><th>Mês</th><th style="text-align:right">Aporte planejado</th><th class="hide-m" style="text-align:right">Aporte real</th><th class="hide-m" style="text-align:right">Ajustes</th><th class="hide-m" style="text-align:right">Rendimento</th><th class="hide-m" style="text-align:right">Plano sem rendimento</th><th style="text-align:right">Plano com rendimento</th><th style="text-align:right">Guardado real</th></tr></thead>
      <tbody>${RV.rows.map(r=>`<tr ${r.m===UI.month?'style="background:var(--accent-soft)"':''}><td>${ymLabel(r.m)}</td><td style="text-align:right">${fmt(r.pl)}</td><td style="text-align:right" class="hide-m ${r.re?'pos':'muted'}">${r.re?fmt(r.re):'–'}</td><td style="text-align:right" class="hide-m ${r.aj<0?'neg':r.aj?'pos':'muted'}">${r.aj?(r.aj>0?'+':'')+fmt(r.aj):'–'}</td><td style="text-align:right" class="hide-m ${r.jr?'pos':'muted'}">${r.jr!=null?(r.jr?'+'+fmt(r.jr):'–'):'+'+fmt(r.jp)}</td><td style="text-align:right" class="t2 hide-m">${fmt(r.cp)}</td><td style="text-align:right">${fmt(r.cpJ)}</td><td style="text-align:right">${r.cr!=null?'<b>'+fmt(r.cr)+'</b>':'<span class="muted" title="projeção">≈ '+fmt(r.proj)+'</span>'}</td></tr>`).join('')}</tbody></table></div>
      <div class="hint">Nos meses futuros, “Rendimento” mostra o estimado do plano e “Guardado real” mostra a projeção (≈) a partir do saldo de hoje.</div>
    </div>
  </div>`;
}
vMetas.after=()=>{
  const ms=monthsList(),gv=UI.goalView||'';
  const R=gv?resSeries(gv==='_none'?null:gv):resSeries();
  lineChart($('#chRes'),{labels:ms,height:280,highlight:UI.month,series:[
    {name:'Sem rendimento',values:R.rows.map(r=>r.cp),color:'var(--s-free)',dash:true},
    {name:'Com rendimento',values:R.rows.map(r=>r.cpJ),color:'var(--s3)'},
    {name:'Real',values:R.rows.map(r=>r.cr),color:'var(--s1)'},
    {name:'Projeção',values:R.rows.map((r,i)=>i>=R.realUntil?r.proj:null),color:'var(--s1)',dash:true}]});
  const inp=$('#resRate');
  inp.onchange=()=>{const v=parseMoney(inp.value);if(v<0||v>5){uiAlert('Taxa inválida','Informe uma taxa mensal entre 0 e 5%.');inp.value=String(S.settings.savingsRate??0.6).replace('.',',');return}S.settings.savingsRate=v;save();render();toast('Rendimento: '+String(v).replace('.',',')+'% ao mês')};
  inp.addEventListener('keydown',e=>{if(e.key==='Enter')inp.blur()});
};

/* ---------- Ajustes ---------- */
function vAjustes(){
  const gOpts=g=>Object.entries(GROUPS).map(([k,v])=>`<option value="${k}" ${k===g?'selected':''}>${v.label}</option>`).join('');
  return `
  <h2 class="title">Ajustes</h2>
  <p class="sub">Sua conta, sincronização, backup e todos os itens do orçamento.</p>
  <div class="grid2">
    <div class="card span-6">
      <h3>👤 Minha conta</h3>
      <div class="t2">Usuário: <b>${esc(USER)}</b></div>
      <div class="hint">Seus dados ficam cifrados com a sua senha — nem quem administra o app consegue ler. Guarde bem a sua <b>chave de recuperação</b>: sem ela e sem a senha, não há como recuperar os dados.</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px">
        <button class="btn sm" data-action="changePw">🔑 Trocar senha</button>
        <button class="btn sm" data-action="newRecKey">🧾 Nova chave de recuperação</button>
        <button class="btn sm danger" data-action="logout">Sair</button>
      </div>
    </div>
    <div class="card span-6">
      <h3>☁️ Sincronização <span class="pill" style="background:${syncState==='error'?'var(--bad-bg);color:var(--bad)':'var(--paid-bg);color:var(--paid-ink)'}">${syncState==='error'?'com erro':syncState==='offline'?'sem internet':'ativa'}</span></h3>
      <div class="t2">${syncState==='ok'?'✓ Última sincronização: '+new Date(lastSyncAt).toLocaleString('pt-BR'):syncState==='busy'?'⟳ Sincronizando…':syncState==='offline'?'Sem internet — as mudanças ficam no aparelho e vão quando voltar a conexão.':'Aguardando…'}</div>
      ${syncState==='error'?`<div class="banner warn" style="margin:10px 0 0">⚠ ${esc(syncErr)}</div>`:''}
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px"><button class="btn sm primary" data-action="syncNow">⟳ Sincronizar agora</button></div>
      <div class="hint">Entre com o mesmo usuário e senha no celular e no computador: os dois veem os mesmos dados.</div>
    </div>
    <div class="card span-6">
      <h3>💾 Backup</h3>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn sm" data-action="exportJson">⬇ Exportar backup (.json)</button>
        <button class="btn sm" data-action="importJson">⬆ Restaurar / importar backup</button>
        <button class="btn sm" data-action="exportCsv">Exportar gastos (.csv)</button>
      </div>
      <div class="hint">O arquivo de backup <b>não</b> é cifrado — guarde em lugar seguro. Também dá para importar um backup do app “Minhas Finanças” antigo.<br>Último salvamento: ${S.savedAt?new Date(S.savedAt).toLocaleString('pt-BR'):'—'} · ${plural(S.tx.length,'gasto lançado','gastos lançados')}</div>
      <input type="file" id="importFile" accept=".json,application/json" style="display:none">
    </div>
    <div class="card span-6">
      <h3>⚙️ Geral</h3>
      <div class="two">
        <div><label class="f">Início do plano</label><input class="in" type="month" id="setStart" value="${S.settings.start}"></div>
        <div><label class="f">Fim do plano</label><input class="in" type="month" id="setEnd" value="${S.settings.end}"></div>
      </div>
      <div class="hint">O fim do plano anda sozinho: sempre fica pelo menos 24 meses à frente. Contas e entradas recorrentes são preenchidas automaticamente.</div>
      <label class="f">Tema</label>
      <div class="chips">${[['auto','Automático'],['light','Claro'],['dark','Escuro']].map(([k,l])=>`<button class="chip ${S.settings.theme===k?'on':''}" data-action="setTheme" data-v="${k}">${l}</button>`).join('')}</div>
      <label class="f">Dia em que a folha de pagamento fecha (para consignados)</label>
      <input class="in" id="setFolha" type="number" min="1" max="31" value="${S.settings.folhaFecha||20}" style="max-width:120px">
      <label class="f" style="margin-top:18px">Recomeçar</label>
      <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn sm" data-action="rerunWizard">🧭 Abrir o assistente de novo</button><button class="btn sm danger" data-action="resetAll">Apagar meus dados</button><button class="btn sm danger" data-action="deleteAccount">Excluir minha conta</button></div>
    </div>

    <div class="card span-12">
      <h3>➕ Cadastrar</h3>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn sm" data-action="newRecurring" data-g="receita">💰 Entrada recorrente</button>
        <button class="btn sm" data-action="newRecurring" data-g="fixa">🧾 Conta fixa</button>
        <button class="btn sm" data-action="newRecurring" data-g="diadia">🛒 Categoria do dia a dia</button>
        <button class="btn sm" data-action="newDebt">🏦 Dívida / parcelamento</button>
        <button class="btn sm" data-action="newCard">💳 Cartão de crédito</button>
        <button class="btn sm" data-action="newGoal">🎯 Meta</button>
        <button class="btn sm" data-action="newConsorcio">🤝 Consórcio</button>
      </div>
    </div>

    <div class="card span-12">
      <h3>📋 Itens do orçamento <span class="right t2">renomeie, mude o ícone ou o dia; ✎ abre o cadastro completo</span></h3>
      <div style="overflow:auto"><table class="items">
        <thead><tr><th style="width:56px">Ícone</th><th>Nome</th><th style="width:200px">Grupo</th><th style="width:90px">Dia</th><th class="hide-m" style="width:130px">Forma padrão</th><th class="hide-m" style="width:130px;text-align:right">Valor em ${ymLabel(UI.month)}</th><th style="width:76px"></th></tr></thead>
        <tbody>${Object.keys(GROUPS).map(g=>byGroup(g).map(i=>`<tr data-id="${i.id}">
          <td><input data-f="icon" value="${esc(i.icon||'')}" maxlength="4" style="text-align:center"></td>
          <td><input data-f="name" value="${esc(i.name)}"></td>
          <td><select data-f="group">${gOpts(i.group)}</select></td>
          <td><input data-f="due" type="number" min="1" max="31" value="${i.due||''}" placeholder="—"></td>
          <td class="hide-m">${i.group==='diadia'?`<select data-f="defMethod"><option value="">—</option>${METHODS.map(([k,l])=>`<option value="${k}" ${i.defMethod===k?'selected':''}>${l}</option>`).join('')}</select>`:''}</td>
          <td class="num hide-m" style="text-align:right;color:var(--text-2)">${fmtN(planned(i,UI.month))}</td>
          <td style="white-space:nowrap"><button class="edit iconbtn" style="height:30px;min-width:30px;padding:0" data-action="editItem" data-id="${i.id}" title="Editar">✎</button> <button class="edit iconbtn" style="height:30px;min-width:30px;padding:0" data-action="delItem" data-id="${i.id}" title="Excluir">🗑</button></td>
        </tr>`).join('')).join('')}</tbody>
      </table></div>
      ${(S.cards||[]).length?`<div class="groupttl" style="margin-top:16px"><span>Cartões</span></div>${S.cards.map(c=>`<div class="tx" data-action="editCard" data-id="${c.id}"><div class="ic">${c.icon||'💳'}</div><div class="info"><div class="nm">${esc(c.name)}</div><div class="meta">fecha dia ${c.fecha} · vence dia ${c.vence}${c.limite?' · limite '+fmt(c.limite):''}</div></div><div class="amt">✎</div></div>`).join('')}`:''}
    </div>
  </div>`;
}
vAjustes.after=()=>{
  document.querySelectorAll('table.items tr[data-id] [data-f]').forEach(inp=>{
    inp.onchange=()=>{
      const it=itemById(inp.closest('tr').dataset.id),f=inp.dataset.f;
      let v=inp.value;
      if(f==='due')v=clampDay(v);
      if(f==='name'&&!v.trim()){inp.value=it.name;return}
      it[f]=v;save();if(f==='group')render();else toast('Salvo');
    };
  });
  const upd=()=>{const s=$('#setStart').value,e=$('#setEnd').value;if(s&&e&&s<=e){S.settings.start=s;S.settings.end=e<ymAdd(todayYM(),24)?ymAdd(todayYM(),24):e;materializeAll();UI.month=clampMonth(UI.month);save();render();toast('Período atualizado')}};
  $('#setStart').onchange=upd;$('#setEnd').onchange=upd;
  $('#setFolha').onchange=e=>{S.settings.folhaFecha=clampDay(e.target.value)||20;save();toast('Salvo')};
  $('#importFile').onchange=e=>{const f=e.target.files[0];if(f)importBackupFile(f);e.target.value=''};
};

/* ---------- Consórcios (na tela de Metas) ---------- */
function consCard(){
  const cs=consorcios();
  return `<div class="card span-12"><h3>🤝 Consórcios <span class="right"><button class="btn sm" data-action="newConsorcio">+ Consórcio</button></span></h3>
    ${cs.length?cs.map(c=>{const x=consInfo(c),nm=c.pay.cons.nome||c.pay.name;return`<div class="goal">
      <div class="row1"><span class="nm">🤝 ${esc(nm)}</span><span class="num"><b>${fmt(x.pago)}</b> <span class="muted">pago de ${fmt(x.parcela*x.n)}</span></span></div>
      <div class="pbar"><i style="width:${x.n?x.paidN/x.n*100:0}%"></i></div>
      <div class="meta">
        <span>${x.paidN} de ${x.n} pagamentos de ${fmt(x.parcela)}</span>
        ${x.falta?`<span>falta pagar ${fmt(x.falta)}${x.nextPay?' · próximo '+ymLabel(x.nextPay):''}</span>`:'<span class="pos">pagamentos concluídos</span>'}
        <span>${x.recebido?`<b class="pos">✓ recebeu ${fmt(x.valor)}</b>${x.mes?' em '+ymLabel(x.mes):''}`:x.mes?`recebe <b class="pos">${fmt(x.valor)}</b> em <b>${ymLabel(x.mes)}</b>`:`recebe ${fmt(x.valor)} · <b>mês ainda não sorteado</b>`}</span>
        <button class="link" data-action="editConsorcio" data-id="${c.id}">✎ editar</button>
      </div></div>`}).join(''):'<div class="empty">Participa de um consórcio entre família ou amigos? Cadastre aqui: o valor sai todo mês nas contas e o total entra no mês da sua vez.</div>'}
  </div>`;
}
