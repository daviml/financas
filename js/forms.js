'use strict';
/* =========================================================
   Formulários e modais
   ========================================================= */
const monthOpts=(sel,from,to)=>{const o=[];for(let m=from,g=0;m<=to&&g<400;m=ymAdd(m,1),g++)o.push(`<option value="${m}" ${m===sel?'selected':''}>${ymLong(m)}</option>`);return o.join('')};
const chipsHtml=(id,list,sel)=>`<div class="chips" id="${id}">${list.map(([k,l])=>`<button type="button" class="chip ${k===sel?'on':''}" data-v="${k}">${l}</button>`).join('')}</div>`;
function bindChips(m,id,cb){const box=m.querySelector('#'+id);box.onclick=e=>{const b=e.target.closest('[data-v]');if(!b)return;box.querySelectorAll('.chip').forEach(c=>c.classList.toggle('on',c===b));cb(b.dataset.v)}}
const peopleList=()=>`<datalist id="peopleList">${people().map(n=>`<option value="${esc(n)}">`).join('')}</datalist>`;
function bad(el){el.focus();el.style.outline='2px solid var(--bad)';setTimeout(()=>el.style.outline='',1800)}
function clearPlanned(it,m){if(it.rec){it.over=it.over||{};it.over[m]=0;materialize(it)}else delete it.values[m]}
function ensureStart(ym){if(ym<S.settings.start){S.settings.start=ym;materializeAll()}}

/* ---------- Gasto do dia a dia (com cartão e parcelas) ---------- */
function txModal(t,preset={}){
  const isNew=!t;
  const dd=byGroup('diadia');
  if(!dd.length){uiAlert('Crie uma categoria primeiro','Para lançar gastos, cadastre pelo menos uma categoria do dia a dia (Mercado, Transporte…).').then(()=>recurringModal('diadia'));return}
  const cards=S.cards||[];
  t=t||{id:uid(),date:(UI.month===todayYM())?todayISO():UI.month+'-01',amount:0,cat:UI.filterCat&&itemById(UI.filterCat)?.group==='diadia'?UI.filterCat:(S.lastCat&&itemById(S.lastCat)?S.lastCat:dd[0].id),method:preset.method||null,card:preset.card||null,parc:1,desc:''};
  let cat=t.cat,method=t.method||itemById(cat)?.defMethod||S.lastMethod||'debito';
  let card=t.card&&cardById(t.card)?t.card:(cardById(S.lastCard)?S.lastCard:cards[0]?.id);
  openModal(`
    <div class="m-hd"><h3>${isNew?(preset.method==='credito'?'Compra no cartão':'Novo gasto'):'Editar gasto'}</h3><button class="x" data-close>×</button></div>
    <div class="m-bd">
      <input class="in amount-in num" id="txAmt" inputmode="decimal" placeholder="R$ 0,00" value="${numIn(t.amount)}" autocomplete="off">
      <label class="f">Categoria</label>
      <div class="chips" id="txCats">${dd.map(i=>`<button type="button" class="chip ${i.id===cat?'on':''}" data-cat="${i.id}">${i.icon||''} ${esc(i.name.replace(/\s*\(.*\)/,''))}</button>`).join('')}</div>
      <label class="f">Forma de pagamento</label>
      <div class="chips" id="txMeth">${METHODS.map(([k,l])=>`<button type="button" class="chip ${k===method?'on':''}" data-m="${k}">${l}</button>`).join('')}</div>
      <div id="txCredit" style="display:none">
        ${cards.length?`<label class="f">Cartão</label><div class="chips" id="txCard">${cards.map(c=>`<button type="button" class="chip ${c.id===card?'on':''}" data-c="${c.id}">${c.icon||'💳'} ${esc(c.name)}</button>`).join('')}</div>
        <div class="two"><div><label class="f">Parcelas</label><select class="in" id="txParc">${[...Array(24)].map((_,k)=>`<option value="${k+1}" ${(t.parc||1)===k+1?'selected':''}>${k===0?'À vista (1x)':(k+1)+'x'}</option>`).join('')}</select></div><div></div></div>`
        :`<div class="hint">Cadastre seu cartão (Ajustes ou aba Cartões) para acompanhar a fatura e parcelar compras.</div>`}
      </div>
      <div class="two">
        <div><label class="f">Data</label><input class="in" type="date" id="txDate" value="${t.date}"></div>
        <div><label class="f">Descrição (opcional)</label><input class="in" id="txDesc" value="${esc(t.desc)}" placeholder="Ex.: padaria, posto, farmácia" list="descList"></div>
      </div>
      <datalist id="descList">${[...new Set(S.tx.map(x=>x.desc).filter(Boolean))].slice(-50).map(d=>`<option value="${esc(d)}">`).join('')}</datalist>
      <div class="hint" id="txHint"></div>
    </div>
    <div class="m-ft">
      ${isNew?'':'<button class="btn danger" id="txDel">Excluir</button>'}
      <span class="spacer"></span>
      ${isNew?'<button class="btn" id="txSaveMore">Salvar e lançar outro</button>':''}
      <button class="btn primary" id="txSave">Salvar</button>
    </div>`,m=>{
      const q=x=>m.querySelector(x);
      const amt=q('#txAmt');setTimeout(()=>amt.focus(),30);
      const parcN=()=>method==='credito'&&q('#txParc')?parseInt(q('#txParc').value)||1:1;
      const hint=()=>{
        q('#txCredit').style.display=method==='credito'?'':'none';
        const date=q('#txDate').value||todayISO(),a=parseMoney(amt.value),n=parcN(),share=n>1?Math.floor(a/n*100)/100:a;
        const c=calc(date.slice(0,7));const x=c.cats.find(z=>z.item.id===cat);
        let h='';
        if(!monthsList().includes(date.slice(0,7)))h='⚠ Esta data está fora do período do plano ('+ymLabel(S.settings.start)+' a '+ymLabel(S.settings.end)+') — mude o início do plano em Ajustes para vê-la nos painéis.';
        else if(x)h=x.plan?`${esc(x.item.name)}: depois deste gasto restam <b class="${x.plan-x.spent-share<0?'neg':''}">${fmt(x.plan-x.spent-share+(isNew?0:(t.cat===cat&&t.date.slice(0,7)===date.slice(0,7)?shareOf(t,0):0)))}</b> de ${fmt(x.plan)}`:`Categoria sem orçamento — este gasto reduz a sobra do mês.`;
        const cd=method==='credito'&&cardById(card);
        if(cd&&a>0){const f=invoiceFirstYM(cd,date);h+=`<br>💳 Entra na fatura de <b>${ymLabel(f)}</b> (vence dia ${cd.vence})${n>1?` · ${n}x de ${fmt(share)} até ${ymLabel(ymAdd(f,n-1))}`:''}.`}
        q('#txHint').innerHTML=h;
      };
      q('#txCats').onclick=e=>{const b=e.target.closest('[data-cat]');if(!b)return;cat=b.dataset.cat;m.querySelectorAll('#txCats .chip').forEach(c=>c.classList.toggle('on',c===b));const dm=itemById(cat)?.defMethod;if(dm&&isNew){method=dm;m.querySelectorAll('#txMeth .chip').forEach(c=>c.classList.toggle('on',c.dataset.m===dm))}hint()};
      q('#txMeth').onclick=e=>{const b=e.target.closest('[data-m]');if(!b)return;method=b.dataset.m;m.querySelectorAll('#txMeth .chip').forEach(c=>c.classList.toggle('on',c===b));hint()};
      const tc=q('#txCard');if(tc)tc.onclick=e=>{const b=e.target.closest('[data-c]');if(!b)return;card=b.dataset.c;tc.querySelectorAll('.chip').forEach(c=>c.classList.toggle('on',c===b));hint()};
      const tp=q('#txParc');if(tp)tp.onchange=hint;
      amt.oninput=hint;q('#txDate').onchange=hint;hint();
      const doSave=more=>{
        const a=parseMoney(amt.value);if(!(a>0)){bad(amt);return}
        const date=q('#txDate').value||todayISO();
        snap();
        const rec={...t,amount:a,cat,method,date,desc:q('#txDesc').value.trim(),ts:t.ts||Date.now()};
        delete rec._k;delete rec._n;delete rec._full;
        if(method==='credito'&&cardById(card)){rec.card=card;rec.parc=parcN();S.lastCard=card}else{delete rec.card;delete rec.parc}
        if(isNew)S.tx.push(rec);else S.tx[S.tx.findIndex(x=>x.id===t.id)]=rec;
        S.lastMethod=method;S.lastCat=cat;save();
        if(date.slice(0,7)!==UI.month&&monthsList().includes(date.slice(0,7))&&!more)UI.month=date.slice(0,7);
        render();toast((isNew?'Gasto lançado: ':'Gasto atualizado: ')+fmt(a)+(rec.parc>1?' em '+rec.parc+'x':''),true);
        if(more)txModal(null,preset);else closeModal();
      };
      q('#txSave').onclick=()=>doSave(false);
      const sm=q('#txSaveMore');if(sm)sm.onclick=()=>doSave(true);
      m.querySelectorAll('.m-bd input').forEach(i=>i.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();doSave(false)}}));
      const del=q('#txDel');if(del)del.onclick=()=>{snap();S.tx=S.tx.filter(x=>x.id!==t.id);save();closeModal();render();toast('Gasto excluído',true)};
    });
}

/* ---------- Célula da planilha ---------- */
function cellModal(it,ym){
  if(it.group==='fatura'){billModal(it,ym);return}
  const s=st(it,ym)||{};const canPay=it.group!=='diadia';
  const isDD=it.group==='diadia';
  const cc=isDD?calc(ym).cats.find(x=>x.item.id===it.id):null;
  openModal(`
    <div class="m-hd"><h3>${esc(it.name)} · ${ymLabel(ym)}</h3><button class="x" data-close>×</button></div>
    <div class="m-bd">
      <label class="f">${isDD?'Valor orçado':'Valor previsto'}</label>
      <input class="in num" id="cPlan" inputmode="decimal" value="${numIn(planned(it,ym))}" placeholder="0,00">
      <label class="check"><input type="checkbox" id="cFwd"> Usar este valor também nos próximos meses</label>
      ${isDD?`<div class="hint">Gasto real neste mês: <b>${fmt(cc?.spent)}</b>. Lance gastos pelo botão “+”.</div>`:''}
      ${canPay?`
      <hr style="border:0;border-top:1px solid var(--border);margin:16px 0 4px">
      <label class="check" style="font-weight:600"><input type="checkbox" id="cPaid" ${s.paid?'checked':''}> ${doneWord(it)} (fica verde)</label>
      <div class="two">
        <div><label class="f">Valor pago de verdade</label><input class="in num" id="cAmt" inputmode="decimal" value="${s.amount!=null?NUM.format(s.amount):''}" placeholder="igual ao previsto"></div>
        <div><label class="f">Data do pagamento</label><input class="in" type="date" id="cDate" value="${s.date||''}"></div>
      </div>`:''}
    </div>
    <div class="m-ft"><button class="btn" data-action="editItem" data-id="${it.id}">✎ Cadastro completo</button><span class="spacer"></span><button class="btn" data-close>Cancelar</button><button class="btn primary" id="cSave">Salvar</button></div>`,m=>{
      const p=m.querySelector('#cPlan');setTimeout(()=>{p.focus();p.select()},30);
      const doSave=()=>{
        snap();
        setPlanned(it,ym,parseMoney(p.value),m.querySelector('#cFwd').checked);
        if(canPay){
          const paid=m.querySelector('#cPaid').checked,a=m.querySelector('#cAmt').value.trim(),d=m.querySelector('#cDate').value;
          if(paid||a){S.status[ym+'|'+it.id]={paid,amount:a?parseMoney(a):null,date:paid?(d||todayISO()):null}}else delete S.status[ym+'|'+it.id];
        }
        save();closeModal();render();toast('Atualizado',true);
      };
      m.querySelector('#cSave').onclick=doSave;
      m.querySelectorAll('.m-bd input').forEach(i=>i.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();doSave()}}));
    });
}

/* ---------- Conta do mês (✎) ---------- */
function billModal(it,ym){
  const s=st(it,ym)||{},isInv=it.group==='fatura';
  openModal(`
    <div class="m-hd"><h3>${esc(it.name)}</h3><button class="x" data-close>×</button></div>
    <div class="m-bd">
      <div class="t2">${ymLong(ym)} · previsto ${fmt(planned(it,ym))}${isInv?' (soma das compras lançadas)':''}</div>
      <label class="check" style="font-weight:600"><input type="checkbox" id="bPaid" ${isPaid(it,ym)?'checked':''}> ${doneWord(it)}</label>
      <div class="two">
        <div><label class="f">Valor ${it.group==='receita'?'recebido':'pago'}</label><input class="in num" id="bAmt" inputmode="decimal" value="${NUM.format(val(it,ym))}"></div>
        <div><label class="f">Data</label><input class="in" type="date" id="bDate" value="${s.date||todayISO()}"></div>
      </div>
      ${isInv?'<div class="hint">Se a fatura veio com outro valor (anuidade, juros, compras não lançadas), informe o valor pago. Os dias de fechamento e vencimento ficam no cadastro do cartão.</div>':`
      <label class="f">${it.group==='receita'?'Cai todo dia':'Vence todo dia'}</label>
      <input class="in" id="bDue" type="number" min="1" max="31" value="${it.due||''}" placeholder="ex.: 10">
      <div class="hint">O dia vale para todos os meses e gera os avisos “vence em X dias” / “atrasada”.</div>
      ${it.group==='parcela'?`<label class="check"><input type="checkbox" id="bFolha" ${it.folha?'checked':''}> Desconto em folha — fica paga sozinha todo mês no dia do vencimento</label>`:''}
      <label class="check"><input type="checkbox" id="bFwd"> Mudar também o valor previsto deste e dos próximos meses para o valor acima</label>`}
    </div>
    <div class="m-ft">${isInv?'':`<button class="btn" data-action="editItem" data-id="${it.id}">✎ Cadastro completo</button>`}<span class="spacer"></span><button class="btn" data-close>Cancelar</button><button class="btn primary" id="bSave">Salvar</button></div>`,m=>{
      const q=x=>m.querySelector(x);
      q('#bSave').onclick=()=>{
        snap();
        const paid=q('#bPaid').checked,a=parseMoney(q('#bAmt').value),d=q('#bDate').value;
        if(!isInv){
          it.due=clampDay(q('#bDue').value);
          if(q('#bFwd').checked)setPlanned(it,ym,a,true);
          const bf=q('#bFolha');if(bf){if(bf.checked){it.folha=true;if(!it.due)it.due=5}else delete it.folha}
        }
        const differs=Math.abs(a-planned(it,ym))>.005;
        const k=ym+'|'+it.id,auto=autoPaid(it,ym);
        if(paid){if(auto&&!differs)delete S.status[k];else S.status[k]={paid:true,amount:differs?a:null,date:d||todayISO()}}
        else if(auto)S.status[k]={paid:false,manual:true,amount:differs?a:null,date:null};
        else if(differs)S.status[k]={paid:false,amount:a,date:null};else delete S.status[k];
        save();closeModal();render();toast('Atualizado',true);
      };
    });
}

/* ---------- Entrada extra (uma vez) ---------- */
function incomeModal(){
  openModal(`
    <div class="m-hd"><h3>Entrada extra</h3><button class="x" data-close>×</button></div>
    <div class="m-bd">
      <label class="f">De onde veio</label><input class="in" id="inName" placeholder="Ex.: freela, venda, reembolso, bônus, Pix de alguém…" list="incList">
      <datalist id="incList">${[...new Set(byGroup('receita').filter(i=>i.kind==='extra'||i.extra).map(i=>i.name))].map(n=>`<option value="${esc(n)}">`).join('')}</datalist>
      <div class="two">
        <div><label class="f">Valor</label><input class="in num amount-in" id="inVal" inputmode="decimal" placeholder="R$ 0,00" style="font-size:24px!important;height:48px!important"></div>
        <div><label class="f">Mês</label><select class="in" id="inMonth">${monthsList().map(m=>`<option value="${m}" ${m===UI.month?'selected':''}>${ymLong(m)}</option>`).join('')}</select></div>
      </div>
      <label class="check"><input type="checkbox" id="inPaid" checked> Já recebi</label>
      <div class="hint">Entra na receita e na sobra do mês. Para uma renda que se repete, use “+ Recorrente”.</div>
    </div>
    <div class="m-ft"><button class="btn" data-action="newRecurring" data-g="receita">🔁 É recorrente</button><span class="spacer"></span><button class="btn" data-close>Cancelar</button><button class="btn primary" id="inSave">Adicionar</button></div>`,m=>{
      setTimeout(()=>m.querySelector('#inName').focus(),30);
      const doSave=()=>{
        const name=m.querySelector('#inName').value.trim()||'Entrada extra',v=parseMoney(m.querySelector('#inVal').value),ym=m.querySelector('#inMonth').value;
        if(!(v>0)){bad(m.querySelector('#inVal'));return}
        snap();
        const it={id:uid(),name,group:'receita',values:{[ym]:v},due:null,icon:'✨',kind:'extra'};
        S.items.push(it);
        if(m.querySelector('#inPaid').checked)S.status[ym+'|'+it.id]={paid:true,amount:null,date:ym===todayYM()?todayISO():ym+'-01'};
        save();closeModal();render();toast('Entrada de '+fmt(v)+' adicionada em '+ymLabel(ym),true);
      };
      m.querySelector('#inSave').onclick=doSave;
      m.querySelectorAll('.m-bd input').forEach(i=>i.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();doSave()}}));
    });
}

/* ---------- Conta avulsa ---------- */
function newBillModal(){
  openModal(`
    <div class="m-hd"><h3>Conta avulsa em ${ymLong(UI.month)}</h3><button class="x" data-close>×</button></div>
    <div class="m-bd">
      <label class="f">Nome</label><input class="in" id="nbName" placeholder="Ex.: IPVA, conserto, presente…">
      <div class="two">
        <div><label class="f">Valor</label><input class="in num" id="nbVal" inputmode="decimal" placeholder="0,00"></div>
        <div><label class="f">Vence dia</label><input class="in" id="nbDue" type="number" min="1" max="31" placeholder="opcional"></div>
      </div>
      <label class="check"><input type="checkbox" id="nbPaid" checked> Já está paga</label>
      <div class="hint">Só para este mês. Para uma conta que se repete, use “+ Conta fixa”.</div>
    </div>
    <div class="m-ft"><button class="btn" data-close>Cancelar</button><button class="btn primary" id="nbSave">Adicionar</button></div>`,m=>{
      setTimeout(()=>m.querySelector('#nbName').focus(),30);
      m.querySelector('#nbSave').onclick=()=>{
        const name=m.querySelector('#nbName').value.trim(),v=parseMoney(m.querySelector('#nbVal').value);
        if(!name){bad(m.querySelector('#nbName'));return}if(!v){bad(m.querySelector('#nbVal'));return}
        snap();const it={id:uid(),name,group:'fixa',values:{[UI.month]:v},due:clampDay(m.querySelector('#nbDue').value),icon:''};
        S.items.push(it);if(m.querySelector('#nbPaid').checked)S.status[UI.month+'|'+it.id]={paid:true,amount:null,date:todayISO()};
        save();closeModal();render();toast('Conta adicionada',true);
      };
    });
}

/* ---------- Recorrente: entrada, conta fixa, categoria do dia a dia, guardar ---------- */
const REC_TITLES={receita:['Entrada recorrente','💰'],fixa:['Conta fixa','🧾'],diadia:['Categoria do dia a dia','🛒'],reserva:['Guardar dinheiro todo mês','🐷'],quitacao:['Quitação','💸']};
function recurringModal(group,it,after){
  const isNew=!it;
  if(it&&it.group==='parcela'){debtModal(it);return}
  group=it?it.group:group;
  const isDD=group==='diadia',isRec=group==='receita';
  // item antigo sem regra: monta uma regra a partir dos valores
  let r=it?.rec?JSON.parse(JSON.stringify(it.rec)):null;
  if(!r){
    const ks=it?Object.keys(it.values).filter(k=>it.values[k]).sort():[];
    const amount=it?(planned(it,UI.month)||it.values[ks[ks.length-1]]||0):0;
    r={freq:'m',amount,start:ks[0]||(isDD?S.settings.start:UI.month)};
    if(ks.length&&ks[ks.length-1]<S.settings.end)r.end=ks[ks.length-1];
  }
  const curAmt=it?(planned(it,UI.month)||recAmountAt(r,UI.month)):r.amount;
  const endMode=r.count?'count':r.end?'end':'none';
  const kind=it?.kind||(it?.salary?'salario':'outra');
  const presets=isDD?DIA_PRESETS:group==='fixa'?FIXA_PRESETS:[];
  const [title,defIcon]=REC_TITLES[group]||['Item','•'];
  const ms=monthsList();
  openModal(`
    <div class="m-hd"><h3>${isNew?'Nova '+title.toLowerCase().replace('guardar','meta: guardar'):esc(it.name)}</h3><button class="x" data-close>×</button></div>
    <div class="m-bd">
      ${isRec?`<label class="f">Tipo</label>${chipsHtml('rKind',INCOME_KINDS.filter(k=>k[0]!=='extra'),kind)}`:''}
      <div class="row" style="gap:10px">
        <div style="flex:0 0 70px"><label class="f">Ícone</label><input class="in" id="rIcon" value="${esc(it?.icon||defIcon)}" maxlength="4" style="text-align:center"></div>
        <div><label class="f">Nome</label><input class="in" id="rName" value="${esc(it?.name||'')}" placeholder="${isRec?'Ex.: Salário, Aposentadoria, Pensão':isDD?'Ex.: Mercado':'Ex.: Aluguel, Internet'}" list="rPresets"></div>
      </div>
      <datalist id="rPresets">${presets.map(p=>`<option value="${esc(p[0])}">`).join('')}</datalist>
      <div class="two">
        <div><label class="f">${isDD?'Orçamento por mês (opcional)':'Valor'}</label><input class="in num" id="rAmt" inputmode="decimal" value="${numIn(curAmt)}" placeholder="0,00"></div>
        <div>${isDD?'':`<label class="f">${isRec?'Cai todo dia':'Vence todo dia'}</label><input class="in" id="rDue" type="number" min="1" max="31" value="${it?.due||''}" placeholder="opcional">`}</div>
      </div>
      ${!isNew&&it.rec?`<div id="rFromWrap" style="display:none"><label class="f">O novo valor vale a partir de</label><select class="in" id="rFrom">${monthOpts(UI.month<r.start?r.start:UI.month,ms[0],ms[ms.length-1])}</select><div class="hint">Os meses anteriores continuam com o valor antigo.</div></div>`:''}
      ${isDD?'':`
      <label class="f">Repete</label>
      ${chipsHtml('rFreq',[['m','Todo mês'],['y','Todo ano'],['n','A cada N meses']],r.freq)}
      <div id="rNWrap" style="display:${r.freq==='n'?'':'none'}"><label class="f">A cada quantos meses?</label><input class="in" id="rN" type="number" min="2" max="24" value="${r.n||2}" style="max-width:120px"></div>
      <div class="two">
        <div><label class="f">Começa em</label><input class="in" type="month" id="rStart" value="${r.start}"></div>
        <div><label class="f">Até quando</label><select class="in" id="rEndMode"><option value="none" ${endMode==='none'?'selected':''}>Sem data para acabar</option><option value="end" ${endMode==='end'?'selected':''}>Até um mês</option><option value="count" ${endMode==='count'?'selected':''}>Por um número de vezes</option></select></div>
      </div>
      <div id="rEndWrap" style="display:${endMode==='end'?'':'none'}"><label class="f">Último mês</label><input class="in" type="month" id="rEnd" value="${r.end||''}"></div>
      <div id="rCountWrap" style="display:${endMode==='count'?'':'none'}"><label class="f">Quantas vezes</label><input class="in" type="number" id="rCount" min="1" value="${r.count||12}" style="max-width:120px"></div>
      <details class="adv" ${r.adj?.pct||it?.payFrom?'open':''}><summary>Opções avançadas</summary>
        <div class="two">
          <div><label class="f">Reajuste anual (%)</label><input class="in num" id="rAdj" inputmode="decimal" value="${r.adj?.pct?String(r.adj.pct).replace('.',','):''}" placeholder="ex.: 5"></div>
          <div><label class="f">Mês do reajuste</label><select class="in" id="rAdjM">${MNF.map((n,k)=>`<option value="${k+1}" ${(r.adj?.month||1)===k+1?'selected':''}>${n}</option>`).join('')}</select></div>
        </div>
        <div class="hint">O valor sobe automaticamente todo ano nesse mês (ex.: aluguel, plano de saúde, salário).</div>
        ${isRec?`<label class="f">É uma pessoa que te paga (para abater num repasse)?</label><input class="in" id="rFrom2" value="${esc(it?.payFrom||'')}" placeholder="nome da pessoa (opcional)" list="peopleList">${peopleList()}`:''}
      </details>`}
      ${isDD?`<label class="f">Forma de pagamento padrão</label>${chipsHtml('rMeth',[['','—'],...METHODS],it?.defMethod||'')}`:''}
      <div class="banner info preview" id="rPrev"></div>
    </div>
    <div class="m-ft">${isNew?'':'<button class="btn danger" id="rDel">Excluir</button>'}<span class="spacer"></span><button class="btn" data-close>Cancelar</button><button class="btn primary" id="rSave">${isNew?'Adicionar':'Salvar'}</button></div>`,m=>{
      const q=x=>m.querySelector(x);
      let freq=r.freq,kd=kind,meth=it?.defMethod||'';
      if(isNew)setTimeout(()=>q('#rName').focus(),30);
      if(isRec)bindChips(m,'rKind',v=>{kd=v;if(v==='13'&&isNew){freq='y';m.querySelectorAll('#rFreq .chip').forEach(c=>c.classList.toggle('on',c.dataset.v==='y'));const y=todayYM().slice(0,4);q('#rStart').value=(UI.month>y+'-12'?+y+1:y)+'-12';if(!q('#rName').value)q('#rName').value='13º salário';const sal=salaryItem();if(sal&&!parseMoney(q('#rAmt').value))q('#rAmt').value=numIn(planned(sal,UI.month)||sal.rec?.amount)}if(v==='salario'&&isNew&&!q('#rName').value)q('#rName').value='Salário';upd()});
      if(isDD)bindChips(m,'rMeth',v=>meth=v);
      const read=()=>{
        const nr=JSON.parse(JSON.stringify(r));
        if(isDD){nr.freq='m';delete nr.n;delete nr.end;delete nr.count;nr.start=it?.rec?.start||S.settings.start}
        else{
          nr.freq=freq;if(freq==='n')nr.n=Math.max(2,parseInt(q('#rN').value)||2);else delete nr.n;
          nr.start=q('#rStart').value||UI.month;
          const em=q('#rEndMode').value;delete nr.end;delete nr.count;
          if(em==='end'&&q('#rEnd').value)nr.end=q('#rEnd').value;
          if(em==='count')nr.count=Math.max(1,parseInt(q('#rCount').value)||1);
          const adj=parseMoney(q('#rAdj').value);if(adj)nr.adj={pct:adj,month:+q('#rAdjM').value};else delete nr.adj;
        }
        return nr;
      };
      const upd=()=>{
        if(!isDD){
          q('#rNWrap').style.display=freq==='n'?'':'none';
          const em=q('#rEndMode').value;q('#rEndWrap').style.display=em==='end'?'':'none';q('#rCountWrap').style.display=em==='count'?'':'none';
        }
        const a=parseMoney(q('#rAmt').value),fw=q('#rFromWrap');
        if(fw)fw.style.display=Math.abs(a-curAmt)>.005?'':'none';
        const nr=read();nr.amount=a;nr.changes=[];
        const next=recMonths(nr,ymAdd(UI.month,36)).filter(x=>x>=UI.month).slice(0,4);
        const last=recLast(nr);
        q('#rPrev').innerHTML=isDD?(a?`Orçamento de <b>${fmt(a)}</b> por mês para esta categoria.`:'Sem orçamento: os gastos desta categoria saem da sobra do mês.'):
          a?(next.length?`Próximos: ${next.map(x=>ymLabel(x)+' <b>'+fmt(recAmountAt(nr,x))+'</b>').join(' · ')}${last?` · termina em <b>${ymLabel(last)}</b>`:' · sem fim'}`:'Nenhum mês a partir de agora com essa regra.'):'Informe o valor.';
      };
      if(!isDD){bindChips(m,'rFreq',v=>{freq=v;upd()});['#rN','#rStart','#rEnd','#rCount','#rAdj'].forEach(x=>q(x).addEventListener('input',upd));q('#rEndMode').onchange=upd;q('#rAdjM').onchange=upd}
      q('#rAmt').addEventListener('input',upd);upd();
      q('#rSave').onclick=()=>{
        const name=q('#rName').value.trim(),a=parseMoney(q('#rAmt').value);
        if(!name){bad(q('#rName'));return}
        if(!isDD&&!a){bad(q('#rAmt'));return}
        const nr=read();
        if(!isDD&&nr.end&&nr.end<nr.start){bad(q('#rEnd'));return}
        snap();
        const x=it||{id:uid(),group,values:{}};
        x.name=name;x.icon=q('#rIcon').value.trim();
        if(!isDD)x.due=clampDay(q('#rDue').value);
        if(isRec){x.kind=kd;delete x.salary;delete x.extra;const pf=q('#rFrom2')?.value.trim();if(pf)x.payFrom=pf;else delete x.payFrom}
        if(isDD){if(meth)x.defMethod=meth;else delete x.defMethod}
        const fromSel=q('#rFrom');
        if(isNew||!it.rec){nr.amount=a;delete nr.changes;x.rec=nr;delete x.over}
        else{
          x.rec={...nr,amount:r.amount,changes:r.changes};
          if(!x.rec.changes)delete x.rec.changes;
          if(Math.abs(a-curAmt)>.005){materialize(x);setPlanned(x,fromSel&&fromSel.value>x.rec.start?fromSel.value:x.rec.start,a,true)}
        }
        if(isNew)S.items.push(x);
        ensureStart(x.rec.start<S.settings.start&&!isDD?x.rec.start:S.settings.start);
        materialize(x);
        save();closeModal();render();toast((isNew?'Adicionado: ':'Salvo: ')+name,true);
        if(after)after(x);
      };
      const del=q('#rDel');if(del)del.onclick=()=>deleteItemFlow(it);
    });
}

/* ---------- Dívida ---------- */
function debtModal(it){
  const isNew=!it;
  const d=it?debtInfo(it):null;
  const D=it?.debt||{};
  // dívida antiga sem regra: monta a partir dos valores do plano
  const r=it?.rec||(it?{freq:'m',amount:d.parcela,start:d.first||UI.month,count:d.ms.length}:null);
  const tipo0=D.tipo||(it&&isConsig(it)?'consignado':isNew?'emprestimo':'outro');
  const start0=r?.start||todayYM();
  const total0=it?(D.total||((D.pagasAntes||0)+(r.count||d.ms.length))):'';
  const ms=monthsList();
  openModal(`
    <div class="m-hd"><h3>${isNew?'Nova dívida ou parcelamento':esc(it.name)}</h3><button class="x" data-close>×</button></div>
    <div class="m-bd">
      <label class="f">Que tipo de dívida?</label>
      ${chipsHtml('dTipo',DEBT_TYPES.map(t=>[t[0],t[1]+' '+t[2]]),tipo0)}
      <label class="f">O que é</label>
      <input class="in" id="dName" value="${esc(it?.name||'')}" placeholder="Ex.: Empréstimo do banco, Geladeira, Moto">
      <label class="f" id="dCredL">Com quem (banco, loja ou pessoa)</label>
      <input class="in" id="dCred" value="${esc(D.credor||(tipo0==='pessoa'?it?.payTo:'')||'')}" placeholder="Ex.: Caixa, Casas Bahia, João" list="peopleList">${peopleList()}
      <div class="two">
        <div><label class="f">Valor de cada parcela</label><input class="in num" id="dParc" inputmode="decimal" value="${numIn(r?.amount||d?.parcela)}" placeholder="0,00"></div>
        <div><label class="f">Vence todo dia</label><input class="in" id="dDue" type="number" min="1" max="31" value="${it?.due||''}" placeholder="ex.: 10"></div>
      </div>
      <div class="two">
        <div><label class="f">Total de parcelas do contrato</label><input class="in" id="dTotal" type="number" min="1" value="${total0}" placeholder="ex.: 24"></div>
        <div><label class="f">${isNew?'Quantas já pagou':'Pagas antes de usar o app'}</label><input class="in" id="dPaid" type="number" min="0" value="${D.pagasAntes||0}"></div>
      </div>
      <label class="f">${isNew?'Mês da próxima parcela':'Primeira parcela no app'}</label>
      <select class="in" id="dStart">${monthOpts(start0,ymAdd(S.settings.start<start0?S.settings.start:start0,-12),ymAdd(ms[ms.length-1],12))}</select>
      <details class="adv" ${D.taxa||it?.folha||(it?.payTo&&tipo0!=='pessoa')?'open':''}><summary>Opções avançadas (juros, desconto em folha, repasse)</summary>
        <label class="f">Juros do contrato (% ao mês, se souber)</label>
        <input class="in num" id="dTaxa" inputmode="decimal" value="${D.taxa?String(D.taxa).replace('.',','):''}" placeholder="ex.: 1,99" style="max-width:160px">
        <div class="hint">Com os juros, o app calcula quanto custaria quitar hoje. Também dá para informar o valor de quitação depois, na tela de Dívidas.</div>
        <label class="check"><input type="checkbox" id="dFolha" ${it?.folha||(isNew&&tipo0==='consignado')?'checked':''}> Desconto em folha (a parcela fica paga sozinha no dia)</label>
        <label class="f" id="dPayToL">A dívida está no nome de outra pessoa e você repassa o dinheiro para ela?</label>
        <input class="in" id="dPayTo" value="${esc(tipo0==='pessoa'?'':it?.payTo||'')}" placeholder="nome da pessoa (deixe vazio se a dívida é sua)" list="peopleList">
      </details>
      <div class="banner info preview" id="dPrev"></div>
    </div>
    <div class="m-ft">${isNew?'':'<button class="btn danger" id="dDel">Excluir</button>'}<span class="spacer"></span><button class="btn" data-close>Cancelar</button><button class="btn primary" id="dSave">${isNew?'Adicionar':'Salvar'}</button></div>`,m=>{
      const q=x=>m.querySelector(x);
      let tipo=tipo0;
      if(isNew)setTimeout(()=>q('#dName').focus(),30);
      const paidInApp=it?d.ms.filter(x=>isPaid(it,x)).length:0;
      const upd=()=>{
        q('#dCredL').textContent=tipo==='pessoa'?'Quem te emprestou (você paga para essa pessoa)':'Com quem (banco, loja ou pessoa)';
        q('#dPayToL').style.display=q('#dPayTo').style.display=tipo==='pessoa'?'none':'';
        const p=parseMoney(q('#dParc').value),tot=parseInt(q('#dTotal').value)||0,pg=parseInt(q('#dPaid').value)||0,start=q('#dStart').value;
        const n=tot-pg;
        if(!p||!tot){q('#dPrev').innerHTML='Informe o valor da parcela e o total de parcelas.';return}
        if(n<=0){q('#dPrev').innerHTML='Todas as parcelas já estão pagas.';return}
        const end=ymAdd(start,n-1),open=Math.max(0,n-paidInApp);
        q('#dPrev').innerHTML=`${plural(n,'parcela')} de <b>${fmt(p)}</b> de ${ymLabel(start)} a <b>${ymLabel(end)}</b>${paidInApp?` (${paidInApp} já marcada${paidInApp>1?'s':''} como paga${paidInApp>1?'s':''})`:''} · falta pagar <b>${fmt(open*p)}</b> · total do contrato ${fmt(tot*p)}.`;
      };
      bindChips(m,'dTipo',v=>{tipo=v;if(v==='consignado'&&isNew)q('#dFolha').checked=true;upd()});
      ['#dParc','#dTotal','#dPaid'].forEach(x=>q(x).addEventListener('input',upd));q('#dStart').onchange=upd;upd();
      q('#dSave').onclick=()=>{
        const name=q('#dName').value.trim(),p=parseMoney(q('#dParc').value),tot=parseInt(q('#dTotal').value)||0,pg=Math.max(0,parseInt(q('#dPaid').value)||0),start=q('#dStart').value;
        if(!name){bad(q('#dName'));return}if(!p){bad(q('#dParc'));return}if(!tot||tot<=pg){bad(q('#dTotal'));return}
        snap();
        const x=it||{id:uid(),group:'parcela',values:{},icon:''};
        const cred=q('#dCred').value.trim(),taxa=parseMoney(q('#dTaxa').value);
        x.name=name;x.due=clampDay(q('#dDue').value);
        x.debt={tipo,credor:cred,total:tot,pagasAntes:pg,...(taxa?{taxa}:{})};
        const old=x.rec;
        x.rec={freq:'m',amount:p,start,count:tot-pg};
        if(old&&old.amount===p&&old.changes)x.rec.changes=old.changes;
        if(q('#dFolha').checked){x.folha=true;if(!x.due)x.due=5}else delete x.folha;
        const pt=tipo==='pessoa'?cred:q('#dPayTo').value.trim();
        if(pt)x.payTo=pt;else delete x.payTo;
        delete x.consig;
        if(isNew)S.items.push(x);
        ensureStart(start);materialize(x);
        save();closeModal();render();toast((isNew?'Dívida adicionada: ':'Dívida atualizada: ')+name,true);
      };
      const del=q('#dDel');if(del)del.onclick=()=>deleteItemFlow(it);
    });
}

/* ---------- Cartão de crédito ---------- */
function cardModal(c,after){
  const isNew=!c;
  openModal(`
    <div class="m-hd"><h3>${isNew?'Novo cartão':esc(c.name)}</h3><button class="x" data-close>×</button></div>
    <div class="m-bd">
      <div class="row" style="gap:10px">
        <div style="flex:0 0 70px"><label class="f">Ícone</label><input class="in" id="ccIcon" value="${esc(c?.icon||'💳')}" maxlength="4" style="text-align:center"></div>
        <div><label class="f">Nome do cartão</label><input class="in" id="ccName" value="${esc(c?.name||'')}" placeholder="Ex.: Cartão do banco, Cartão da loja"></div>
      </div>
      <div class="two">
        <div><label class="f">Fecha todo dia</label><input class="in" id="ccFecha" type="number" min="1" max="31" value="${c?.fecha||''}" placeholder="ex.: 3"></div>
        <div><label class="f">Vence todo dia</label><input class="in" id="ccVence" type="number" min="1" max="31" value="${c?.vence||''}" placeholder="ex.: 10"></div>
      </div>
      <label class="f">Limite (opcional)</label><input class="in num" id="ccLim" inputmode="decimal" value="${numIn(c?.limite)}" placeholder="0,00">
      <div class="hint">O dia de fechamento está na fatura ou no app do banco (“melhor dia de compra” é o dia seguinte ao fechamento). Compras feitas depois do fechamento vão para a fatura seguinte.</div>
    </div>
    <div class="m-ft">${isNew?'':'<button class="btn danger" id="ccDel">Excluir</button>'}<span class="spacer"></span><button class="btn" data-close>Cancelar</button><button class="btn primary" id="ccSave">${isNew?'Adicionar':'Salvar'}</button></div>`,m=>{
      const q=x=>m.querySelector(x);
      if(isNew)setTimeout(()=>q('#ccName').focus(),30);
      q('#ccSave').onclick=()=>{
        const name=q('#ccName').value.trim(),fecha=clampDay(q('#ccFecha').value),vence=clampDay(q('#ccVence').value);
        if(!name){bad(q('#ccName'));return}if(!fecha){bad(q('#ccFecha'));return}if(!vence){bad(q('#ccVence'));return}
        snap();
        const x=c||{id:uid()};
        Object.assign(x,{name,icon:q('#ccIcon').value.trim()||'💳',fecha,vence,limite:parseMoney(q('#ccLim').value)||0});
        if(isNew)S.cards.push(x);
        save();closeModal();render();toast((isNew?'Cartão adicionado: ':'Cartão salvo: ')+name,true);
        if(after)after(x);
      };
      const del=q('#ccDel');if(del)del.onclick=async()=>{
        const n=S.tx.filter(t=>t.card===c.id).length;
        if(!await uiConfirm('Excluir o cartão “'+c.name+'”?',n?`${plural(n,'compra')} lançada${n>1?'s':''} nele continua${n>1?'m':''} nos gastos (como crédito, sem cartão).`:'',"Excluir",true))return;
        snap();S.cards=S.cards.filter(x=>x.id!==c.id);S.tx.forEach(t=>{if(t.card===c.id){delete t.card;delete t.parc}});
        Object.keys(S.status).forEach(k=>{if(k.endsWith('|card:'+c.id))delete S.status[k]});
        save();closeModal();render();toast('Cartão excluído',true);
      };
    });
}

/* ---------- Meta ---------- */
const GOAL_ICONS=['🛟','🏠','✈️','🚗','🎓','💍','👶','🎁','🏖️','📱','🎯'];
function goalModal(g){
  const isNew=!g;
  const it=g?byGroup('reserva').find(i=>i.goal===g.id):null;
  const mon=it?(planned(it,UI.month)||it.rec?.amount||0):0;
  const cur=g?resSeries(g.id).cur:0;
  openModal(`
    <div class="m-hd"><h3>${isNew?'Nova meta':esc(g.name)}</h3><button class="x" data-close>×</button></div>
    <div class="m-bd">
      <label class="f">Ícone</label>
      <div class="chips" id="gIcon">${GOAL_ICONS.map(i=>`<button type="button" class="chip ${i===(g?.icon||'🛟')?'on':''}" data-v="${i}">${i}</button>`).join('')}</div>
      <label class="f">Nome da meta</label>
      <input class="in" id="gName" value="${esc(g?.name||'')}" placeholder="Ex.: Reserva de emergência, Viagem, Entrada da casa" list="gList">
      <datalist id="gList"><option value="Reserva de emergência"><option value="Viagem"><option value="Entrada da casa"><option value="Carro"><option value="Estudos"></datalist>
      <div class="two">
        <div><label class="f">Quanto quer juntar</label><input class="in num" id="gAlvo" inputmode="decimal" value="${numIn(g?.alvo)}" placeholder="0,00"></div>
        <div><label class="f">Até quando (opcional)</label><input class="in" type="month" id="gPrazo" value="${g?.prazo||''}"></div>
      </div>
      <div class="two">
        <div><label class="f">Quanto vai guardar por mês</label><input class="in num" id="gMon" inputmode="decimal" value="${numIn(mon)}" placeholder="0,00"></div>
        <div>${isNew?`<label class="f">Já tem guardado hoje</label><input class="in num" id="gHave" inputmode="decimal" placeholder="0,00">`:`<label class="f">Guardado hoje</label><div class="in num" style="display:flex;align-items:center;background:var(--surface-2)">${fmt(cur)}</div>`}</div>
      </div>
      <div class="hint" id="gHint"></div>
      <div class="hint">O valor mensal aparece em “Contas do mês” para você marcar quando guardar.</div>
    </div>
    <div class="m-ft">${isNew?'':'<button class="btn danger" id="gDel">Excluir</button>'}<span class="spacer"></span><button class="btn" data-close>Cancelar</button><button class="btn primary" id="gSave">${isNew?'Criar meta':'Salvar'}</button></div>`,m=>{
      const q=x=>m.querySelector(x);let icon=g?.icon||'🛟';
      if(isNew)setTimeout(()=>q('#gName').focus(),30);
      bindChips(m,'gIcon',v=>icon=v);
      const upd=()=>{
        const alvo=parseMoney(q('#gAlvo').value),prazo=q('#gPrazo').value,have=isNew?parseMoney(q('#gHave').value):cur,mo=parseMoney(q('#gMon').value);
        let h='';
        if(alvo&&prazo&&prazo>=todayYM()){const n=monthsDiff(todayYM(),prazo)+1,need=Math.max(0,(alvo-have)/n);h=`Para chegar a ${fmt(alvo)} até ${ymLabel(prazo)}, guarde cerca de <b>${fmt(need)}</b> por mês (sem contar rendimento). <button type="button" class="link" id="gUse">usar este valor</button>`;q('#gHint').innerHTML=h;q('#gUse').onclick=()=>{q('#gMon').value=numIn(round2(need));upd()};return}
        if(alvo&&mo>0){const n=Math.ceil(Math.max(0,alvo-have)/mo);h=`Guardando ${fmt(mo)} por mês, chega lá em cerca de <b>${plural(n,'mês','meses')}</b> (${ymLabel(ymAdd(todayYM(),Math.max(0,n-1)))}), sem contar rendimento.`}
        q('#gHint').innerHTML=h;
      };
      ['#gAlvo','#gPrazo','#gMon','#gHave'].forEach(x=>q(x)&&q(x).addEventListener('input',upd));upd();
      q('#gSave').onclick=()=>{
        const name=q('#gName').value.trim();if(!name){bad(q('#gName'));return}
        snap();
        const x=g||{id:uid()};
        Object.assign(x,{name,icon,alvo:parseMoney(q('#gAlvo').value)||0});
        const pz=q('#gPrazo').value;if(pz)x.prazo=pz;else delete x.prazo;
        if(isNew)S.goals.push(x);
        const mo=parseMoney(q('#gMon').value);
        let ri=byGroup('reserva').find(i=>i.goal===x.id);
        if(!ri&&mo){ri={id:uid(),name:'Guardar: '+name,group:'reserva',goal:x.id,icon,values:{},rec:{freq:'m',amount:mo,start:UI.month<todayYM()?todayYM():UI.month}};S.items.push(ri);materialize(ri)}
        else if(ri){ri.name='Guardar: '+name;ri.icon=icon;const from=UI.month<todayYM()?todayYM():UI.month;if(Math.abs(mo-(planned(ri,from)||0))>.005){if(!ri.rec){ri.rec={freq:'m',amount:mo,start:from};materialize(ri)}else setPlanned(ri,from,mo,true)}}
        if(isNew){const have=parseMoney(q('#gHave').value);if(have)S.resAdj.push({id:uid(),date:todayISO(),amount:have,note:'Saldo inicial',bank:have,goal:x.id})}
        save();closeModal();render();toast((isNew?'Meta criada: ':'Meta salva: ')+name,true);
      };
      const del=q('#gDel');if(del)del.onclick=async()=>{
        if(!await uiConfirm('Excluir a meta “'+g.name+'”?','O valor mensal dela sai do orçamento e os ajustes de saldo dela são apagados.','Excluir',true))return;
        snap();S.goals=S.goals.filter(x=>x.id!==g.id);
        const ids=byGroup('reserva').filter(i=>i.goal===g.id).map(i=>i.id);
        S.items=S.items.filter(i=>!ids.includes(i.id));Object.keys(S.status).forEach(k=>{if(ids.some(id=>k.endsWith('|'+id)))delete S.status[k]});
        S.resAdj=S.resAdj.filter(a=>a.goal!==g.id);
        save();closeModal();render();toast('Meta excluída',true);
      };
    });
}

/* ---------- Saldo do banco (ajuste da reserva / meta) ---------- */
function resBankModal(gid){
  const goals=S.goals||[];
  if(gid===''||gid===undefined)gid=goals.length===1?goals[0].id:(goals.length?goals[0].id:null);
  openModal(`
    <div class="m-hd"><h3>Saldo guardado no banco</h3><button class="x" data-close>×</button></div>
    <div class="m-bd">
      ${goals.length?`<label class="f">Meta</label><select class="in" id="rbGoal">${goals.map(g=>`<option value="${g.id}" ${g.id===gid?'selected':''}>${g.icon||'🎯'} ${esc(g.name)}</option>`).join('')}<option value="" ${!gid?'selected':''}>Sem meta</option></select>`:''}
      <div class="t2" id="rbInfo" style="margin-top:10px"></div>
      <label class="f">Quanto tem guardado hoje</label>
      <input class="in amount-in num" id="rbVal" inputmode="decimal">
      <div class="two">
        <div><label class="f">Motivo</label><select class="in" id="rbNote"><option>Saldo inicial</option><option>Rendimento</option><option>Depósito</option><option>Retirada</option><option>Correção</option></select></div>
        <div><label class="f">Data</label><input class="in" type="date" id="rbDate" value="${todayISO()}"></div>
      </div>
      <div class="hint" id="rbHint"></div>
    </div>
    <div class="m-ft"><button class="btn" data-close>Cancelar</button><button class="btn primary" id="rbSave">Salvar</button></div>`,m=>{
      const q=x=>m.querySelector(x),inp=q('#rbVal'),h=q('#rbHint');
      const G=()=>q('#rbGoal')?q('#rbGoal').value||null:null;
      const cur=()=>round2(resSeries(G()).cur);
      const hasAdj=()=>(S.resAdj||[]).some(a=>inGoal(a,G()));
      const load=()=>{q('#rbInfo').innerHTML=`O app mostra hoje <b>${fmt(cur())}</b>. Digite quanto você tem guardado de verdade — a diferença vira um ajuste e os próximos aportes somam em cima.`;inp.value=NUM.format(cur());upd()};
      const upd=()=>{const d=round2(parseMoney(inp.value)-cur());h.innerHTML=d?`Ajuste de <b class="${d<0?'neg':'pos'}">${d>0?'+':''}${fmt(d)}</b>`:'Sem diferença.';if(!hasAdj()&&d>0)q('#rbNote').value='Saldo inicial';else if(d<0)q('#rbNote').value='Retirada'};
      inp.oninput=upd;if(q('#rbGoal'))q('#rbGoal').onchange=load;load();
      setTimeout(()=>{inp.focus();inp.select()},30);
      const doSave=()=>{
        const bank=parseMoney(inp.value),d=round2(bank-cur());
        if(!d){closeModal();return}
        snap();
        S.resAdj.push({id:uid(),date:q('#rbDate').value||todayISO(),amount:d,note:q('#rbNote').value,bank,...(G()?{goal:G()}:{})});
        save();closeModal();render();toast('Saldo atualizado para '+fmt(bank),true);
      };
      q('#rbSave').onclick=doSave;
      inp.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();doSave()}});
    });
}

/* ---------- Valor de quitação (descobre os juros do contrato) ---------- */
function quoteModal(it){
  const un=monthsList().filter(m=>planned(it,m)>0&&!isPaid(it,m));
  const firstOpen=openParcels(it)[0];
  const consig=isConsig(it);
  openModal(`
    <div class="m-hd"><h3>Valor de quitação · ${esc(it.name)}</h3><button class="x" data-close>×</button></div>
    <div class="m-bd">
      <div class="t2">Veja no app do banco (ou peça ao credor) quanto custa quitar hoje. Com esse valor o app descobre os juros do contrato e passa a calcular o “à vista” sozinho nos próximos meses.</div>
      <div class="two">
        <div><label class="f">Valor para quitar hoje</label><input class="in num" id="qVal" inputmode="decimal" value="${it.quote?NUM.format(it.quote.amount):''}" placeholder="0,00"></div>
        <div><label class="f">Vence todo dia</label><input class="in" id="qDue" type="number" min="1" max="31" value="${it.due||''}" placeholder="ex.: 2"></div>
      </div>
      <label class="f">Esse valor quita as parcelas a partir de</label>
      <select class="in" id="qFrom">${un.map((m,k)=>`<option value="${m}" ${(it.quote?it.quote.from===m:firstOpen===m)?'selected':''}>${ymLong(m)} · ${plural(un.length-k,'parcela')}</option>`).join('')}</select>
      <div class="hint">Escolha a primeira parcela que o valor de quitação cobre. As anteriores (já descontadas ou pagas) não entram.</div>
      <label class="check" id="qPrevWrap" style="display:none"><input type="checkbox" id="qPrev" checked> <span id="qPrevTxt"></span></label>
      ${consig?`<label class="check"><input type="checkbox" id="qAll" ${S.settings.consigRate==null||S.settings.consigRateFrom===it.id?'checked':''}> Usar esta taxa como estimativa para os outros consignados que ainda não têm valor informado</label>`:''}
      <div class="banner info" id="qRes" style="margin-top:12px"></div>
    </div>
    <div class="m-ft">${it.rate!=null?'<button class="btn danger" id="qDel">Remover</button><span class="spacer"></span>':''}<button class="btn" data-close>Cancelar</button><button class="btn primary" id="qSave">Salvar</button></div>`,m=>{
      const q=x=>m.querySelector(x);setTimeout(()=>q('#qVal').focus(),30);
      if(!un.length){q('#qRes').innerHTML='Não há parcelas em aberto.';return}
      const calcR=()=>{
        const tmp={...it,due:parseInt(q('#qDue').value)||it.due};
        const ms=un.filter(x=>x>=q('#qFrom').value);
        const nom=ms.reduce((s,x)=>s+val(it,x),0),a=parseMoney(q('#qVal').value);
        return{r:solveRate(tmp,ms,a),ms,nom,a,tmp};
      };
      const upd=()=>{const prev=un.filter(x=>x<q('#qFrom').value);q('#qPrevWrap').style.display=prev.length?'':'none';q('#qPrevTxt').textContent=prev.length?`Marcar ${prev.length===1?'a parcela de '+ymLabel(prev[0]):'as '+prev.length+' parcelas de '+ymLabel(prev[0])+' a '+ymLabel(prev[prev.length-1])} como paga${prev.length>1?'s':''} (não entra${prev.length>1?'m':''} na quitação)`:'';const c=calcR();q('#qRes').innerHTML=c.a>0?(c.a>=c.nom?'O valor é igual ou maior que a soma das parcelas — sem desconto de juros.':`${plural(c.ms.length,'parcela')} somam ${fmt(c.nom)} · você economiza <b class="pos">${fmt(c.nom-c.a)}</b> quitando hoje.<br>Juros do contrato ≈ <b>${pctRate(c.r)}</b> (${((Math.pow(1+c.r,12)-1)*100).toLocaleString('pt-BR',{maximumFractionDigits:1})}% ao ano).`):'Digite o valor de quitação.'};
      ['#qVal','#qDue'].forEach(x=>q(x).addEventListener('input',upd));q('#qFrom').addEventListener('change',upd);upd();
      q('#qSave').onclick=()=>{
        const c=calcR();if(!(c.a>0)){bad(q('#qVal'));return}
        snap();
        it.due=c.tmp.due||null;it.rate=c.r;it.quote={amount:c.a,date:todayISO(),from:q('#qFrom').value};
        if(q('#qPrev').checked)un.filter(x=>x<q('#qFrom').value).forEach(x=>{const k=x+'|'+it.id;S.status[k]={...(S.status[k]||{amount:null}),paid:true,date:S.status[k]?.date||todayISO()}});
        if(consig&&q('#qAll').checked){S.settings.consigRate=c.r;S.settings.consigRateFrom=it.id}
        save();closeModal();render();toast('Juros de '+pctRate(c.r)+' salvos para '+it.name,true);
      };
      const del=q('#qDel');if(del)del.onclick=()=>{snap();delete it.rate;delete it.quote;if(S.settings.consigRateFrom===it.id){delete S.settings.consigRate;delete S.settings.consigRateFrom}save();closeModal();render();toast('Valor de quitação removido',true)};
    });
}

/* ---------- Quitar / amortizar ---------- */
function payoffModal(it){
  const d=debtInfo(it);
  const unpaid=openParcels(it);
  if(!unpaid.length){uiAlert('Nada para quitar','Não há parcelas em aberto nesta dívida.');return}
  const nominal=unpaid.reduce((s,m)=>s+val(it,m),0);
  openModal(`
    <div class="m-hd"><h3>Quitar / amortizar · ${esc(it.name)}</h3><button class="x" data-close>×</button></div>
    <div class="m-bd">
      <div class="banner info" style="margin:6px 0 4px">Faltam <b>${unpaid.length}</b> parcela${unpaid.length!==1?'s':''} de ${fmt(d.parcela)} (${ymLabel(unpaid[0])} a ${ymLabel(unpaid[unpaid.length-1])}) = <b>${fmt(nominal)}</b> sem desconto.</div>
      <div class="chips" id="poMode" style="margin-top:10px">
        <button type="button" class="chip on" data-v="total">Quitação total</button>
        <button type="button" class="chip" data-v="partial">Amortização (algumas parcelas)</button>
      </div>
      <div class="two">
        <div><label class="f">Valor que você pagou</label><input class="in num" id="poVal" inputmode="decimal" placeholder="${debtRate(it)?'à vista hoje ≈ '+NUM.format(debtCash(it).cash):'0,00'}"></div>
        <div><label class="f">Data do pagamento</label><input class="in" type="date" id="poDate" value="${todayISO()}"></div>
      </div>
      <div id="poPartial" style="display:none">
        <label class="f">Quantas parcelas o credor abateu?</label>
        <input class="in" id="poN" type="number" min="1" max="${unpaid.length}" value="1">
        <div class="hint">Saem as últimas parcelas do contrato (o fim fica mais cedo; o valor da parcela continua igual).</div>
      </div>
      <div id="poPlanWrap"></div>
      <div class="hint" id="poHint"></div>
    </div>
    <div class="m-ft"><button class="btn" data-close>Cancelar</button><button class="btn good" id="poSave">Registrar pagamento</button></div>`,m=>{
      let mode='total';
      const q=x=>m.querySelector(x);
      setTimeout(()=>q('#poVal').focus(),30);
      const payMonth=()=>clampMonth((q('#poDate').value||todayISO()).slice(0,7));
      const plannedQ=()=>{const pm=payMonth();return byGroup('quitacao').filter(i=>!i.payoffOf&&planned(i,pm)>0&&!isPaid(i,pm))};
      const removed=()=>{
        const pm=payMonth();
        if(mode==='total')return unpaid.filter(x=>x>=pm);
        const n=Math.max(1,Math.min(unpaid.length,parseInt(q('#poN').value)||1));
        return unpaid.slice(-n);
      };
      const upd=()=>{
        q('#poPartial').style.display=mode==='partial'?'':'none';
        const pq=plannedQ(),pm=payMonth();
        q('#poPlanWrap').innerHTML=pq.length?`<label class="check"><input type="checkbox" id="poUsePlan" checked> Usar a quitação já planejada de ${ymLabel(pm)} (${fmt(pq.reduce((s,i)=>s+planned(i,pm),0))}) — ela é trocada por este pagamento</label>`:'';
        const r=removed(),a=parseMoney(q('#poVal').value),nom=r.reduce((s,x)=>s+val(it,x),0);
        const before=unpaid.filter(x=>x<pm&&!r.includes(x));
        q('#poHint').innerHTML=r.length?`Saem <b>${r.length}</b> parcela${r.length!==1?'s':''} (${ymLabel(r[0])}${r.length>1?' a '+ymLabel(r[r.length-1]):''}), que somam ${fmt(nom)}.`+(a>0&&a<nom?' Economia de <b class="pos">'+fmt(nom-a)+'</b> em juros.':'')+(mode==='total'&&before.length?`<br>⚠ ${plural(before.length,'parcela')} antes de ${ymLabel(pm)} ainda não foram marcadas como pagas e continuam no plano.`:''):'Nenhuma parcela a partir dessa data.';
      };
      q('#poMode').onclick=e=>{const b=e.target.closest('[data-v]');if(!b)return;mode=b.dataset.v;q('#poMode').querySelectorAll('.chip').forEach(c=>c.classList.toggle('on',c===b));upd()};
      ['#poVal','#poN'].forEach(x=>q(x).addEventListener('input',upd));q('#poDate').addEventListener('change',upd);upd();
      q('#poSave').onclick=async()=>{
        const a=parseMoney(q('#poVal').value),r=removed(),date=q('#poDate').value||todayISO(),pm=payMonth();
        if(!(a>0)){bad(q('#poVal'));return}
        if(!r.length){uiAlert('Nada para remover','Não há parcelas a partir dessa data.');return}
        const nom=r.reduce((s,x)=>s+val(it,x),0);
        const usePlan=q('#poUsePlan')&&q('#poUsePlan').checked;
        if(!await uiConfirm(mode==='total'?'Registrar quitação?':'Registrar amortização?',`Pagamento de <b>${fmt(a)}</b> e ${plural(r.length,'parcela')} a menos em “${esc(it.name)}”.`,'Registrar'))return;
        snap();
        r.forEach(x=>{clearPlanned(it,x);delete S.status[x+'|'+it.id]});
        if(usePlan)plannedQ().forEach(i=>clearPlanned(i,pm));
        const qi={id:uid(),name:'Quitação – '+it.name,group:'quitacao',values:{[pm]:a},due:null,icon:'',payoffOf:it.id};
        S.items.push(qi);S.status[pm+'|'+qi.id]={paid:true,amount:null,date};
        it.payoffs=[...(it.payoffs||[]),{date,amount:a,removed:r.length,mode,saved:round2(nom-a)}];
        save();closeModal();render();
        toast(`✓ ${mode==='total'?'Quitada':'Amortizada'}: ${plural(r.length,'parcela')} a menos`,true);
      };
    });
}

/* ---------- Excluir item (pergunta para onde vão os gastos da categoria) ---------- */
async function deleteItemFlow(it){
  const n=S.tx.filter(t=>t.cat===it.id).length;
  const others=byGroup('diadia').filter(i=>i.id!==it.id);
  if(it.group==='diadia'&&n&&others.length){
    const html=`<div class="t2">${plural(n,'gasto')} ${n>1?'estão':'está'} nesta categoria. Para onde ${n>1?'devem ir':'deve ir'}?</div><label class="f">Mover para</label><select class="in" id="dlgMove">${others.map(i=>`<option value="${i.id}">${i.icon||''} ${esc(i.name)}</option>`).join('')}</select>`;
    const d=$('#dlg');
    const ok=await new Promise(res=>{
      d.innerHTML=`<div class="m-hd"><h3>Excluir “${esc(it.name)}”?</h3></div><div class="m-bd">${html}</div><div class="m-ft"><button class="btn" id="dlgNo">Cancelar</button><button class="btn danger" id="dlgOk">Mover e excluir</button></div>`;
      d.querySelector('#dlgNo').onclick=()=>{d.close();res(null)};
      d.querySelector('#dlgOk').onclick=()=>{const v=d.querySelector('#dlgMove').value;d.close();res(v)};
      d.oncancel=e=>{e.preventDefault();d.close();res(null)};
      d.showModal();
    });
    if(!ok)return;
    snap();S.tx.forEach(t=>{if(t.cat===it.id)t.cat=ok});
  }else{
    if(!await uiConfirm(`Excluir “${it.name}”?`,it.group==='diadia'&&n?plural(n,'gasto')+' ficará sem categoria.':'Os valores e pagamentos dele somem do plano (dá para desfazer logo em seguida).','Excluir',true))return;
    snap();
  }
  S.items=S.items.filter(i=>i.id!==it.id);
  Object.keys(S.status).forEach(k=>{if(k.endsWith('|'+it.id))delete S.status[k]});
  save();if(modal.open)closeModal();render();toast('“'+it.name+'” excluído',true);
}
function editItem(it){
  if(!it)return;
  if(it.group==='parcela')debtModal(it);
  else if(it.group==='reserva'&&it.goal&&goalById(it.goal))goalModal(goalById(it.goal));
  else if(it.group==='fatura')cardModal(it._card);
  else if((it.group==='receita'&&(it.kind==='extra'||it.extra))||it.group==='quitacao'){const m=Object.keys(it.values).sort()[0]||UI.month;cellModal(it,m)}
  else recurringModal(it.group,it);
}
