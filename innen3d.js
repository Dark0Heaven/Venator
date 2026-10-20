/* =====================================================================
   Innenraum in 3D: Block-Querschnitt mit den sechs Farm-Räumen.
   Eigener kleiner WebGL-Renderer, ohne Zusatzbibliothek. Alles wird beim
   Laden aus Blöcken gebaut, es gibt keine Modelldatei. Die Räume sind
   eine Skizze, keine genaue Bauanleitung. Texte stehen in config.js.
   Auswahl und Infofeld teilt sich dieses Modul mit farmen.js.
   ===================================================================== */
(() => {
  "use strict";

  const A = window.VenatorApp;
  const CFG = window.VENATOR_CONFIG || {};
  const sek = document.getElementById("innenraum");
  const FARMEN = (CFG.innenraum && CFG.innenraum.farmen) || [];
  if (!A || !sek || !FARMEN.length) return;

  const { $, el, reduce, klammer } = A;
  const farm = () => window.VenatorFarmen;
  const rad = (g) => (g * Math.PI) / 180;

  const cv = $("i3d-canvas"), buehne = $("i3d-buehne"), pinsBox = $("i3d-pins");
  const tip = $("i3d-tip"), status = $("i3d-status"), hinweis = $("i3d-hinweis");
  const tabsBox = $("innen-tabs"), tab3 = $("tab-3d"), tab2 = $("tab-2d"), p3 = $("panel-3d"), p2 = $("panel-2d"), lagerBox = $("lager-box");

  /* ---------- Blockarten (eigene Farben) ---------- */
  const hex = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const MATS = [null];
  function mk(h, o) {
    o = o || {};
    MATS.push({ c: hex(h), a: o.a == null ? 1 : o.a, em: o.em ? 1 : 0, w: o.w ? 1 : 0, n: o.n == null ? 0.07 : o.n, chk: o.chk || 0 });
    return MATS.length - 1;
  }
  const STEIN = mk("#69707a"), DUNKEL = mk("#2b3038"), BODEN = mk("#8b929b", { chk: 1, n: 0.03 }), METALL = mk("#a9b0b8", { n: 0.03 });
  const EISEN = mk("#dcdcdc", { n: 0.03 }), HOLZ = mk("#8a5a2b"), PLANKEN = mk("#a8854f"), GLAS = mk("#bfe3ee", { a: 0.3, n: 0 });
  const WASSER = mk("#2f66d8", { a: 0.62, w: 1, n: 0 }), SAND = mk("#dbd3a0"), ACKER = mk("#5b3b1f"), NASS = mk("#3f2915");
  const WEIZEN = mk("#5fae3c"), REIF = mk("#d8bf5a"), ROHR = mk("#8dbb4c"), TANG = mk("#2f9a4e"), TANG2 = mk("#23823f");
  const LAVA = mk("#e8641c", { em: 1 }), GLUT = mk("#ffe08a", { em: 1, n: 0.02 }), LATERNE = mk("#b8e8d8", { em: 1, n: 0.02 });
  const BETTR = mk("#b02e26"), BETTW = mk("#e8e8e8"), TRICHTER = mk("#4a4a4d"), KOLBEN = mk("#a38a5c"), KOLBENK = mk("#d0bc8c");
  const BEOB = mk("#6b6b6b"), ROT = mk("#ff4a3a", { em: 1 }), OBSIDIAN = mk("#2a1f45"), PLATTE = mk("#23272e"), TRUHE = mk("#9c6933");
  const GRAU = mk("#9aa0a6");

  /* ---------- Raster ---------- */
  const R = 22, GAP = 4, M = 2;
  const W = 2 * M + 3 * R + 2 * GAP, D = 2 * M + 2 * R + GAP, H = 26;
  const BASEY = 2;                              // Raumboden liegt auf dieser Höhe
  const grid = new Uint8Array(W * H * D), raum = new Uint8Array(W * H * D);
  const gi = (x, y, z) => (y * D + z) * W + x;
  const inGrid = (x, y, z) => x >= 0 && y >= 0 && z >= 0 && x < W && y < H && z < D;
  function put(x, y, z, m, r) { if (inGrid(x, y, z)) { grid[gi(x, y, z)] = m; raum[gi(x, y, z)] = m ? (r || 0) : 0; } }
  function fill(x0, y0, z0, x1, y1, z1, m, r) {
    for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) put(x, y, z, m, r);
  }
  const hash = (x, y, z) => { let h = (x * 73856093) ^ (y * 19349663) ^ (z * 83492791); h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967295; };

  const ORIGIN = [0, 1, 2, 3, 4, 5].map((i) => ({ x: M + (i % 3) * (R + GAP), z: M + Math.floor(i / 3) * (R + GAP) }));
  const OBEN = [8, 7, 16, 13, 10, 7];           // grobe Höhe pro Raum für die Beschriftung
  function lokal(i) {
    const o = ORIGIN[i], id = i + 1;
    return {
      put: (x, y, z, m) => put(o.x + x, BASEY + y, o.z + z, m, id),
      fill: (x0, y0, z0, x1, y1, z1, m) => fill(o.x + x0, BASEY + y0, o.z + z0, o.x + x1, BASEY + y1, o.z + z1, m, id)
    };
  }
  function huelle(r) {
    r.fill(0, 0, 0, R - 1, 0, R - 1, BODEN);
    r.fill(0, 1, 0, R - 1, 2, 0, STEIN); r.fill(0, 1, R - 1, R - 1, 2, R - 1, STEIN);
    r.fill(0, 1, 0, 0, 2, R - 1, STEIN); r.fill(R - 1, 1, 0, R - 1, 2, R - 1, STEIN);
    [[0, 0], [R - 1, 0], [0, R - 1], [R - 1, R - 1]].forEach((p) => r.put(p[0], 3, p[1], GLUT));
  }
  function lichtbalken(r, x0, x1, z, y) {
    r.fill(x0, y, z, x1, y, z, METALL);
    for (let x = x0 + 2; x < x1; x += 4) r.put(x, y - 1, z, GLUT);
  }

  /* ---------- Die sechs Räume ---------- */
  function getreide(r) {
    huelle(r);
    const wasser = [4, 7, 10, 13, 16];
    for (let x = 2; x <= 17; x++) {
      const w = wasser.indexOf(x) >= 0;
      for (let z = 3; z <= 14; z++) {
        r.put(x, 1, z, w ? WASSER : ACKER);
        if (!w) {
          const s = hash(x, 1, z);
          r.put(x, 2, z, s > 0.55 ? REIF : WEIZEN);
          if (s > 0.8) r.put(x, 3, z, REIF);
        }
      }
    }
    r.fill(2, 1, 15, 17, 1, 15, WASSER); r.fill(2, 0, 16, 17, 1, 16, STEIN);
    r.fill(18, 1, 15, 19, 1, 15, TRICHTER); r.fill(20, 1, 14, 20, 1, 15, TRUHE);
    lichtbalken(r, 1, 18, 2, 7); lichtbalken(r, 1, 18, 15, 7);
    [[1, 2], [18, 2], [1, 15], [18, 15]].forEach((p) => r.fill(p[0], 3, p[1], p[0], 6, p[1], STEIN));
  }

  function rohr(r) {
    huelle(r);
    const sx = [3, 6, 9, 12, 15, 18];
    for (let x = 2; x <= 19; x++) {
      const s = sx.indexOf(x) >= 0;
      r.put(x, 1, 10, s ? SAND : STEIN);
      if (s) { r.put(x, 1, 9, WASSER); r.put(x, 1, 11, WASSER); }
    }
    sx.forEach((x) => {
      const h = 2 + Math.floor(hash(x, 5, 3) * 2.2);
      for (let y = 2; y < 2 + h + 1 && y <= 4; y++) r.put(x, y, 10, ROHR);
      r.put(x - 1, 2, 10, STEIN); r.put(x + 1, 2, 10, STEIN);
      r.put(x - 1, 3, 10, KOLBEN); r.put(x - 1, 4, 10, KOLBENK);
      r.put(x + 1, 3, 10, BEOB); r.put(x + 1, 4, 10, ROT);
    });
    r.fill(2, 1, 13, 18, 1, 13, TRICHTER); r.fill(19, 1, 13, 20, 1, 13, TRUHE);
    lichtbalken(r, 1, 19, 6, 8); lichtbalken(r, 1, 19, 15, 8);
    [[1, 6], [19, 6], [1, 15], [19, 15]].forEach((p) => r.fill(p[0], 3, p[1], p[0], 7, p[1], STEIN));
  }

  function tang(r) {
    huelle(r);
    r.fill(2, 1, 3, 13, 1, 14, SAND);
    r.fill(3, 2, 4, 12, 12, 13, WASSER);
    for (let y = 2; y <= 13; y++) {
      r.fill(2, y, 3, 13, y, 3, GLAS); r.fill(2, y, 14, 13, y, 14, GLAS);
      r.fill(2, y, 3, 2, y, 14, GLAS); r.fill(13, y, 3, 13, y, 14, GLAS);
    }
    r.fill(2, 14, 3, 13, 14, 3, METALL); r.fill(2, 14, 14, 13, 14, 14, METALL);
    r.fill(2, 14, 3, 2, 14, 14, METALL); r.fill(13, 14, 3, 13, 14, 14, METALL);
    for (let x = 3; x <= 12; x++) r.put(x, 15, 3, x % 2 ? KOLBEN : BEOB);
    [4, 6, 8, 10, 12].forEach((x) => [5, 8, 11].forEach((z) => {
      const h = 4 + Math.floor(hash(x, 9, z) * 8);
      for (let y = 2; y <= Math.min(12, 1 + h); y++) r.put(x, y, z, y % 2 ? TANG : TANG2);
    }));
    [[3, 4], [12, 4], [3, 13], [12, 13]].forEach((p) => r.put(p[0], 2, p[1], LATERNE));
    r.fill(14, 1, 8, 16, 1, 8, TRICHTER); r.fill(17, 1, 8, 18, 1, 8, TRUHE);
    r.fill(14, 1, 9, 14, 2, 9, STEIN);
  }

  function monster(r) {
    huelle(r);
    r.fill(2, 9, 2, 19, 9, 19, PLATTE);
    r.fill(2, 10, 2, 19, 10, 2, OBSIDIAN); r.fill(2, 10, 19, 19, 10, 19, OBSIDIAN);
    r.fill(2, 10, 2, 2, 10, 19, OBSIDIAN); r.fill(19, 10, 2, 19, 10, 19, OBSIDIAN);
    for (let i = 3; i <= 9; i++) {
      [10, 11].forEach((k) => { r.put(i, 10, k, WASSER); r.put(R - 1 - i, 10, k, WASSER); r.put(k, 10, i, WASSER); r.put(k, 10, R - 1 - i, WASSER); });
    }
    for (let y = 1; y <= 8; y++) {
      [2, 19].forEach((x) => [2, 19].forEach((z) => r.put(x, y, z, STEIN)));
      [6, 15].forEach((x) => [6, 15].forEach((z) => r.put(x, y, z, STEIN)));
      for (let x = 9; x <= 12; x++) for (let z = 9; z <= 12; z++) {
        if (x >= 10 && x <= 11 && z >= 10 && z <= 11) continue;
        r.put(x, y, z, DUNKEL);
      }
    }
    r.put(10, 9, 10, 0); r.put(11, 9, 10, 0); r.put(10, 9, 11, 0); r.put(11, 9, 11, 0);
    r.fill(10, 1, 10, 11, 1, 10, TRICHTER); r.fill(10, 1, 11, 11, 1, 11, TRUHE);
    [[4, 4], [17, 4], [4, 17], [17, 17]].forEach((p) => r.put(p[0], 8, p[1], LATERNE));
  }

  function eisen(r) {
    huelle(r);
    for (let y = 1; y <= 4; y++) {
      r.fill(1, y, 3, 9, y, 3, GLAS); r.fill(1, y, 9, 9, y, 9, GLAS);
      r.fill(1, y, 3, 1, y, 9, GLAS); r.fill(9, y, 3, 9, y, 9, GLAS);
    }
    r.fill(1, 5, 3, 9, 5, 9, GLAS);
    [3, 5, 7].forEach((x) => {
      r.put(x, 1, 5, BETTW); r.put(x, 1, 6, BETTR); r.put(x, 1, 8, PLANKEN);
    });
    r.fill(11, 7, 3, 19, 7, 11, METALL);
    r.put(17, 7, 7, 0); r.put(18, 7, 7, 0);
    for (let y = 1; y <= 7; y++) {
      for (let z = 6; z <= 8; z++) { r.put(16, y, z, DUNKEL); r.put(19, y, z, DUNKEL); }
      for (let x = 17; x <= 18; x++) { r.put(x, y, 6, DUNKEL); if (y > 1) r.put(x, y, 8, DUNKEL); }
    }
    r.put(17, 2, 7, LAVA); r.put(18, 2, 7, LAVA);
    r.put(17, 1, 7, TRICHTER); r.put(18, 1, 7, TRICHTER);
    r.put(17, 1, 8, TRICHTER); r.put(18, 1, 8, TRICHTER);
    r.fill(17, 1, 9, 18, 1, 9, TRUHE);
    for (let y = 1; y <= 6; y++) [[11, 3], [11, 11], [15, 3], [15, 11]].forEach((p) => r.put(p[0], y, p[1], STEIN));
    r.fill(11, 8, 3, 11, 8, 11, DUNKEL); r.fill(19, 8, 3, 19, 8, 5, DUNKEL); r.fill(19, 8, 9, 19, 8, 11, DUNKEL);
    r.put(11, 9, 3, GLUT); r.put(11, 9, 11, GLUT);
  }

  const FARBEN = [REIF, ROHR, TANG, GRAU, EISEN];
  function lager(r) {
    huelle(r);
    for (let lage = 0; lage < 2; lage++) {
      for (let k = 0; k < 9; k++) {
        const x = 2 + k * 2;
        r.fill(x, 1 + lage, 2, x + 1, 1 + lage, 2, TRUHE);
        if (lage === 1) r.put(x, 3, 2, k % 2 ? GLUT : STEIN);
      }
    }
    r.fill(2, 1, 4, 19, 1, 4, STEIN);
    r.fill(2, 2, 4, 19, 2, 4, TRICHTER);
    r.fill(2, 4, 4, 19, 4, 4, METALL);
    for (let i = 0; i < 5; i++) {
      const x = 3 + i * 4;
      r.fill(x, 1, 6, x, 1, 8, TRICHTER);
      r.fill(x - 1, 1, 9, x + 1, 1, 9, TRUHE);
      r.fill(x - 1, 2, 9, x + 1, 2, 9, FARBEN[i]);
      r.put(x, 3, 9, LATERNE);
      r.put(x + 1, 2, 7, BEOB); r.put(x + 1, 3, 7, ROT);
    }
    r.fill(2, 1, 12, 19, 1, 12, PLATTE);
    for (let x = 2; x <= 19; x += 2) r.put(x, 2, 12, x % 4 ? STEIN : LATERNE);
  }

  /* ---------- Szene aufbauen ---------- */
  function szeneBauen() {
    // Grundplatte mit Gängen zwischen den Räumen
    fill(0, 0, 0, W - 1, 0, D - 1, DUNKEL);
    fill(0, 1, 0, W - 1, 1, D - 1, BODEN);
    fill(0, 1, 0, W - 1, 1, 0, METALL); fill(0, 1, D - 1, W - 1, 1, D - 1, METALL);
    fill(0, 1, 0, 0, 1, D - 1, METALL); fill(W - 1, 1, 0, W - 1, 1, D - 1, METALL);
    [getreide, rohr, tang, monster, eisen, lager].forEach((f, i) => f(lokal(i)));
    // Pfeiler an den Kreuzungen
    const px = [M + R + 1, M + 2 * R + GAP + 1], pz = [0, M + R + 1, D - 2];
    px.forEach((x) => pz.forEach((z) => { fill(x, 2, z, x + 1, 9, z + 1, STEIN); fill(x, 10, z, x + 1, 10, z + 1, GLUT); }));
  }

  /* ---------- Mesh ---------- */
  const FLAECHEN = [
    { d: [1, 0, 0], s: 0.82, c: [[1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]] },
    { d: [-1, 0, 0], s: 0.72, c: [[0, 0, 1], [0, 1, 1], [0, 1, 0], [0, 0, 0]] },
    { d: [0, 1, 0], s: 1.0, c: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]] },
    { d: [0, -1, 0], s: 0.5, c: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]] },
    { d: [0, 0, 1], s: 0.9, c: [[1, 0, 1], [1, 1, 1], [0, 1, 1], [0, 0, 1]] },
    { d: [0, 0, -1], s: 0.66, c: [[0, 0, 0], [0, 1, 0], [1, 1, 0], [1, 0, 0]] }
  ];
  const UVS = [[0, 0], [0, 255], [255, 255], [255, 0]], TRI = [0, 1, 2, 0, 2, 3];
  function meshBauen() {
    const op = { p: [], c: [], m: [] }, tr = { p: [], c: [], m: [] };
    for (let y = 0; y < H; y++) for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) {
      const i = gi(x, y, z), mi = grid[i];
      if (!mi) continue;
      const M0 = MATS[mi], ziel = M0.a < 1 ? tr : op;
      for (const f of FLAECHEN) {
        const nx = x + f.d[0], ny = y + f.d[1], nz = z + f.d[2];
        if (inGrid(nx, ny, nz)) {
          const nm = grid[gi(nx, ny, nz)];
          if (nm) {
            const N = MATS[nm];
            if (N.a >= 1) continue;                    // Nachbar ist undurchsichtig
            if (M0.a < 1 && nm === mi) continue;       // gleiche Glas- oder Wasserfläche
            if (M0.a < 1) continue;                    // durchsichtig an durchsichtig
          }
        }
        let b = 1 + (hash(x, y, z) - 0.5) * 2 * M0.n;
        if (M0.chk) b *= ((x + z) & 1) ? 1.05 : 0.95;
        const k = f.s * b, r = raum[i];
        const flag = M0.em ? 1 : M0.w ? 2 : 0;
        for (const t of TRI) {
          const cc = f.c[t];
          ziel.p.push(x + cc[0], y + cc[1], z + cc[2]);
          ziel.c.push(klammer(M0.c[0] * k, 0, 255), klammer(M0.c[1] * k, 0, 255), klammer(M0.c[2] * k, 0, 255), Math.round(M0.a * 255));
          ziel.m.push(r, flag, UVS[t][0], UVS[t][1]);
        }
      }
    }
    return { op, tr };
  }

  /* ---------- Mathe und Kamera ---------- */
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const unit = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
  function mul(a, b) {
    const o = new Float32Array(16);
    for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
      let s = 0;
      for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k];
      o[c * 4 + r] = s;
    }
    return o;
  }
  const FOV = rad(38), ASP_REF = 1.4;
  const fovTan = (asp) => Math.tan(FOV / 2) * Math.max(1, ASP_REF / asp);
  const abst = (d) => d * (ST.w && ST.h && ST.w / ST.h < 1.3 ? 1.28 : 1);
  const MITTE = [W / 2, 5, D / 2];

  const ST = {
    w: 1, h: 1, dpr: 1, cam: null, tween: null, sel: 0, hov: 0, drehen: !reduce, pinsAn: true,
    sichtbar: false, laeuft: false, letzt: 0, ruhe: 0, ziehen: false, bereit: false, tris: 0, hinweisT: 0, t0: performance.now()
  };
  const ANSICHTEN = {
    uebersicht: { name: "Übersicht", yaw: 24, pitch: 34, dist: 100 },
    oben: { name: "Von oben", yaw: 0, pitch: 86, dist: 92 },
    vorn: { name: "Von vorn", yaw: 0, pitch: 18, dist: 112 },
    seite: { name: "Von der Seite", yaw: 90, pitch: 18, dist: 88 }
  };

  function kameraWerte() {
    const c = ST.cam;
    const cp = Math.cos(c.pitch), sp = Math.sin(c.pitch), cy = Math.cos(c.yaw), sy = Math.sin(c.yaw);
    const eye = [c.t[0] + c.dist * cp * sy, c.t[1] + c.dist * sp, c.t[2] + c.dist * cp * cy];
    const f = [-cp * sy, -sp, -cp * cy];
    const r = unit(cross(f, [0, 1, 0]));
    return { eye, f, r, u: cross(r, f) };
  }
  function matrix(k) {
    const { eye, f, r, u } = k;
    const view = new Float32Array([r[0], u[0], -f[0], 0, r[1], u[1], -f[1], 0, r[2], u[2], -f[2], 0, -dot(r, eye), -dot(u, eye), dot(f, eye), 1]);
    const near = klammer(ST.cam.dist * 0.04, 0.5, 6), far = ST.cam.dist * 4 + 300;
    const asp = ST.w / ST.h, fc = 1 / fovTan(asp);
    const proj = new Float32Array([fc / asp, 0, 0, 0, 0, fc, 0, 0, 0, 0, (far + near) / (near - far), -1, 0, 0, (2 * far * near) / (near - far), 0]);
    return mul(proj, view);
  }
  function projizieren(k, p) {
    const v = sub(p, k.eye), x = dot(v, k.r), y = dot(v, k.u), z = dot(v, k.f);
    if (z <= 0.5) return null;
    const asp = ST.w / ST.h, th = fovTan(asp);
    return { x: (x / (z * th * asp) * 0.5 + 0.5) * ST.w, y: (0.5 - (y / (z * th)) * 0.5) * ST.h, z };
  }
  function strahlAn(px, py) {
    const r = cv.getBoundingClientRect();
    const nx = ((px - r.left) / r.width) * 2 - 1, ny = 1 - ((py - r.top) / r.height) * 2;
    const k = kameraWerte(), asp = r.width / r.height, th = fovTan(asp);
    return { o: k.eye, d: unit([0, 1, 2].map((i) => k.f[i] + k.r[i] * nx * th * asp + k.u[i] * ny * th)) };
  }

  /* ---------- Strahl durch das Raster (3D-DDA) ---------- */
  function strahl(o, d, tmax, ohneGlas) {
    const dim = [W, H, D];
    let t0 = 0, t1 = tmax;
    for (let a = 0; a < 3; a++) {
      if (Math.abs(d[a]) < 1e-9) { if (o[a] < 0 || o[a] > dim[a]) return null; }
      else {
        let ta = (0 - o[a]) / d[a], tb = (dim[a] - o[a]) / d[a];
        if (ta > tb) { const x = ta; ta = tb; tb = x; }
        if (ta > t0) t0 = ta;
        if (tb < t1) t1 = tb;
        if (t0 > t1) return null;
      }
    }
    const t = t0 + 1e-4, p = [o[0] + d[0] * t, o[1] + d[1] * t, o[2] + d[2] * t];
    const c = [0, 1, 2].map((a) => klammer(Math.floor(p[a]), 0, dim[a] - 1));
    const st = d.map((v) => (v > 0 ? 1 : -1));
    const delta = d.map((v) => (Math.abs(v) < 1e-9 ? Infinity : Math.abs(1 / v)));
    const tm = [0, 1, 2].map((a) => (Math.abs(d[a]) < 1e-9 ? Infinity : t + ((st[a] > 0 ? c[a] + 1 : c[a]) - p[a]) / d[a]));
    let tc = t;
    for (let n = 0, max = W + H + D + 4; n < max; n++) {
      const i = gi(c[0], c[1], c[2]), m = grid[i];
      if (m && !(ohneGlas && MATS[m].a < 1)) return { x: c[0], y: c[1], z: c[2], raum: raum[i], m, t: tc };
      const a = tm[0] < tm[1] ? (tm[0] < tm[2] ? 0 : 2) : (tm[1] < tm[2] ? 1 : 2);
      tc = tm[a];
      if (tc > t1) return null;
      c[a] += st[a]; tm[a] += delta[a];
      if (c[a] < 0 || c[a] >= dim[a]) return null;
    }
    return null;
  }

  /* ---------- WebGL ---------- */
  let gl = null, prog = null, buf = null;
  const U = {};
  const VS = "attribute vec3 aPos;attribute vec4 aCol;attribute vec4 aMeta;uniform mat4 uVP;varying vec4 vCol;varying vec2 vUV;varying float vRoom;varying float vFlag;varying vec3 vP;" +
    "void main(){gl_Position=uVP*vec4(aPos,1.0);vCol=aCol;vUV=aMeta.zw/255.0;vRoom=aMeta.x;vFlag=aMeta.y;vP=aPos;}";
  const FS = "precision mediump float;uniform float uSel;uniform float uHov;uniform float uTime;varying vec4 vCol;varying vec2 vUV;varying float vRoom;varying float vFlag;varying vec3 vP;" +
    "void main(){vec3 c=vCol.rgb;float e=min(min(vUV.x,1.0-vUV.x),min(vUV.y,1.0-vUV.y));c*=0.84+0.16*smoothstep(0.0,0.16,e);" +
    "if(vFlag>0.5&&vFlag<1.5){c*=1.0+0.3*sin(uTime*2.2+vP.x*0.8+vP.z*0.6);}" +
    "if(vFlag>1.5){c*=0.93+0.07*sin(uTime*1.6+vP.x*1.4+vP.z*1.1);}" +
    "float sel=step(abs(vRoom-uSel),0.5)*step(0.5,uSel);float hov=step(abs(vRoom-uHov),0.5)*step(0.5,uHov);" +
    "if(uSel>0.5){c*=mix(0.5,1.12,sel);}" +
    "c=mix(c,vec3(1.0,0.86,0.3),hov*0.2+sel*0.06);" +
    "gl_FragColor=vec4(c,vCol.a);}";

  function shader(typ, src) {
    const s = gl.createShader(typ);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || "Shader");
    return s;
  }
  function glStarten() {
    gl = cv.getContext("webgl", { antialias: true, alpha: false }) || cv.getContext("experimental-webgl", { antialias: true, alpha: false });
    if (!gl) throw new Error("kein WebGL");
    prog = gl.createProgram();
    gl.attachShader(prog, shader(gl.VERTEX_SHADER, VS));
    gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error("Programm");
    ["uVP", "uSel", "uHov", "uTime"].forEach((n) => { U[n] = gl.getUniformLocation(prog, n); });
    U.pos = gl.getAttribLocation(prog, "aPos"); U.col = gl.getAttribLocation(prog, "aCol"); U.meta = gl.getAttribLocation(prog, "aMeta");
    cv.addEventListener("webglcontextlost", (e) => { e.preventDefault(); ST.bereit = false; fallback("Die Grafik wurde vom Browser angehalten."); });
  }
  function puffer(m) {
    const mk1 = (typ, daten) => { const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, daten, gl.STATIC_DRAW); return b; };
    return { n: m.p.length / 3, p: mk1(0, new Float32Array(m.p)), c: mk1(0, new Uint8Array(m.c)), m: mk1(0, new Uint8Array(m.m)) };
  }
  function zeichneMesh(b) {
    if (!b.n) return;
    gl.bindBuffer(gl.ARRAY_BUFFER, b.p); gl.enableVertexAttribArray(U.pos); gl.vertexAttribPointer(U.pos, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, b.c); gl.enableVertexAttribArray(U.col); gl.vertexAttribPointer(U.col, 4, gl.UNSIGNED_BYTE, true, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, b.m); gl.enableVertexAttribArray(U.meta); gl.vertexAttribPointer(U.meta, 4, gl.UNSIGNED_BYTE, false, 0, 0);
    gl.drawArrays(gl.TRIANGLES, 0, b.n);
  }
  function zeichnen(jetzt) {
    if (!gl || !buf) return;
    gl.viewport(0, 0, cv.width, cv.height);
    gl.clearColor(0.016, 0.024, 0.047, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST); gl.disable(gl.CULL_FACE);
    gl.useProgram(prog);
    const k = kameraWerte();
    gl.uniformMatrix4fv(U.uVP, false, matrix(k));
    gl.uniform1f(U.uSel, ST.sel); gl.uniform1f(U.uHov, ST.hov);
    gl.uniform1f(U.uTime, reduce ? 0 : (jetzt - ST.t0) / 1000);
    gl.disable(gl.BLEND); gl.depthMask(true);
    zeichneMesh(buf.op);
    gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false);
    zeichneMesh(buf.tr);
    gl.depthMask(true); gl.disable(gl.BLEND);
    pinsLegen(k);
  }

  /* ---------- Beschriftungen (Pins) ---------- */
  const PINS = [];
  function pinsBauen() {
    pinsBox.replaceChildren();
    FARMEN.slice(0, 6).forEach((f, i) => {
      const b = el("button", "pin");
      b.type = "button";
      b.setAttribute("aria-label", f.titel);
      b.tabIndex = -1;
      b.append(el("span", "pin-punkt"), el("span", "pin-name", f.titel));
      b.addEventListener("click", () => waehlen(i, true));
      pinsBox.append(b);
      const o = ORIGIN[i];
      PINS.push({ i, b, pos: [o.x + R / 2, BASEY + OBEN[i] + 0.5, o.z + R / 2] });
    });
  }
  function pinsLegen(k) {
    pinsBox.classList.toggle("aus", !ST.pinsAn);
    if (!ST.pinsAn) return;
    PINS.forEach((p) => {
      const s = projizieren(k, p.pos);
      if (!s || s.x < -20 || s.y < -20 || s.x > ST.w + 20 || s.y > ST.h + 20) { p.b.style.display = "none"; return; }
      p.b.style.display = "";
      p.b.classList.toggle("links", s.x > ST.w - 170);
      p.b.style.transform = "translate(" + s.x.toFixed(1) + "px," + s.y.toFixed(1) + "px)";
      p.b.classList.toggle("aktiv", ST.sel === p.i + 1);
      const v = sub(p.pos, k.eye), dist = Math.hypot(v[0], v[1], v[2]);
      const h = strahl(k.eye, [v[0] / dist, v[1] / dist, v[2] / dist], dist - 1.2, true);
      p.b.classList.toggle("verdeckt", !!h);
    });
  }

  /* ---------- Auswahl, Flug, Ansichten ---------- */
  function tweenStarten(nach, dauer) {
    const c = ST.cam;
    let dy = nach.yaw - c.yaw;
    while (dy > Math.PI) dy -= 2 * Math.PI;
    while (dy < -Math.PI) dy += 2 * Math.PI;
    if (reduce) { c.yaw += dy; c.pitch = nach.pitch; c.dist = nach.dist; c.t = nach.t.slice(); anfordern(); return; }
    ST.tween = { t0: performance.now(), dauer: dauer || 800, von: { yaw: c.yaw, pitch: c.pitch, dist: c.dist, t: c.t.slice() }, nach: { yaw: c.yaw + dy, pitch: nach.pitch, dist: nach.dist, t: nach.t.slice() } };
    anfordern();
  }
  function ansicht(name) {
    const a = ANSICHTEN[name];
    if (!a) return;
    ST.drehenWar = ST.drehen;
    tweenStarten({ yaw: rad(a.yaw), pitch: rad(a.pitch), dist: abst(a.dist), t: MITTE.slice() });
  }
  function heranfliegen(i) {
    const o = ORIGIN[i];
    tweenStarten({ yaw: rad(22), pitch: rad(34), dist: abst(40 + (OBEN[i] > 12 ? 12 : 0)), t: [o.x + R / 2, BASEY + OBEN[i] / 2, o.z + R / 2] });
  }
  function waehlen(i, auchFarm) {
    if (auchFarm && farm()) farm().waehlen(i);     // farmen.js meldet die Auswahl zurück
    else setzeAuswahl(i);
  }
  function setzeAuswahl(i) {
    ST.sel = i >= 0 ? i + 1 : 0;
    anfordern();
  }
  document.addEventListener("venator:raum", (e) => { setzeAuswahl(e.detail && typeof e.detail.i === "number" ? e.detail.i : -1); });
  function abwaehlen() { ST.sel = 0; if (farm() && farm().abwaehlen) farm().abwaehlen(); anfordern(); }

  /* ---------- Werkzeuge ---------- */
  function werkzeugeBauen() {
    const box = $("i3d-werkzeuge");
    box.replaceChildren();
    Object.keys(ANSICHTEN).forEach((k) => {
      const b = el("button", "knopf klein", ANSICHTEN[k].name);
      b.type = "button";
      b.addEventListener("click", () => { ST.drehen = false; drehKnopf(); ansicht(k); });
      box.append(b);
    });
    const dreh = el("button", "knopf klein", "Drehen"); dreh.type = "button";
    const drehKnopfFn = () => dreh.setAttribute("aria-pressed", ST.drehen ? "true" : "false");
    dreh.addEventListener("click", () => { ST.drehen = !ST.drehen; drehKnopfFn(); anfordern(); });
    drehKnopf = drehKnopfFn; drehKnopfFn();
    box.append(dreh);
    const lab = el("button", "knopf klein", "Beschriftungen"); lab.type = "button";
    lab.setAttribute("aria-pressed", "true");
    lab.addEventListener("click", () => { ST.pinsAn = !ST.pinsAn; lab.setAttribute("aria-pressed", ST.pinsAn ? "true" : "false"); anfordern(); });
    box.append(lab);
  }
  let drehKnopf = () => {};

  /* ---------- Eingabe ---------- */
  const zeiger = new Map();
  let pinch = 0, bewegt = 0, downZeit = 0;
  function eingabeBegonnen() { ST.tween = null; if (ST.drehen) { ST.drehen = false; drehKnopf(); } }
  function raumAn(px, py) {
    const s = strahlAn(px, py);
    const h = strahl(s.o, s.d, 1e4, false);
    return h ? h.raum : 0;
  }
  function hoverPruefen(e) {
    const r = raumAn(e.clientX, e.clientY);
    if (r !== ST.hov) { ST.hov = r; anfordern(); }
    if (r) {
      const b = buehne.getBoundingClientRect();
      tip.textContent = FARMEN[r - 1] ? FARMEN[r - 1].titel : "";
      tip.hidden = false;
      tip.style.transform = "translate(" + (e.clientX - b.left + 14).toFixed(0) + "px," + (e.clientY - b.top + 14).toFixed(0) + "px)";
      cv.style.cursor = "pointer";
    } else { tip.hidden = true; cv.style.cursor = "grab"; }
  }
  let letzterTipp = 0;
  function tippen(e) {
    const r = raumAn(e.clientX, e.clientY), jetzt = performance.now();
    const doppelt = jetzt - letzterTipp < 380;
    letzterTipp = jetzt;
    if (!r) { if (ST.sel) abwaehlen(); return; }
    waehlen(r - 1, true);
    if (doppelt) { eingabeBegonnen(); heranfliegen(r - 1); }
  }
  function eingabeStarten() {
    cv.addEventListener("pointerdown", (e) => {
      cv.setPointerCapture(e.pointerId);
      zeiger.set(e.pointerId, { x: e.clientX, y: e.clientY });
      eingabeBegonnen();
      if (zeiger.size === 1) { bewegt = 0; downZeit = performance.now(); ST.ziehen = true; cv.style.cursor = "grabbing"; tip.hidden = true; }
      if (zeiger.size === 2) { const [a, b] = [...zeiger.values()]; pinch = Math.hypot(a.x - b.x, a.y - b.y); }
      anfordern();
    });
    cv.addEventListener("pointermove", (e) => {
      const p = zeiger.get(e.pointerId);
      if (!p) { if (e.pointerType === "mouse") hoverPruefen(e); return; }
      const dx = e.clientX - p.x, dy = e.clientY - p.y;
      p.x = e.clientX; p.y = e.clientY;
      if (zeiger.size === 1) {
        bewegt += Math.abs(dx) + Math.abs(dy);
        ST.cam.yaw -= dx * 0.0055;
        ST.cam.pitch = klammer(ST.cam.pitch + dy * 0.0055, rad(-10), rad(88));
      } else if (zeiger.size === 2) {
        const [a, b] = [...zeiger.values()], d = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinch > 0 && d > 0) ST.cam.dist = klammer(ST.cam.dist * (pinch / d), 18, 260);
        pinch = d;
      }
      anfordern();
    });
    const ende = (e) => {
      if (!zeiger.has(e.pointerId)) return;
      zeiger.delete(e.pointerId);
      if (zeiger.size === 0) {
        ST.ziehen = false; pinch = 0;
        cv.style.cursor = e.pointerType === "mouse" ? "grab" : "";
        if (e.type === "pointerup" && bewegt < 7 && performance.now() - downZeit < 600) tippen(e);
      }
    };
    cv.addEventListener("pointerup", ende);
    cv.addEventListener("pointercancel", ende);
    cv.addEventListener("pointerleave", () => { if (!ST.ziehen) { tip.hidden = true; if (ST.hov) { ST.hov = 0; anfordern(); } } });
    cv.addEventListener("wheel", (e) => {
      if (document.activeElement !== cv) {
        hinweis.hidden = false;
        clearTimeout(ST.hinweisT);
        ST.hinweisT = setTimeout(() => { hinweis.hidden = true; }, 2600);
        return;
      }
      e.preventDefault();
      eingabeBegonnen();
      ST.cam.dist = klammer(ST.cam.dist * Math.exp(e.deltaY * 0.0012), 18, 260);
      anfordern();
    }, { passive: false });
    cv.addEventListener("keydown", (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const c = ST.cam, k = e.key;
      if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "+", "=", "-", "_", "Escape", "r", "R"].includes(k)) return;
      eingabeBegonnen();
      if (k === "ArrowLeft") c.yaw += rad(6);
      else if (k === "ArrowRight") c.yaw -= rad(6);
      else if (k === "ArrowUp") c.pitch = klammer(c.pitch - rad(5), rad(-10), rad(88));
      else if (k === "ArrowDown") c.pitch = klammer(c.pitch + rad(5), rad(-10), rad(88));
      else if (k === "+" || k === "=") c.dist = klammer(c.dist * 0.88, 18, 260);
      else if (k === "-" || k === "_") c.dist = klammer(c.dist / 0.88, 18, 260);
      else if (k === "Escape") abwaehlen();
      else if (k === "r" || k === "R") ansicht("uebersicht");
      e.preventDefault();
      anfordern();
    });
    cv.style.touchAction = "pan-y";
    cv.style.cursor = "grab";
  }

  /* ---------- Schleife ---------- */
  function anfordern() { ST.ruhe = 0; if (!ST.laeuft && ST.bereit) { ST.laeuft = true; ST.letzt = performance.now(); requestAnimationFrame(schleife); } }
  function schleife(jetzt) {
    if (!ST.bereit || !ST.sichtbar || document.visibilityState === "hidden") { ST.laeuft = false; return; }
    const dt = Math.min(0.05, (jetzt - ST.letzt) / 1000);
    ST.letzt = jetzt;
    let bewegtJetzt = false;
    if (ST.tween) {
      const tw = ST.tween, p = klammer((jetzt - tw.t0) / tw.dauer, 0, 1), c = ST.cam;
      const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
      c.yaw = tw.von.yaw + (tw.nach.yaw - tw.von.yaw) * e;
      c.pitch = tw.von.pitch + (tw.nach.pitch - tw.von.pitch) * e;
      c.dist = tw.von.dist + (tw.nach.dist - tw.von.dist) * e;
      c.t = [0, 1, 2].map((a) => tw.von.t[a] + (tw.nach.t[a] - tw.von.t[a]) * e);
      if (p >= 1) ST.tween = null;
      bewegtJetzt = true;
    } else if (ST.drehen && !ST.ziehen && !reduce) {
      ST.cam.yaw += dt * 0.14;
      bewegtJetzt = true;
    }
    zeichnen(jetzt);
    // Ohne Bewegung und ohne Animation reicht kurz weiterzeichnen, bei reduzierter Bewegung gar nicht
    if (reduce) { if (bewegtJetzt || ++ST.ruhe < 3) requestAnimationFrame(schleife); else ST.laeuft = false; return; }
    requestAnimationFrame(schleife);
  }
  function groesse() {
    const r = buehne.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return;
    ST.dpr = Math.min(window.devicePixelRatio || 1, 2);
    ST.w = Math.round(r.width); ST.h = Math.round(r.height);
    cv.width = Math.round(ST.w * ST.dpr); cv.height = Math.round(ST.h * ST.dpr);
    anfordern();
  }

  /* ---------- Tabs 3D / 2D ---------- */
  function tabWaehlen(drei, fokus) {
    tab3.setAttribute("aria-selected", drei ? "true" : "false"); tab3.tabIndex = drei ? 0 : -1;
    tab2.setAttribute("aria-selected", drei ? "false" : "true"); tab2.tabIndex = drei ? -1 : 0;
    p3.hidden = !drei; p2.hidden = drei; lagerBox.hidden = drei;
    if (fokus) (drei ? tab3 : tab2).focus();
    if (drei) { groesse(); anfordern(); }
  }
  function tabsStarten() {
    tabsBox.hidden = false;
    tab3.addEventListener("click", () => tabWaehlen(true));
    tab2.addEventListener("click", () => tabWaehlen(false));
    tabsBox.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft" || e.key === "ArrowRight" || e.key === "Home" || e.key === "End") {
        e.preventDefault();
        tabWaehlen(e.key === "ArrowLeft" || e.key === "Home", true);
      }
    });
    tabWaehlen(true);
  }

  function fallback(text) {
    ST.bereit = false;
    status.hidden = false; status.textContent = text; status.classList.add("fehler");
    tabsBox.hidden = true; p3.hidden = true; p2.hidden = false; lagerBox.hidden = false;
  }

  /* ---------- Start ---------- */
  function start() {
    try {
      glStarten();
      szeneBauen();
      const m = meshBauen();
      buf = { op: puffer(m.op), tr: puffer(m.tr) };
      ST.tris = (m.op.p.length + m.tr.p.length) / 9;
    } catch (e) {
      fallback("Das 3D-Modell läuft in diesem Browser nicht.");
      tabsBox.hidden = true;
      return;
    }
    pinsBauen();
    werkzeugeBauen();
    eingabeStarten();
    const a = ANSICHTEN.uebersicht;
    ST.cam = { yaw: rad(a.yaw), pitch: rad(a.pitch), dist: a.dist, t: MITTE.slice() };
    ST.bereit = true;
    status.hidden = true;
    tabsStarten();
    ST.cam.dist = abst(a.dist);
    groesse();
    if ("ResizeObserver" in window) new ResizeObserver(groesse).observe(buehne);
    else window.addEventListener("resize", groesse);
    if ("IntersectionObserver" in window) {
      new IntersectionObserver((es) => { ST.sichtbar = es.some((x) => x.isIntersecting); if (ST.sichtbar) anfordern(); }, { threshold: 0.05 }).observe(buehne);
    } else ST.sichtbar = true;
    document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") anfordern(); });
    A.f3.push(() => (ST.bereit ? "Innenraum 3D: " + ST.tris + " Dreiecke, Abstand " + Math.round(ST.cam.dist) + ", Raum " + (ST.sel || "–") : "Innenraum 3D: aus"));
    window.VenatorInnen3D = { bereit: () => ST.bereit, zustand: ST, tab: (drei) => tabWaehlen(!!drei), ansicht, heranfliegen, raumAn, strahlAn };
  }

  start();
})();
