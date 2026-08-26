/* ============================================================
   Petal Post — shared app logic, loaded as a module on every page.
   Each page sets <body data-page="..."> and this file runs the
   right init for that page. See README.md for the asset naming
   convention and the watering/growth timing rules.
   ============================================================ */

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import {
  getFirestore, doc, getDoc, setDoc
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

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

const PALETTE = [
  {light:'#FBD7E1', main:'#F0879E', spot:'#FBE3A0'},
  {light:'#EBE0FA', main:'#C9AEED', spot:'#FFFFFF'},
  {light:'#FCE7B8', main:'#F0AE4E', spot:'#F0879E'},
  {light:'#D7F0E6', main:'#7DBFA9', spot:'#FFFFFF'},
  {light:'#E1F3F8', main:'#9CCFE0', spot:'#F0879E'},
  {light:'#FBDCEA', main:'#E888B5', spot:'#FBE3A0'},
];
let uidSeq = 0;
function rand(min,max){ return min + Math.random()*(max-min); }

export function butterflySvg(c){
  const uid = 'bf' + (uidSeq++);
  const fore = "M20,15 C17,3 5,-1 1,7 C-2,13 3,18 10,17 C15,16 19,16 20,15 Z";
  const hind = "M20,16 C18,22 9,27 3,23 C-1,20 2,15 9,14.5 C14,14 18,15 20,16 Z";
  return `<svg viewBox="0 0 40 30">
    <defs>
      <radialGradient id="${uid}" cx="28%" cy="30%" r="85%">
        <stop offset="0%" stop-color="${c.light}"/>
        <stop offset="100%" stop-color="${c.main}"/>
      </radialGradient>
    </defs>
    <g class="bfly-wing" style="animation-delay:${(-Math.random()*2).toFixed(2)}s">
      <path d="${fore}" fill="url(#${uid})" stroke="var(--ink)" stroke-width="0.55" stroke-opacity="0.4"/>
      <path d="${hind}" fill="url(#${uid})" stroke="var(--ink)" stroke-width="0.55" stroke-opacity="0.4" opacity="0.94"/>
      <path d="M19,14 C13,10 7,8 2,8.5" stroke="var(--ink)" stroke-width="0.4" fill="none" opacity="0.32"/>
      <path d="M19,15.5 C13,17 7,19 3,21" stroke="var(--ink)" stroke-width="0.4" fill="none" opacity="0.32"/>
      <circle cx="9" cy="8.5" r="2.1" fill="${c.spot}" opacity="0.88"/>
      <circle cx="8" cy="19" r="1.5" fill="${c.spot}" opacity="0.75"/>
    </g>
    <g class="bfly-wing" style="transform:scaleX(-1); animation-delay:${(-Math.random()*2).toFixed(2)}s">
      <path d="${fore}" fill="url(#${uid})" stroke="var(--ink)" stroke-width="0.55" stroke-opacity="0.4"/>
      <path d="${hind}" fill="url(#${uid})" stroke="var(--ink)" stroke-width="0.55" stroke-opacity="0.4" opacity="0.94"/>
      <path d="M19,14 C13,10 7,8 2,8.5" stroke="var(--ink)" stroke-width="0.4" fill="none" opacity="0.32"/>
      <path d="M19,15.5 C13,17 7,19 3,21" stroke="var(--ink)" stroke-width="0.4" fill="none" opacity="0.32"/>
      <circle cx="9" cy="8.5" r="2.1" fill="${c.spot}" opacity="0.88"/>
      <circle cx="8" cy="19" r="1.5" fill="${c.spot}" opacity="0.75"/>
    </g>
    <path d="M20,8 C17,4 14,4 13,1.5" stroke="var(--ink)" stroke-width="0.9" fill="none" stroke-linecap="round"/>
    <path d="M20,8 C23,4 26,4 27,1.5" stroke="var(--ink)" stroke-width="0.9" fill="none" stroke-linecap="round"/>
    <circle cx="13" cy="1.5" r="1" fill="var(--ink)"/><circle cx="27" cy="1.5" r="1" fill="var(--ink)"/>
    <ellipse cx="20" cy="16" rx="1.7" ry="8.5" fill="var(--ink)" opacity="0.88"/>
  </svg>`;
}

function initDriftingButterflies(){
  const COUNT = 14, DODGE_RADIUS = 130, SEPARATION = 100;
  let butterflies = [];
  let cursor = { x:-9999, y:-9999, active:false };

  class Butterfly{
    constructor(index, cols, rows){
      this.el = document.createElement('div');
      this.color = PALETTE[Math.floor(Math.random()*PALETTE.length)];
      this.faceFlip = Math.random() < 0.5 ? -1 : 1;
      this.el.className = 'butterfly';
      this.el.innerHTML = butterflySvg(this.color);
      document.body.appendChild(this.el);
      const cellX = index % cols, cellY = Math.floor(index/cols);
      this.home = { x0: cellX/cols, x1: (cellX+1)/cols, y0: cellY/rows, y1: (cellY+1)/rows };
      this.x = rand(this.home.x0, this.home.x1) * window.innerWidth;
      this.y = rand(this.home.y0, this.home.y1) * window.innerHeight;
      this.vx = 0; this.vy = 0;
      this.pauseTimer = rand(30,120);
      this.startled = false;
      this.restTilt = rand(-14,14);
      this.tiltPhase = rand(0, Math.PI*2);
      this.tiltSpeed = rand(700,1100);
      this.pickWanderTarget();
    }
    pickWanderTarget(){
      const w = window.innerWidth, h = window.innerHeight;
      const marginX = Math.min(50, (this.home.x1-this.home.x0)*w*0.18);
      const marginY = Math.min(50, (this.home.y1-this.home.y0)*h*0.18);
      this.tx = rand(this.home.x0*w + marginX, this.home.x1*w - marginX);
      this.ty = rand(this.home.y0*h + marginY, this.home.y1*h - marginY);
    }
    steerTowards(tx, ty, accel, maxSpeed){
      const dx = tx-this.x, dy = ty-this.y, d = Math.hypot(dx,dy) || 1;
      this.vx += (dx/d)*accel; this.vy += (dy/d)*accel;
      const sp = Math.hypot(this.vx,this.vy);
      if(sp>maxSpeed){ this.vx = this.vx/sp*maxSpeed; this.vy = this.vy/sp*maxSpeed; }
      return d;
    }
    separate(){
      let fx=0, fy=0;
      for(const other of butterflies){
        if(other===this) continue;
        const dx = this.x-other.x, dy = this.y-other.y, d = Math.hypot(dx,dy);
        if(d>0 && d<SEPARATION){ const push = (1 - d/SEPARATION) * 0.045; fx += (dx/d)*push; fy += (dy/d)*push; }
      }
      this.vx += fx; this.vy += fy;
    }
    update(){
      this.pauseTimer = Math.max(0, this.pauseTimer-1);
      const d = this.steerTowards(this.tx, this.ty, 0.016, 0.4);
      if(d<26 && this.pauseTimer<=0){ this.pickWanderTarget(); this.pauseTimer = rand(40,140); }
      this.separate();
      if(cursor.active){
        const dx = this.x-cursor.x, dy = this.y-cursor.y, dist = Math.hypot(dx,dy);
        if(dist < DODGE_RADIUS){
          const strength = (1 - dist/DODGE_RADIUS) * 1.3;
          const ux = dist>0.001 ? dx/dist : rand(-1,1);
          const uy = dist>0.001 ? dy/dist : rand(-1,1);
          this.vx += ux*strength; this.vy += uy*strength;
          this.startled = true;
        }
      }
      const maxSpeed = this.startled ? 2.2 : 0.4;
      const sp = Math.hypot(this.vx,this.vy);
      if(sp>maxSpeed){ this.vx = this.vx/sp*maxSpeed; this.vy = this.vy/sp*maxSpeed; }
      this.vx *= this.startled ? 0.9 : 0.95;
      this.vy *= this.startled ? 0.9 : 0.95;
      if(this.startled && sp<0.6){ this.startled = false; this.pickWanderTarget(); }
      if(!this.startled){
        const w = window.innerWidth, h = window.innerHeight;
        const x0=this.home.x0*w, x1=this.home.x1*w, y0=this.home.y0*h, y1=this.home.y1*h;
        if(this.x<x0-10 || this.x>x1+10 || this.y<y0-10 || this.y>y1+10) this.pickWanderTarget();
      }
      this.x += this.vx; this.y += this.vy;
      const pad = 24;
      if(this.x<pad){ this.x=pad; this.vx=Math.abs(this.vx); }
      if(this.x>window.innerWidth-pad){ this.x=window.innerWidth-pad; this.vx=-Math.abs(this.vx); }
      if(this.y<pad){ this.y=pad; this.vy=Math.abs(this.vy); }
      if(this.y>window.innerHeight-pad){ this.y=window.innerHeight-pad; this.vy=-Math.abs(this.vy); }
      const bob = Math.sin(Date.now()/500 + this.x*0.01)*2.4;
      const wobble = Math.sin(Date.now()/this.tiltSpeed + this.tiltPhase)*9;
      const bank = Math.max(-20, Math.min(20, this.vx*13*this.faceFlip));
      const tilt = this.restTilt + wobble + bank;
      this.el.classList.toggle('fleeing', this.startled);
      this.el.style.transform = `translate(${this.x}px, ${(this.y+bob)}px) translate(-50%,-50%) rotate(${tilt}deg) scaleX(${this.faceFlip})`;
    }
  }
  function loop(){ butterflies.forEach(b=>b.update()); requestAnimationFrame(loop); }
  const aspect = window.innerWidth / window.innerHeight;
  const cols = Math.max(1, Math.round(Math.sqrt(COUNT * aspect)));
  const rows = Math.max(1, Math.ceil(COUNT / cols));
  for(let i=0;i<COUNT;i++) butterflies.push(new Butterfly(i, cols, rows));
  requestAnimationFrame(loop);
  window.addEventListener('mousemove', (e)=>{ cursor.x=e.clientX; cursor.y=e.clientY; cursor.active=true; });
  window.addEventListener('mouseleave', ()=>{ cursor.active=false; });
  window.addEventListener('touchstart', (e)=>{
    const t = e.touches[0]; if(!t) return;
    cursor.x=t.clientX; cursor.y=t.clientY; cursor.active=true;
    setTimeout(()=>{ cursor.active=false; }, 500);
  }, {passive:true});
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
      const link = location.origin + location.pathname.replace(/send\.html$/, '') + 'receive.html?gift=' + giftId;
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
    } else if(!canWater){
      waterBtn.disabled = true;
      waterBtn.textContent = 'watered — check back soon';
      tickCountdown();
    } else {
      waterBtn.disabled = false; waterBtn.textContent = 'water it 💧';
      countdownEl.textContent = '';
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

  startAmbientBirdsong(scene);
  startBees(scene);

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
  scene.innerHTML = `
    <div class="g-sun"></div>
    <div class="g-cloud" style="left:8%; top:18px; animation-duration:52s; animation-delay:-6s;"></div>
    <div class="g-cloud" style="left:50%; top:34px; animation-duration:64s; animation-delay:-24s;"></div>
    <div class="g-bird" style="top:16%; animation-duration:18s; animation-delay:-3s;">🕊️</div>
    <div class="g-bird" style="top:26%; animation-duration:24s; animation-delay:-11s;">🐦</div>
    <div class="g-hill-back"></div>
    <div class="g-tree" id="tree1" style="left:5%;"><div class="canopy" style="animation-duration:4.4s; animation-delay:-1.1s;"></div><div class="trunk"></div></div>
    <div class="g-tree" id="tree2" style="left:78%;"><div class="canopy" style="animation-duration:3.8s; animation-delay:-2.4s;"></div><div class="trunk"></div></div>
    <div class="g-bush" style="left:20%; animation-duration:3.4s; animation-delay:-0.6s;"></div>
    <div class="g-bush" style="left:60%; animation-duration:3.9s; animation-delay:-1.8s;"></div>
    <div class="g-bush" style="left:90%; animation-duration:3.1s; animation-delay:-2.1s;"></div>
    <div class="g-path"></div>
    <div class="g-figure" style="animation-duration:34s; animation-delay:-4s;">🚶🏿</div>
    <div class="g-figure" style="animation-duration:21s; animation-delay:-13s;">🚴🏾</div>
    <div class="g-figure" style="animation-duration:15s; animation-delay:-2s;">🚗</div>
    <div class="g-figure" style="animation-duration:27s; animation-delay:-19s;">🚶🏾‍♀️</div>
    <div class="flower-bed" id="flowerBed"></div>
    <div class="g-empty" id="gardenEmptyState" style="display:none;">Enter a handle from "My garden" on the home page to see a garden.</div>
  `;
  // trees perch a small singing bird each, and can also be clicked to make
  // a butterfly land in the canopy
  ['tree1','tree2'].forEach(id=>{
    const tree = document.getElementById(id);
    const perchedBird = document.createElement('div');
    perchedBird.textContent = '🐦';
    perchedBird.style.cssText = 'position:absolute; top:-6px; left:60%; font-size:13px;';
    tree.querySelector('.canopy').appendChild(perchedBird);
    tree.onclick = () => perchButterflyOn(tree, tree.closest('.garden-scene'));
  });
}

function startAmbientBirdsong(scene){
  setInterval(()=>{
    document.querySelectorAll('#tree1, #tree2').forEach(tree=>{
      if(Math.random() < 0.6){
        const note = document.createElement('div');
        note.className = 'g-note';
        note.textContent = ['♪','♫','♪'][Math.floor(Math.random()*3)];
        note.style.left = (30 + Math.random()*20) + 'px';
        note.style.top = '4px';
        tree.querySelector('.canopy').appendChild(note);
        setTimeout(()=>note.remove(), 3500);
      }
    });
  }, 2200);
}

function startBees(scene){
  const COUNT = 3;
  const bees = [];
  class Bee{
    constructor(){
      this.el = document.createElement('div');
      this.el.className = 'g-bee';
      this.el.textContent = '🐝';
      scene.appendChild(this.el);
      this.x = rand(20, scene.clientWidth-20 || 300);
      this.y = rand(120, 240);
      this.vx = 0; this.vy = 0;
      this.restTimer = 0;
      this.pickTarget();
    }
    pickTarget(){
      const w = scene.clientWidth || 320;
      this.tx = rand(20, w-20);
      this.ty = rand(130, 250);
      this.restTimer = rand(60,180);
    }
    update(){
      if(this.resting){
        this.restTimer--;
        if(this.restTimer<=0){ this.resting = false; this.pickTarget(); }
        return;
      }
      const dx=this.tx-this.x, dy=this.ty-this.y, d=Math.hypot(dx,dy)||1;
      this.vx += (dx/d)*0.02; this.vy += (dy/d)*0.02;
      const sp = Math.hypot(this.vx,this.vy);
      const max = 0.7;
      if(sp>max){ this.vx=this.vx/sp*max; this.vy=this.vy/sp*max; }
      this.vx*=0.94; this.vy*=0.94;
      this.x+=this.vx; this.y+=this.vy;
      if(d<12){ this.resting = true; this.restTimer = rand(90,240); }
      const wobble = Math.sin(Date.now()/220 + this.x)*3;
      this.el.style.transform = `translate(${this.x}px, ${this.y+wobble}px)`;
    }
  }
  for(let i=0;i<COUNT;i++) bees.push(new Bee());
  (function loop(){ bees.forEach(b=>b.update()); requestAnimationFrame(loop); })();
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
