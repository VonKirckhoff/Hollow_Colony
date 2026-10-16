'use strict';
/* =====================================================================
   SECTION 2 — ENGINE
   ===================================================================== */
const TILE = 32, STEP = 1/30;
const $ = s => document.querySelector(s);
const clamp = (v,a,b) => v<a?a:v>b?b:v;
const rand = (a,b) => a+Math.random()*(b-a);
const pick = arr => arr[Math.floor(Math.random()*arr.length)];
const dist = (a,b) => Math.hypot(a.x-b.x, a.y-b.y);
function hash2(x,y,s){ let h=(x*374761393 + y*668265263 + (s|0)*1442695041)|0; h=Math.imul(h^(h>>>13),1274126177); return ((h^(h>>>16))>>>0)/4294967296; }
const store = {
  get(k,d){ try{ const v=localStorage.getItem(k); return v?JSON.parse(v):d; }catch(e){ return d; } },
  set(k,v){ try{ localStorage.setItem(k,JSON.stringify(v)); }catch(e){} }
};
