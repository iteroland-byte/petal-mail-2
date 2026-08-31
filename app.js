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
   Garden-scene illustrations — trees, birds, bees, grass, clouds.
   Drawn as gradient-filled SVGs with thin ink strokes, matching the
   butterflySvg() look above, rather than emoji.
   ============================================================ */

const TREE_PALETTE = [
  { trunkLight:'#B08A5D', trunkDark:'#8B6239', leafLight:'#BCE8A0', leafDark:'#5E9A57', leafHi:'#E6F6D6' },
  { trunkLight:'#A9835A', trunkDark:'#7E5934', leafLight:'#A6E0C9', leafDark:'#4E9C82', leafHi:'#DCF5EB' },
  { trunkLight:'#B4936B', trunkDark:'#8B6A44', leafLight:'#CDE9A0', leafDark:'#7DAE4E', leafHi:'#EEF7D8' },
];

/* Big, wide backyard tree: a tapered trunk plus four visible branches
   that reach past the leaf clusters (so the bare branch tips show, like
   real limbs) — those exposed tips double as bird perch points, see
   TREE_PERCHES below. ViewBox is 220x300; keep any container this is
   dropped into at that same aspect ratio. */
function treeSvg(pal, swayDur, swayDelay){
  const uid = 'tr' + (uidSeq++);
  return `<svg viewBox="0 0 220 300" class="tree-svg" overflow="visible">
    <defs>
      <linearGradient id="${uid}t" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${pal.trunkLight}"/>
        <stop offset="100%" stop-color="${pal.trunkDark}"/>
      </linearGradient>
      <radialGradient id="${uid}c" cx="35%" cy="25%" r="75%">
        <stop offset="0%" stop-color="${pal.leafLight}"/>
        <stop offset="100%" stop-color="${pal.leafDark}"/>
      </radialGradient>
    </defs>
    <path d="M96,300 C93,246 90,198 98,152 C99,144 121,144 122,152 C130,198 127,246 124,300 Z"
      fill="url(#${uid}t)" stroke="var(--ink)" stroke-width="1.2" stroke-opacity="0.22"/>
    <g class="tree-canopy" style="transform-origin:110px 160px; animation-duration:${swayDur}s; animation-delay:${swayDelay}s;">
      <path class="tree-branch" d="M100,160 C70,140 45,120 26,86" fill="none" stroke="${pal.trunkDark}" stroke-width="7" stroke-linecap="round"/>
      <path class="tree-branch" d="M120,156 C150,130 178,105 199,76" fill="none" stroke="${pal.trunkDark}" stroke-width="7" stroke-linecap="round"/>
      <path class="tree-branch" d="M98,188 C75,182 55,178 31,166" fill="none" stroke="${pal.trunkDark}" stroke-width="6" stroke-linecap="round"/>
      <path class="tree-branch" d="M122,184 C148,190 172,196 195,206" fill="none" stroke="${pal.trunkDark}" stroke-width="6" stroke-linecap="round"/>
      <ellipse cx="110" cy="150" rx="70" ry="55" fill="url(#${uid}c)" opacity="0.9"/>
      <ellipse cx="55" cy="115" rx="42" ry="38" fill="url(#${uid}c)" stroke="var(--ink)" stroke-width="1" stroke-opacity="0.2"/>
      <ellipse cx="168" cy="110" rx="44" ry="40" fill="url(#${uid}c)" stroke="var(--ink)" stroke-width="1" stroke-opacity="0.2"/>
      <ellipse cx="70" cy="165" rx="34" ry="28" fill="url(#${uid}c)" stroke="var(--ink)" stroke-width="1" stroke-opacity="0.18"/>
      <ellipse cx="155" cy="172" rx="34" ry="28" fill="url(#${uid}c)" stroke="var(--ink)" stroke-width="1" stroke-opacity="0.18"/>
      <ellipse cx="110" cy="95" rx="80" ry="70" fill="url(#${uid}c)" stroke="var(--ink)" stroke-width="1.1" stroke-opacity="0.24"/>
      <ellipse cx="70" cy="65" rx="26" ry="18" fill="${pal.leafHi}" opacity="0.35"/>
    </g>
  </svg>`;
}

function cloudSvg(){
  const uid = 'cl' + (uidSeq++);
  return `<svg viewBox="0 0 120 46" class="cloud-svg" overflow="visible">
    <defs><radialGradient id="${uid}" cx="35%" cy="28%" r="80%">
      <stop offset="0%" stop-color="#FFFFFF"/><stop offset="100%" stop-color="#E9F4E1"/>
    </radialGradient></defs>
    <path d="M18,36 C4,36 2,18 16,14 C18,4 38,2 44,12 C56,4 78,8 78,20 C96,18 104,36 88,36 Z"
      fill="url(#${uid})" stroke="var(--ink)" stroke-width="0.6" stroke-opacity="0.1"/>
  </svg>`;
}

const BIRD_PALETTE = [
  { light:'#F6C89E', main:'#E8895D', wing:'#C96A3E', belly:'#FBEFDD', beak:'#E4A73B' },
  { light:'#C9DDF3', main:'#7CA6D8', wing:'#4E7FB8', belly:'#F3F8FF', beak:'#E4A73B' },
  { light:'#D7EFC9', main:'#8FC17B', wing:'#5E9A57', belly:'#FDF8E8', beak:'#E4A73B' },
];

function birdSvg(c){
  const uid = 'bd' + (uidSeq++);
  return `<svg viewBox="0 0 46 36" overflow="visible">
    <defs><linearGradient id="${uid}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${c.light}"/><stop offset="100%" stop-color="${c.main}"/>
    </linearGradient></defs>
    <path d="M9,19 L-2,12 L-1,20 L-2,28 L9,22 Z" fill="${c.main}" stroke="var(--ink)" stroke-width="0.5" stroke-opacity="0.28"/>
    <path d="M2,15 L-1,20 L2,25" stroke="var(--ink)" stroke-width="0.4" fill="none" opacity="0.3"/>
    <ellipse cx="22" cy="21" rx="15" ry="10.5" fill="url(#${uid})" stroke="var(--ink)" stroke-width="0.7" stroke-opacity="0.3"/>
    <ellipse cx="23" cy="26" rx="9" ry="4.5" fill="${c.belly}" opacity="0.9"/>
    <circle cx="35" cy="13" r="7.6" fill="url(#${uid})" stroke="var(--ink)" stroke-width="0.7" stroke-opacity="0.3"/>
    <path d="M41,13 L46,11.4 L41,16.2 Z" fill="${c.beak}"/>
    <circle cx="37" cy="11" r="1.25" fill="var(--ink)"/>
    <circle cx="36.6" cy="10.6" r="0.4" fill="#fff" opacity="0.85"/>
    <g class="bird-wing" style="transform-origin:22px 17px;">
      <path d="M25,15 C17,6 4,8 1,17 C0,21 5,24 12,24 C10,26 9,28 10,29 C16,29 22,26 24.5,20 C25.5,18 25.5,16.5 25,15 Z"
        fill="${c.wing}" stroke="var(--ink)" stroke-width="0.6" stroke-opacity="0.3"/>
      <path d="M6,17 C10,19 15,20 21,18 M8,21 C13,22.5 18,22 22,20"
        stroke="var(--ink)" stroke-width="0.5" fill="none" opacity="0.24"/>
      <path d="M24,17 C15,8 3,10 1,19 C-1,26 11,30 22,25 C27,23 27,19.5 24,17 Z"
        fill="${c.wing}" opacity="0.55" stroke="var(--ink)" stroke-width="0.5" stroke-opacity="0.22"/>
    </g>
    <path d="M18,31 L17,35 M23,31.5 L23,35.5 M27,31 L28,35" stroke="var(--ink)" stroke-width="1" stroke-linecap="round" opacity="0.5"/>
  </svg>`;
}

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

function buildGrassSvg(){
  const total = 90;
  let blades = '';
  for(let i=0;i<total;i++){
    const x = (i/(total-1))*1000 + rand(-4,4);
    const h = rand(38,80);
    const w = rand(5,9);
    const tilt = rand(-6,6);
    const dark = Math.random() < 0.5;
    const dur = rand(2.6,4.2).toFixed(2);
    const delay = (-rand(0,4)).toFixed(2);
    blades += `<g class="blade" style="transform-origin:${x.toFixed(1)}px 90px; animation-duration:${dur}s; animation-delay:${delay}s;">
      <path d="M${x.toFixed(1)},90 C${(x-w).toFixed(1)},${(90-h*0.5).toFixed(1)} ${(x+tilt).toFixed(1)},${(90-h*0.85).toFixed(1)} ${(x+tilt*1.4).toFixed(1)},${(90-h).toFixed(1)} C${(x+tilt*0.6).toFixed(1)},${(90-h*0.6).toFixed(1)} ${(x+w).toFixed(1)},${(90-h*0.3).toFixed(1)} ${x.toFixed(1)},90 Z"
        fill="${dark ? 'var(--leaf-dark)' : 'var(--leaf)'}" opacity="${dark ? 0.92 : 0.85}"/>
    </g>`;
  }
  return `<svg class="grass-svg" viewBox="0 0 1000 90" preserveAspectRatio="none" overflow="visible">${blades}</svg>`;
}

/* trees a bird can call home. widthPx/heightPx keep the 220:300 aspect
   of treeSvg's viewBox so nothing looks stretched. Perch points are
   percentages of each tree's own box, landing right on the four bare
   branch tips drawn in treeSvg — they track any tree at any size. */
const TREE_DEFS = [
  { leftPct: 2,  widthPx: 250, heightPx: 341, palette: 0 },
  { leftPct: 62, widthPx: 200, heightPx: 273, palette: 1 },
];
const TREE_PERCHES = [
  {left:'12%', top:'29%'}, {left:'90%', top:'25%'},
  {left:'14%', top:'55%'}, {left:'89%', top:'69%'},
];
const TREE_DEFS_FLAT = [];
TREE_DEFS.forEach((t,i)=> TREE_PERCHES.forEach(p=> TREE_DEFS_FLAT.push({ treeIdx:i, ...p })));

/* ---------- tiny synthesized birdsong (no external audio file needed) ---------- */
let _audioCtx = null;
function getAudioCtx(){
  if(!_audioCtx){
    try{ _audioCtx = new (window.AudioContext||window.webkitAudioContext)(); }
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
      y: tr.top - sceneRect.top + tr.height * (parseFloat(this.target.top)/100)
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
    else { const p=this.targetPos(); tx=p.x; ty=p.y; maxSpeed=0.6; }
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
    else { tx=this.tx; ty=this.ty; maxSpeed=0.55; }
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
    const dur = (4.5 + i*0.7).toFixed(1);
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
