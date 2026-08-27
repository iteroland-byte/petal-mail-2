/* ============================================================

   Petal Post — shared app logic, loaded as a module on every page.

   Each page sets <body data-page="..."> and this file runs the

   right init for that page. See README.md for the asset naming

   convention and the watering/growth timing rules.

   ============================================================ */

import { initializeApp } from "[https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js](https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js)";

import {

  getFirestore, doc, getDoc, setDoc

} from "[https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js](https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js)";

const firebaseConfig = {

  apiKey: "AIzaSyDhQMItgQF4vvMFcFkY0oeS7XVvK9Vmvo",

  authDomain: "petal-post-45cd4.firebaseapp.com",

  projectId: "petal-post-45cd4",

  storageBucket: "petal-post-45cd4.firebasestorage.app",

  messagingSenderId: "311454152110",

  appId: "1:311454152110:web:8a59edc16b3b213044843f",

  measurementId: "G-SV3W5S0B3L"

};

const app = initializeApp(firebaseConfig);

const db = getFirestore(app);

/* ---------- flower catalogue ----------

   `name` (lowercased) drives the image filenames — see README for the

   exact naming convention. `emoji` is only used as a fallback until

   real photos are dropped into assets/flowers/. */

export const FLOWERS = [

  {id:'carnation', emoji:'🌸', name:'Carnation', meaning:'devotion'},

  {id:'sunflower', emoji:'🌻', name:'Sunflower', meaning:'warmth'},

  {id:'lavender', emoji:'💜', name:'Lavender', meaning:'calm'},

  {id:'tulip', emoji:'🌷', name:'Tulip', meaning:'new beginnings'},

  {id:'hibiscus', emoji:'🌺', name:'Hibiscus', meaning:'celebration'},

  {id:'marigold', emoji:'🟠', name:'Marigold', meaning:'gratitude'},

  {id:'orchid', emoji:'🪷', name:'Orchid', meaning:'strength'},

  {id:'daisy', emoji:'🌼', name:'Daisy', meaning:'simplicity'},

  {id:'rose', emoji:'🌹', name:'Rose', meaning:'love'},

  {id:'jasmine', emoji:'🤍', name:'Jasmine', meaning:'devotion'},

  {id:'lily', emoji:'⚜️', name:'Lily', meaning:'renewal'},

  {id:'peony', emoji:'🌸', name:'Peony', meaning:'good fortune'},

  {id:'poppy', emoji:'❤️', name:'Poppy', meaning:'remembrance'},

  {id:'iris', emoji:'💠', name:'Iris', meaning:'hope'},

  {id:'chrysanthemum', emoji:'🟡', name:'Chrysanthemum', meaning:'joy'},

  {id:'bougainvillea', emoji:'💗', name:'Bougainvillea', meaning:'resilience'},

];

export function flowerById(id){ return FLOWERS.find(f=>f.id===id) || FLOWERS[0]; }

/* ---------- image-stage helper ----------

   Matches the naming convention: "carnation.jpg", "carnation sapling day

   one.jpg", "carnation bud.jpg", "carnation bud opens.jpg",

   "carnation bloom.jpg" — one set per flower, all lowercase, living in

   assets/flowers/. */

export function flowerImg(flower, stage){

  const n = flower.name.toLowerCase();

  const suffix = {

    icon: '',

    day1: ' sapling day one',

    bud: ' bud',

    opens: ' bud opens',

    bloom: ' bloom'

  }[stage] ?? '';

  return `assets/flowers/${n}${suffix}.jpg`;

}

/* Renders an <img> that falls back to `fallbackHtml` (plain HTML string,

   usually an emoji) if the real photo hasn't been added yet. Returns the

   wrapping element. */

export function imgOrFallback(src, alt, fallbackHtml, imgClass, fallbackClass){

  const wrap = document.createElement('span');

  wrap.style.display = 'contents';

  const img = document.createElement('img');

  img.src = src; img.alt = alt || '';

  if(imgClass) img.className = imgClass;

  const fb = document.createElement('span');

  fb.innerHTML = fallbackHtml;

  if(fallbackClass) fb.className = fallbackClass;

  fb.style.display = 'none';

  img.onerror = () => { img.style.display = 'none'; fb.style.display = ''; };

  wrap.appendChild(img); wrap.appendChild(fb);

  return wrap;

}

/* ---------- watering / growth timing ----------

   A gift needs 3 waterings. The first can happen the moment the flower

   is opened; after that, a 24h cooldown gates the next one, so a

   flower that's watered right on schedule blooms 72 hours (3 days)

   after the first watering — growing a visible stage each time. */

export const WATER_COOLDOWN_MS = 24 * 60 * 60 * 1000;

export const DAYS_NEEDED = 3;

export function stageForWaterings(count){

  return Math.max(0, Math.min(DAYS_NEEDED, count));

}

export function canWaterNow(gift){

  if(gift.waterings.length >= DAYS_NEEDED) return false;

  if(gift.waterings.length === 0) return true;

  const last = gift.waterings[gift.waterings.length-1];

  return (Date.now() - last) >= WATER_COOLDOWN_MS;

}

export function msUntilNextWater(gift){

  if(gift.waterings.length === 0) return 0;

  const last = gift.waterings[gift.waterings.length-1];

  return Math.max(0, WATER_COOLDOWN_MS - (Date.now() - last));

}

export function formatCountdown(ms){

  const total = Math.ceil(ms/1000);

  const h = Math.floor(total/3600);

  const m = Math.floor((total%3600)/60);

  const s = total%60;

  return `${h}h ${m}m ${s}s`;

}

/* ---------- misc helpers ---------- */

export function qs(name){ return new URLSearchParams(location.search).get(name); }

export function todayStr(offsetDays){

  const d = new Date(); d.setDate(d.getDate() + (offsetDays||0));

  return d.toISOString().slice(0,10);

}

export function getMyHandle(){ return localStorage.getItem('petalpost.handle') || ''; }

export function setMyHandle(h){ if(h) localStorage.setItem('petalpost.handle', h); }

export async function loadGift(giftId){

  const snap = await getDoc(doc(db, 'gifts', giftId));

  if(!snap.exists()) return null;

  const data = snap.data();

  // migrate any legacy calendar-date records to the timestamp model

  if(!Array.isArray(data.waterings)){

    data.waterings = (data.wateredDates||[]).map((_,i)=>Date.now() - (data.wateredDates.length-1-i)*WATER_COOLDOWN_MS);

  }

  return { id: snap.id, ...data };

}

export async function saveGift(gift){ await setDoc(doc(db,'gifts',gift.id), gift); }

export async function pushNotification(senderHandle, giftId, text){

  try{

    const ref = doc(db, 'notifications', senderHandle);

    const snap = await getDoc(ref);

    const list = snap.exists() ? (snap.data().items||[]) : [];

    list.push({giftId, text, at: Date.now()});

    await setDoc(ref, {items:list});

  }catch(e){ /* non-fatal */ }

}

export async function addToGarden(gift){

  if(!gift.recipientHandle) return;

  const ref = doc(db, 'gardens', gift.recipientHandle);

  const snap = await getDoc(ref);

  const list = snap.exists() ? (snap.data().flowers||[]) : [];

  if(!list.some(item=>item.giftId===gift.id)){

    list.push({ giftId:gift.id, flowerId:gift.flowerId, senderHandle:gift.senderHandle, note:gift.note, bloomedAt:Date.now() });

  }

  await setDoc(ref, {flowers:list});

}

/* ============================================================

   Shared drifting-butterfly background (every page except garden.html)

   ============================================================ */

function buildWorld(){

  const world = document.getElementById('world');

  if(!world) return;

  let html = '<div class="sun"></div>';

  for(let i=0;i<3;i++){

    html += `<div class="puff-cloud" style="top:${8+i*9}%; left:${-10+i*5}%; animation-duration:${64+i*18}s; animation-delay:${-i*20}s;">

      <span style="width:${40+i*8}px; height:${18+i*3}px; border-radius:20px;"></span>

      <span style="width:${20+i*4}px; height:${20+i*4}px; top:-10px; left:8px;"></span>

      <span style="width:${16+i*3}px; height:${16+i*3}px; top:-6px; left:${26+i*4}px;"></span>

    </div>`;

  }

  const doodles = ['🌸','🌿','✨','🌼'];

  for(let i=0;i<10;i++){

    html += `<div class="doodle" style="top:${Math.random()*80+5}%; left:${Math.random()*96}%; animation:bob ${5+Math.random()*4}s ease-in-out infinite; animation-delay:${-Math.random()*4}s;">${doodles[i%doodles.length]}</div>`;

  }

  html += '<div class="hill back"></div><div class="hill front"></div>';

  world.innerHTML = html;

  initDriftingButterflies();

}

const GARDEN_ASSETS = {
  tree: 'assets/garden/tree-new.png',
  butterflies: [
    'assets/garden/butterfly-orange.png',
    'assets/garden/butterfly-red.png',
    'assets/garden/butterfly-green.png',
    'assets/garden/butterfly-blue.png'
  ],
  birds: {
    red: { flying:'assets/garden/bird-flying-red-sprite.png', perched:'assets/garden/bird-perched-red.png' },
    green:{ flying:'assets/garden/bird-flying-green-sprite.png', perched:'assets/garden/bird-perched-green.png' }
  }
};
let gardenStyleInstalled=false;
function installGardenGraphicStyle(){
  if(gardenStyleInstalled) return; gardenStyleInstalled=true;
  const style=document.createElement('style');
  style.textContent=`
    .butterfly,.g-driftbutterfly,.g-perch-butterfly{width:clamp(30px,4.8vw,68px)!important;height:auto!important;aspect-ratio:1.34/1;transform-origin:50% 45%!important;z-index:30}
    .butterfly img,.g-driftbutterfly img,.g-perch-butterfly img{display:block;width:100%;height:100%;object-fit:contain;transform-origin:50% 12%;filter:drop-shadow(0 2px 2px rgba(42,58,38,.16))}
    .butterfly img,.g-driftbutterfly img{animation:gardenButterflyWings .34s ease-in-out infinite alternate}
    .g-perch-butterfly img{animation:gardenButterflyPerched 1.8s ease-in-out infinite}
    @keyframes gardenButterflyWings{from{transform:perspective(260px) rotateX(0deg) rotateZ(-3deg)}to{transform:perspective(260px) rotateX(20deg) rotateZ(3deg)}}
    @keyframes gardenButterflyPerched{0%,100%{transform:perspective(260px) rotateX(5deg) rotateZ(-4deg)}50%{transform:perspective(260px) rotateX(16deg) rotateZ(2deg)}}
    .g-tree{z-index:9;overflow:visible!important;transform-origin:50% 96%!important}
    .tree-art-wrap{position:absolute;inset:0;transform-origin:50% 96%;animation:gardenTreeSway var(--tree-sway,6s) ease-in-out infinite}
    .tree-art{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;object-position:center bottom;filter:saturate(.98) contrast(1.02)}
    .tree-ground{position:absolute;left:14%;right:14%;bottom:-1.5%;height:9%;border-radius:50%;background:radial-gradient(ellipse at center,rgba(75,92,48,.26),rgba(75,92,48,0) 72%);z-index:-1}
    @keyframes gardenTreeSway{0%,100%{transform:rotate(-1.2deg)}50%{transform:rotate(1.6deg)}}
    .g-realbird{width:56px!important;height:52px!important;z-index:34;transform-origin:50% 86%}
    .bird-art{display:block;width:100%;height:100%;background-repeat:no-repeat;background-position:0 0;background-size:400% 100%;background-image:var(--bird-flying);filter:drop-shadow(0 2px 2px rgba(42,58,38,.18))}
    .g-realbird.perched .bird-art{background-image:var(--bird-perched);background-size:contain;background-position:center bottom;animation:gardenBirdPerch .9s ease-in-out infinite alternate}
    .g-realbird.flying .bird-art{animation:none}
    @keyframes gardenBirdPerch{from{transform:translateY(0) rotate(-1deg)}to{transform:translateY(-1px) rotate(1deg)}}
    .g-sun,.sun{background:radial-gradient(circle at 42% 38%,#fff3b0 0 22%,#e6a94f 23% 56%,rgba(230,169,79,0) 58%)!important;box-shadow:none!important}
    .g-cloud-wrap,.puff-cloud{filter:drop-shadow(0 3px 2px rgba(60,84,55,.10))}
    .g-cloud-wrap .cloud-svg,.puff-cloud span{background:linear-gradient(145deg,#f5f0d7,#dce9d0)!important}
    button,.ghost-btn,.share-link,input,textarea,select{border-radius:14px!important;border-color:rgba(82,100,61,.28)!important;font-family:inherit}
    button,.ghost-btn{background:linear-gradient(145deg,#f7efd6,#dce9cf)!important;color:#34452f!important;box-shadow:0 4px 0 rgba(92,106,66,.16),0 8px 18px rgba(56,76,48,.10)!important;transition:transform .18s ease,box-shadow .18s ease,filter .18s ease}
    button:hover,.ghost-btn:hover{transform:translateY(-2px);filter:saturate(1.05)}
    button:active,.ghost-btn:active{transform:translateY(1px);box-shadow:0 2px 0 rgba(92,106,66,.15)!important}
    .page,body{--ink:#30402e;--leaf:#4e9c57;--leaf-dark:#315d3b}
  `;
  document.head.appendChild(style);
}

const PALETTE = [
  {asset:GARDEN_ASSETS.butterflies[0],name:'orange'},
  {asset:GARDEN_ASSETS.butterflies[1],name:'red'},
  {asset:GARDEN_ASSETS.butterflies[2],name:'green'},
  {asset:GARDEN_ASSETS.butterflies[3],name:'blue'}
];
export function butterflySvg(c){ return `<img class="butterfly-art" src="${c.asset||GARDEN_ASSETS.butterflies[0]}" alt="" draggable="false">`; }

function initDriftingButterflies(){
  const COUNT=8,DODGE_RADIUS=130,SEPARATION=95; const butterflies=[];
  let cursor={x:-9999,y:-9999,active:false};
  class Butterfly{
    constructor(){this.el=document.createElement('div');this.color=PALETTE[Math.floor(Math.random()*PALETTE.length)];this.faceFlip=Math.random()<.5?-1:1;this.el.className='butterfly';this.el.innerHTML=butterflySvg(this.color);document.body.appendChild(this.el);this.vx=0;this.vy=0;this.startled=false;this.tiltPhase=rand(0,Math.PI*2);this.tiltSpeed=rand(650,980);this.life=rand(520,980);this.spawnFromEdge();this.pickTarget();}
    spawnFromEdge(){const w=innerWidth,h=innerHeight,side=Math.random()<.5?0:1;this.x=side===0?-45:w+45;this.y=rand(h*.12,h*.88);this.faceFlip=side===0?1:-1;}
    pickTarget(){this.tx=rand(innerWidth*.08,innerWidth*.92);this.ty=rand(innerHeight*.12,innerHeight*.88);}
    update(){
      this.life--; if(this.life<=0)this.startLeaving();
      const dx=this.tx-this.x,dy=this.ty-this.y,d=Math.hypot(dx,dy)||1; this.vx+=(dx/d)*.019;this.vy+=(dy/d)*.019;
      for(const o of butterflies){if(o===this)continue;const sx=this.x-o.x,sy=this.y-o.y,sd=Math.hypot(sx,sy);if(sd>0&&sd<SEPARATION){const p=(1-sd/SEPARATION)*.035;this.vx+=(sx/sd)*p;this.vy+=(sy/sd)*p;}}
      if(cursor.active){const sx=this.x-cursor.x,sy=this.y-cursor.y,sd=Math.hypot(sx,sy);if(sd<DODGE_RADIUS){const p=(1-sd/DODGE_RADIUS)*1.05;this.vx+=(sd>.001?sx/sd:1)*p;this.vy+=(sd>.001?sy/sd:0)*p;this.startled=true;}}
      const max=this.startled?2.4:.46,sp=Math.hypot(this.vx,this.vy);if(sp>max){this.vx=this.vx/sp*max;this.vy=this.vy/sp*max;}this.vx*=this.startled?.91:.955;this.vy*=this.startled?.91:.955;
      if(!this.startled&&d<30)this.pickTarget();if(this.startled&&sp<.55){this.startled=false;this.pickTarget();}
      this.x+=this.vx;this.y+=this.vy;if(Math.abs(this.vx)>.03)this.faceFlip=this.vx>0?1:-1;
      const bob=Math.sin(Date.now()/430+this.x*.01)*2.5,wobble=Math.sin(Date.now()/this.tiltSpeed+this.tiltPhase)*7,bank=Math.max(-18,Math.min(18,this.vx*12*this.faceFlip));
      this.el.classList.toggle('fleeing',this.startled);this.el.style.transform=`translate(${this.x}px,${this.y+bob}px) translate(-50%,-50%) rotate(${wobble+bank-4}deg) scaleX(${this.faceFlip})`;
      if(this.x<-90||this.x>innerWidth+90||this.y<-90||this.y>innerHeight+90){this.spawnFromEdge();this.life=rand(560,980);this.pickTarget();}
    }
    startLeaving(){this.tx=this.x<innerWidth/2?innerWidth+90:-90;this.ty=Math.max(-80,Math.min(innerHeight+80,this.y+rand(-120,120)));}
  }
  function loop(){butterflies.forEach(b=>b.update());requestAnimationFrame(loop);}
  for(let i=0;i<COUNT;i++)butterflies.push(new Butterfly());requestAnimationFrame(loop);
  addEventListener('mousemove',e=>{cursor.x=e.clientX;cursor.y=e.clientY;cursor.active=true});addEventListener('mouseleave',()=>cursor.active=false);
  addEventListener('touchstart',e=>{const t=e.touches[0];if(!t)return;cursor.x=t.clientX;cursor.y=t.clientY;cursor.active=true;setTimeout(()=>cursor.active=false,500)},{passive:true});
}

const TREE_PALETTE=[{name:'supplied-tree'}];
function treeSvg(pal,swayDur,swayDelay){return `<div class="tree-art-wrap" style="--tree-sway:${swayDur}s;animation-delay:${swayDelay}s;"><img class="tree-art" src="${GARDEN_ASSETS.tree}" alt="garden tree" draggable="false"><span class="tree-ground" aria-hidden="true"></span></div>`;}
function cloudSvg(){return `<svg viewBox="0 0 150 58" class="cloud-svg" overflow="visible" aria-hidden="true"><path d="M21 45C5 45 3 27 17 21C20 9 41 7 48 19C62 8 87 12 88 28C108 24 121 43 104 45Z" fill="#e8efdc" stroke="#486044" stroke-opacity=".14" stroke-width="1.5"/><path d="M31 36C19 34 20 24 29 22C34 14 45 16 49 24C60 17 72 22 72 31C83 29 90 37 85 40H32Z" fill="#f7f3dd" opacity=".78"/></svg>`;}
const BIRD_PALETTE=[{key:'red',light:'#ef9a7f',main:'#c9574f',wing:'#a8423d',belly:'#f9ead9',beak:'#8a5a35'},{key:'green',light:'#a9d18d',main:'#5f9d5c',wing:'#477f4d',belly:'#eef4d9',beak:'#8a5a35'}];
function birdSvg(c){const a=GARDEN_ASSETS.birds[c.key]||GARDEN_ASSETS.birds.green;return `<span class="bird-art" style="--bird-flying:url('${a.flying}');--bird-perched:url('${a.perched}');" aria-hidden="true"></span>`;}

function beeSvg(){

  const uid = 'be' + (uidSeq++);

  return `<svg viewBox="0 0 34 24" overflow="visible">

    <defs><linearGradient id="${uid}" x1="0" y1="0" x2="0" y2="1">

      <stop offset="0%" stop-color="#FBE07A"/><stop offset="100%" stop-color="#E8A93B"/>

    </linearGradient></defs>

    <g class="bee-wing bee-wing-l" style="transform-origin:15px 9px;">

      <ellipse cx="9" cy="5" rx="8" ry="4.6" fill="#F3FBFF" opacity="0.6" stroke="var(--ink)" stroke-width="0.4" stroke-opacity="0.22"/>

    </g>

    <g class="bee-wing bee-wing-r" style="transform-origin:19px 9px;">

      <ellipse cx="25" cy="5" rx="8" ry="4.6" fill="#F3FBFF" opacity="0.6" stroke="var(--ink)" stroke-width="0.4" stroke-opacity="0.22"/>

    </g>

    <ellipse cx="17" cy="14" rx="11" ry="7.6" fill="url(#${uid})" stroke="var(--ink)" stroke-width="0.6" stroke-opacity="0.32"/>

    <path d="M8,10 L9.5,18 M13,9 L15,19 M19,9 L21,19 M24,10 L25,17"

      stroke="var(--ink)" stroke-width="2.1" stroke-linecap="round" opacity="0.78"/>

    <circle cx="6.5" cy="12" r="3.4" fill="url(#${uid})" stroke="var(--ink)" stroke-width="0.6" stroke-opacity="0.32"/>

    <path d="M4,9 C2,6 1,6 0.5,4" stroke="var(--ink)" stroke-width="0.7" fill="none" stroke-linecap="round"/>

  </svg>`;

}

function buildGrassSvg(){let blades='',total=72;for(let i=0;i<total;i++){const x=(i/(total-1))*1000+rand(-5,5),h=rand(28,66),w=rand(4,9),tilt=rand(-9,9),dark=Math.random()<.48,dur=rand(2.8,4.4).toFixed(2),delay=(-rand(0,4)).toFixed(2);blades+=`<g class="blade" style="transform-origin:${x.toFixed(1)}px 90px;animation-duration:${dur}s;animation-delay:${delay}s;"><path d="M${x.toFixed(1)},90 C${(x-w).toFixed(1)},${(90-h*.55).toFixed(1)} ${(x+tilt).toFixed(1)},${(90-h*.85).toFixed(1)} ${(x+tilt*1.35).toFixed(1)},${(90-h).toFixed(1)} C${(x+tilt*.6).toFixed(1)},${(90-h*.55).toFixed(1)} ${(x+w).toFixed(1)},${(90-h*.25).toFixed(1)} ${x.toFixed(1)},90Z" fill="${dark?'#315d3b':'#4e9c57'}" opacity="${dark?.9:.82}"/></g>`;}return `<svg class="grass-svg" viewBox="0 0 1000 90" preserveAspectRatio="none" overflow="visible">${blades}</svg>`;}

const TREE_DEFS=[{leftPct:2,widthPx:255,heightPx:365,palette:0},{leftPct:61,widthPx:215,heightPx:310,palette:0}];
const TREE_PERCHES=[{left:'28%',top:'35%'},{left:'69%',top:'35%'},{left:'24%',top:'49%'},{left:'77%',top:'50%'}];
const TREE_DEFS_FLAT=[];TREE_DEFS.forEach((t,i)=>TREE_PERCHES.forEach(p=>TREE_DEFS_FLAT.push({treeIdx:i,...p})));

/* ---------- tiny synthesized birdsong (no external audio file needed) ---------- */

let _audioCtx = null;

function getAudioCtx(){

  if(!_audioCtx){

    try{ _audioCtx = new (window\.AudioContext||window\.webkitAudioContext)(); }

    catch(e){ _audioCtx = null; }

  }

  if(_audioCtx && _audioCtx.state === 'suspended') _audioCtx.resume().catch(()=>{});

  return _audioCtx;

}

function chirp(ctx, startTime, freqFrom, freqTo, dur, peak){

  const osc = ctx.createOscillator(), gain = ctx.createGain();

  osc.type = 'sine';

  osc.frequency.setValueAtTime(freqFrom, startTime);

  osc.frequency.exponentialRampToValueAtTime(freqTo, startTime + dur*0.6);

  osc.frequency.exponentialRampToValueAtTime(Math.max(200,freqFrom*0.9), startTime + dur);

  gain.gain.setValueAtTime(0.0001, startTime);

  gain.gain.exponentialRampToValueAtTime(peak, startTime + dur*0.15);

  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + dur);

  osc.connect(gain); gain.connect(ctx.destination);

  osc.start(startTime); osc.stop(startTime + dur + 0.02);

}

function playBirdsong(){

  const ctx = getAudioCtx();

  if(!ctx) return;

  const notes = [[2400,3200,0.09],[2650,3450,0.07],[2200,3000,0.1],[2750,3600,0.06]];

  let t = ctx.currentTime;

  notes.forEach(n=>{ chirp(ctx, t, n[0], n[1], n[2], 0.045); t += n[2] + rand(0.02,0.06); });

}

/* Birds drift in from the left/right edges at the same slow, gliding

   pace as the bees, land on a bare branch tip, sit a while (occasionally

   singing quietly), then either wing over to another branch or drift

   back out of the page — same as the bees do. Clicking a perched bird

   makes it rustle its feathers and burst into song (with audio). */

class Bird{

  constructor(scene, idOffset, onDone){

    this.scene = scene;

    this.onDone = onDone;

    this.color = BIRD_PALETTE[idOffset % BIRD_PALETTE.length];

    this.el = document.createElement('div');

    this.el.className = 'g-realbird flying';

    this.el.innerHTML = birdSvg(this.color);
    this.frame=0; this.nextFrameAt=0;

    scene.appendChild(this.el);

    const w = scene.clientWidth||320, h = scene.clientHeight||600;

    const edge = Math.random()<0.5 ? 0 : 1;

    this.x = edge===0 ? -40 : w+40;

    this.y = rand(h*0.1, h*0.5);

    this.vx = 0; this.vy = 0;

    this.state = 'flying';

    this.facing = edge===0 ? 1 : -1;

    this.el.addEventListener('click', (e)=>{ e.stopPropagation(); this.onClick(); });

    this.pickPerchTarget();

    this.update = this.update.bind(this);

    this._raf = requestAnimationFrame(this.update);

  }

  pickPerchTarget(){ this.target = TREE_DEFS_FLAT[Math.floor(Math.random()*TREE_DEFS_FLAT.length)]; }

  targetPos(){

    const treeEl = document.getElementById('tree'+this.target.treeIdx);

    if(!treeEl) return { x:this.x, y:this.y };

    const sceneRect = this.scene.getBoundingClientRect(), tr = treeEl.getBoundingClientRect();

    return {

      x: tr.left - sceneRect.left + tr.width * (parseFloat(this.target.left)/100),

      y: tr.top - sceneRect.top + tr.height * (parseFloat(this.target.top)/100) - 38

    };

  }

  update(){

    const w = this.scene.clientWidth||320, h = this.scene.clientHeight||600;

    if(this.state==='perched'){

      this.perchTimer--;

      if(this.perchTimer>0){ this._raf = requestAnimationFrame(this.update); return; }

      if(Math.random()<0.4){ this.startLeaving(); }

      else { this.state='flying'; this.el.classList.add('flying'); this.el.classList.remove('perched'); this.pickPerchTarget(); }

    }

    let tx,ty,maxSpeed;

    if(this.state==='leaving'){ tx=this.exitX; ty=this.exitY; maxSpeed=1.0; }

    else { const p=this.targetPos(); tx=p.x; ty=p.y; maxSpeed=0.72; }

    const dx=tx-this.x, dy=ty-this.y, d=Math.hypot(dx,dy)||1;

    this.vx += (dx/d)*0.032; this.vy += (dy/d)*0.032;

    const sp = Math.hypot(this.vx,this.vy);

    if(sp>maxSpeed){ this.vx=this.vx/sp*maxSpeed; this.vy=this.vy/sp*maxSpeed; }

    this.vx *= 0.95; this.vy *= 0.95;

    this.x += this.vx; this.y += this.vy;

    if(Math.abs(this.vx)>0.04) this.facing = this.vx>0 ? 1 : -1;

    const bob = Math.sin(Date.now()/280)*1.6;

    this.el.style.transform = `translate(${this.x.toFixed(1)}px, ${(this.y+bob).toFixed(1)}px) scaleX(${this.facing})`;

    if(this.state==='leaving'){

      if(this.x<-60 || this.x>w+60 || this.y<-60){

        this.el.remove(); cancelAnimationFrame(this._raf);

        if(this.onDone) this.onDone();

        return;

      }

    } else if(d<12){ this.land(); return; }

    this._raf = requestAnimationFrame(this.update);

  }

  land(){

    this.state = 'perched'; this.vx=0; this.vy=0;

    this.el.classList.remove('flying'); this.el.classList.add('perched');

    this.perchTimer = Math.floor(rand(260,520));

    this._raf = requestAnimationFrame(this.update);

    this.maybeIdleSing();

  }

  maybeIdleSing(){

    clearTimeout(this._singT);

    this._singT = setTimeout(()=>{

      if(this.state!=='perched') return;

      if(Math.random()<0.5) this.sing(false);

      this.maybeIdleSing();

    }, rand(3500,7500));

  }

  startLeaving(){

    const w = this.scene.clientWidth||320;

    this.state = 'leaving';

    this.el.classList.remove('perched'); this.el.classList.add('flying');

    const edge = Math.random()<0.5 ? 0 : 1;

    this.exitX = edge===0 ? -60 : w+60;

    this.exitY = this.y - rand(0,60);

  }

  onClick(){

    if(this.state!=='perched') return;

    this.el.classList.add('preening');

    this.sing(true);

    setTimeout(()=>this.el.classList.remove('preening'), 1100);

    this.perchTimer = Math.max(this.perchTimer, 200);

  }

  sing(loud){

    this.el.classList.add('singing');

    if(loud) playBirdsong();

    const n = loud ? 3 : 1;

    for(let i=0;i<n;i++){

      setTimeout(()=>{

        const note = document.createElement('div');

        note.className = 'g-note';

        note.textContent = ['♪','♫','♪'][Math.floor(Math.random()*3)];

        note.style.left = rand(6,30) + 'px';

        note.style.top = '-4px';

        this.el.appendChild(note);

        setTimeout(()=>note.remove(), 3200);

      }, i*240);

    }

    setTimeout(()=>this.el.classList.remove('singing'), 900);

  }

}

function spawnBirds(scene){

  const BIRD_MAX = 3;

  let active = 0, seq = 0;

  function launch(){

    if(active >= BIRD_MAX){ setTimeout(launch, rand(2000,5000)); return; }

    active++;

    new Bird(scene, seq++, ()=>{ active--; setTimeout(launch, rand(2500,6000)); });

    setTimeout(launch, rand(4000,9000));

  }

  launch();

}

class Bee{

  constructor(scene, onDone){

    this.scene = scene;

    this.onDone = onDone;

    this.el = document.createElement('div');

    this.el.className = 'g-realbee';

    this.el.innerHTML = beeSvg();

    scene.appendChild(this.el);

    const w = scene.clientWidth || 320, h = scene.clientHeight || 420;

    const edge = Math.floor(Math.random()*3);

    if(edge===0){ this.x=-30; this.y=rand(h*0.35,h*0.78); }

    else if(edge===1){ this.x=w+30; this.y=rand(h*0.35,h*0.78); }

    else { this.x=rand(0,w); this.y=-20; }

    this.vx=0; this.vy=0;

    this.age=0;

    this.life=rand(220,380);

    this.leaving=false;

    this.pickTarget(w,h);

    this.update = this.update.bind(this);

    this._raf = requestAnimationFrame(this.update);

  }

  pickTarget(w,h){

    this.tx = rand(w*0.15, w*0.85);

    this.ty = rand(h*0.42, h*0.8);

  }

  update(){

    const w = this.scene.clientWidth || 320, h = this.scene.clientHeight || 420;

    this.age++;

    if(this.age > this.life && !this.leaving){

      this.leaving = true;

      const edge = Math.floor(Math.random()*3);

      if(edge===0) this.tx = -40; else if(edge===1) this.tx = w+40; else this.ty = -30;

    }

    const dx=this.tx-this.x, dy=this.ty-this.y, d=Math.hypot(dx,dy)||1;

    this.vx += (dx/d)*0.03; this.vy += (dy/d)*0.03;

    const sp = Math.hypot(this.vx,this.vy), max = this.leaving ? 1.1 : 0.65;

    if(sp>max){ this.vx = this.vx/sp*max; this.vy = this.vy/sp*max; }

    this.vx *= 0.95; this.vy *= 0.95;

    this.x += this.vx; this.y += this.vy;

    const wob = Math.sin(Date.now()/150 + this.x)*3;

    // the art faces left by default (head/antenna are on the left side),

    // so flip it only when actually heading right, and tilt the nose

    // up/down a little to match the vertical component of travel too

    const facing = this.vx > 0.02 ? -1 : 1;

    const pitch = Math.max(-22, Math.min(22, this.vy*46));

    this.el.style.transform = `translate(${this.x.toFixed(1)}px, ${(this.y+wob).toFixed(1)}px) rotate(${pitch.toFixed(1)}deg) scaleX(${facing})`;

    if(!this.leaving && d<14 && Math.random()<0.02) this.pickTarget(w,h);

    if(this.leaving && (this.x < -50 || this.x > w+50 || this.y < -50)){

      this.el.remove();

      cancelAnimationFrame(this._raf);

      if(this.onDone) this.onDone();

      return;

    }

    this._raf = requestAnimationFrame(this.update);

  }

}

function spawnBees(scene){

  const BEE_MAX = 2;

  let active = 0;

  function launch(){

    if(active >= BEE_MAX){ setTimeout(launch, rand(2000,4000)); return; }

    active++;

    new Bee(scene, ()=>{ active--; setTimeout(launch, rand(2500,6000)); });

    setTimeout(launch, rand(3500,7000));

  }

  launch();

}

/* Garden butterflies — the same drifting-in-and-out cast that floats

   over every other page, brought into the garden. They wander in from

   an edge at the bees' same gentle pace, land on a flower for a few

   seconds, then move to another flower or drift back out — automatically,

   or right away if clicked while perched. */

class GardenButterfly{

  constructor(scene, onDone){

    this.scene = scene;

    this.onDone = onDone;

    this.color = PALETTE[Math.floor(Math.random()*PALETTE.length)];

    this.el = document.createElement('div');

    this.el.className = 'g-driftbutterfly';

    this.el.innerHTML = butterflySvg(this.color);

    scene.appendChild(this.el);

    this.el.addEventListener('click', (e)=>{ e.stopPropagation(); this.onClick(); });

    const w = scene.clientWidth||320, h = scene.clientHeight||600;

    const edge = Math.random()<0.5 ? 0 : 1;

    this.x = edge===0 ? -30 : w+30;

    this.y = rand(h*0.55, h*0.85);

    this.vx = 0; this.vy = 0;

    this.state = 'flying';

    this.facing = edge===0 ? 1 : -1;

    this.pickTarget(w,h);

    this.update = this.update.bind(this);

    this._raf = requestAnimationFrame(this.update);

  }

  pickTarget(w,h){

    const flowers = Array.from(this.scene.querySelectorAll('.planted'));

    if(flowers.length && Math.random()<0.85){

      const f = flowers[Math.floor(Math.random()*flowers.length)];

      const sceneRect = this.scene.getBoundingClientRect(), fr = f.getBoundingClientRect();

      this.tx = fr.left - sceneRect.left + fr.width/2;

      this.ty = fr.top - sceneRect.top + 6;

    } else {

      this.tx = rand(w*0.15, w*0.85);

      this.ty = rand(h*0.45, h*0.8);

    }

  }

  update(){

    const w = this.scene.clientWidth||320, h = this.scene.clientHeight||600;

    if(this.state==='perched'){

      this.perchTimer--;

      if(this.perchTimer>0){ this._raf = requestAnimationFrame(this.update); return; }

      if(Math.random()<0.45){ this.startLeaving(); }

      else { this.state='flying'; this.el.classList.remove('perched'); this.pickTarget(w,h); }

    }

    let tx,ty,maxSpeed;

    if(this.state==='leaving'){ tx=this.exitX; ty=this.exitY; maxSpeed=1.0; }

    else { tx=this.tx; ty=this.ty; maxSpeed=0.66; }

    const dx=tx-this.x, dy=ty-this.y, d=Math.hypot(dx,dy)||1;

    this.vx += (dx/d)*0.03; this.vy += (dy/d)*0.03;

    const sp = Math.hypot(this.vx,this.vy);

    if(sp>maxSpeed){ this.vx=this.vx/sp*maxSpeed; this.vy=this.vy/sp*maxSpeed; }

    this.vx *= 0.95; this.vy *= 0.95;

    this.x += this.vx; this.y += this.vy;

    if(Math.abs(this.vx)>0.03) this.facing = this.vx>0 ? 1 : -1;

    const wob = Math.sin(Date.now()/260 + this.x*0.02)*3;

    this.el.style.transform = `translate(${this.x.toFixed(1)}px, ${(this.y+wob).toFixed(1)}px) scaleX(${this.facing})`;

    if(this.state==='leaving'){

      if(this.x<-60 || this.x>w+60 || this.y<-60){

        this.el.remove(); cancelAnimationFrame(this._raf);

        if(this.onDone) this.onDone();

        return;

      }

    } else if(d<10){ this.land(); return; }

    this._raf = requestAnimationFrame(this.update);

  }

  land(){

    this.state = 'perched'; this.vx=0; this.vy=0;

    this.el.classList.add('perched');

    this.perchTimer = Math.floor(rand(180,340));

    this._raf = requestAnimationFrame(this.update);

  }

  startLeaving(){

    const w = this.scene.clientWidth||320;

    this.state = 'leaving';

    this.el.classList.remove('perched');

    const edge = Math.random()<0.5 ? 0 : 1;

    this.exitX = edge===0 ? -60 : w+60;

    this.exitY = this.y - rand(-30,60);

  }

  onClick(){ if(this.state==='perched') this.startLeaving(); }

}

function spawnGardenButterflies(scene){

  const BFLY_MAX = 2;

  let active = 0;

  function launch(){

    if(active >= BFLY_MAX){ setTimeout(launch, rand(2500,5000)); return; }

    active++;

    new GardenButterfly(scene, ()=>{ active--; setTimeout(launch, rand(3000,7000)); });

    setTimeout(launch, rand(4500,9000));

  }

  launch();

}

/* ============================================================

   Page fade-in + init dispatch

   ============================================================ */

function fadeInPage(){

  const el = document.querySelector('.page');

  if(!el) return;

  requestAnimationFrame(()=>el.classList.add('page-fade'));

}

document.addEventListener('DOMContentLoaded', () => {

  installGardenGraphicStyle();

  const page = document.body.dataset.page;

  if(page !== 'garden') buildWorld();

  fadeInPage();

  const init = PAGE_INIT[page];

  if(init) init();

});

const PAGE_INIT = {

  landing(){ /* static */ },

  send: initSend,

  gardenEntry: initGardenEntry,

  receive: initReceive,

  vase: initVase,

  garden: initGarden,

  notifications: initNotifications,

  bloom: initBloom,

};

/* ---------------- SEND ---------------- */

function initSend(){

  const grid = document.getElementById('flowerGrid');

  const handleInput = document.getElementById('senderHandle');

  handleInput.value = getMyHandle();

  let selected = null;

  function buildGrid(){

    grid.innerHTML = '';

    FLOWERS.forEach(f=>{

      const d = document.createElement('div');

      d.className = 'flower-opt can-perch' + (selected===f.id ? ' selected':'');

      const thumb = imgOrFallback(flowerImg(f,'icon'), f.name, `<span class="fem">${f.emoji}</span>`, 'fthumb');

      d.appendChild(thumb);

      d.insertAdjacentHTML('beforeend', `<span class="fname">${f.name}</span><span class="fdivider"></span><span class="fmean">${f.meaning}</span>`);

      d.onclick = ()=>{ selected = f.id; buildGrid(); };

      grid.appendChild(d);

    });

  }

  buildGrid();

  document.getElementById('sendBtn').onclick = async () => {

    const sender = handleInput.value.trim().toLowerCase();

    const note = document.getElementById('noteInput').value.trim();

    const errEl = document.getElementById('sendErr');

    errEl.style.display = 'none';

    if(!sender || !selected){

      errEl.textContent = 'Add your handle and pick a flower first.';

      errEl.style.display = 'block';

      return;

    }

    setMyHandle(sender);

    const giftId = 'g_' + Math.random().toString(36).slice(2,10);

    const gift = {

      id: giftId, senderHandle: sender, recipientHandle: null, flowerId: selected,

      note, createdAt: Date.now(), daysNeeded: DAYS_NEEDED, waterings: [],

      bloomed: false, lastVisitNotifiedDate: null

    };

    try{

      await saveGift(gift);

      const link = location.origin + location.pathname.replace(/send**\\.**html$/, '') + 'receive.html?gift=' + giftId;

      const box = document.getElementById('linkBox');

      box.style.display = 'block';

      box.innerHTML = `Planted! Here's the working link — send it to whoever it's for, any way you like:<br>

        <a class="share-link" href="${link}" target="_blank">${link}</a>

        <div class="link-row">

          <button class="ghost-btn" id="copyLinkBtn">copy link</button>

          <a class="ghost-btn" href="${link}" target="_blank">open it</a>

        </div>`;

      document.getElementById('copyLinkBtn').onclick = (e)=>{

        const btn = e.target;

        const done = ()=>{ const old=btn.textContent; btn.textContent='copied!'; setTimeout(()=>btn.textContent=old,1400); };

        if(navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(link).then(done).catch(done);

        else done();

      };

    }catch(e){

      errEl.textContent = "Couldn't plant that flower — try again.";

      errEl.style.display = 'block';

    }

  };

}

/* ---------------- GARDEN ENTRY ---------------- */

function initGardenEntry(){

  const input = document.getElementById('gardenHandleInput');

  input.value = getMyHandle();

  document.getElementById('openGardenBtn').onclick = () => {

    const handle = input.value.trim().toLowerCase();

    if(!handle) return;

    setMyHandle(handle);

    location.href = 'garden.html?handle=' + encodeURIComponent(handle);

  };

}

/* ---------------- RECEIVE ---------------- */

async function initReceive(){

  const giftId = qs('gift');

  if(!giftId){ document.getElementById('receiveFromPill').textContent = 'This link is missing its flower.'; return; }

  const gift = await loadGift(giftId);

  if(!gift){ document.getElementById('receiveFromPill').textContent = "We couldn't find that flower."; return; }

  const today = todayStr(0);

  if(gift.lastVisitNotifiedDate !== today){

    gift.lastVisitNotifiedDate = today;

    await saveGift(gift);

    await pushNotification(gift.senderHandle, gift.id, `👀 someone opened the flower you sent`);

  }

  document.getElementById('receiveFromPill').textContent = 'from @' + gift.senderHandle;

  if(gift.waterings.length > 0){

    location.href = 'vase.html?gift=' + giftId;

    return;

  }

  document.getElementById('openBtn').onclick = () => { location.href = 'vase.html?gift=' + giftId; };

}

/* ---------------- VASE ---------------- */

async function initVase(){

  const giftId = qs('gift');

  if(!giftId){ document.getElementById('vaseTitle').textContent = 'This link is missing its flower.'; return; }

  let gift = await loadGift(giftId);

  if(!gift){ document.getElementById('vaseTitle').textContent = "We couldn't find that flower."; return; }

  if(gift.bloomed){ location.href = 'bloom.html?gift=' + giftId; return; }

  const flower = flowerById(gift.flowerId);

  const stack = document.getElementById('vaseStack');

  const stemEl = document.getElementById('vaseStem');

  const stageLabel = document.getElementById('stageLabel');

  const dayDots = document.getElementById('dayDots');

  const waterBtn = document.getElementById('waterBtn');

  const countdownEl = document.getElementById('waitCountdown');

  const demoControls = document.getElementById('demoControls');

  const skipDayBtn = document.getElementById('skipDayBtn');

  const vaseTitle = document.getElementById('vaseTitle');

  const vaseFrom = document.getElementById('vaseFrom');

  const vaseWho = document.getElementById('vaseWho');

  const vasePot = document.getElementById('vasePot');

  // try to load a real vase image; fall back to the illustrated pot if absent

  const potImg = new Image();

  potImg.onload = () => vasePot.classList.add('has-image');

  potImg.onerror = () => vasePot.classList.remove('has-image');

  potImg.src = 'assets/vase.png';

  if(vasePot.querySelector('img')){ vasePot.querySelector('img').src = 'assets/vase.png'; }

  vaseWho.textContent = gift.recipientHandle ? '@' + gift.recipientHandle : 'this link is your vase';

  vaseFrom.textContent = 'from @' + gift.senderHandle + ' — a mystery until it blooms';

  const STAGE_IMG_KEYS = ['icon','day1','bud','opens'];

  const STAGE_HEIGHTS = [0, 44, 78, 96];

  const labels = ['a seed, tucked in soil','a tiny seedling, just peeking through','a bud, waiting to open','ready to bloom'];

  function render(){

    const stage = stageForWaterings(gift.waterings.length);

    stageLabel.textContent = labels[stage];

    stemEl.style.height = (stage>=1 ? 30 + stage*22 : 0) + 'px';

    stack.querySelectorAll('.vase-stage-img, .vase-stage-fallback').forEach(n=>n.remove());

    if(stage>=1){

      const key = STAGE_IMG_KEYS[stage];

      const node = imgOrFallback(

        flowerImg(flower, key), flower.name,

        `<span class="vase-stage-fallback shown" style="width:${STAGE_HEIGHTS[stage]}px;height:${STAGE_HEIGHTS[stage]}px;">${flower.emoji}</span>`,

        'vase-stage-img'

      );

      stack.insertBefore(node, stemEl);

      const img = node.querySelector('img');

      img.style.width = img.style.height = STAGE_HEIGHTS[stage] + 'px';

      requestAnimationFrame(()=>img.classList.add('shown'));

    }

    dayDots.innerHTML = '';

    for(let i=0;i<gift.daysNeeded;i++){

      const d = document.createElement('div');

      d.className = 'day-dot' + (i < gift.waterings.length ? ' done':'');

      dayDots.appendChild(d);

    }

    const finished = gift.waterings.length >= gift.daysNeeded;

    const canWater = canWaterNow(gift);

    if(finished){

      waterBtn.disabled = true; waterBtn.textContent = 'fully bloomed 🌸';

      countdownEl.textContent = '';

      demoControls.style.display = 'none';

    } else if(!canWater){

      waterBtn.disabled = true;

      waterBtn.textContent = 'watered — check back soon';

      tickCountdown();

      demoControls.style.display = '';

    } else {

      waterBtn.disabled = false; waterBtn.textContent = 'water it 💧';

      countdownEl.textContent = '';

      demoControls.style.display = 'none';

    }

    vaseTitle.textContent = finished ? 'Ready to bloom' : 'Day ' + Math.min(gift.waterings.length+1, gift.daysNeeded) + ' of ' + gift.daysNeeded;

  }

  let countdownTimer = null;

  function tickCountdown(){

    clearInterval(countdownTimer);

    countdownTimer = setInterval(()=>{

      const ms = msUntilNextWater(gift);

      if(ms<=0){ clearInterval(countdownTimer); render(); return; }

      countdownEl.textContent = 'next watering in ' + formatCountdown(ms);

    }, 1000);

    countdownEl.textContent = 'next watering in ' + formatCountdown(msUntilNextWater(gift));

  }

  async function playBloomAnimation(){

    return new Promise(resolve=>{

      stageLabel.textContent = 'blooming...';

      waterBtn.textContent = 'blooming...';

      stack.querySelectorAll('.vase-stage-img, .vase-stage-fallback').forEach(n=>n.remove());

      const burst = document.createElement('div');

      burst.className = 'vase-bloom-burst';

      const node = imgOrFallback(flowerImg(flower,'opens'), flower.name, `<span class="fallback">${flower.emoji}</span>`);

      burst.appendChild(node);

      document.getElementById('vaseScene').appendChild(burst);

      setTimeout(()=>{ burst.remove(); resolve(); }, 1700);

    });

  }

  waterBtn.onclick = async () => {

    if(!canWaterNow(gift)) return;

    gift.waterings.push(Date.now());

    const finished = gift.waterings.length >= gift.daysNeeded;

    if(finished) gift.bloomed = true;

    await saveGift(gift);

    await pushNotification(gift.senderHandle, gift.id, finished

      ? `🌸 the ${flower.name.toLowerCase()} you sent bloomed`

      : `🌱 watered — day ${gift.waterings.length} of ${gift.daysNeeded}`);

    if(finished){

      render();

      await playBloomAnimation();

      location.href = 'bloom.html?gift=' + gift.id;

    } else {

      render();

    }

  };

  // demo-only: rewinds the last watering's timestamp by a full cooldown

  // so the 24h wait clears instantly, without touching waterings.length

  // (the count — and therefore the day/stage — is untouched).

  skipDayBtn.onclick = async () => {

    if(gift.waterings.length === 0) return;

    clearInterval(countdownTimer);

    gift.waterings[gift.waterings.length-1] -= WATER_COOLDOWN_MS;

    await saveGift(gift);

    render();

  };

  render();

}

/* ---------------- BLOOM ---------------- */

async function initBloom(){

  const giftId = qs('gift');

  const gift = giftId ? await loadGift(giftId) : null;

  if(!gift || !gift.bloomed){

    document.getElementById('bloomName').textContent = giftId ? "This one hasn't bloomed yet." : 'No flower to show.';

    document.getElementById('claimBox').style.display = 'none';

    return;

  }

  const flower = flowerById(gift.flowerId);

  const imgHolder = document.getElementById('bloomImgHolder');

  const node = imgOrFallback(flowerImg(flower,'bloom'), flower.name, `<span class="bloom-flower-fallback">${flower.emoji}</span>`, 'bloom-flower-img');

  imgHolder.appendChild(node);

  document.getElementById('bloomName').textContent = flower.name;

  document.getElementById('bloomMeaning').textContent = 'means ' + flower.meaning;

  const noteEl = document.getElementById('bloomNote');

  if(gift.note){ noteEl.style.display='block'; noteEl.textContent = '"'+gift.note+'"'; }

  else { noteEl.style.display='none'; }

  document.getElementById('bloomFrom').textContent = 'from @' + gift.senderHandle;

  const claimInput = document.getElementById('claimHandleInput');

  claimInput.value = getMyHandle();

  document.getElementById('claimBtn').onclick = async () => {

    const handle = claimInput.value.trim().toLowerCase();

    const errEl = document.getElementById('claimErr');

    if(!handle){ errEl.textContent = 'Enter a handle first.'; errEl.style.display='block'; return; }

    gift.recipientHandle = handle;

    await saveGift(gift);

    await addToGarden(gift);

    setMyHandle(handle);

    location.href = 'garden.html?handle=' + encodeURIComponent(handle);

  };

  document.getElementById('skipClaimBtn').onclick = () => { location.href = 'index.html'; };

  document.getElementById('doneBtn').onclick = () => {

    const h = getMyHandle();

    location.href = h ? 'garden.html?handle=' + encodeURIComponent(h) : 'index.html';

  };

}

/* ---------------- NOTIFICATIONS ---------------- */

async function initNotifications(){

  const handle = qs('handle') || getMyHandle();

  document.getElementById('backLink').href = 'garden.html' + (handle ? '?handle='+encodeURIComponent(handle) : '');

  const list = document.getElementById('notifList');

  if(!handle){ list.innerHTML = '<p class="g-empty" style="padding:20px 0;">Open your garden with a handle first.</p>'; return; }

  try{

    const snap = await getDoc(doc(db,'notifications',handle));

    const items = snap.exists() ? (snap.data().items||[]) : [];

    if(!items.length){ list.innerHTML = '<p class="g-empty" style="padding:20px 0;">No notifications yet — you will see updates here as your sent flowers get visited and watered.</p>'; return; }

    list.innerHTML = '';

    items.slice().reverse().forEach(n=>{

      const d = document.createElement('div');

      d.className = 'notif-item';

      const t = new Date(n.at);

      d.innerHTML = `${n.text}<div class="t">${t.toLocaleString()}</div>`;

      list.appendChild(d);

    });

  }catch(e){

    list.innerHTML = '<p class="g-empty">Could not load notifications right now.</p>';

  }

}

/* ---------------- GARDEN ---------------- */

async function initGarden(){

  const handle = qs('handle') || getMyHandle();

  const who = document.getElementById('gardenWho');

  const scene = document.getElementById('gardenScene');

  const notifLink = document.getElementById('notifLink');

  buildGardenSceneShell(scene);

  const bed = document.getElementById('flowerBed');

  if(!handle){

    who.textContent = '';

    bed.innerHTML = '';

    document.getElementById('gardenEmptyState').style.display = 'block';

    return;

  }

  setMyHandle(handle);

  who.textContent = '@' + handle;

  notifLink.href = 'notifications.html?handle=' + encodeURIComponent(handle);

  spawnBirds(scene);

  spawnBees(scene);

  spawnGardenButterflies(scene);

  let list = [];

  try{

    const snap = await getDoc(doc(db,'gardens',handle));

    if(snap.exists()) list = snap.data().flowers || [];

  }catch(e){ list = []; }

  bed.innerHTML = '';

  if(!list.length){

    bed.innerHTML = '<span class="g-empty" style="padding:0; font-size:13px;">nothing has bloomed here yet — flowers you keep will be planted right here</span>';

    return;

  }

  list.slice().reverse().forEach(item=>{

    const f = flowerById(item.flowerId);

    const el = document.createElement('div');

    el.className = 'planted can-perch';

    el.style.animationDuration = (3 + Math.random()*1.6).toFixed(1) + 's';

    el.style.animationDelay = (-Math.random()*3).toFixed(1) + 's';

    const imgNode = imgOrFallback(flowerImg(f,'bloom'), f.name, `<span class="p-flower-fallback">${f.emoji}</span>`, 'p-flower-img');

    el.appendChild(imgNode);

    el.insertAdjacentHTML('beforeend', `<div class="p-stem"></div><div class="p-label">${f.name}</div>`);

    el.onclick = () => { showNotePopup(item, f); perchButterflyOn(el, scene); };

    bed.appendChild(el);

  });

}

function buildGardenSceneShell(scene){

  const treesHtml = TREE_DEFS.map((t,i)=>{

    const dur = (5.2 + i*0.6).toFixed(1);

    const delay = (-rand(0,3)).toFixed(1);

    return `<div class="g-tree" id="tree${i}" style="left:${t.leftPct}%; width:${t.widthPx}px; height:${t.heightPx}px;">

      ${treeSvg(TREE_PALETTE[t.palette], dur, delay)}

    </div>`;

  }).join('');

  scene.innerHTML = `

    <div class="g-sun"></div>

    <div class="g-cloud-wrap" style="left:6%; top:4%; width:170px; animation-duration:84s; animation-delay:-10s;">${cloudSvg()}</div>

    <div class="g-cloud-wrap" style="left:46%; top:1%; width:120px; animation-duration:98s; animation-delay:-42s;">${cloudSvg()}</div>

    <div class="g-cloud-wrap" style="left:74%; top:7%; width:145px; animation-duration:110s; animation-delay:-64s;">${cloudSvg()}</div>

    <div class="g-hill-back"></div>

    ${treesHtml}

    <div class="g-bush" style="left:26%; animation-duration:${(3.4+Math.random()).toFixed(1)}s; animation-delay:${(-Math.random()*2).toFixed(1)}s;"></div>

    <div class="g-bush" style="left:64%; animation-duration:${(3.6+Math.random()).toFixed(1)}s; animation-delay:${(-Math.random()*2).toFixed(1)}s;"></div>

    <div class="g-bush" style="left:92%; animation-duration:${(3.1+Math.random()).toFixed(1)}s; animation-delay:${(-Math.random()*2).toFixed(1)}s;"></div>

    <div class="g-grass" id="gGrass"></div>

    <div class="flower-bed" id="flowerBed"></div>

    <div class="g-empty" id="gardenEmptyState" style="display:none;">Enter a handle from "My garden" on the home page to see a garden.</div>

  `;

  document.getElementById('gGrass').innerHTML = buildGrassSvg();

  // trees can be clicked to make a butterfly land in the canopy — birds

  // are their own elements (see spawnBirds) so a click on a bird itself

  // doesn't also trigger this.

  TREE_DEFS.forEach((t,i)=>{

    const tree = document.getElementById('tree'+i);

    tree.onclick = (e) => {

      if(e.target.closest('.g-realbird')) return;

      perchButterflyOn(tree, scene);

    };

  });

}

function showNotePopup(item, f){

  const popup = document.getElementById('notePopup');

  popup.style.display = 'block';

  popup.innerHTML = `<button class="np-close" id="npClose">✕</button>

    <div class="np-flower">${f.emoji} ${f.name} — from @${item.senderHandle}</div>

    <div class="np-text">${item.note ? '"'+item.note+'"' : 'No note was left with this one.'}</div>`;

  document.getElementById('npClose').onclick = () => { popup.style.display = 'none'; };

}

/* A butterfly flies in from off-scene and lands on the clicked flower/tree.

   Clicking again while one is perched moves it to the new spot. */

function perchButterflyOn(targetEl, scene){

  if(!scene) return;

  let perch = scene.querySelector('.g-perch-butterfly');

  if(!perch){

    perch = document.createElement('div');

    perch.className = 'g-perch-butterfly';

    perch.innerHTML = butterflySvg(PALETTE[Math.floor(Math.random()*PALETTE.length)]);

    scene.appendChild(perch);

    perch.style.opacity = '0';

    perch.style.transition = 'opacity .4s ease, transform .6s cubic-bezier(.22,.9,.32,1)';

  }

  const sceneRect = scene.getBoundingClientRect();

  const targetRect = targetEl.getBoundingClientRect();

  const x = targetRect.left - sceneRect.left + targetRect.width/2 - 15;

  const y = targetRect.top - sceneRect.top - 6;

  perch.style.transform = `translate(${x}px, ${y}px)`;

  requestAnimationFrame(()=>{ perch.style.opacity = '1'; });

}