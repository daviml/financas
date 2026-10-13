'use strict';
/* =========================================================
   Interface: modal, diálogos (no lugar de alert/confirm/prompt), aviso e gráficos
   ========================================================= */
const modal=$('#modal');
function openModal(html,mount){$('#modalIn').innerHTML=html;if(!modal.open)modal.showModal();if(mount)mount(modal)}
function closeModal(){modal.close()}
modal.addEventListener('click',e=>{if(e.target===modal)closeModal()});
const anyModalOpen=()=>modal.open||$('#dlg').open;

// Diálogo simples por cima de tudo (pode abrir em cima de um modal)
function dialogBox({title,html='',ok='OK',cancel=null,danger=false,input=null}){
  return new Promise(res=>{
    const d=$('#dlg');
    d.innerHTML=`<div class="m-hd"><h3>${esc(title||'')}</h3></div><div class="m-bd">${html}${input?`<label class="f">${esc(input.label||'')}</label><input class="in" id="dlgIn" value="${esc(input.value||'')}" ${input.type?`type="${input.type}"`:''} ${input.mode?`inputmode="${input.mode}"`:''} placeholder="${esc(input.placeholder||'')}" autocomplete="off">`:''}</div>
      <div class="m-ft">${cancel?`<button class="btn" id="dlgNo">${esc(cancel)}</button>`:''}<button class="btn ${danger?'danger':'primary'}" id="dlgOk">${esc(ok)}</button></div>`;
    const done=v=>{d.close();res(v)};
    d.querySelector('#dlgOk').onclick=()=>done(input?d.querySelector('#dlgIn').value:true);
    const no=d.querySelector('#dlgNo');if(no)no.onclick=()=>done(input?null:false);
    d.oncancel=e=>{e.preventDefault();done(input?null:false)};
    d.showModal();
    const inp=d.querySelector('#dlgIn');
    if(inp){setTimeout(()=>{inp.focus();inp.select()},30);inp.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();done(inp.value)}}}
  });
}
const uiAlert=(title,text)=>dialogBox({title,html:text?`<div class="t2">${text}</div>`:''});
const uiConfirm=(title,text,ok='Confirmar',danger=false)=>dialogBox({title,html:text?`<div class="t2">${text}</div>`:'',ok,cancel:'Cancelar',danger});
const uiPrompt=(title,label,value,opts={})=>dialogBox({title,html:opts.text?`<div class="t2">${opts.text}</div>`:'',ok:opts.ok||'OK',cancel:'Cancelar',input:{label,value,...opts}});

function toast(msg,undoable=false){
  $('#toastMsg').textContent=msg;
  $('#toastUndo').style.display=undoable&&undoSnap?'':'none';
  $('#toast').style.display='flex';
  clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').style.display='none',4500);
}
$('#toastUndo').onclick=undo;

/* ---------- Gráficos (SVG simples, com tooltip) ---------- */
const tipEl=$('#tip');
function showTip(html,x,y){tipEl.innerHTML=html;tipEl.style.display='block';const w=tipEl.offsetWidth,h=tipEl.offsetHeight;let L=x+14,T=y-h-10;if(L+w>innerWidth-8)L=x-w-14;if(T<8)T=y+16;tipEl.style.left=L+'px';tipEl.style.top=T+'px'}
function hideTip(){tipEl.style.display='none'}
document.addEventListener('mouseover',e=>{const t=e.target.closest('[data-tip]');if(t){const r=t.getBoundingClientRect();showTip(t.dataset.tip,r.left+r.width/2,r.top)}});
document.addEventListener('mouseout',e=>{if(e.target.closest('[data-tip]'))hideTip()});
function niceMax(v){if(v<=0)return 1;const p=Math.pow(10,Math.floor(Math.log10(v)));const n=v/p;return(n<=1?1:n<=2?2:n<=2.5?2.5:n<=5?5:10)*p}
function barPath(x,y,w,h,r){r=Math.min(r,w/2,h);if(h<=0)return'';return`M${x},${y+h}V${y+r}Q${x},${y} ${x+r},${y}H${x+w-r}Q${x+w},${y} ${x+w},${y+r}V${y+h}Z`}

function lineChart(el,{labels,series,height=240,yFmt=fmt,highlight}){
  const W=Math.max(el.clientWidth,280),narrow=W<520,H=height,pl=narrow?44:58,pr=narrow?12:70,pt=14,pb=26,iw=W-pl-pr,ih=H-pt-pb;
  const max=niceMax(Math.max(1,...series.flatMap(s=>s.values.filter(v=>v!=null))));
  const x=i=>pl+(labels.length<=1?iw/2:i*iw/(labels.length-1)),y=v=>pt+ih-v/max*ih;
  let g='';
  for(let k=0;k<=4;k++){const v=max*k/4,yy=y(v);g+=`<line class="gl" x1="${pl}" x2="${W-pr}" y1="${yy}" y2="${yy}"/><text class="ax" x="${pl-8}" y="${yy+4}" text-anchor="end">${fmtK(v)}</text>`}
  const step=Math.ceil(labels.length/Math.max(2,Math.floor(iw/58)));
  labels.forEach((l,i)=>{if(i%step===0||i===labels.length-1)g+=`<text class="ax" x="${x(i)}" y="${H-6}" text-anchor="middle">${ymLabel(l)}</text>`});
  if(highlight!=null){const i=labels.indexOf(highlight);if(i>=0)g+=`<line x1="${x(i)}" x2="${x(i)}" y1="${pt}" y2="${pt+ih}" stroke="var(--accent)" stroke-width="1" stroke-dasharray="2 3" opacity=".6"/>`}
  series.forEach(s=>{
    let d='',on=false;s.values.forEach((v,i)=>{if(v==null){on=false;return}d+=(on?'L':'M')+x(i)+','+y(v);on=true});
    g+=`<path d="${d}" fill="none" stroke="${s.color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" ${s.dash?'stroke-dasharray="5 4"':''}/>`;
    let li=-1;s.values.forEach((v,i)=>{if(v!=null)li=i});
    if(li>=0){g+=`<circle cx="${x(li)}" cy="${y(s.values[li])}" r="4" fill="${s.color}" stroke="var(--surface)" stroke-width="2"/>`+(narrow?'':`<text class="dl" x="${x(li)+8}" y="${y(s.values[li])+4}">${esc(s.name)}</text>`)}
  });
  g+=`<line class="xh" id="xh" x1="0" x2="0" y1="${pt}" y2="${pt+ih}" style="display:none"/><g id="hd"></g><rect x="${pl}" y="${pt}" width="${iw}" height="${ih}" fill="transparent" id="hov"/>`;
  el.innerHTML=`<svg viewBox="0 0 ${W} ${H}" height="${H}" role="img">${g}</svg>`;
  const svg=el.querySelector('svg'),xh=svg.querySelector('#xh'),hd=svg.querySelector('#hd');
  svg.querySelector('#hov').addEventListener('mousemove',e=>{
    const r=svg.getBoundingClientRect();const px=(e.clientX-r.left)*W/r.width;
    const i=Math.max(0,Math.min(labels.length-1,Math.round((px-pl)/iw*(labels.length-1))));
    xh.setAttribute('x1',x(i));xh.setAttribute('x2',x(i));xh.style.display='';
    hd.innerHTML=series.map(s=>s.values[i]==null?'':`<circle cx="${x(i)}" cy="${y(s.values[i])}" r="4.5" fill="${s.color}" stroke="var(--surface)" stroke-width="2"/>`).join('');
    showTip(`<b>${ymLong(labels[i])}</b>`+series.map(s=>`<div class="r"><span><i class="sw" style="background:${s.color}"></i>${esc(s.name)}</span><span class="num">${s.values[i]==null?'—':yFmt(s.values[i])}</span></div>`).join(''),e.clientX,e.clientY);
  });
  svg.querySelector('#hov').addEventListener('mouseleave',()=>{xh.style.display='none';hd.innerHTML='';hideTip()});
}
function barChart(el,{labels,values,height=220,color='var(--s1)',yFmt=fmt,tip,highlight,onClick}){
  const W=Math.max(el.clientWidth,280),H=height,pl=58,pr=10,pt=14,pb=26,iw=W-pl-pr,ih=H-pt-pb;
  const max=niceMax(Math.max(1,...values));
  const bw=iw/labels.length,gap=Math.min(6,Math.max(2,bw*.25)),y=v=>pt+ih-v/max*ih;
  let g='';
  for(let k=0;k<=4;k++){const v=max*k/4,yy=y(v);g+=`<line class="gl" x1="${pl}" x2="${W-pr}" y1="${yy}" y2="${yy}"/><text class="ax" x="${pl-8}" y="${yy+4}" text-anchor="end">${fmtK(v)}</text>`}
  const step=Math.ceil(labels.length/Math.max(2,Math.floor(iw/58)));
  labels.forEach((l,i)=>{
    const x=pl+i*bw+gap/2,w=bw-gap,h=ih-(y(values[i])-pt);
    const hl=highlight===l;
    g+=`<path d="${barPath(x,y(values[i]),w,h,4)}" fill="${color}" opacity="${highlight&&!hl?.55:1}"/>`;
    g+=`<rect x="${pl+i*bw}" y="${pt}" width="${bw}" height="${ih}" fill="transparent" data-i="${i}" style="cursor:${onClick?'pointer':'default'}"/>`;
    if(i%step===0||i===labels.length-1)g+=`<text class="ax" x="${pl+i*bw+bw/2}" y="${H-6}" text-anchor="middle" ${hl?'style="fill:var(--accent);font-weight:700"':''}>${ymLabel(l)}</text>`;
  });
  el.innerHTML=`<svg viewBox="0 0 ${W} ${H}" height="${H}" role="img">${g}</svg>`;
  el.querySelectorAll('rect[data-i]').forEach(r=>{
    const i=+r.dataset.i;
    r.addEventListener('mousemove',e=>showTip(`<b>${ymLong(labels[i])}</b>`+(tip?tip(i):`<div class="r"><span>Valor</span><span class="num">${yFmt(values[i])}</span></div>`),e.clientX,e.clientY));
    r.addEventListener('mouseleave',hideTip);
    if(onClick)r.addEventListener('click',()=>{hideTip();onClick(labels[i])});
  });
}
