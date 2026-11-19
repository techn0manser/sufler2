// Симуляция: виртуальный говорящий + поддельные распознавание и синтез речи.
// Запуск: node test/sim.js [имя сценария]
const {chromium}=require('playwright'),path=require('path'),fs=require('fs');
function mock(cfg){
 let seed=cfg.seed||1;const rnd=()=>{seed=(seed*1664525+1013904223)%4294967296;return seed/4294967296};
 const sim=window.__sim={voice:{},cancels:0,tU:[],wait:[],cfg};
 const vdur=w=>{const x=w.replace(/[^0-9a-zа-яё%]/gi,'');if(!x)return 0;const d=(x.match(/\d/g)||[]).length,v=(x.match(/[аеёиоуыэюя]/gi)||[]).length;return .105*v+.05*(x.length-d-v)+.3*d+(x.includes('%')?.5:0)+.05};
 const wdur=w=>{const x=w.replace(/[^0-9a-zа-яё%]/gi,'');if(!x)return 0;const d=(x.match(/\d/g)||[]).length;return .058*(x.length-d)+.3*d+(x.includes('%')?.5:0)+.07};
 class U{constructor(t){this.text=t;this.rate=1}}
 window.SpeechSynthesisUtterance=U;
 const sy={q:[],cur:null,tm:0,
  speak(u){this.q.push(u);if(!this.cur)this.next(cfg.ttsLat||220)},
  next(d){const u=this.q.shift();if(!u){this.cur=null;return}this.cur=u;
   this.tm=setTimeout(()=>{u.t1=Date.now();u.onstart&&u.onstart();let t=0;u.marks=[];
    u.text.split(' ').forEach(w=>{u.marks.push(t);t+=(vdur(w)+(/[,;:]$/.test(w)?.15:0))/u.rate/(cfg.ttsSpeed||1)});
    this.tm=setTimeout(()=>{this.commit(u,1e15);this.cur=null;u.onend&&u.onend();if(!this.cur)this.next(50)},(t+.1)*1000)},d)},
  commit(u,tn){if(u._s===undefined||!u.marks)return;u.marks.forEach((m,k)=>{const tt=u.t1+m*1000;if(tt<=tn)(sim.voice[u._s+k]=sim.voice[u._s+k]||[]).push(tt)});u.marks=null},
  cancel(){clearTimeout(this.tm);const c=this.cur,q=this.q;this.cur=null;this.q=[];
   if(c){if(c._s!==undefined)sim.cancels++;if(c.t1)this.commit(c,Date.now());setTimeout(()=>c.onerror&&c.onerror({error:'interrupted'}),0)}
   q.forEach(u=>setTimeout(()=>u.onerror&&u.onerror({error:'canceled'}),0))},
  getVoices(){return[]}};
 Object.defineProperty(window,'speechSynthesis',{value:sy,configurable:true});
 sim.vtimes=(i,t)=>{const a=(sim.voice[i]||[]).slice(),c=sy.cur;
  if(c&&c.marks&&c._s!==undefined){const k=i-c._s;if(k>=0&&k<c.marks.length){const tt=c.t1+c.marks[k]*1000;if(tt<=t)a.push(tt)}}return a};
 class R{start(){R.inst=this;R.ready=false;setTimeout(()=>{this.onstart&&this.onstart();R.ready=true},300)}stop(){setTimeout(()=>this.onend&&this.onend(),10)}abort(){}}
 window.SpeechRecognition=R;
 if(cfg.srRestart)setInterval(()=>{if(R.inst&&R.ready){R.ready=false;R.inst.onend&&R.inst.onend()}},cfg.srRestart*1000);
 sim.begin=()=>{const D=window.__dbg(),W=D.W,sl=D.slSt,N=W.length,knows=[];let ph=true;
  for(let i=0;i<N;i++){if(i==0||/[.!?…]$/.test(W[i-1]))ph=rnd()<cfg.knowPhrase;knows[i]=ph&&rnd()>=cfg.forgetWord}
  knows[0]=knows[1]=knows[2]=knows[3]=true;sim.knows=knows;
  let i=0,tFree=Date.now()+(cfg.startDelay||5000),said=[],emitAt=0;
  setInterval(()=>{const t=Date.now();
   while(i<N&&t>=tFree){let ok=false,at=tFree,own=0;
    if(cfg.stopAt&&i==cfg.stopAt[0]&&!sim.stopped){sim.stopped=1;tFree+=cfg.stopAt[1]*1000;break}   // человек замер на несколько секунд
    if(knows[i]){own=sl[i]?cfg.ownPause*1000:0;at=tFree+own;ok=t>=at}
    else{const vs=sim.vtimes(i,t).filter(v=>v>=tFree-2000);if(vs.length){at=Math.max(tFree,vs[0]+cfg.react*1000);ok=t>=at}}
    if(!ok)break;
    sim.tU[i]=at;sim.wait[i]=at-tFree-own;
    const dur=wdur(W[i])*cfg.speed*(.85+.3*rnd())+(/[,;:]$/.test(W[i])?.12:0)+(/[.!?…]$/.test(W[i])?.25:0);tFree=at+dur*1000;
    if(wdur(W[i])){said.push(rnd()<cfg.garble?'абвгд':W[i]);
     let te=tFree+(cfg.srLag[0]+rnd()*(cfg.srLag[1]-cfg.srLag[0]))*1000+(rnd()<.06?1500:0);te=Math.max(te,emitAt+60);emitAt=te;
     const tail=said.slice(-8).join(' ');
     setTimeout(()=>{if(R.inst&&R.ready&&!(cfg.micDeadAt&&sim.tU.length>cfg.micDeadAt))R.inst.onresult({results:[[{transcript:tail}]]})},te-t)}
    i++}},40)};
 sim.report=()=>{const D=window.__dbg(),N=D.W.length,L=[],kn=[];let late=0,miss=0,said=0,bad=[];
  for(let i=0;i<N;i++){const tu=sim.tU[i];if(tu===undefined)continue;said++;const vs=sim.voice[i]||[],b=vs.filter(v=>v<=tu+50);
   if(b.length){const l=(tu-b[b.length-1])/1000;L.push(l);if(sim.knows[i])kn.push(l)}else{if(vs.length)late++;else miss++;if(bad.length<12)bad.push(i+':'+D.W[i])}}
  const pc=(a,p)=>{a=a.slice().sort((x,y)=>x-y);return a.length?+a[Math.floor((a.length-1)*p)].toFixed(2):null};
  const cnt=k=>D.LOG.filter(r=>r[1]=='say'&&r[2]==k).length,w=sim.wait.filter(x=>x!==undefined);
  const tt=sim.tU.filter(x=>x!==undefined);
  const tl=[];for(let i=0;i<N;i++){const tu=sim.tU[i],vs=sim.voice[i]||[];tl.push(i+' '+D.W[i]+' u='+(tu===undefined?'-':((tu-sim.tU[0])/1000).toFixed(2))+' v='+vs.map(v=>((v-sim.tU[0])/1000).toFixed(2)).join(',')+(sim.knows[i]?'':' ?'))}
  return{tl,t00:sim.tU[0],said:said+'/'+N,dur:Math.round((tt[tt.length-1]-tt[0])/1000),mode:D.mode,
   lead:{p10:pc(L,.1),med:pc(L,.5),p90:pc(L,.9)},inBand:Math.round(100*L.filter(l=>l>=.1&&l<=1.5).length/said)+'%',
   voiceLate:late,lateKnownMidSlide:(()=>{let n=0;for(let i=6;i<N;i++){if(!sim.knows[i]||sim.tU[i]===undefined)continue;let near=false;for(let k=0;k<12;k++)if(D.slSt[i-k])near=true;if(near)continue;const vs=sim.voice[i]||[];if(!vs.some(v=>v<=sim.tU[i]+50))n++}return n})(),voiceSkipped:miss,example:bad.join(' '),
   cancels:sim.cancels,jumps:D.LOG.filter(r=>r[1]=='jump').length,relead:cnt('relead'),auto:cnt('auto'),slide:cnt('slide'),
   waitMax:+(Math.max(0,...w)/1000).toFixed(1),waitSum:Math.round(w.reduce((a,b)=>a+b,0)/1000),
   voicedWords:Object.values(sim.voice).reduce((a,b)=>a+b.length,0),tempo:+D.tempo.toFixed(2),vps:+D.vps.toFixed(2),lat:Math.round(D.lat)}}}
const base={seed:7,knowPhrase:1,forgetWord:0,speed:1,react:.3,ownPause:1.3,garble:.1,srLag:[.35,.9],srRestart:14};
const SC={
 'знает всё, обычный темп':{},
 'знает всё, на слайдах ждёт голос':{ownPause:3},
 'знает всё, быстро':{speed:.8},
 'знает всё, медленно':{speed:1.3},
 'повторяет за голосом (не знает ничего)':{knowPhrase:0},
 'знает 60% фраз, забывает слова':{knowPhrase:.6,forgetWord:.05},
 'знает 60%, распознавание плохое':{knowPhrase:.6,forgetWord:.05,garble:.3,srLag:[.6,1.4]},
 'знает 85%, быстрый голос телефона':{knowPhrase:.85,forgetWord:.03,ttsSpeed:1.3},
 'знает 85%, медленный голос, большая задержка':{knowPhrase:.85,forgetWord:.03,ttsSpeed:.75,ttsLat:450},
 'знает всё, замер на 8 с посреди слайда':{stopAt:[120,8]},
 'микрофон отказал на 100-м слове, повторяет за голосом':{knowPhrase:0,micDeadAt:100},
 'микрофон отказал на 100-м слове, знает 85%':{knowPhrase:.85,forgetWord:.03,micDeadAt:100},
};
(async()=>{const only=process.argv[2],b=await chromium.launch();
 const out=await Promise.all(Object.entries(SC).filter(([n])=>!only||n.includes(only)).map(async([name,c])=>{
  const p=await b.newPage(),errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.route(/fonts\./,r=>r.abort());await p.clock.install({time:new Date('2026-11-15T10:00:00')});
  await p.addInitScript(mock,{...base,...c});
  await p.goto('file://'+path.resolve(__dirname,'../index.html'));
  await p.evaluate(()=>{document.querySelector('#go').click();window.__sim.begin()});
  for(let k=0;k<50;k++){await p.clock.runFor(10000);if(await p.evaluate(()=>window.__dbg().mode=='done'))break}
  const r=await p.evaluate(()=>window.__sim.report());if(process.env.TL)fs.writeFileSync(process.env.TL,r.tl.join('\n')+'\n#t00 '+r.t00);delete r.tl;delete r.t00;
  if(process.env.DUMP)fs.writeFileSync(process.env.DUMP,await p.evaluate(()=>window.__dbg().LOG.map(r=>JSON.stringify(r)).join('\n')));
  await p.close();return'\n== '+name+'\n'+JSON.stringify(r)+(errs.length?'\nОШИБКИ: '+errs.slice(0,3).join(' | '):'')}));
 console.log(out.join('\n'));await b.close()})();
