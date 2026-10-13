'use strict';
/* =========================================================
   Utilidades
   ========================================================= */
const MN=['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
const MNF=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const WD=['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=()=>Math.random().toString(36).slice(2,10);
const pad=n=>String(n).padStart(2,'0');
const round2=n=>Math.round(n*100)/100;
const BRL=new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'});
const NUM=new Intl.NumberFormat('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
const fmt=n=>BRL.format(n||0);
const fmtN=n=>n?NUM.format(n):'–';
const pct=v=>(v*100).toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1})+'%';
const fmtK=n=>Math.abs(n)>=1000?(n/1000).toLocaleString('pt-BR',{maximumFractionDigits:1})+' mil':Math.round(n).toLocaleString('pt-BR');
const numIn=v=>v?NUM.format(v):'';
function parseMoney(s){
  if(typeof s==='number')return s;
  s=String(s||'').replace(/R\$|\s/g,'');
  if(!s)return 0;
  if(s.includes(','))s=s.replace(/\./g,'').replace(',','.');
  const n=parseFloat(s);return isNaN(n)?0:round2(n);
}
function todayISO(){const d=new Date();return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())}
const todayYM=()=>todayISO().slice(0,7);
function ymAdd(ym,n){let[y,m]=ym.split('-').map(Number);m+=n;y+=Math.floor((m-1)/12);m=((m-1)%12+12)%12+1;return y+'-'+pad(m)}
const ymLabel=ym=>{const[y,m]=ym.split('-');return MN[m-1]+'/'+y.slice(2)};
const ymLong=ym=>{const[y,m]=ym.split('-');return MNF[m-1]+' de '+y};
const dim=ym=>{const[y,m]=ym.split('-').map(Number);return new Date(y,m,0).getDate()};
const dmy=iso=>iso?iso.slice(8,10)+'/'+iso.slice(5,7):'';
const daysBetween=(a,b)=>Math.round((new Date(b+'T12:00')-new Date(a+'T12:00'))/864e5);
function monthsDiff(a,b){const[y1,m1]=a.split('-').map(Number),[y2,m2]=b.split('-').map(Number);return(y2-y1)*12+(m2-m1)}
const plural=(n,s,p)=>n+' '+(n===1?s:(p||s+'s'));
const clampDay=v=>{const n=parseInt(v);return n?Math.max(1,Math.min(31,n)):null};

const GROUPS={
  receita:{label:'Entradas (receitas)',sec:'RECEITAS'},
  fixa:{label:'Contas fixas',sec:'CONTAS FIXAS'},
  diadia:{label:'Dia a dia (categoria)',sec:'DIA A DIA'},
  parcela:{label:'Parcelas e dívidas',sec:'PARCELAS E DÍVIDAS'},
  quitacao:{label:'Quitações antecipadas',sec:'PARCELAS E DÍVIDAS'},
  reserva:{label:'Guardar dinheiro (metas)',sec:'DESTINO DA SOBRA'}
};
const BILL_GROUPS=['fixa','parcela','quitacao','reserva'];
const METHODS=[['debito','Débito'],['pix','Pix'],['credito','Crédito'],['dinheiro','Dinheiro']];
const methodLabel=k=>(METHODS.find(m=>m[0]===k)||[,k||'—'])[1];
const DEBT_TYPES=[
  ['emprestimo','🏦','Empréstimo'],
  ['consignado','🧾','Consignado'],
  ['financiamento','🚗','Financiamento'],
  ['carne','🛍️','Carnê / crediário'],
  ['pessoa','🤝','Com uma pessoa'],
  ['outro','📄','Outro']
];
const debtTypeLabel=k=>(DEBT_TYPES.find(t=>t[0]===k)||[,'',''])[2];
const INCOME_KINDS=[['salario','Salário'],['13','13º salário'],['outra','Outra renda fixa'],['extra','Extra (uma vez)']];
