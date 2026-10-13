'use strict';
/* =========================================================
   Cálculos
   ========================================================= */
function monthsList(){const o=[];let c=S.settings.start;let g=0;while(c<=S.settings.end&&g++<600){o.push(c);c=ymAdd(c,1)}return o}
function clampMonth(ym){const ms=monthsList();if(ym<ms[0])return ms[0];if(ym>ms[ms.length-1])return ms[ms.length-1];return ym}
const byGroup=g=>S.items.filter(i=>i.group===g);
const planned=(it,ym)=>it.values[ym]||0;
const st=(it,ym)=>S.status[ym+'|'+it.id];
// Desconto em folha: a parcela conta como paga sozinha a partir do dia de desconto (it.due) do mês.
// Se você desmarcar, fica gravado {paid:false, manual:true} e vale o que você marcou.
const folhaFecha=()=>S.settings.folhaFecha||20; // dia do mês anterior em que a folha fecha (a parcela já está reservada)
const folhaDate=(it,ym)=>ym+'-'+pad(Math.min(it.due||5,dim(ym)));
const autoPaid=(it,ym)=>!!it.folha&&planned(it,ym)>0&&todayISO()>=folhaDate(it,ym);
const isPaid=(it,ym)=>{const s=st(it,ym);if(s&&s.manual&&!s.paid)return false;return!!(s&&s.paid)||autoPaid(it,ym)};
// parcela já reservada na folha (não entra mais no valor de quitação)
const folhaCommitted=(it,ym)=>!!it.folha&&todayISO()>=ymAdd(ym,-1)+'-'+pad(folhaFecha());
const openParcels=it=>monthsList().filter(m=>planned(it,m)>0&&!isPaid(it,m)&&!folhaCommitted(it,m));
const val=(it,ym)=>{const s=st(it,ym);return s&&s.amount!=null?s.amount:planned(it,ym)};
const people=()=>[...new Set(S.items.flatMap(x=>[x.payTo,x.payFrom]).filter(Boolean))];

/* ---------- Cartões de crédito ----------
   Compra no crédito: tx.method='credito', tx.card=id do cartão, tx.parc=nº de parcelas.
   - no orçamento do dia a dia, a parcela k conta no mês da compra + k (à vista = mês da compra)
   - na fatura, entra pelo fechamento: comprou depois do dia de fechamento, vai para a fatura seguinte
   - a fatura aparece em "Contas do mês" para marcar como paga, mas NÃO soma de novo na sobra */
const cardById=id=>(S.cards||[]).find(c=>c.id===id);
const parcOf=t=>t.parc>1?t.parc:1;
function shareOf(t,k){const n=parcOf(t);if(n===1)return t.amount;const base=Math.floor(t.amount/n*100)/100;return k===n-1?round2(t.amount-base*(n-1)):base}
function invoiceFirstYM(card,date){
  const ym=date.slice(0,7),d=+date.slice(8,10);
  const close=d<=Math.min(card.fecha||1,dim(ym))?ym:ymAdd(ym,1);
  return(card.vence||10)>(card.fecha||1)?close:ymAdd(close,1);
}
function cardInstallments(card){
  const out=[];
  S.tx.forEach(t=>{
    if(t.method!=='credito'||t.card!==card.id)return;
    const n=parcOf(t),first=invoiceFirstYM(card,t.date);
    for(let k=0;k<n;k++)out.push({t,k,n,amount:shareOf(t,k),ym:ymAdd(first,k)});
  });
  return out;
}
function invoiceTotals(card){const o={};cardInstallments(card).forEach(x=>o[x.ym]=round2((o[x.ym]||0)+x.amount));return o}
const invoiceItem=card=>({id:'card:'+card.id,name:'Fatura '+card.name,group:'fatura',icon:card.icon||'💳',due:card.vence,values:invoiceTotals(card),_card:card});
const invoiceItems=()=>(S.cards||[]).map(invoiceItem);
function cardUsed(card){const inv=invoiceItem(card);return round2(cardInstallments(card).filter(x=>!isPaid(inv,x.ym)).reduce((s,x)=>s+x.amount,0))}
function itemById(id){
  if(id&&id.startsWith('card:')){const c=cardById(id.slice(5));return c?invoiceItem(c):null}
  return S.items.find(i=>i.id===id);
}

// lançamentos do dia a dia que pesam no mês (compras parceladas entram uma parcela por mês)
function txOf(ym){
  const out=[];
  S.tx.forEach(t=>{
    const n=parcOf(t),m0=t.date.slice(0,7);
    if(n===1){if(m0===ym)out.push(t);return}
    const k=monthsDiff(m0,ym);if(k<0||k>=n)return;
    out.push({...t,amount:shareOf(t,k),_full:t.amount,_k:k,_n:n});
  });
  return out;
}

const goalById=id=>(S.goals||[]).find(g=>g.id===id);
const resAdjIn=(m,f)=>(S.resAdj||[]).filter(a=>(!f||f(a))&&clampMonth(a.date.slice(0,7))===m).reduce((s,a)=>s+a.amount,0);

function calc(ym){
  const sumV=g=>byGroup(g).reduce((s,i)=>s+val(i,ym),0);
  const txs=txOf(ym);
  const dd=byGroup('diadia');
  const cats=dd.map(i=>{
    const own=txs.filter(t=>t.cat===i.id);
    const spent=own.reduce((s,t)=>s+t.amount,0);
    const plan=planned(i,ym);
    return{item:i,plan,spent:round2(spent),n:own.length};
  });
  const orphan=txs.filter(t=>!dd.some(i=>i.id===t.cat));
  if(orphan.length){cats.push({item:{id:'_orf',name:'Sem categoria',icon:'❔'},plan:0,spent:round2(orphan.reduce((s,t)=>s+t.amount,0)),n:orphan.length})}
  const receita=sumV('receita');
  const fixas=sumV('fixa'),parcelas=sumV('parcela'),quit=sumV('quitacao'),reserva=sumV('reserva');
  const diaPlan=cats.reduce((s,c)=>s+c.plan,0),diaSpent=round2(cats.reduce((s,c)=>s+c.spent,0));
  const diaProj=cats.reduce((s,c)=>s+Math.max(c.plan,c.spent),0);
  const semOrc=round2(cats.filter(c=>!c.plan).reduce((s,c)=>s+c.spent,0));
  const saidas=fixas+parcelas+quit+diaProj;
  const sobra=receita-saidas;
  const bills=BILL_GROUPS.flatMap(byGroup).filter(i=>planned(i,ym)>0||st(i,ym));
  const billsNoRes=bills.filter(i=>i.group!=='reserva');
  const paidBills=billsNoRes.filter(i=>isPaid(i,ym));
  const paidAmt=paidBills.reduce((s,i)=>s+val(i,ym),0);
  const billsAmt=billsNoRes.reduce((s,i)=>s+val(i,ym),0);
  const invoices=invoiceItems().filter(i=>planned(i,ym)>0||st(i,ym));
  const salaryIt=salaryItem();
  const salary=salaryIt?val(salaryIt,ym):0;
  return{ym,cats,receita,fixas,parcelas,quit,reserva,diaPlan,diaSpent,diaProj,semOrc,saidas,sobra,livre:sobra-reserva,
    bills,billsNoRes,paidBills,paidAmt,billsAmt,invoices,pctParc:salary?parcelas/salary:0,txs,
    jaSaiu:paidAmt+diaSpent, vaiSair:(billsAmt-paidAmt)+Math.max(0,diaProj-diaSpent)};
}
const salaryItem=()=>S.items.find(i=>i.group==='receita'&&(i.kind==='salario'||i.salary))||byGroup('receita').find(i=>i.kind!=='extra'&&!i.extra);
const doneWord=it=>it.group==='receita'?'Recebido':it.group==='reserva'?'Guardado':'Pago';
function dueInfo(it,ym){
  const s=st(it,ym);
  if(s&&s.paid)return{cls:'paid',text:doneWord(it)+(s.date?' em '+dmy(s.date):'')};
  if(isPaid(it,ym))return{cls:'paid',text:'Descontado na folha '+dmy(folhaDate(it,ym))};
  if(it.folha&&!(s&&s.manual)){const f=folhaDate(it,ym),diff=daysBetween(todayISO(),f);return{cls:diff<=3?'soon':'',text:'Folha dia '+dmy(f)+(diff===0?' (hoje)':diff>0&&diff<=3?' (em '+plural(diff,'dia')+')':''),diff}}
  if(!it.due)return{cls:'',text:it.group==='receita'?'sem dia definido':'sem vencimento'};
  const d=Math.min(it.due,dim(ym));const dueISO=ym+'-'+pad(d);const t=todayISO();
  const diff=daysBetween(t,dueISO);
  if(it.group==='receita'){
    if(diff<0)return{cls:'late',text:'Atrasado · era para cair dia '+dmy(dueISO),diff};
    if(diff===0)return{cls:'soon',text:'Cai hoje',diff};
    return{cls:diff<=3?'soon':'',text:'Cai dia '+dmy(dueISO)+(diff<=3?' (em '+plural(diff,'dia')+')':''),diff};
  }
  if(diff<0)return{cls:'late',text:'Atrasada · venceu '+dmy(dueISO),diff};
  if(diff===0)return{cls:'soon',text:'Vence hoje',diff};
  if(diff<=3)return{cls:'soon',text:'Vence em '+plural(diff,'dia')+' ('+dmy(dueISO)+')',diff};
  return{cls:'',text:'Vence dia '+dmy(dueISO),diff};
}

/* ---------- Dívidas ---------- */
// Valor à vista: cada parcela em aberto é trazida para hoje pela taxa de juros do contrato,
// contando os dias até o vencimento (como o banco faz na quitação antecipada).
const isConsig=it=>it.group==='parcela'&&(it.debt?.tipo==='consignado'||!!it.consig);
function debtRate(it){
  if(it.rate!=null)return{r:it.rate,src:'quote'};
  if(it.debt&&it.debt.taxa!=null&&it.debt.taxa>0)return{r:it.debt.taxa/100,src:'info'};
  if(isConsig(it)&&S.settings.consigRate!=null)return{r:S.settings.consigRate,src:'est'};
  return null;
}
function parcelK(it,m){const d=Math.min(it.due||1,dim(m));return Math.max(0,daysBetween(todayISO(),m+'-'+pad(d))/30.4375)}
const pvOf=(it,months,r)=>months.reduce((s,m)=>s+val(it,m)/Math.pow(1+r,parcelK(it,m)),0);
function solveRate(it,months,target){
  const nom=months.reduce((s,m)=>s+val(it,m),0);
  if(!(target>0)||target>=nom)return 0;
  let lo=0,hi=1;
  for(let k=0;k<100;k++){const mid=(lo+hi)/2;if(pvOf(it,months,mid)>target)lo=mid;else hi=mid}
  return(lo+hi)/2;
}
function debtCash(it){
  const un=openParcels(it);
  const nom=un.reduce((s,m)=>s+val(it,m),0);
  const R=debtRate(it);
  if(!R)return{cash:nom,nom,rate:null,src:null};
  return{cash:round2(pvOf(it,un,R.r)),nom,rate:R.r,src:R.src};
}
const pctRate=r=>(r*100).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})+'% a.m.';
function debtInfo(it){
  const ms=monthsList().filter(m=>planned(it,m)>0);
  const paid=ms.filter(m=>isPaid(it,m));
  const unpaid=ms.filter(m=>!isPaid(it,m));
  const before=it.debt?.pagasAntes||0; // parcelas pagas antes de começar a usar o app
  const parcela=ms.length?planned(it,ms[ms.length-1]):(it.rec?.amount||0);
  return{ms,total:ms.length+before,paid:paid.length+before,remaining:unpaid.length,remVal:unpaid.reduce((s,m)=>s+val(it,m),0),
    totalVal:ms.reduce((s,m)=>s+val(it,m),0)+before*parcela,last:ms[ms.length-1],first:ms[0],parcela,
    nextUnpaid:unpaid[0],before};
}
// compras parceladas no cartão que ainda têm parcelas por vir
function cardDebts(){
  const tm=todayYM(),out=[];
  (S.cards||[]).forEach(c=>{
    const inv=invoiceItem(c),by={};
    cardInstallments(c).filter(x=>x.n>1).forEach(x=>{(by[x.t.id]=by[x.t.id]||{t:x.t,card:c,list:[]}).list.push(x)});
    Object.values(by).forEach(g=>{
      const open=g.list.filter(x=>!isPaid(inv,x.ym)&&x.ym>=tm);
      if(open.length)out.push({...g,open,rem:round2(open.reduce((s,x)=>s+x.amount,0)),last:g.list[g.list.length-1].ym});
    });
  });
  return out.sort((a,b)=>a.last.localeCompare(b.last));
}

/* ---------- Reserva e metas ----------
   Reserva mês a mês, com rendimento (juros sobre o saldo do mês anterior + aporte do mês).
   gid: undefined = tudo; null = dinheiro guardado sem meta; id = só aquela meta */
const resRate=()=>(S.settings.savingsRate??0.6)/100;
const inGoal=(x,gid)=>gid===undefined||(gid===null?!x.goal||!goalById(x.goal):x.goal===gid);
function resSeries(gid){
  const ms=monthsList(),r=resRate(),tm=clampMonth(todayYM());
  const its=byGroup('reserva').filter(i=>inGoal(i,gid)),af=a=>inGoal(a,gid);
  const lastIdx=ms.reduce((k,m,i)=>its.some(it=>isPaid(it,m))||resAdjIn(m,af)?i:k,-1);
  const realUntil=Math.max(lastIdx,ms.indexOf(tm));
  let cp=0,cpJ=0,cr=0,jrTot=0,proj=0;
  const rows=ms.map((m,i)=>{
    const pl=its.reduce((s,it)=>s+planned(it,m),0);
    const re=its.reduce((s,it)=>s+(isPaid(it,m)?val(it,m):0),0);
    const aj=resAdjIn(m,af);
    const jp=cpJ*r;cp+=pl;cpJ+=jp+pl;
    let jr=null,crv=null;
    if(i<=realUntil){jr=m<=tm?cr*r:0;cr+=jr+re+aj;jrTot+=jr;crv=cr;proj=cr}
    else{proj=proj*(1+r)+pl}
    return{m,pl,re,aj,cp,cpJ,jp,jr,cr:crv,proj};
  });
  return{rows,realUntil,cur:cr,jrTot,last:rows[rows.length-1]};
}
function goalETA(R,target){
  const hit=R.rows.find(r=>(r.cr??r.proj)>=target);
  if(hit)return{m:hit.m,after:false};
  const last12=R.rows.slice(-12),avg=last12.reduce((s,r)=>s+r.pl,0)/(last12.length||1);
  const r=resRate();let bal=R.last.proj,m=R.last.m,k=0;
  if(avg<=0&&r<=0)return null;
  if(avg<=0&&bal<=0)return null;
  while(bal<target&&k++<600){m=ymAdd(m,1);bal=bal*(1+r)+avg}
  return k>600?null:{m,after:true,avg};
}

/* ---------- Consórcios ----------
   Dois itens ligados por cons.id: a parcela mensal (conta fixa, role 'pay')
   e o recebimento no mês da sua vez (entrada, role 'get'). */
function consorcios(){
  const by={};
  S.items.forEach(i=>{if(i.cons&&i.cons.id)(by[i.cons.id]=by[i.cons.id]||{id:i.cons.id})[i.cons.role]=i});
  return Object.values(by).filter(c=>c.pay);
}
const consorcioById=id=>consorcios().find(c=>c.id===id);
function consInfo(c){
  const p=c.pay,cf=p.cons,before=cf.pagasAntes||0;
  const ms=monthsList().filter(m=>planned(p,m)>0);
  const paid=ms.filter(m=>isPaid(p,m)),open=ms.filter(m=>!isPaid(p,m));
  const parcela=p.rec?.amount||(ms.length?planned(p,ms[0]):0);
  const n=cf.parcelas||ms.length+before;
  const first=ymAdd(p.rec?.start||ms[0]||todayYM(),-before);
  const mes=cf.mes||null;
  const recebido=!!cf.recebido||!!(c.get&&mes&&isPaid(c.get,mes));
  return{n,paidN:paid.length+before,pago:round2(paid.reduce((s,m)=>s+val(p,m),0)+before*parcela),
    falta:round2(open.reduce((s,m)=>s+val(p,m),0)),parcela,first,last:ymAdd(first,n-1),
    mes,valor:cf.valor||0,recebido,nextPay:open[0]};
}
