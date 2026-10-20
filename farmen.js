/* =====================================================================
   Innenraum-Simulation: sechs Räume mit Farmen als Beispiel.
   Eine vereinfachte Zeichnung mit stark verkürzten Zeiten, keine echte
   Redstone-Rechnung. Texte und Blöcke stehen in config.js unter "innenraum".
   ===================================================================== */
(() => {
  "use strict";

  const A = window.VenatorApp;
  const CFG = window.VENATOR_CONFIG || {};
  const IC = CFG.innenraum;
  const sek = document.getElementById("innenraum");
  if (!A || !sek) return;
  if (!IC || !(IC.farmen || []).length) { sek.hidden = true; return; }

  const { $, el, toast, freischalten, Ton, reduce, plural } = A;
  const FARMEN = IC.farmen;
  const cv = $("sim-canvas");
  const g = cv.getContext("2d");
  const W = cv.width, H = cv.height;
  const norm = (s) => String(s).toLowerCase().replace(/ü/g, "ue").replace(/ö/g, "oe").replace(/ä/g, "ae").replace(/ß/g, "ss");
  const rnd = (a, b) => a + Math.random() * (b - a);

  /* ---------- Zeichenhilfen ---------- */
  const shadeCache = {};
  function shade(hex, f) {
    const k = hex + f;
    if (shadeCache[k]) return shadeCache[k];
    const n = parseInt(hex.slice(1), 16);
    const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.max(0, Math.min(255, Math.round(v * f))));
    return (shadeCache[k] = "rgb(" + c.join(",") + ")");
  }
  function R(x, y, w, h, c) { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }
  function blk(x, y, c) {
    R(x, y, 8, 8, c);
    R(x, y, 8, 1, shade(c, 1.25)); R(x, y, 1, 8, shade(c, 1.15));
    R(x, y + 7, 8, 1, shade(c, 0.7)); R(x + 7, y, 1, 8, shade(c, 0.78));
  }
  const WASSER = "#2f5fd1", STEIN = "#5b616a", DUNKEL = "#14181d", SAND = "#dbd3a0", ERDE = "#5b3b1f";

  function wasserBlock(x, y, t, ph) {
    R(x, y, 8, 8, WASSER);
    R(x, y + 1 + ((t * 3 + ph) % 6 | 0), 8, 1, "#5a8cf2");
    R(x + 2, y + 3 + ((t * 2 + ph) % 4 | 0), 4, 1, "#3f74e0");
  }
  function trichter(x, y) {
    R(x, y, 8, 8, "#3b3e43");
    R(x + 1, y + 1, 6, 2, "#6b6f75");
    R(x + 2, y + 3, 4, 2, "#222");
    R(x + 3, y + 5, 2, 3, "#222");
  }
  function truhe(x, y, puls) {
    const dy = puls > 0 ? -2 : 0;
    R(x, y + 2, 16, 12, "#8a5a2b");
    R(x, y + 2, 16, 1, "#b07a42");
    R(x, y + 13, 16, 1, "#5e3b1a");
    R(x, y + 2 + dy, 16, 5, "#9c6933");
    R(x + 7, y + 6 + dy, 2, 3, "#d8d8d8");
  }
  function kolben(x, y, aus, vertikal) {
    // Kolben mit Kopf. aus = 0..1
    R(x, y, 8, 8, "#7d7f86");
    R(x + 1, y + 1, 6, 6, "#9c8556");
    if (vertikal) { R(x + 3, y + 8, 2, aus * 8, "#cdb98a"); R(x, y + 8 + aus * 8, 8, 2, "#9c8556"); }
    else { R(x + 8, y + 3, aus * 8, 2, "#cdb98a"); R(x + 8 + aus * 8, y, 2, 8, "#9c8556"); }
  }
  function beobachter(x, y, blitz) {
    R(x, y, 8, 8, "#6b6b6b");
    R(x + 1, y + 1, 6, 2, "#8a8a8a");
    R(x + 1, y + 4, 2, 2, blitz > 0 ? "#ff5a4a" : "#7a2a24");
    R(x + 5, y + 4, 2, 2, "#444");
  }

  /* ---------- Gegenstände (laufen auf einem Pfad zur Truhe) ---------- */
  const ITEM = {
    weizen: { c: "#d8bf5a", zeichne(x, y) { R(x - 2, y - 3, 4, 6, "#d8bf5a"); R(x - 1, y - 4, 2, 2, "#f1dc86"); R(x - 3, y, 6, 1, "#9b8434"); } },
    rohr: { c: "#8dbb4c", zeichne(x, y) { R(x - 1, y - 4, 3, 8, "#8dbb4c"); R(x - 1, y - 1, 3, 1, "#5d8530"); } },
    kelp: { c: "#2f8f4a", zeichne(x, y) { R(x - 1, y - 3, 3, 7, "#2f8f4a"); R(x + 1, y - 2, 1, 3, "#1c6a33"); } },
    beute: { c: "#d8d8d8", zeichne(x, y, it) { R(x - 2, y - 2, 4, 4, it.alt ? "#9aa0a6" : "#e8e4d8"); R(x - 1, y - 1, 2, 2, it.alt ? "#6b7076" : "#bdb8a8"); } },
    eisen: { c: "#dcdcdc", zeichne(x, y) { R(x - 3, y - 1, 6, 3, "#dcdcdc"); R(x - 3, y + 1, 6, 1, "#9a9a9a"); R(x - 2, y - 1, 3, 1, "#fff"); } },
    xp: { c: "#7fd13b", zeichne(x, y, it, t) { const f = 0.7 + 0.3 * Math.sin(t * 8 + x); R(x - 2, y - 2, 4, 4, "#7fd13b"); R(x - 1, y - 1, 2, 2, f > 0.85 ? "#e4ffb0" : "#c8f27a"); } }
  };

  function itemsAktualisieren(farm, dt, S) {
    farm.items = farm.items.filter((it) => {
      const w = it.pfad[it.i];
      const dx = w[0] - it.x, dy = w[1] - it.y, d = Math.hypot(dx, dy), s = w[2] * dt;
      if (d <= s) {
        it.x = w[0]; it.y = w[1]; it.i++;
        if (it.i >= it.pfad.length) { S.gib(farm, it.typ); return false; }
      } else { it.x += (dx / d) * s; it.y += (dy / d) * s; }
      return true;
    });
  }
  function itemsZeichnen(farm, t) {
    farm.items.forEach((it) => ITEM[it.typ].zeichne(it.x, it.y, it, t));
  }

  /* =================================================================
     Die sechs Räume. Koordinaten sind lokal zur Zelle (152 × 142).
     Der Streifen oben (0 bis 14) gehört dem Namensschild.
     ================================================================= */

  /* ----- Getreidefarm ----- */
  const getreide = {
    id: "getreide",
    init() {
      this.crops = [];
      for (let bx = 0; bx < 14; bx++) {
        if (bx === 3 || bx === 9) continue;
        this.crops.push({ x: 8 + bx * 8 + 4, t: rnd(0, 6), rate: rnd(0.8, 1.5) });
      }
      this.items = []; this.fluss = -1; this.truhe = 0;
    },
    ernten(c, manuell) {
      c.t = 0; c.rate = rnd(0.8, 1.5);
      this.items.push({ x: c.x, y: 98, typ: "weizen", pfad: manuell ? [[124, 98, 140], [124, 116, 90]] : [[c.x, 108, 80], [124, 108, 38], [124, 116, 60]], i: 0 });
    },
    update(dt, S) {
      if (this.fluss >= 0) {
        this.fluss += dt * 150;
        this.crops.forEach((c) => { if (c.t >= 7 && c.x < this.fluss) this.ernten(c); });
        if (this.fluss > 132) this.fluss = -1;
      } else {
        let reif = 0;
        this.crops.forEach((c) => { c.t = Math.min(7, c.t + dt * c.rate); if (c.t >= 7) reif++; });
        if (reif >= this.crops.length * 0.75) this.fluss = 0;
      }
      this.truhe = Math.max(0, this.truhe - dt);
      itemsAktualisieren(this, dt, S);
    },
    ankunft() { this.truhe = 0.2; },
    zeichne(t) {
      R(0, 14, 152, 128, "#0c1016");
      for (let i = 0; i < 6; i++) { R(10 + i * 24, 14, 10, 3, "#f3e2a0"); R(8 + i * 24, 14, 14, 1, "#fff6cc"); }
      for (let bx = 0; bx < 14; bx++) {
        const x = 8 + bx * 8;
        if (bx === 3 || bx === 9) wasserBlock(x, 96, t, bx);
        else { blk(x, 96, "#4a2f19"); R(x + 1, 96, 6, 1, "#2b1a0d"); }
        blk(x, 104, "#4d535b");
        wasserBlock(x, 112, t * 2, bx);
        blk(x, 120, STEIN);
      }
      R(8, 112, 112, 8, "#1d4aa8"); for (let bx = 0; bx < 14; bx++) wasserBlock(8 + bx * 8, 112, t * 2, bx);
      blk(0, 88, "#7d7f86"); R(2, 91, 4, 3, "#111");
      trichter(120, 112); truhe(120, 120, this.truhe);
      blk(120, 104, "#4d535b");
      this.crops.forEach((c) => {
        const s = Math.floor(c.t), h = 4 + s * 1.5, gr = c.t >= 7 ? "#c9b24f" : "#5fae3c";
        R(c.x - 1, 96 - h, 2, h, gr); R(c.x - 3, 96 - h + 3, 2, 2, gr); R(c.x + 1, 96 - h + 1, 2, 2, gr);
        if (c.t >= 7) { R(c.x - 2, 96 - h - 3, 4, 4, "#d8bf5a"); R(c.x - 1, 96 - h - 4, 2, 2, "#f1dc86"); }
      });
      if (this.fluss >= 0) { R(8, 91, Math.max(0, this.fluss - 8), 5, "rgba(80,130,240,0.75)"); R(8, 92, Math.max(0, this.fluss - 8), 1, "#bcd4ff"); }
      itemsZeichnen(this, t);
    },
    klick(lx, ly) {
      if (ly < 70 || ly > 100) return false;
      const c = this.crops.find((k) => k.t >= 7 && Math.abs(k.x - lx) < 6);
      if (!c) return false;
      this.ernten(c, true);
      return true;
    }
  };

  /* ----- Zuckerrohrfarm ----- */
  const zuckerrohr = {
    id: "zuckerrohr",
    init() {
      this.rohre = [1, 4, 7, 10, 13].map((bx) => ({ x: 8 + bx * 8 + 4, bx, h: rnd(0.2, 2.8), rate: rnd(0.35, 0.6), kolben: 0, blitz: 0, schnitt: false }));
      this.items = []; this.truhe = 0;
    },
    update(dt, S) {
      this.rohre.forEach((r) => {
        r.blitz = Math.max(0, r.blitz - dt);
        if (!r.schnitt) {
          r.h = Math.min(3, r.h + dt * r.rate);
          if (r.h >= 3) { r.schnitt = true; r.blitz = 0.3; r.zeit = 0; }
        } else {
          r.zeit += dt;
          r.kolben = r.zeit < 0.25 ? r.zeit / 0.25 : Math.max(0, 1 - (r.zeit - 0.25) / 0.25);
          if (r.zeit >= 0.25 && !r.geschnitten) {
            r.geschnitten = true; r.h = 2;
            this.items.push({ x: r.x, y: 80, typ: "rohr", pfad: [[r.x, 98, 110], [132, 98, 40], [132, 114, 70]], i: 0 });
          }
          if (r.zeit >= 0.5) { r.schnitt = false; r.geschnitten = false; r.kolben = 0; }
        }
      });
      this.truhe = Math.max(0, this.truhe - dt);
      itemsAktualisieren(this, dt, S);
    },
    ankunft() { this.truhe = 0.2; },
    zeichne(t) {
      R(0, 14, 152, 128, "#0c1016");
      for (let i = 0; i < 6; i++) R(10 + i * 24, 14, 10, 3, "#f3e2a0");
      for (let bx = 0; bx < 15; bx++) R(8 + bx * 8, 52, 8, 8, bx % 2 ? "#4d535b" : "#585f68");
      const sand = [1, 4, 7, 10, 13];
      for (let bx = 0; bx < 15; bx++) {
        const x = 8 + bx * 8;
        if (sand.includes(bx)) blk(x, 100, SAND); else wasserBlock(x, 100, t, bx);
        blk(x, 108, "#4d535b"); blk(x, 116, STEIN);
      }
      trichter(128, 100); truhe(126, 108, this.truhe);
      this.rohre.forEach((r) => {
        R(r.x - 6, 60, 4, 16, "#4d535b");
        kolben(r.x - 12, 76, r.kolben, false);
        beobachter(r.x + 8, 76, r.blitz);
        const n = Math.floor(r.h), rest = r.h - n;
        for (let k = 0; k < n; k++) { const y = 100 - 8 * (k + 1); R(r.x - 2, y, 4, 8, "#8dbb4c"); R(r.x - 2, y + 3, 4, 1, "#5d8530"); R(r.x - 3, y + 1, 1, 2, "#a8d065"); }
        if (rest > 0 && n < 3) { const h = Math.round(rest * 8), y = 100 - 8 * n - h; R(r.x - 2, y, 4, h, "#9ccb58"); }
      });
      itemsZeichnen(this, t);
    }
  };

  /* ----- Seetangfarm ----- */
  const seetang = {
    id: "seetang",
    init() {
      this.stiele = [0, 1, 2, 3, 4, 5].map((i) => ({ x: 22 + i * 18, l: rnd(1, 8), rate: rnd(0.7, 1.3), kolben: 0, zeit: -1 }));
      this.items = []; this.truhe = 0;
    },
    update(dt, S) {
      this.stiele.forEach((s) => {
        if (s.zeit < 0) {
          s.l = Math.min(10, s.l + dt * s.rate);
          if (s.l >= 10) s.zeit = 0;
        } else {
          s.zeit += dt;
          s.kolben = s.zeit < 0.25 ? s.zeit / 0.25 : Math.max(0, 1 - (s.zeit - 0.25) / 0.25);
          if (s.zeit >= 0.25 && !s.ab) {
            s.ab = true; s.l = 3;
            this.items.push({ x: s.x, y: 34, typ: "kelp", pfad: [[132, 34, 34], [132, 112, 90]], i: 0 });
          }
          if (s.zeit >= 0.5) { s.zeit = -1; s.ab = false; s.kolben = 0; }
        }
      });
      this.truhe = Math.max(0, this.truhe - dt);
      itemsAktualisieren(this, dt, S);
    },
    ankunft() { this.truhe = 0.2; },
    zeichne(t) {
      R(0, 14, 152, 128, "#0c1016");
      R(8, 30, 120, 88, "#183a82");
      R(8, 30, 120, 22, "#1f4797");
      for (let i = 0; i < 9; i++) R(12 + ((i * 37 + t * 6) % 112), 40 + ((i * 53) % 70), 2, 2, "rgba(150,200,255,0.25)");
      R(6, 28, 2, 92, "#9fd0e6"); R(128, 28, 2, 92, "#9fd0e6"); R(6, 28, 124, 2, "#9fd0e6");
      for (let bx = 0; bx < 15; bx++) blk(8 + bx * 8, 118, SAND);
      for (let bx = 0; bx < 15; bx++) R(8 + bx * 8, 22, 8, 6, bx % 2 ? "#4d535b" : "#585f68");
      R(128, 30, 8, 82, "#3b3e43"); R(130, 32, 4, 78, "#222");
      trichter(128, 22); truhe(126, 112, this.truhe);
      this.stiele.forEach((s, i) => {
        kolben(s.x - 4, 22, s.kolben, true);
        const n = Math.ceil(s.l);
        for (let k = 0; k < n; k++) {
          const y = 118 - 8 * (k + 1), sw = Math.sin(t * 2 + i * 0.9 + k * 0.5) * 1.6;
          R(s.x - 2 + sw, y, 4, 8, k % 2 ? "#2f8f4a" : "#37a356");
          R(s.x + 1 + sw, y + 2, 1, 4, "#1c6a33");
        }
      });
      itemsZeichnen(this, t);
    }
  };

  /* ----- Monsterfarm ----- */
  const monster = {
    id: "monster",
    init() { this.mobs = []; this.items = []; this.truhe = 0; this.taktE = rnd(0.6, 1.2); this.schlag = 0; },
    mobTot(m, S) {
      m.weg = true; this.schlag = 0.25;
      const alt = Math.random() < 0.5;
      this.items.push({ x: 68, y: 108, typ: "beute", alt, pfad: [[68, 118, 60]], i: 0 });
      for (let k = 0; k < 2; k++) this.items.push({ x: 68 + rnd(-4, 4), y: 104 - k * 3, typ: "xp", pfad: [[58, 100 - k * 4, 40], [34, 128, 70]], i: 0 });
    },
    update(dt, S) {
      this.taktE -= dt;
      if (this.taktE <= 0 && this.mobs.length < 6) {
        this.taktE = rnd(0.9, 2);
        this.mobs.push({ x: rnd(14, 122), y: 44, z: "geh", w: 0, fall: 0 });
      }
      this.mobs.forEach((m) => {
        if (m.z === "geh") {
          const ziel = 68;
          m.x += Math.sign(ziel - m.x) * 26 * dt;
          if (Math.abs(ziel - m.x) < 1.5) { m.x = 68; m.z = "fall"; }
        } else if (m.z === "fall") {
          m.fall += 260 * dt; m.y += m.fall * dt;
          if (m.y >= 100) { m.y = 100; m.z = "warte"; m.w = 0.5; }
        } else if (m.z === "warte") {
          m.w -= dt;
          if (m.w <= 0) this.mobTot(m, S);
        }
      });
      this.mobs = this.mobs.filter((m) => !m.weg);
      this.schlag = Math.max(0, this.schlag - dt);
      this.truhe = Math.max(0, this.truhe - dt);
      itemsAktualisieren(this, dt, S);
    },
    ankunft(typ) { if (typ === "beute") this.truhe = 0.2; },
    zeichne(t) {
      R(0, 14, 152, 128, "#07090d");
      for (let bx = 0; bx < 15; bx++) { R(8 + bx * 8, 20, 8, 8, "#1c2026"); }
      for (let bx = 0; bx < 15; bx++) {
        if (bx === 7) continue;
        const x = 8 + bx * 8;
        blk(x, 48, "#101318");
        R(x, 44, 8, 4, WASSER); R(x + 1 + ((t * 10 + bx * 3) % 6 | 0) * (bx < 7 ? 1 : -1) + (bx < 7 ? 0 : 0), 45, 2, 1, "#7aa5ff");
      }
      for (let y = 56; y < 112; y += 8) { blk(56, y, "#2a2f36"); blk(80, y, "#2a2f36"); R(64, y, 16, 8, "#0b0e12"); R(64, y, 1, 8, "#16301f"); }
      R(64, 52, 16, 4, "#173a8c"); // Wasserfall im Schacht
      for (let y = 56; y < 112; y += 6) R(66 + ((y * 5) % 6), y + ((t * 40) % 6 | 0), 2, 3, "#4a78d8");
      trichter(64, 108); truhe(60, 116, this.truhe);
      blk(48, 108, "#2a2f36"); blk(80, 108, "#2a2f36");
      this.mobs.forEach((m, i) => {
        // allgemeine Schattenfigur, bewusst keine bekannte Spielfigur
        const x = Math.round(m.x) - 3, y = Math.round(m.y), br = i % 2 ? 7 : 5;
        R(x - (br - 6) / 2, y - 11, br, 11, "#3a3347"); R(x, y - 15, 6, 4, "#4a4259");
        R(x + 1, y - 14, 1, 2, "#e8f0ff"); R(x + 4, y - 14, 1, 2, "#e8f0ff");
      });
      if (this.schlag > 0) { R(76, 92, 3, 14, "#fff"); R(72, 90, 3, 3, "#e8e8e8"); R(78, 104, 5, 2, "#fff"); }
      itemsZeichnen(this, t);
    },
    klick(lx, ly) {
      const m = this.mobs.find((k) => Math.abs(k.x - lx) < 8 && ly > k.y - 18 && ly < k.y + 4);
      if (!m) return false;
      this.mobTot(m);
      return true;
    }
  };

  /* ----- Eisenfarm ----- */
  const eisen = {
    id: "eisen",
    init() { this.golem = null; this.items = []; this.truhe = 0; this.takt = rnd(1, 2); this.dorf = rnd(0, 6); },
    update(dt, S) {
      this.dorf += dt;
      this.takt -= dt;
      if (!this.golem && this.takt <= 0) { this.golem = { x: 80, y: 46, z: "geh", fall: 0, w: 0 }; this.takt = rnd(2.5, 4); }
      const gm = this.golem;
      if (gm) {
        if (gm.z === "geh") { gm.x += 22 * dt; if (gm.x >= 112) { gm.x = 112; gm.z = "fall"; } }
        else if (gm.z === "fall") {
          gm.fall += 260 * dt; gm.y += gm.fall * dt;
          if (gm.y >= 96) { gm.y = 96; gm.z = "tot"; gm.w = 0.3; }
        } else if (gm.z === "tot") {
          gm.w -= dt;
          if (gm.w <= 0) {
            for (let k = 0; k < 3; k++) this.items.push({ x: 112 + rnd(-3, 3), y: 98 - k * 3, typ: "eisen", pfad: [[112, 110, 70]], i: 0 });
            this.golem = null;
          }
        }
      }
      this.truhe = Math.max(0, this.truhe - dt);
      itemsAktualisieren(this, dt, S);
    },
    ankunft() { this.truhe = 0.2; },
    zeichne(t) {
      R(0, 14, 152, 128, "#0c1016");
      // Dorfbewohner-Kammer
      R(8, 56, 48, 56, "#101a24"); R(6, 54, 52, 2, "#9fd0e6"); R(6, 54, 2, 60, "#9fd0e6"); R(56, 54, 2, 60, "#9fd0e6"); R(6, 112, 52, 2, "#9fd0e6");
      for (let bx = 0; bx < 6; bx++) blk(8 + bx * 8, 112, "#4d535b");
      [14, 28, 42].forEach((x, i) => {
        R(x - 2, 104, 14, 4, "#b02e26"); R(x - 2, 108, 14, 4, "#6d4a26"); R(x + 8, 102, 4, 2, "#eee");
        const w = Math.sin(this.dorf * 1.6 + i) * 1;
        R(x + 1, 92 + w, 6, 6, "#7a6a5a"); R(x + 2, 87 + w, 4, 5, "#d9b48c"); R(x + 3, 89 + w, 1, 1, "#222"); R(x + 5, 89 + w, 1, 1, "#222");
      });
      // Plattform und Schacht
      for (let bx = 0; bx < 8; bx++) blk(64 + bx * 8, 52, bx === 6 ? "#4a1f1a" : "#7d7f86");
      R(64, 52, 56, 2, "#c8c8a0");
      R(104, 52, 8, 8, "#0c1016");
      for (let y = 60; y < 104; y += 8) { blk(96, y, "#2a2f36"); blk(120, y, "#2a2f36"); }
      const lava = 0.85 + 0.15 * Math.sin(t * 6);
      R(104, 96, 16, 8, "#e5601a"); R(104, 96, 16, 2, "#ffb347"); R(106, 100, 4, 2, "#ffd27a"); R(112 + lava * 2, 98, 3, 2, "#ffe9a8");
      blk(96, 96, "#2a2f36"); blk(120, 96, "#2a2f36");
      blk(104, 104, "#2a2f36"); trichter(108, 108); truhe(104, 116, this.truhe); blk(120, 108, "#2a2f36");
      const gm = this.golem;
      if (gm) {
        const x = Math.round(gm.x) - 5, y = Math.round(gm.y);
        if (gm.z !== "tot") {
          // schlichte graue Blockfigur
          R(x, y - 12, 10, 10, "#b8bdc2"); R(x + 2, y - 17, 6, 5, "#9aa0a6");
          R(x + 3, y - 15, 1, 1, "#33383d"); R(x + 6, y - 15, 1, 1, "#33383d");
          R(x + 1, y - 2, 3, 4, "#8e949a"); R(x + 6, y - 2, 3, 4, "#8e949a");
        } else { R(x - 2, y - 2, 14, 2, "#ffb347"); }
      }
      itemsZeichnen(this, t);
    }
  };

  /* ----- Lagerhalle ----- */
  const LAGER = [
    { typ: "weizen", name: "Weizen", farbe: "#d8bf5a" },
    { typ: "rohr", name: "Zuckerrohr", farbe: "#8dbb4c" },
    { typ: "kelp", name: "Seetang", farbe: "#2f8f4a" },
    { typ: "beute", name: "Monsterbeute", farbe: "#bdb8a8" },
    { typ: "eisen", name: "Eisenbarren", farbe: "#dcdcdc" }
  ];
  const lager = {
    id: "lager",
    init() { this.puls = {}; this.items = []; },
    gutschrift(typ) { this.puls[typ] = 0.25; },
    update(dt) { Object.keys(this.puls).forEach((k) => { this.puls[k] = Math.max(0, this.puls[k] - dt); }); },
    zeichne(t, S) {
      R(0, 14, 152, 128, "#0c1016");
      for (let i = 0; i < 6; i++) R(10 + i * 24, 14, 10, 3, "#f3e2a0");
      R(6, 40, 140, 6, "#3b3e43"); R(6, 42, 140, 2, "#222");
      for (let i = 0; i < 18; i++) R(8 + ((i * 8 + t * 20) % 136), 42, 3, 2, "#9aa0a6");
      LAGER.forEach((l, i) => {
        const x = 12 + i * 27;
        R(x + 7, 46, 2, 26, "#3b3e43");
        beobachter(x + 12, 56, 0); R(x + 14, 58, 2, 2, "#ff5a4a");
        trichter(x + 4, 70);
        const p = (this.puls[l.typ] || 0) > 0 ? 1 : 0;
        truhe(x, 82, p);
        R(x + 4, 80, 8, 3, l.farbe);
        const anteil = Math.min(1, (S.zaehler[l.typ] || 0) / 1728);
        R(x, 102, 16, 4, "#000"); R(x + 1, 103, 14, 2, "#1e232a");
        if (S.zaehler[l.typ] > 0) R(x + 1, 103, Math.max(1, Math.round(14 * anteil)), 2, l.farbe);
        R(x + 5, 108, 6, 6, l.farbe); R(x + 5, 108, 6, 1, "#fff");
      });
      R(6, 122, 140, 2, "#2b3540");
    }
  };

  const RAEUME = [getreide, zuckerrohr, seetang, monster, eisen, lager];
  const ZELLE = { w: 152, h: 142 };
  const ZELLEN = RAEUME.map((r, i) => ({ r, x: 6 + (i % 3) * 156, y: 6 + Math.floor(i / 3) * 146 }));

  /* ---------- Simulation ---------- */
  const SIM = {
    zaehler: { weizen: 0, rohr: 0, kelp: 0, beute: 0, eisen: 0, xp: 0 },
    laeuft: !reduce, tempo: 1, sichtbar: false, auswahl: -1, hover: -1, t: 0, letzt: 0, schleife: false,
    gesehen: new Set(), ton: 0,
    gib(farm, typ) {
      this.zaehler[typ] = (this.zaehler[typ] || 0) + 1;
      if (farm.ankunft) farm.ankunft(typ);
      lager.gutschrift(typ);
      if (this.tempo === 1 && performance.now() - this.ton > 220) { this.ton = performance.now(); if (typ === "xp") Ton.xp(); else Ton.klick(); }
      lagerAnzeigen();
    }
  };

  function menge(n) { return n < 64 ? String(n) : plural(Math.floor(n / 64), "Stack", "Stacks") + " + " + (n % 64); }
  let lagerUhr = 0;
  function lagerAnzeigen(erzwingen) {
    const jetzt = performance.now();
    if (!erzwingen && jetzt - lagerUhr < 250) return;
    lagerUhr = jetzt;
    const ul = $("lager");
    if (!ul.children.length) {
      LAGER.concat([{ typ: "xp", name: "Erfahrung", farbe: "#7fd13b" }]).forEach((l) => {
        const li = el("li"); li.dataset.typ = l.typ;
        const p = el("span", "punkt"); p.style.background = l.farbe; p.setAttribute("aria-hidden", "true");
        const m = el("span", "menge"); m.append(el("strong", "", l.name), el("span", "wert", "0"));
        li.append(p, m); ul.append(li);
      });
    }
    ul.querySelectorAll("li").forEach((li) => {
      const t = li.dataset.typ, n = SIM.zaehler[t] || 0;
      li.querySelector(".wert").textContent = t === "xp" ? String(n) : menge(n);
    });
  }

  function aufwaermen() {
    RAEUME.forEach((r) => r.init());
    SIM.zaehler = { weizen: 0, rohr: 0, kelp: 0, beute: 0, eisen: 0, xp: 0 };
    for (let i = 0; i < 160; i++) RAEUME.forEach((r) => r.update(0.05, SIM));
    SIM.zaehler = { weizen: 0, rohr: 0, kelp: 0, beute: 0, eisen: 0, xp: 0 };
    RAEUME.forEach((r) => { if (r.items) r.items = []; });
    lagerAnzeigen(true);
  }

  /* ---------- Zeichnen ---------- */
  function zeichnen() {
    R(0, 0, W, H, "#12161c");
    ZELLEN.forEach((z, i) => {
      g.save();
      g.beginPath(); g.rect(z.x, z.y, ZELLE.w, ZELLE.h); g.clip();
      g.translate(z.x, z.y);
      z.r.zeichne(SIM.t, SIM);
      R(0, 0, ZELLE.w, 14, "#0a0d12");
      g.restore();
      const rahmen = i === SIM.auswahl ? "#f2d04a" : i === SIM.hover ? "#ffffff" : "#3a4552";
      R(z.x - 2, z.y - 2, ZELLE.w + 4, 2, rahmen); R(z.x - 2, z.y + ZELLE.h, ZELLE.w + 4, 2, rahmen);
      R(z.x - 2, z.y, 2, ZELLE.h, rahmen); R(z.x + ZELLE.w, z.y, 2, ZELLE.h, rahmen);
    });
    $("sim-status").textContent = (SIM.laeuft ? "läuft" : "angehalten") + " · " + SIM.tempo + "×";
  }

  function schritt(jetzt) {
    if (!SIM.sichtbar || document.visibilityState === "hidden" || !SIM.laeuft) { SIM.schleife = false; zeichnen(); return; }
    const dtReal = Math.min(0.1, (jetzt - SIM.letzt) / 1000);
    SIM.letzt = jetzt;
    let rest = dtReal * SIM.tempo;
    while (rest > 0) {
      const dt = Math.min(0.05, rest);
      rest -= dt; SIM.t += dt;
      RAEUME.forEach((r) => r.update(dt, SIM));
    }
    zeichnen();
    requestAnimationFrame(schritt);
  }
  function anwerfen() {
    if (SIM.schleife) return;
    if (!SIM.laeuft || !SIM.sichtbar) { zeichnen(); return; }
    SIM.schleife = true; SIM.letzt = performance.now();
    requestAnimationFrame(schritt);
  }

  /* ---------- Auswahl und Infofeld ---------- */
  function infoZeigen(i) {
    const box = $("sim-info");
    box.replaceChildren();
    if (i < 0) {
      const h = el("h3", "", "Innenraum"); h.id = "si-titel";
      box.append(h);
      box.append(el("p", "ti-text", "Sechs Räume mit Farmen als Beispiel. Klick auf einen Raum oder wähle ihn in der Liste. Dann siehst du, wie die Anlage funktioniert und aus welchen Blöcken du sie baust."));
      box.append(el("p", "ti-tipp", "Tipp: Reife Weizenpflanzen und Monster lassen sich mit einem Klick selbst abernten."));
      return;
    }
    const f = FARMEN[i];
    const h = el("h3", "", f.titel); h.id = "si-titel";
    box.append(h);
    if (f.kurz) box.append(el("p", "ti-kurz", f.kurz));
    if (f.text) box.append(el("p", "ti-text", f.text));
    if ((f.schritte || []).length) {
      box.append(el("h4", "", "So läuft es ab"));
      const ol = el("ol", "schritte");
      f.schritte.forEach((s) => ol.append(el("li", "", s)));
      box.append(ol);
    }
    if ((f.bloecke || []).length) {
      box.append(el("h4", "", "Bauvorschlag: gebaut aus"));
      const ul = el("ul", "bloecke");
      f.bloecke.forEach((b) => ul.append(A.blockChip(b.name, b.rolle)));
      box.append(ul);
    }
    if (f.hinweis) box.append(el("p", "ti-tipp", "Gut zu wissen: " + f.hinweis));
  }

  function listeBauen() {
    const ul = $("sim-liste");
    ul.replaceChildren();
    FARMEN.forEach((f, i) => {
      const li = el("li");
      const b = el("button", "teil-knopf"); b.type = "button"; b.dataset.id = f.id; b.setAttribute("aria-pressed", "false");
      b.append(el("strong", "", f.titel), el("span", "", f.kurz || ""));
      b.addEventListener("click", () => waehlen(i));
      li.append(b); ul.append(li);
    });
    const namen = $("sim-namen");
    namen.replaceChildren();
    ZELLEN.forEach((z, i) => {
      if (!FARMEN[i]) return;
      const n = el("span", "sim-name", FARMEN[i].titel);
      n.style.left = ((z.x / W) * 100).toFixed(2) + "%"; n.style.top = ((z.y / H) * 100).toFixed(2) + "%";
      n.dataset.i = i;
      namen.append(n);
    });
  }
  function markieren() {
    document.querySelectorAll("#sim-liste .teil-knopf").forEach((b, i) => b.setAttribute("aria-pressed", i === SIM.auswahl ? "true" : "false"));
    document.querySelectorAll("#sim-namen .sim-name").forEach((n) => n.classList.toggle("aktiv", Number(n.dataset.i) === SIM.auswahl));
  }
  function waehlen(i) {
    const idx = typeof i === "number" ? i : FARMEN.findIndex((f) => f.id === i);
    if (idx < 0 || idx >= RAEUME.length) return;
    SIM.auswahl = idx;
    infoZeigen(idx); markieren();
    SIM.gesehen.add(idx);
    if (SIM.gesehen.size >= Math.min(RAEUME.length, FARMEN.length)) freischalten("inspektor");
    if (!SIM.laeuft || !SIM.sichtbar) zeichnen();
  }
  function finden(q) {
    const n = norm(q).trim();
    if (!n) return null;
    const alle = FARMEN.map((f) => ({ f, id: norm(f.id), ti: norm(f.titel) }));
    const t = alle.find((x) => x.id === n) || alle.find((x) => x.ti === n) || alle.find((x) => x.id.startsWith(n) || x.ti.startsWith(n)) || alle.find((x) => x.id.includes(n) || x.ti.includes(n));
    return t ? t.f : null;
  }
  window.VenatorFarmen = { namen: () => FARMEN.map((f) => f.id), finden, waehlen, zustand: SIM };

  /* ---------- Steuerung ---------- */
  function steuerungBauen() {
    const box = $("sim-steuerung");
    box.replaceChildren();
    const play = el("button", "knopf klein", ""); play.type = "button";
    const zeigePlay = () => { play.textContent = SIM.laeuft ? "Pause" : "Start"; play.setAttribute("aria-pressed", SIM.laeuft ? "true" : "false"); };
    play.addEventListener("click", () => { SIM.laeuft = !SIM.laeuft; zeigePlay(); if (SIM.laeuft) anwerfen(); else zeichnen(); });
    zeigePlay();
    box.append(play);
    const tempos = [1, 4, 16];
    const tb = tempos.map((n) => {
      const b = el("button", "knopf klein", n + "×"); b.type = "button";
      b.setAttribute("aria-label", "Zeitraffer " + n + " mal");
      b.addEventListener("click", () => { SIM.tempo = n; tb.forEach((x, k) => x.setAttribute("aria-pressed", tempos[k] === n ? "true" : "false")); if (!SIM.laeuft) zeichnen(); });
      b.setAttribute("aria-pressed", n === SIM.tempo ? "true" : "false");
      return b;
    });
    tb.forEach((b) => box.append(b));
    const reset = el("button", "knopf klein", "Neu starten"); reset.type = "button";
    reset.addEventListener("click", () => { aufwaermen(); zeichnen(); toast("Innenraum", "Alles zurückgesetzt.", "ernte"); });
    box.append(reset);
  }

  function zelleAn(e) {
    const r = cv.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * W, y = ((e.clientY - r.top) / r.height) * H;
    const i = ZELLEN.findIndex((z) => x >= z.x && x < z.x + ZELLE.w && y >= z.y && y < z.y + ZELLE.h);
    return i < 0 ? null : { i, lx: x - ZELLEN[i].x, ly: y - ZELLEN[i].y };
  }
  function eingabeStarten() {
    cv.addEventListener("pointermove", (e) => {
      const z = zelleAn(e), h = z ? z.i : -1;
      if (h !== SIM.hover) { SIM.hover = h; if (!SIM.laeuft || !SIM.sichtbar) zeichnen(); }
    });
    cv.addEventListener("pointerleave", () => { if (SIM.hover !== -1) { SIM.hover = -1; if (!SIM.laeuft || !SIM.sichtbar) zeichnen(); } });
    cv.addEventListener("click", (e) => {
      const z = zelleAn(e);
      if (!z) return;
      const r = RAEUME[z.i];
      if (r.klick && r.klick(z.lx, z.ly)) { if (SIM.tempo === 1) Ton.klick(); if (!SIM.laeuft) zeichnen(); }
      waehlen(z.i);
    });
  }

  /* ---------- Start ---------- */
  function start() {
    listeBauen();
    steuerungBauen();
    infoZeigen(-1);
    aufwaermen();
    eingabeStarten();
    A.f3.push(() => "Innenraum: " + (SIM.laeuft ? "läuft" : "Pause") + ", " + SIM.tempo + "×, Weizen " + SIM.zaehler.weizen + ", Eisen " + SIM.zaehler.eisen + ", XP " + SIM.zaehler.xp);
    zeichnen();
    if ("IntersectionObserver" in window) {
      new IntersectionObserver((es) => {
        SIM.sichtbar = es.some((x) => x.isIntersecting);
        if (SIM.sichtbar) anwerfen();
      }, { threshold: 0.1 }).observe($("sim-buehne"));
    } else { SIM.sichtbar = true; anwerfen(); }
    document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") anwerfen(); });
  }

  start();
})();
