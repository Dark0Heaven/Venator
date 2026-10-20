/* =====================================================================
   3D-Modell zum Anklicken.
   Ein kleiner eigener WebGL-Betrachter für die .glb-Datei, ohne Fremdbibliothek.
   Teile, Texte und Blöcke stehen in config.js unter "modell".
   ===================================================================== */
(() => {
  "use strict";

  const A = window.VenatorApp;
  const CFG = window.VENATOR_CONFIG || {};
  const MC = CFG.modell;
  const sek = document.getElementById("modell");
  if (!A || !sek) return;
  if (!MC || !MC.datei || !(MC.teile || []).length) { sek.hidden = true; return; }

  const { $, el, toast, freischalten, reduce, klammer } = A;
  const TEILE = MC.teile;
  const MASSSTAB = Number(CFG.massstab) > 0 ? Number(CFG.massstab) : 4;
  const FOV = (36 * Math.PI) / 180;
  // Bei schmaler Bühne (Handy) bleibt die waagerechte Sicht gleich, damit das Schiff nicht abgeschnitten wird.
  const ASP_REF = 1.4;
  // Auf schmaler Bühne etwas mehr Abstand, sonst wird das lange Schiff am Rand abgeschnitten.
  const abst = (d) => d * (ST.w && ST.h && ST.w / ST.h < 1.3 ? 1.28 : 1);
  const fovTan = (asp) => Math.tan(FOV / 2) * Math.max(1, ASP_REF / asp);
  const rad = (g) => (g * Math.PI) / 180;
  const norm = (s) => String(s).toLowerCase().replace(/ü/g, "ue").replace(/ö/g, "oe").replace(/ä/g, "ae").replace(/ß/g, "ss");
  const fallbackIdx = Math.max(0, TEILE.findIndex((t) => t.fallback));

  const ST = {
    gl: null, geladen: false, meshes: [], prog: null, loc: {},
    cam: null, ziel: null, tween: null, auswahl: -1, hover: -1,
    auto: !reduce, tour: null, sichtbar: false, gesehen: new Set(), yawSumme: 0,
    zeiger: null, dim: [0, 0, 0], tris: 0, laeuft: false, still: 0, pins: [], regionen: [],
    w: 1, h: 1, dpr: 1, ruhe: 0
  };

  const cv = $("modell-canvas");
  const buehne = $("modell-buehne");

  /* ---------- Text rund ums Modell (auch ohne 3D nutzbar) ---------- */
  function blocksText(w) { return Math.max(1, Math.round(w / MASSSTAB)); }

  function infoZeigen(i) {
    const box = $("teil-info");
    box.replaceChildren();
    if (i < 0) {
      box.append(el("h3", "", "Schiffsmodell"));
      box.lastChild.id = "ti-titel";
      box.append(el("p", "ti-text", "Klick ein Teil des Schiffs an oder wähle es in der Liste. Dann siehst du, was es ist und aus welchen Blöcken du es bauen kannst."));
      if (ST.geladen) {
        const [l, b, h] = ST.dim;
        box.append(el("p", "ti-masse", "Gesamtgröße im Spiel: etwa " + blocksText(l) + " × " + blocksText(b) + " × " + blocksText(h) + " Blöcke (Länge × Breite × Höhe). Ein Block entspricht " + MASSSTAB + " Metern."));
      }
      box.append(el("p", "ti-tipp", "Die Blöcke sind Vorschläge. Ihr könnt sie in config.js ändern."));
      return;
    }
    const t = TEILE[i];
    const h3 = el("h3", "", t.titel); h3.id = "ti-titel";
    box.append(h3);
    if (t.kurz) box.append(el("p", "ti-kurz", t.kurz));
    if (t.text) box.append(el("p", "ti-text", t.text));
    if ((t.bloecke || []).length) {
      box.append(el("h4", "", "Bauvorschlag: gebaut aus"));
      const ul = el("ul", "bloecke");
      t.bloecke.forEach((b) => ul.append(A.blockChip(b.name, b.rolle)));
      box.append(ul);
    }
    if (t.masse) box.append(el("p", "ti-masse", "Größe im Spiel: " + t.masse));
    if (t.tipp) box.append(el("p", "ti-tipp", "Bautipp: " + t.tipp));
    const reihe = el("div", "ti-knoepfe");
    if (ST.geladen) {
      const b1 = el("button", "knopf", "Heranfliegen"); b1.type = "button";
      b1.addEventListener("click", () => { stopTour(); fliegenZu(i); });
      reihe.append(b1);
    }
    const b2 = el("button", "knopf", "Zurück zur Übersicht"); b2.type = "button";
    b2.addEventListener("click", () => { stopTour(); abwaehlen(); ansicht("schraeg"); });
    reihe.append(b2);
    box.append(reihe);
  }

  function listeBauen() {
    const ul = $("teile-liste");
    ul.replaceChildren();
    TEILE.forEach((t, i) => {
      const li = el("li");
      const b = el("button", "teil-knopf");
      b.type = "button";
      b.dataset.id = t.id;
      b.setAttribute("aria-pressed", "false");
      b.append(el("strong", "", t.titel), el("span", "", t.kurz || ""));
      b.addEventListener("click", () => { stopTour(); waehlen(t.id, { fliegen: true }); });
      li.append(b);
      ul.append(li);
    });
  }
  function listeMarkieren() {
    document.querySelectorAll("#teile-liste .teil-knopf").forEach((b) => {
      b.setAttribute("aria-pressed", ST.auswahl >= 0 && TEILE[ST.auswahl].id === b.dataset.id ? "true" : "false");
    });
    ST.pins.forEach((p) => p.knopf.classList.toggle("aktiv", p.idx === ST.auswahl));
  }

  /* ---------- Auswahl ---------- */
  function waehlen(id, opt) {
    const i = typeof id === "number" ? id : TEILE.findIndex((t) => t.id === id);
    if (i < 0) return;
    ST.auswahl = i;
    infoZeigen(i);
    listeMarkieren();
    ST.gesehen.add(TEILE[i].id);
    if (ST.gesehen.size >= 6) freischalten("bauplan");
    if (opt && opt.fliegen && ST.geladen) fliegenZu(i);
    anfordern();
  }
  function abwaehlen() {
    ST.auswahl = -1;
    infoZeigen(-1);
    listeMarkieren();
    anfordern();
  }
  function finden(q) {
    const n = norm(q).trim();
    if (!n) return null;
    const alle = TEILE.map((t) => ({ t, id: norm(t.id), ti: norm(t.titel) }));
    const treffer =
      alle.find((x) => x.id === n) || alle.find((x) => x.ti === n) ||
      alle.find((x) => x.id.startsWith(n) || x.ti.startsWith(n)) ||
      alle.find((x) => x.id.includes(n) || x.ti.includes(n));
    return treffer ? treffer.t : null;
  }
  window.VenatorModell = {
    bereit: () => ST.geladen,
    namen: () => TEILE.map((t) => t.id),
    finden,
    waehlen,
    abwaehlen,
    zustand: ST
  };

  /* ---------- Werkzeugleiste ---------- */
  const ANSICHTEN = {
    schraeg: { name: "Schräg", yaw: (MC.ansicht && MC.ansicht.yaw) || 52, pitch: (MC.ansicht && MC.ansicht.pitch) || 24, dist: (MC.ansicht && MC.ansicht.abstand) || 1850 },
    seite: { name: "Seite", yaw: 90, pitch: 3, dist: 1400 },
    oben: { name: "Oben", yaw: 180, pitch: 88, dist: 1300 },
    unten: { name: "Unten", yaw: 160, pitch: -62, dist: 1350 },
    vorn: { name: "Vorn", yaw: 0, pitch: 8, dist: 1250 },
    heck: { name: "Heck", yaw: 180, pitch: 8, dist: 1150 }
  };
  let knopfAuto, knopfTour, knopfPins;

  function werkzeugeBauen() {
    const box = $("modell-werkzeuge");
    box.replaceChildren();
    Object.keys(ANSICHTEN).forEach((k) => {
      const b = el("button", "knopf klein", ANSICHTEN[k].name);
      b.type = "button";
      b.addEventListener("click", () => { stopTour(); ansicht(k); });
      box.append(b);
    });
    knopfAuto = el("button", "knopf klein", ""); knopfAuto.type = "button";
    knopfAuto.addEventListener("click", () => { ST.auto = !ST.auto; autoAnzeige(); anfordern(); });
    knopfTour = el("button", "knopf klein", "Führung"); knopfTour.type = "button";
    knopfTour.addEventListener("click", () => (ST.tour ? stopTour() : startTour()));
    knopfPins = el("button", "knopf klein", ""); knopfPins.type = "button";
    knopfPins.setAttribute("aria-pressed", "true");
    knopfPins.addEventListener("click", () => {
      const aus = !$("modell-pins").classList.contains("aus");
      $("modell-pins").classList.toggle("aus", aus);
      knopfPins.setAttribute("aria-pressed", aus ? "false" : "true");
      knopfPins.textContent = aus ? "Markierungen: aus" : "Markierungen: an";
    });
    knopfPins.textContent = "Markierungen: an";
    box.append(knopfAuto, knopfTour, knopfPins);
    autoAnzeige();
    if (!ST.geladen) box.querySelectorAll("button").forEach((b) => { b.disabled = true; });
  }
  function autoAnzeige() {
    knopfAuto.setAttribute("aria-pressed", ST.auto ? "true" : "false");
    knopfAuto.textContent = ST.auto ? "Drehen: an" : "Drehen: aus";
  }

  /* ---------- Führung ---------- */
  function startTour() {
    const ids = TEILE.filter((t) => !t.fallback && t.id !== "details" && t.id !== "fenster").map((t) => t.id);
    if (!ids.length || !ST.geladen) return;
    ST.auto = false; autoAnzeige();
    let n = 0;
    const schritt = () => {
      waehlen(ids[n % ids.length], { fliegen: true });
      n++;
    };
    schritt();
    ST.tour = setInterval(schritt, 6000);
    knopfTour.textContent = "Führung beenden";
    knopfTour.setAttribute("aria-pressed", "true");
  }
  function stopTour() {
    if (!ST.tour) return;
    clearInterval(ST.tour);
    ST.tour = null;
    if (knopfTour) { knopfTour.textContent = "Führung"; knopfTour.setAttribute("aria-pressed", "false"); }
  }

  /* =================================================================
     Ab hier: nur mit WebGL
     ================================================================= */

  /* ---------- Mathe ---------- */
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

  /* ---------- Kamera ---------- */
  function kameraWerte() {
    const c = ST.cam;
    const cp = Math.cos(c.pitch), sp = Math.sin(c.pitch), cy = Math.cos(c.yaw), sy = Math.sin(c.yaw);
    const eye = [c.t[0] + c.dist * cp * sy, c.t[1] + c.dist * sp, c.t[2] + c.dist * cp * cy];
    const f = [-cp * sy, -sp, -cp * cy];
    const r = unit(cross(f, [0, 1, 0]));
    const u = cross(r, f);
    return { eye, f, r, u };
  }
  function matrizen(k) {
    const { eye, f, r, u } = k;
    const view = new Float32Array([
      r[0], u[0], -f[0], 0, r[1], u[1], -f[1], 0, r[2], u[2], -f[2], 0,
      -dot(r, eye), -dot(u, eye), dot(f, eye), 1
    ]);
    const near = klammer(ST.cam.dist * 0.04, 2, 90), far = ST.cam.dist * 4 + 3500;
    const asp = ST.w / ST.h, fc = 1 / fovTan(asp);
    const proj = new Float32Array([
      fc / asp, 0, 0, 0, 0, fc, 0, 0, 0, 0, (far + near) / (near - far), -1, 0, 0, (2 * far * near) / (near - far), 0
    ]);
    return mul(proj, view);
  }
  function projizieren(k, p) {
    const v = sub(p, k.eye);
    const x = dot(v, k.r), y = dot(v, k.u), z = dot(v, k.f);
    if (z <= 1) return null;
    const asp = ST.w / ST.h, th = fovTan(asp);
    return { x: (x / (z * th * asp) * 0.5 + 0.5) * ST.w, y: (0.5 - (y / (z * th)) * 0.5) * ST.h, z };
  }
  function strahlAn(px, py) {
    const r = cv.getBoundingClientRect();
    const nx = ((px - r.left) / r.width) * 2 - 1, ny = 1 - ((py - r.top) / r.height) * 2;
    const k = kameraWerte(), asp = r.width / r.height, th = fovTan(asp);
    const d = unit([
      k.f[0] + k.r[0] * nx * th * asp + k.u[0] * ny * th,
      k.f[1] + k.r[1] * nx * th * asp + k.u[1] * ny * th,
      k.f[2] + k.r[2] * nx * th * asp + k.u[2] * ny * th
    ]);
    return { o: k.eye, d };
  }

  /* ---------- Strahl gegen Dreiecke (Möller-Trumbore) ---------- */
  function schnitt(o, d, tmax) {
    let best = null, bt = tmax || 1e9;
    for (let mi = 0; mi < ST.meshes.length; mi++) {
      const m = ST.meshes[mi];
      // Quader-Vortest
      let t0 = 0, t1 = bt, ok = true;
      for (let a = 0; a < 3; a++) {
        if (Math.abs(d[a]) < 1e-9) { if (o[a] < m.bmin[a] || o[a] > m.bmax[a]) { ok = false; break; } }
        else {
          let ta = (m.bmin[a] - o[a]) / d[a], tb = (m.bmax[a] - o[a]) / d[a];
          if (ta > tb) { const x = ta; ta = tb; tb = x; }
          if (ta > t0) t0 = ta;
          if (tb < t1) t1 = tb;
          if (t0 > t1) { ok = false; break; }
        }
      }
      if (!ok) continue;
      const P = m.pos, I = m.idx, n = I.length;
      for (let i = 0; i < n; i += 3) {
        const a = I[i] * 3, b = I[i + 1] * 3, c = I[i + 2] * 3;
        const e1x = P[b] - P[a], e1y = P[b + 1] - P[a + 1], e1z = P[b + 2] - P[a + 2];
        const e2x = P[c] - P[a], e2y = P[c + 1] - P[a + 1], e2z = P[c + 2] - P[a + 2];
        const px = d[1] * e2z - d[2] * e2y, py = d[2] * e2x - d[0] * e2z, pz = d[0] * e2y - d[1] * e2x;
        const det = e1x * px + e1y * py + e1z * pz;
        if (det > -1e-9 && det < 1e-9) continue;
        const inv = 1 / det;
        const tx = o[0] - P[a], ty = o[1] - P[a + 1], tz = o[2] - P[a + 2];
        const u = (tx * px + ty * py + tz * pz) * inv;
        if (u < 0 || u > 1) continue;
        const qx = ty * e1z - tz * e1y, qy = tz * e1x - tx * e1z, qz = tx * e1y - ty * e1x;
        const v = (d[0] * qx + d[1] * qy + d[2] * qz) * inv;
        if (v < 0 || u + v > 1) continue;
        const t = (e2x * qx + e2y * qy + e2z * qz) * inv;
        if (t > 0.01 && t < bt) { bt = t; best = { t, mi }; }
      }
    }
    if (best) { best.x = o[0] + d[0] * bt; best.y = o[1] + d[1] * bt; best.z = o[2] + d[2] * bt; }
    return best;
  }

  /* ---------- Welches Teil sitzt an einer Stelle? ---------- */
  function meshMenge(muster) {
    const s = new Set();
    ST.meshes.forEach((m, i) => {
      muster.forEach((p) => {
        if (p.endsWith("*") ? m.name.startsWith(p.slice(0, -1)) : m.name === p) s.add(i);
      });
    });
    return s;
  }
  function regionenBauen() {
    ST.regionen = TEILE.map((t) => (t.bereiche || []).map((r) => ({
      meshes: r.mesh ? meshMenge(r.mesh) : null, box: r.box, sym: !!r.sym
    })));
  }
  function teilAn(mi, x, y, z) {
    for (let i = 0; i < ST.regionen.length; i++) {
      for (const r of ST.regionen[i]) {
        if (r.meshes && !r.meshes.has(mi)) continue;
        const b = r.box, ax = r.sym ? Math.abs(x) : x;
        if (ax >= b[0] - 0.6 && ax <= b[1] + 0.6 && y >= b[2] - 0.6 && y <= b[3] + 0.6 && z >= b[4] - 0.6 && z <= b[5] + 0.6) return i;
      }
    }
    return fallbackIdx;
  }

  /* ---------- Laden ---------- */
  function b64Bytes(s) {
    const bin = atob(s), n = bin.length, u = new Uint8Array(n);
    for (let i = 0; i < n; i++) u[i] = bin.charCodeAt(i);
    return u.buffer;
  }
  async function ladeBytes() {
    if (window.VENATOR_MODELL_B64) return b64Bytes(window.VENATOR_MODELL_B64);
    const res = await fetch(MC.datei);
    if (!res.ok) throw new Error("HTTP " + res.status);
    const gesamt = Number(res.headers.get("content-length")) || 0;
    if (!res.body || !gesamt || !res.body.getReader) return res.arrayBuffer();
    const rd = res.body.getReader();
    const teile = []; let n = 0;
    for (;;) {
      const { done, value } = await rd.read();
      if (done) break;
      teile.push(value); n += value.length;
      $("modell-status").textContent = "Modell wird geladen … " + Math.min(99, Math.round((n / gesamt) * 100)) + " %";
    }
    const all = new Uint8Array(n); let o = 0;
    teile.forEach((t) => { all.set(t, o); o += t.length; });
    return all.buffer;
  }
  function glbLesen(buf) {
    const dv = new DataView(buf);
    if (dv.getUint32(0, true) !== 0x46546c67) throw new Error("keine GLB-Datei");
    let off = 12, json = null, bin = 0;
    while (off + 8 <= buf.byteLength) {
      const len = dv.getUint32(off, true), typ = dv.getUint32(off + 4, true), start = off + 8;
      if (typ === 0x4e4f534a) json = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, start, len)));
      else if (typ === 0x004e4942) bin = start;
      off = start + len;
    }
    if (!json) throw new Error("kein JSON-Teil");
    return { json, bin };
  }
  function lesen(buf, J, bin, idx) {
    const a = J.accessors[idx], bv = J.bufferViews[a.bufferView];
    const typ = { 5126: Float32Array, 5123: Uint16Array, 5125: Uint32Array, 5121: Uint8Array }[a.componentType];
    const n = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }[a.type];
    const start = bin + (bv.byteOffset || 0) + (a.byteOffset || 0);
    return new typ(buf.slice(start, start + a.count * n * typ.BYTES_PER_ELEMENT));
  }

  const VS = "attribute vec3 aPos;attribute vec3 aNor;attribute vec2 aUv;uniform mat4 uVP;varying vec3 vW;varying vec3 vN;varying vec2 vUv;" +
    "void main(){vW=aPos;vN=aNor;vUv=aUv;gl_Position=uVP*vec4(aPos,1.0);}";
  const FS = "#ifdef GL_FRAGMENT_PRECISION_HIGH\nprecision highp float;\n#else\nprecision mediump float;\n#endif\n" +
    "varying vec3 vW;varying vec3 vN;varying vec2 vUv;" +
    "uniform vec3 uCam;uniform vec3 uBase;uniform vec3 uEmis;uniform float uMetal;uniform float uRough;uniform float uTex;uniform sampler2D uSamp;" +
    "uniform vec3 uBoxMin;uniform vec3 uBoxMax;uniform float uSym;uniform float uHi;uniform vec3 uTint;uniform float uPulse;" +
    "void main(){" +
    "vec3 n=normalize(vN);if(!gl_FrontFacing)n=-n;" +
    "vec3 base=uBase;if(uTex>0.5)base=pow(texture2D(uSamp,vUv).rgb,vec3(2.2));" +
    "vec3 V=normalize(uCam-vW);" +
    "vec3 L1=normalize(vec3(0.45,0.85,0.35));vec3 L2=normalize(vec3(-0.6,0.25,-0.55));" +
    "float d1=max(dot(n,L1),0.0);float d2=max(dot(n,L2),0.0);" +
    "vec3 amb=mix(vec3(0.07,0.085,0.11),vec3(0.2,0.24,0.31),0.5+0.5*n.y);" +
    "vec3 col=base*(amb+vec3(1.0,0.96,0.9)*d1*1.0+vec3(0.35,0.5,0.85)*d2*0.38);" +
    "vec3 H=normalize(L1+V);float sp=pow(max(dot(n,H),0.0),mix(10.0,70.0,1.0-uRough))*(0.04+0.5*uMetal);" +
    "col+=vec3(sp)*d1;col+=uEmis;" +
    "if(uHi>0.0){" +
    "vec3 p=vec3(uSym>0.5?abs(vW.x):vW.x,vW.y,vW.z);" +
    "vec3 a=step(uBoxMin,p)*step(p,uBoxMax);float inside=a.x*a.y*a.z;" +
    "if(inside<0.5)discard;" +
    "col=mix(col,uTint,uHi*(0.34+0.2*uPulse));col+=uTint*0.1*uHi;}" +
    "gl_FragColor=vec4(pow(col,vec3(1.0/2.2)),1.0);}";

  function shader(gl, typ, src) {
    const s = gl.createShader(typ);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error("Shader: " + gl.getShaderInfoLog(s));
    return s;
  }

  function glStarten() {
    const opt = { antialias: true, alpha: true, premultipliedAlpha: false, powerPreference: "high-performance" };
    const gl = cv.getContext("webgl", opt) || cv.getContext("experimental-webgl", opt);
    if (!gl) throw new Error("kein WebGL");
    ST.gl = gl;
    const p = gl.createProgram();
    gl.attachShader(p, shader(gl, gl.VERTEX_SHADER, VS));
    gl.attachShader(p, shader(gl, gl.FRAGMENT_SHADER, FS));
    gl.bindAttribLocation(p, 0, "aPos"); gl.bindAttribLocation(p, 1, "aNor"); gl.bindAttribLocation(p, 2, "aUv");
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error("Programm: " + gl.getProgramInfoLog(p));
    ST.prog = p;
    ["uVP", "uCam", "uBase", "uEmis", "uMetal", "uRough", "uTex", "uSamp", "uBoxMin", "uBoxMax", "uSym", "uHi", "uTint", "uPulse"]
      .forEach((n) => { ST.loc[n] = gl.getUniformLocation(p, n); });
    ST.uint = gl.getExtension("OES_element_index_uint");
    ST.aniso = gl.getExtension("EXT_texture_filter_anisotropic");
    // weiße 1x1-Textur für Teile ohne Textur
    ST.weiss = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, ST.weiss);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 255, 255, 255]));
    cv.addEventListener("webglcontextlost", (e) => {
      e.preventDefault();
      ST.geladen = false;
      $("modell-status").hidden = false;
      $("modell-status").textContent = "Die Grafik wurde vom Browser unterbrochen. Lade die Seite neu, dann ist das Modell wieder da.";
    });
  }

  function puffer(gl, ziel, daten) {
    const b = gl.createBuffer();
    gl.bindBuffer(ziel, b);
    gl.bufferData(ziel, daten, gl.STATIC_DRAW);
    return b;
  }

  async function texturLaden(gl, J, buf, bin, bildIdx) {
    const im = J.images[bildIdx], bv = J.bufferViews[im.bufferView];
    const start = bin + (bv.byteOffset || 0);
    const blob = new Blob([new Uint8Array(buf, start, bv.byteLength)], { type: im.mimeType || "image/png" });
    let bild;
    if (window.createImageBitmap) bild = await createImageBitmap(blob, { premultiplyAlpha: "none", colorSpaceConversion: "none" });
    else {
      bild = await new Promise((ok, fehler) => {
        const i = new Image(); i.onload = () => ok(i); i.onerror = fehler; i.src = URL.createObjectURL(blob);
      });
    }
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, bild);
    const pot = (n) => (n & (n - 1)) === 0;
    const w = bild.width, h = bild.height;
    if (pot(w) && pot(h)) {
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      if (ST.aniso) gl.texParameterf(gl.TEXTURE_2D, ST.aniso.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(8, gl.getParameter(ST.aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));
    } else gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  }

  async function modellBauen(buf) {
    const gl = ST.gl;
    const { json: J, bin } = glbLesen(buf);
    const texCache = {};
    ST.meshes = [];
    for (const mesh of J.meshes) {
      for (const pr of mesh.primitives) {
        if ((pr.mode === undefined ? 4 : pr.mode) !== 4) continue;
        const pos = lesen(buf, J, bin, pr.attributes.POSITION);
        const nor = pr.attributes.NORMAL !== undefined ? lesen(buf, J, bin, pr.attributes.NORMAL) : new Float32Array(pos.length);
        const uv = pr.attributes.TEXCOORD_0 !== undefined ? lesen(buf, J, bin, pr.attributes.TEXCOORD_0) : null;
        let idx;
        if (pr.indices !== undefined) idx = lesen(buf, J, bin, pr.indices);
        else { idx = new Uint16Array(pos.length / 3); for (let i = 0; i < idx.length; i++) idx[i] = i; }
        if (idx instanceof Uint32Array && !ST.uint) throw new Error("Index zu groß für diesen Browser");
        const mat = (J.materials || [])[pr.material] || {};
        const pbr = mat.pbrMetallicRoughness || {};
        let tex = -1;
        if (pbr.baseColorTexture) tex = J.textures[pbr.baseColorTexture.index].source;
        const bmin = [1e9, 1e9, 1e9], bmax = [-1e9, -1e9, -1e9];
        for (let i = 0; i < pos.length; i += 3) for (let a = 0; a < 3; a++) {
          if (pos[i + a] < bmin[a]) bmin[a] = pos[i + a];
          if (pos[i + a] > bmax[a]) bmax[a] = pos[i + a];
        }
        const m = {
          name: mesh.name || "mesh", pos, idx, bmin, bmax,
          base: (pbr.baseColorFactor || [1, 1, 1, 1]).slice(0, 3),
          emis: mat.emissiveFactor || [0, 0, 0],
          metal: pbr.metallicFactor === undefined ? 0.1 : pbr.metallicFactor,
          rough: pbr.roughnessFactor === undefined ? 0.8 : pbr.roughnessFactor,
          tex: null, texIdx: tex,
          bPos: puffer(gl, gl.ARRAY_BUFFER, pos), bNor: puffer(gl, gl.ARRAY_BUFFER, nor),
          bUv: uv ? puffer(gl, gl.ARRAY_BUFFER, uv) : null,
          bIdx: puffer(gl, gl.ELEMENT_ARRAY_BUFFER, idx),
          typ: idx instanceof Uint32Array ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT
        };
        ST.tris += idx.length / 3;
        ST.meshes.push(m);
      }
    }
    for (const m of ST.meshes) {
      if (m.texIdx >= 0) {
        if (!texCache[m.texIdx]) texCache[m.texIdx] = await texturLaden(gl, J, buf, bin, m.texIdx);
        m.tex = texCache[m.texIdx];
      }
    }
    // Maße
    const mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
    ST.meshes.forEach((m) => { for (let a = 0; a < 3; a++) { mn[a] = Math.min(mn[a], m.bmin[a]); mx[a] = Math.max(mx[a], m.bmax[a]); } });
    ST.dim = [mx[2] - mn[2], mx[0] - mn[0], mx[1] - mn[1]];
    ST.mitte = [(mn[0] + mx[0]) / 2, mn[1] + (mx[1] - mn[1]) * 0.3, (mn[2] + mx[2]) / 2];
  }

  /* ---------- Zeichnen ---------- */
  function meshZeichnen(m, zeit, hi) {
    const gl = ST.gl, L = ST.loc;
    gl.bindBuffer(gl.ARRAY_BUFFER, m.bPos); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, m.bNor); gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);
    if (m.bUv) { gl.bindBuffer(gl.ARRAY_BUFFER, m.bUv); gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 0, 0); }
    else { gl.disableVertexAttribArray(2); gl.vertexAttrib2f(2, 0, 0); }
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, m.bIdx);
    const puls = m.name.indexOf("Engines_") === 0 ? 0.82 + 0.18 * Math.sin(zeit / 380) : 1;
    gl.uniform3f(L.uBase, m.base[0], m.base[1], m.base[2]);
    gl.uniform3f(L.uEmis, m.emis[0] * puls, m.emis[1] * puls, m.emis[2] * puls);
    gl.uniform1f(L.uMetal, m.metal); gl.uniform1f(L.uRough, m.rough);
    gl.uniform1f(L.uTex, m.tex ? 1 : 0);
    gl.bindTexture(gl.TEXTURE_2D, m.tex || ST.weiss);
    if (hi) {
      gl.uniform3f(L.uBoxMin, hi.box[0], hi.box[2], hi.box[4]);
      gl.uniform3f(L.uBoxMax, hi.box[1], hi.box[3], hi.box[5]);
      gl.uniform1f(L.uSym, hi.sym ? 1 : 0);
      gl.uniform1f(L.uHi, hi.staerke);
    } else gl.uniform1f(L.uHi, 0);
    gl.drawElements(gl.TRIANGLES, m.idx.length, m.typ, 0);
  }

  function zeichnen(zeit) {
    const gl = ST.gl, L = ST.loc;
    gl.viewport(0, 0, cv.width, cv.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LESS); gl.disable(gl.CULL_FACE); gl.disable(gl.BLEND);
    gl.useProgram(ST.prog);
    const k = kameraWerte();
    gl.uniformMatrix4fv(L.uVP, false, matrizen(k));
    gl.uniform3f(L.uCam, k.eye[0], k.eye[1], k.eye[2]);
    gl.uniform1i(L.uSamp, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.uniform3f(L.uTint, 1.0, 0.83, 0.25);
    gl.uniform1f(L.uPulse, 0.5 + 0.5 * Math.sin(zeit / 260));
    ST.meshes.forEach((m) => meshZeichnen(m, zeit, null));
    // Hervorhebung: erneut zeichnen, nur innerhalb der Bereiche des Teils
    gl.depthFunc(gl.LEQUAL);
    const hebe = (idx, staerke) => {
      ST.regionen[idx].forEach((r) => {
        ST.meshes.forEach((m, mi) => {
          if (r.meshes && !r.meshes.has(mi)) return;
          meshZeichnen(m, zeit, { box: r.box, sym: r.sym, staerke });
        });
      });
    };
    if (ST.hover >= 0 && ST.hover !== ST.auswahl && ST.hover !== fallbackIdx) hebe(ST.hover, 0.5);
    if (ST.auswahl >= 0) hebe(ST.auswahl, 1);
    return k;
  }

  /* ---------- Markierungen (Pins) ---------- */
  function pinPos(spec) {
    if (Array.isArray(spec)) return spec;
    const unten = spec.seite === "unten";
    const h = schnitt([spec.x, unten ? -300 : 700, spec.z], [0, unten ? 1 : -1, 0], 2000);
    if (!h) return [spec.x, 100, spec.z];
    return [h.x, h.y + (unten ? -9 : 9), h.z];
  }
  function pinsBauen() {
    const box = $("modell-pins");
    box.replaceChildren();
    ST.pins = [];
    TEILE.forEach((t, i) => {
      if (!t.pin) return;
      const b = el("button", "pin");
      b.type = "button"; b.tabIndex = -1;
      b.setAttribute("aria-hidden", "true");
      b.append(el("span", "pin-punkt"), el("span", "pin-name", t.titel));
      b.addEventListener("pointerdown", (e) => e.stopPropagation());
      b.addEventListener("click", () => { stopTour(); waehlen(i, { fliegen: true }); });
      box.append(b);
      ST.pins.push({ idx: i, pos: pinPos(t.pin), knopf: b, verdeckt: false });
    });
  }
  function pinsPruefen(k) {
    ST.pins.forEach((p) => {
      const v = sub(p.pos, k.eye), dist = Math.hypot(v[0], v[1], v[2]);
      const h = schnitt(k.eye, [v[0] / dist, v[1] / dist, v[2] / dist], dist - 14);
      p.verdeckt = !!h;
      p.knopf.classList.toggle("verdeckt", p.verdeckt);
    });
  }
  function pinsLegen(k) {
    ST.pins.forEach((p) => {
      const s = projizieren(k, p.pos);
      if (!s || s.x < -20 || s.y < -20 || s.x > ST.w + 20 || s.y > ST.h + 20) { p.knopf.style.display = "none"; return; }
      p.knopf.style.display = "";
      p.knopf.classList.toggle("links", s.x > ST.w - 170);
      p.knopf.style.transform = "translate(" + s.x.toFixed(1) + "px," + s.y.toFixed(1) + "px)";
    });
  }

  /* ---------- Schleife ---------- */
  function anfordern() { ST.ruhe = 0; if (!ST.laeuft && ST.geladen) { ST.laeuft = true; ST.letzt = performance.now(); requestAnimationFrame(schleife); } }

  function schleife(jetzt) {
    if (!ST.geladen) { ST.laeuft = false; return; }
    if (!ST.sichtbar || document.visibilityState === "hidden") { ST.laeuft = false; return; }
    const dt = Math.min(0.05, (jetzt - ST.letzt) / 1000);
    ST.letzt = jetzt;
    let bewegt = false;

    if (ST.tween) {
      const tw = ST.tween, p = klammer((jetzt - tw.t0) / tw.dauer, 0, 1);
      const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
      const c = ST.cam;
      c.yaw = tw.von.yaw + (tw.nach.yaw - tw.von.yaw) * e;
      c.pitch = tw.von.pitch + (tw.nach.pitch - tw.von.pitch) * e;
      c.dist = tw.von.dist + (tw.nach.dist - tw.von.dist) * e;
      for (let a = 0; a < 3; a++) c.t[a] = tw.von.t[a] + (tw.nach.t[a] - tw.von.t[a]) * e;
      if (p >= 1) ST.tween = null;
      bewegt = true;
    } else if (ST.auto && !ST.ziehen && !reduce) {
      ST.cam.yaw += 0.12 * dt;
      bewegt = true;
    }
    if (bewegt || ST.ziehen) ST.still = 0; else ST.still += dt;

    const k = zeichnen(jetzt);
    pinsLegen(k);
    if ((bewegt || ST.ziehen) && ST.pinsStand !== "alt") ST.pinsStand = "alt";
    if (ST.pinsStand === "alt" && ST.still > 0.18) { pinsPruefen(k); ST.pinsStand = "neu"; }
    requestAnimationFrame(schleife);
  }

  function groesse() {
    const r = buehne.getBoundingClientRect();
    ST.dpr = Math.min(window.devicePixelRatio || 1, 2);
    ST.w = Math.max(1, Math.round(r.width)); ST.h = Math.max(1, Math.round(r.height));
    cv.width = Math.round(ST.w * ST.dpr); cv.height = Math.round(ST.h * ST.dpr);
    anfordern();
  }

  /* ---------- Flug und Ansichten ---------- */
  function tweenStarten(nach, dauer) {
    const c = ST.cam;
    if (reduce) {
      c.yaw = nach.yaw; c.pitch = nach.pitch; c.dist = nach.dist; c.t = nach.t.slice();
      ST.tween = null; ST.pinsStand = "alt"; anfordern();
      return;
    }
    let dy = nach.yaw - c.yaw;
    dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    ST.tween = { t0: performance.now(), dauer: dauer || 900, von: { yaw: c.yaw, pitch: c.pitch, dist: c.dist, t: c.t.slice() }, nach: { yaw: c.yaw + dy, pitch: nach.pitch, dist: nach.dist, t: nach.t.slice() } };
    anfordern();
  }
  function ansicht(name) {
    const a = ANSICHTEN[name];
    if (!a) return;
    tweenStarten({ yaw: rad(a.yaw), pitch: rad(a.pitch), dist: abst(a.dist), t: ST.mitte.slice() });
  }
  function fliegenZu(i) {
    const regs = TEILE[i].bereiche || [];
    if (!regs.length) return;
    const seite = kameraWerte().eye[0] >= 0 ? 1 : -1;
    const mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
    regs.forEach((r) => {
      const b = r.box;
      let x0 = b[0], x1 = b[1];
      if (r.sym) { if (seite < 0) { x0 = -b[1]; x1 = -b[0]; } }
      const lo = [x0, b[2], b[4]], hi = [x1, b[3], b[5]];
      for (let a = 0; a < 3; a++) { mn[a] = Math.min(mn[a], lo[a]); mx[a] = Math.max(mx[a], hi[a]); }
    });
    const gr = Math.max(mx[0] - mn[0], mx[1] - mn[1], mx[2] - mn[2]);
    if (gr > 600) { ansicht("schraeg"); return; }
    const t = [(mn[0] + mx[0]) / 2, (mn[1] + mx[1]) / 2, (mn[2] + mx[2]) / 2];
    const bl = TEILE[i].blick || {};
    tweenStarten({
      yaw: bl.yaw !== undefined ? rad(bl.yaw * (seite < 0 && bl.spiegeln !== false ? -1 : 1)) : ST.cam.yaw,
      pitch: bl.pitch !== undefined ? rad(bl.pitch) : ST.cam.pitch,
      dist: abst(klammer(gr * 2.1 + 70, 150, 1500)), t
    });
  }

  /* ---------- Bedienung ---------- */
  const zeiger = new Map();
  let pinch = 0, bewegtStrecke = 0, downZeit = 0, letzterTap = 0;

  function eingabeBegonnen() { ST.auto = false; autoAnzeige(); ST.tween = null; stopTour(); }

  function tippen(e) {
    const s = strahlAn(e.clientX, e.clientY);
    const h = schnitt(s.o, s.d);
    if (!h) { if (ST.auswahl >= 0) abwaehlen(); return; }
    const i = teilAn(h.mi, h.x, h.y, h.z);
    const jetzt = performance.now();
    const doppelt = jetzt - letzterTap < 380 && ST.auswahl === i;
    letzterTap = jetzt;
    waehlen(i);
    if (doppelt) fliegenZu(i);
  }

  function hoverPruefen(e) {
    if (ST.hoverWartet) return;
    ST.hoverWartet = true;
    const cx = e.clientX, cy = e.clientY;
    requestAnimationFrame(() => {
      ST.hoverWartet = false;
      if (!ST.geladen || ST.ziehen) return;
      const s = strahlAn(cx, cy);
      const h = schnitt(s.o, s.d);
      const tip = $("modell-tip");
      if (!h) {
        ST.zeiger = null;
        if (ST.hover !== -1) { ST.hover = -1; anfordern(); }
        tip.hidden = true; cv.style.cursor = "grab";
        return;
      }
      const i = teilAn(h.mi, h.x, h.y, h.z);
      ST.zeiger = { x: h.x, y: h.y, z: h.z, mesh: ST.meshes[h.mi].name, teil: TEILE[i].id };
      if (ST.hover !== i) { ST.hover = i; anfordern(); }
      cv.style.cursor = "pointer";
      const r = buehne.getBoundingClientRect();
      tip.textContent = TEILE[i].titel;
      tip.hidden = false;
      tip.style.transform = "translate(" + Math.min(r.width - 150, cx - r.left + 14) + "px," + Math.max(4, cy - r.top + 16) + "px)";
    });
  }

  function eingabeStarten() {
    cv.addEventListener("pointerdown", (e) => {
      if (!ST.geladen) return;
      cv.setPointerCapture(e.pointerId);
      zeiger.set(e.pointerId, { x: e.clientX, y: e.clientY });
      eingabeBegonnen();
      if (zeiger.size === 1) { bewegtStrecke = 0; downZeit = performance.now(); ST.ziehen = true; cv.style.cursor = "grabbing"; $("modell-tip").hidden = true; }
      if (zeiger.size === 2) { const [a, b] = [...zeiger.values()]; pinch = Math.hypot(a.x - b.x, a.y - b.y); }
      anfordern();
    });
    cv.addEventListener("pointermove", (e) => {
      const p = zeiger.get(e.pointerId);
      if (!p) { if (e.pointerType === "mouse") hoverPruefen(e); return; }
      const dx = e.clientX - p.x, dy = e.clientY - p.y;
      p.x = e.clientX; p.y = e.clientY;
      if (zeiger.size === 1) {
        bewegtStrecke += Math.abs(dx) + Math.abs(dy);
        const c = ST.cam;
        const dyaw = -dx * 0.0055;
        c.yaw += dyaw;
        c.pitch = klammer(c.pitch + dy * 0.0055, rad(-70), rad(88));
        ST.yawSumme += Math.abs(dyaw);
        if (ST.yawSumme > Math.PI * 2) freischalten("rundflug");
      } else if (zeiger.size === 2) {
        const [a, b] = [...zeiger.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinch > 0 && d > 0) ST.cam.dist = klammer(ST.cam.dist * (pinch / d), 90, 3200);
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
        if (e.type === "pointerup" && bewegtStrecke < 7 && performance.now() - downZeit < 600) tippen(e);
      }
    };
    cv.addEventListener("pointerup", ende);
    cv.addEventListener("pointercancel", ende);
    cv.addEventListener("pointerleave", () => { if (!ST.ziehen) { $("modell-tip").hidden = true; if (ST.hover !== -1) { ST.hover = -1; ST.zeiger = null; anfordern(); } } });
    cv.addEventListener("wheel", (e) => {
      if (!ST.geladen) return;
      if (document.activeElement !== cv) {
        const h = $("modell-hinweis");
        h.hidden = false;
        clearTimeout(ST.hinweisT);
        ST.hinweisT = setTimeout(() => { h.hidden = true; }, 2600);
        return;
      }
      e.preventDefault();
      eingabeBegonnen();
      ST.cam.dist = klammer(ST.cam.dist * Math.exp(e.deltaY * 0.0012), 90, 3200);
      anfordern();
    }, { passive: false });
    cv.addEventListener("keydown", (e) => {
      if (!ST.geladen || e.ctrlKey || e.metaKey || e.altKey) return;
      const c = ST.cam, k = e.key;
      if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "+", "=", "-", "_", "Escape", "r", "R"].includes(k)) return;
      let ok = true;
      eingabeBegonnen();
      if (k === "ArrowLeft") { c.yaw += rad(6); ST.yawSumme += rad(6); }
      else if (k === "ArrowRight") { c.yaw -= rad(6); ST.yawSumme += rad(6); }
      else if (k === "ArrowUp") c.pitch = klammer(c.pitch - rad(5), rad(-70), rad(88));
      else if (k === "ArrowDown") c.pitch = klammer(c.pitch + rad(5), rad(-70), rad(88));
      else if (k === "+" || k === "=") c.dist = klammer(c.dist * 0.88, 90, 3200);
      else if (k === "-" || k === "_") c.dist = klammer(c.dist / 0.88, 90, 3200);
      else if (k === "Escape") { abwaehlen(); }
      else if (k === "r" || k === "R") ansicht("schraeg");
      else ok = false;
      if (ST.yawSumme > Math.PI * 2) freischalten("rundflug");
      if (ok) { e.preventDefault(); anfordern(); }
    });
    // Kein Seitenscrollen mit dem Mausrad, solange das Bild nicht angeklickt wurde
    cv.style.touchAction = "pan-y";
  }

  /* ---------- Start ---------- */
  async function start() {
    infoZeigen(-1);
    listeBauen();
    werkzeugeBauen();
    A.f3.push(() => {
      if (!ST.geladen) return "Modell: nicht geladen";
      let z = "Modell: " + ST.tris + " Dreiecke, Abstand " + Math.round(ST.cam.dist) + " m";
      if (ST.zeiger) z += "\nZeiger: x " + ST.zeiger.x.toFixed(0) + ", y " + ST.zeiger.y.toFixed(0) + ", z " + ST.zeiger.z.toFixed(0) + " (" + ST.zeiger.mesh + ", " + ST.zeiger.teil + ")";
      return z;
    });
    const status = $("modell-status");
    try {
      glStarten();
      const buf = await ladeBytes();
      status.textContent = "Modell wird aufgebaut …";
      await modellBauen(buf);
    } catch (e) {
      status.textContent = "Das 3D-Modell läuft in diesem Browser nicht (" + (e && e.message ? e.message : "Fehler") + "). Die Liste unten funktioniert trotzdem.";
      status.classList.add("fehler");
      cv.hidden = true;
      return;
    }
    ST.geladen = true;
    groesse();
    ST.cam = { yaw: rad(ANSICHTEN.schraeg.yaw), pitch: rad(ANSICHTEN.schraeg.pitch), dist: abst(ANSICHTEN.schraeg.dist), t: ST.mitte.slice() };
    regionenBauen();
    pinsBauen();
    infoZeigen(-1);
    status.hidden = true;
    werkzeugeBauen();
    eingabeStarten();
    cv.style.cursor = "grab";
    groesse();
    if ("ResizeObserver" in window) new ResizeObserver(groesse).observe(buehne);
    else window.addEventListener("resize", groesse);
    if ("IntersectionObserver" in window) {
      new IntersectionObserver((es) => {
        ST.sichtbar = es.some((x) => x.isIntersecting);
        if (ST.sichtbar) anfordern();
      }, { threshold: 0.05 }).observe(buehne);
    } else ST.sichtbar = true;
    document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") anfordern(); });
    ST.pinsStand = "alt";
    anfordern();
  }

  start();
})();
