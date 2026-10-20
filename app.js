/* =====================================================================
   Venator Werft: Verhalten der Seite.
   Texte, Namen und Zugangsdaten stehen in config.js, nicht hier.
   ===================================================================== */
(() => {
  "use strict";

  const CFG = window.VENATOR_CONFIG || {};
  const $ = (id) => document.getElementById(id);
  const reduce = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const klammer = (v, a, b) => Math.max(a, Math.min(b, v));

  function el(tag, klasse, text) {
    const e = document.createElement(tag);
    if (klasse) e.className = klasse;
    if (text !== undefined) e.textContent = text;
    return e;
  }
  function lesen(key) { try { return localStorage.getItem(key); } catch (e) { return null; } }
  function schreiben(key, wert) { try { localStorage.setItem(key, String(wert)); } catch (e) {} }
  function entfernen(key) { try { localStorage.removeItem(key); } catch (e) {} }
  function jsonListe(key) {
    try { const r = JSON.parse(lesen(key) || "[]"); return Array.isArray(r) ? r : []; } catch (e) { return []; }
  }
  const plural = (n, eins, viele) => n + " " + (n === 1 ? eins : viele);

  /* ---------- Meilensteine: gemeinsamer Stand und Prozent ---------- */
  const MS = { stand: {}, geladen: false };   // stand: id -> { fertig, von, geaendert }
  const msId = (m) => String(m.id || m.titel);
  const msFertig = (m) => { const s = MS.stand[msId(m)]; return s ? !!s.fertig : !!m.fertig; };
  const msListe = () => CFG.meilensteine || [];
  function msProzent() {
    const l = msListe();
    if (!l.length) return klammer(Number(CFG.fortschritt) || 0, 0, 100);
    return Math.round((100 * l.filter(msFertig).length) / l.length);
  }

  /* ---------- Zustand ---------- */
  const Z = {
    bloecke: Math.max(0, parseInt(lesen("venator-bloecke"), 10) || 0),
    fortschritt: msProzent(),
    letzter: null,        // neuester Log-Eintrag mit Notiz
    neuester: null,       // neuester Log-Eintrag überhaupt
    ton: lesen("venator-ton") === "an",
    erfolge: new Set(jsonListe("venator-erfolge")),
    funk: 0,
    tag: false,
    abschnitt: "bruecke",
    hyper: false
  };

  /* ---------- Pixel-Symbole (selbst gezeichnet, 8 x 8) ---------- */
  const PAL = {
    w: "#eef2f5", g: "#9aa3ab", d: "#4a525a", k: "#14181d", r: "#d0453b",
    y: "#f6c945", o: "#d9822b", c: "#62d6ff", b: "#3a7fe0", e: "#7fd13b", n: "#8a5a2b"
  };
  const SYMBOLE = {
    stern:  ["...yy...", "...yy...", "yyyyyyyy", ".yyyyyy.", "..yyyy..", "..yyyy..", ".yy..yy.", "yy....yy"],
    hammer: [".gggggg.", "gggggggg", "gggggggg", ".gggggg.", "...nn...", "...nn...", "...nn...", "...nn..."],
    buch:   ["nnnnnnnn", "nwwwwwwn", "nw.dd.wn", "nwwwwwwn", "nw.dd.wn", "nwwwwwwn", "nw.dd.wn", "nnnnnnnn"],
    klinge: ["......cc", ".....cwc", "....cwc.", "...cwc..", "..dgc...", ".dgd....", "dgd.....", "gd......"],
    kopf:   ["..wwww..", ".wwwwww.", ".wkwwkw.", ".wwwwww.", ".wkkkkw.", "..wwww..", ".bbbbbb.", "bbbbbbbb"],
    term:   ["dddddddd", "dkkkkkkd", "dkekkkkd", "dkkekkkd", "dkekkkkd", "dkkkkeed", "dkkkkkkd", "dddddddd"],
    pokal:  [".yyyyyy.", "yyyyyyyy", "y.yyyy.y", "y.yyyy.y", ".yyyyyy.", "..oooo..", "...oo...", "..oooo.."],
    hyper:  ["c......c", ".c....c.", "..c..c..", "...ww...", "...ww...", "..c..c..", ".c....c.", "c......c"],
    tonan:  ["....w...", "...ww.c.", "wwwwwc.c", "wwwwwc.c", "wwwwwc.c", "...ww.c.", "....w...", "........"],
    tonaus: ["....w...", "...ww...", "wwwwwr.r", "wwwww.r.", "wwwwwr.r", "...ww...", "....w...", "........"],
    block:  ["gggggggg", "gddgggdg", "gggdgggg", "gdgggddg", "gggggdgg", "gdggggdg", "ggdggggg", "gggggggg"],
    schloss:["..dddd..", ".d....d.", ".d....d.", "dddddddd", "dkkkkkkd", "dkkddkkd", "dkkddkkd", "dddddddd"],
    wuerfel:["..cccccc", ".cc....c", "cccccc.c", "c....c.c", "c....c.c", "c....c.c", "c....cc.", "cccccc.."],
    ernte:  ["...e.e..", "..eeeee.", "...eee..", "....e...", "....e...", "nnnnnnnn", "nnknnknn", "nnnnnnnn"]
  };
  function icon(name) {
    const c = document.createElement("canvas");
    c.width = 8; c.height = 8;
    c.className = "pix";
    c.setAttribute("aria-hidden", "true");
    const g = c.getContext("2d");
    (SYMBOLE[name] || SYMBOLE.stern).forEach((zeile, y) => {
      for (let x = 0; x < zeile.length; x++) {
        const f = PAL[zeile[x]];
        if (f) { g.fillStyle = f; g.fillRect(x, y, 1, 1); }
      }
    });
    return c;
  }

  /* ---------- Blöcke als kleine Farbfelder (selbst gemalt, keine Originaltexturen) ---------- */
  const BLOCK_FARBEN = {
    "Hellgrauer Beton": "#7d7d73", "Grauer Beton": "#373a3e", "Schwarzer Beton": "#0a0c11", "Weißer Beton": "#cfd5d6",
    "Roter Beton": "#8e2121", "Hellblauer Beton": "#2389c6", "Oranger Beton": "#e06101",
    "Glatter Stein": "#9e9e9e", "Steinziegel": "#7a7a7a", "Tiefenschiefer-Fliesen": "#36363a", "Polierter Schwarzstein": "#353036",
    "Seelaterne": "#acc8bd", "Leuchtstein": "#ab8654", "Hellblau gefärbtes Glas": "#71a7d8", "Gelb gefärbtes Glas": "#d9d34a",
    "Schwarz gefärbtes Glas": "#262626", "Glas": "#b8d8e0",
    "Eisenstangen": "#6b6f73", "Eisenfalltür": "#c4c4c4", "Eisenblock": "#dcdcdc", "Endstab": "#e9e2d0",
    "Klebriger Kolben": "#9c8556", "Kolben": "#a38a5c", "Beobachter": "#6b6b6b", "Trichter": "#4a4a4d", "Truhe": "#8a5a2b",
    "Spender": "#7a7a7a", "Komparator": "#a8a39a", "Schild": "#a8854f", "Falltür": "#8a6a3c",
    "Ackerboden": "#5b3b1f", "Wasser": "#2f5fd1", "Lava": "#e5601a", "Sand": "#dbd3a0", "Bett": "#b02e26"
  };
  function hex2rgb(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function blockFeld(name) {
    const c = document.createElement("canvas");
    c.width = 16; c.height = 16; c.className = "swatch";
    c.setAttribute("aria-hidden", "true");
    const g = c.getContext("2d");
    const basis = hex2rgb(BLOCK_FARBEN[name] || "#7a7f86");
    let seed = 0;
    for (let i = 0; i < name.length; i++) seed = (seed * 31 + name.charCodeAt(i)) % 2147483647;
    seed = seed || 7;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        let f = 0.9 + rnd() * 0.2;
        if (x === 0 || y === 0) f += 0.12;
        if (x === 15 || y === 15) f -= 0.18;
        g.fillStyle = "rgb(" + basis.map((v) => Math.max(0, Math.min(255, Math.round(v * f)))).join(",") + ")";
        g.fillRect(x, y, 1, 1);
      }
    }
    return c;
  }
  function blockChip(name, rolle) {
    const li = el("li", "bl");
    li.append(blockFeld(name));
    const t = el("span", "bl-text");
    t.append(el("strong", "bl-name", name));
    if (rolle) t.append(el("span", "bl-rolle", rolle));
    li.append(t);
    return li;
  }

  /* ---------- Ton (alles per Web Audio erzeugt, standardmäßig aus) ---------- */
  const Ton = {
    ctx: null,
    holen() {
      if (!Z.ton) return null;
      if (!this.ctx) {
        try {
          const AC = window.AudioContext || window.webkitAudioContext;
          if (!AC) return null;
          this.ctx = new AC();
        } catch (e) { return null; }
      }
      if (this.ctx.state === "suspended") { try { this.ctx.resume(); } catch (e) {} }
      return this.ctx;
    },
    ton(f, dauer, typ, vol, ziel, verz) {
      const c = this.holen(); if (!c) return;
      const t = c.currentTime + (verz || 0);
      const o = c.createOscillator(), g = c.createGain();
      o.type = typ || "square";
      o.frequency.setValueAtTime(f, t);
      if (ziel) o.frequency.exponentialRampToValueAtTime(ziel, t + dauer);
      g.gain.setValueAtTime(vol || 0.04, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dauer);
      o.connect(g); g.connect(c.destination);
      o.start(t); o.stop(t + dauer + 0.03);
    },
    rauschen(dauer, vol, filter, ziel, verz) {
      const c = this.holen(); if (!c) return;
      const t = c.currentTime + (verz || 0);
      const n = Math.max(1, Math.floor(c.sampleRate * dauer));
      const buf = c.createBuffer(1, n, c.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
      const s = c.createBufferSource(); s.buffer = buf;
      const f = c.createBiquadFilter(); f.type = "lowpass";
      f.frequency.setValueAtTime(filter || 1200, t);
      if (ziel) f.frequency.exponentialRampToValueAtTime(ziel, t + dauer);
      const g = c.createGain();
      g.gain.setValueAtTime(vol || 0.05, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dauer);
      s.connect(f); f.connect(g); g.connect(c.destination);
      s.start(t);
    },
    klick() { this.ton(240, 0.06, "square", 0.03, 120); },
    setzen() { this.ton(170, 0.09, "square", 0.05, 90); this.rauschen(0.05, 0.03, 900); },
    abbau(stufe) { this.rauschen(0.07, 0.05, 500 + stufe * 140); },
    zerbrechen() { this.rauschen(0.35, 0.08, 1800, 300); this.ton(130, 0.25, "sawtooth", 0.04, 50); },
    xp() { this.ton(660, 0.09, "sine", 0.04, 990); },
    erfolg() { [523, 659, 784, 1047].forEach((f, i) => this.ton(f, 0.14, "triangle", 0.05, null, i * 0.09)); },
    saber(an) {
      if (an) { this.ton(90, 0.4, "sawtooth", 0.045, 260); this.ton(110, 0.7, "sawtooth", 0.02); }
      else this.ton(260, 0.35, "sawtooth", 0.04, 70);
    },
    hyper() { this.rauschen(1.6, 0.07, 300, 5000); this.ton(80, 1.6, "sawtooth", 0.03, 600); },
    funk() { this.ton(880, 0.05, "square", 0.025); this.ton(1175, 0.07, "square", 0.025, null, 0.07); }
  };

  /* ---------- Effekte: Blockteilchen und XP-Kugeln ---------- */
  const Fx = {
    cv: null, cx: null, teile: [], laeuft: false, t: 0,
    init() {
      this.cv = $("fx"); this.cx = this.cv.getContext("2d");
      this.groesse();
      window.addEventListener("resize", () => this.groesse());
    },
    groesse() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.cv.width = Math.round(window.innerWidth * dpr);
      this.cv.height = Math.round(window.innerHeight * dpr);
      this.cx.setTransform(dpr, 0, 0, dpr, 0, 0);
    },
    block(x, y, n, farben) {
      if (reduce) return;
      const f = farben || ["#cfd3d7", "#9aa1a8", "#6f777f", "#c8352b"];
      for (let i = 0; i < n; i++) {
        this.teile.push({
          typ: "b", x, y,
          vx: (Math.random() - 0.5) * 300, vy: -Math.random() * 320 - 40,
          s: 4 + Math.floor(Math.random() * 5),
          c: f[Math.floor(Math.random() * f.length)],
          t: 0, leben: 0.8 + Math.random() * 0.6
        });
      }
      this.los();
    },
    xp(x, y, n) {
      if (reduce) { Hud.puls(); return; }
      for (let i = 0; i < n; i++) {
        this.teile.push({
          typ: "x", x, y,
          vx: (Math.random() - 0.5) * 240, vy: -Math.random() * 240 - 40,
          t: 0, leben: 4
        });
      }
      this.los();
    },
    los() {
      if (this.laeuft) return;
      this.laeuft = true;
      this.t = performance.now();
      requestAnimationFrame((n) => this.schritt(n));
    },
    schritt(jetzt) {
      const dt = Math.min(0.05, (jetzt - this.t) / 1000);
      this.t = jetzt;
      const cx = this.cx;
      cx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      const r = $("xp-leiste").getBoundingClientRect();
      const tx = r.left + r.width / 2, ty = r.top + r.height / 2;
      this.teile = this.teile.filter((p) => {
        p.t += dt;
        if (p.t > p.leben) return false;
        if (p.typ === "b") {
          p.vy += 900 * dt; p.x += p.vx * dt; p.y += p.vy * dt;
          cx.globalAlpha = Math.min(1, (p.leben - p.t) * 3);
          cx.fillStyle = p.c;
          cx.fillRect(Math.round(p.x), Math.round(p.y), p.s, p.s);
          cx.globalAlpha = 1;
          return true;
        }
        if (p.t < 0.35) {
          p.vy += 500 * dt; p.x += p.vx * dt; p.y += p.vy * dt;
        } else {
          const dx = tx - p.x, dy = ty - p.y, d = Math.hypot(dx, dy);
          if (d < 14) { Hud.puls(); return false; }
          const v = Math.min(900, 160 + (p.t - 0.35) * 900);
          p.x += (dx / d) * v * dt; p.y += (dy / d) * v * dt;
        }
        cx.fillStyle = "#7fd13b";
        cx.fillRect(Math.round(p.x) - 3, Math.round(p.y) - 3, 6, 6);
        cx.fillStyle = "#d6ffa6";
        cx.fillRect(Math.round(p.x) - 1, Math.round(p.y) - 1, 2, 2);
        return true;
      });
      if (this.teile.length) requestAnimationFrame((n) => this.schritt(n));
      else { this.laeuft = false; cx.clearRect(0, 0, window.innerWidth, window.innerHeight); }
    }
  };

  /* ---------- Meldung (wie ein Spiel-Erfolg) ---------- */
  // Meldungen laufen nacheinander, damit keine die vorige überschreibt.
  const toastSchlange = [];
  let toastLaeuft = false;
  function toast(titel, text, symbol) {
    toastSchlange.push({ titel, text, symbol });
    if (toastSchlange.length > 4) toastSchlange.splice(1, 1);
    if (!toastLaeuft) toastNaechster();
  }
  function toastNaechster() {
    const n = toastSchlange.shift();
    const t = $("toast");
    if (!n) { toastLaeuft = false; return; }
    toastLaeuft = true;
    t.replaceChildren();
    if (n.symbol) t.append(icon(n.symbol));
    const box = el("div");
    box.append(el("strong", "", n.titel), el("span", "", n.text));
    t.append(box);
    t.classList.add("zeigen");
    setTimeout(() => {
      t.classList.remove("zeigen");
      setTimeout(toastNaechster, 350);
    }, 3000);
  }

  /* ---------- Sternenfeld und Hyperraum ---------- */
  const Sterne = {
    cv: null, cx: null, w: 0, h: 0, stars: [], scrollV: 0, lastY: 0, hyperStart: -1, last: 0,
    farben: ["#ffffff", "#cfe4ff", "#fff1cc"],
    init() {
      this.cv = $("sterne"); this.cx = this.cv.getContext("2d");
      this.lastY = window.scrollY;
      this.groesse();
      let t;
      window.addEventListener("resize", () => { clearTimeout(t); t = setTimeout(() => this.groesse(), 150); });
      window.addEventListener("scroll", () => {
        const y = window.scrollY;
        this.scrollV += y - this.lastY;
        this.lastY = y;
      }, { passive: true });
      if (reduce) { this.statisch(); return; }
      requestAnimationFrame((n) => { this.last = n; this.schritt(n); });
    },
    groesse() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.w = window.innerWidth; this.h = window.innerHeight;
      this.cv.width = Math.round(this.w * dpr); this.cv.height = Math.round(this.h * dpr);
      this.cx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = klammer(Math.round((this.w * this.h) / 7000), 80, 260);
      this.stars = Array.from({ length: n }, () => this.neu({}, true));
      if (reduce) this.statisch();
    },
    neu(s, anfang) {
      s.x = Math.random() * 2 - 1;
      s.y = Math.random() * 2 - 1;
      s.z = anfang ? Math.random() * 0.95 + 0.05 : 1;
      s.pz = s.z;
      s.f = Math.random();
      s.c = this.farben[Math.floor(Math.random() * this.farben.length)];
      return s;
    },
    statisch() {
      const cx = this.cx;
      cx.clearRect(0, 0, this.w, this.h);
      this.stars.forEach((s) => {
        const size = s.z < 0.35 ? 3 : s.z < 0.7 ? 2 : 1;
        cx.globalAlpha = 1 - s.z * 0.65;
        cx.fillStyle = s.c;
        cx.fillRect(Math.round(this.w / 2 + (s.x / s.z) * (this.w / 2)), Math.round(this.h / 2 + (s.y / s.z) * (this.h / 2)), size, size);
      });
      cx.globalAlpha = 1;
    },
    sprung() { this.hyperStart = performance.now(); },
    faktor(jetzt) {
      if (this.hyperStart < 0) return 0;
      const t = (jetzt - this.hyperStart) / 1000;
      if (t < 0.5) return t / 0.5;
      if (t < 1.6) return 1;
      if (t < 2.9) return 1 - (t - 1.6) / 1.3;
      this.hyperStart = -1;
      return 0;
    },
    schritt(jetzt) {
      const dt = Math.min(0.05, (jetzt - this.last) / 1000);
      this.last = jetzt;
      this.scrollV *= 0.88;
      if (document.documentElement.dataset.zeit === "tag") {
        requestAnimationFrame((n) => this.schritt(n));
        return;
      }
      const hf = this.faktor(jetzt);
      const tempo = 0.02 + Math.min(0.5, Math.abs(this.scrollV) * 0.0007) + hf * 2.6;
      const cx = this.cx, w = this.w, h = this.h, hw = w / 2, hh = h / 2;
      cx.clearRect(0, 0, w, h);
      for (const s of this.stars) {
        s.pz = s.z;
        s.z -= tempo * dt * (0.4 + s.f * 0.9);
        if (s.z <= 0.03) { this.neu(s, false); continue; }
        const sx = hw + (s.x / s.z) * hw, sy = hh + (s.y / s.z) * hh;
        if (sx < -20 || sx > w + 20 || sy < -20 || sy > h + 20) { this.neu(s, false); continue; }
        cx.globalAlpha = 1 - s.z * 0.65;
        if (hf > 0.08) {
          const px = hw + (s.x / s.pz) * hw, py = hh + (s.y / s.pz) * hh;
          cx.strokeStyle = s.c;
          cx.lineWidth = 1 + (1 - s.z) * 1.6;
          cx.beginPath(); cx.moveTo(px, py); cx.lineTo(sx, sy); cx.stroke();
        } else {
          const size = s.z < 0.35 ? 3 : s.z < 0.7 ? 2 : 1;
          cx.fillStyle = s.c;
          cx.fillRect(Math.round(sx), Math.round(sy), size, size);
        }
      }
      cx.globalAlpha = 1;
      if (hf > 0.05) {
        const g = cx.createRadialGradient(hw, hh, 0, hw, hh, Math.max(w, h) * 0.6);
        g.addColorStop(0, "rgba(190,220,255," + (hf * 0.28).toFixed(3) + ")");
        g.addColorStop(1, "rgba(190,220,255,0)");
        cx.fillStyle = g;
        cx.fillRect(0, 0, w, h);
      }
      requestAnimationFrame((n) => this.schritt(n));
    }
  };

  const Hyper = {
    sprung() {
      if (Z.hyper) return;
      Z.hyper = true;
      setTimeout(() => { Z.hyper = false; }, 3000);
      if (reduce) toast("Hyperraum", "Sprung ausgeführt. Die Animation ist in deinem System ausgeschaltet.", "hyper");
      else Sterne.sprung();
      Ton.hyper();
      freischalten("hyperraum");
    }
  };

  const Zeit = {
    setzen(tag) {
      Z.tag = tag;
      document.documentElement.dataset.zeit = tag ? "tag" : "nacht";
      if (tag) freischalten("tagnacht");
    }
  };

  /* ---------- Erfolge ---------- */
  const ERFOLGE = [
    { id: "zuendung", titel: "Erste Zündung", text: "Zünde einen Meilenstein (mit dem Passwort der Besatzung).", sym: "klinge" },
    { id: "hyperraum", titel: "Kleiner Sprung", text: "Spring einmal in den Hyperraum.", sym: "hyper" },
    { id: "bergmann", titel: "Block abgebaut", text: "Baue den schwebenden Block in der Werft ab.", sym: "hammer" },
    { id: "stack", titel: "Ein ganzer Stack", text: "Setze 64 Blöcke.", sym: "block" },
    { id: "funker", titel: "Funkverkehr", text: "Empfange fünf Funksprüche.", sym: "tonan" },
    { id: "kommando", titel: "Kommandozeile", text: "Führe einen Befehl im Bordterminal aus.", sym: "term" },
    { id: "klinge", titel: "Klingenfarbe", text: "Ändere die Farbe aller Klingen.", sym: "stern" },
    { id: "tagnacht", titel: "Tag und Nacht", text: "Lass es im Weltraum Tag werden.", sym: "stern" },
    { id: "weitgereist", titel: "Weit gereist", text: "Scrolle bis ganz nach unten.", sym: "buch" },
    { id: "bauplan", titel: "Bauplan studiert", text: "Sieh dir sechs Teile des Schiffs im Modell an.", sym: "wuerfel" },
    { id: "rundflug", titel: "Rundflug", text: "Dreh das Modell einmal rundherum.", sym: "hyper" },
    { id: "inspektor", titel: "Chef-Ingenieur", text: "Schau dir alle Räume im Innenraum an.", sym: "ernte" },
    { id: "geheim", titel: "Geheimcode", text: "Ein alter Klassiker auf der Tastatur.", sym: "pokal", geheim: true }
  ];

  function erfolgeZeigen() {
    const liste = $("erfolge-liste");
    liste.replaceChildren();
    ERFOLGE.forEach((e) => {
      const frei = Z.erfolge.has(e.id);
      const li = el("li", "erfolg " + (frei ? "frei" : "offen"));
      const sym = el("span", "sym");
      sym.append(icon(frei ? e.sym : (e.geheim ? "schloss" : e.sym)));
      const box = el("div");
      box.append(el("strong", "", frei || !e.geheim ? e.titel : "Geheim"));
      box.append(el("span", "t", e.text));
      li.append(sym, box);
      liste.append(li);
    });
    $("erfolge-zaehler").textContent = "(" + ERFOLGE.filter((e) => Z.erfolge.has(e.id)).length + " von " + ERFOLGE.length + ")";
  }

  function freischalten(id) {
    const e = ERFOLGE.find((x) => x.id === id);
    if (!e || Z.erfolge.has(id)) return;
    Z.erfolge.add(id);
    schreiben("venator-erfolge", JSON.stringify([...Z.erfolge]));
    toast("Erfolg freigeschaltet", e.titel, e.sym);
    Ton.erfolg();
    const x = window.innerWidth - 60, y = 40;
    Fx.xp(x, y, 6);
    erfolgeZeigen();
  }

  /* ---------- Baufortschritt ---------- */
  const Fortschritt = {
    setzen(p) {
      Z.fortschritt = klammer(Math.round(Number(p) || 0), 0, 100);
      $("xp-fuellung").style.width = Z.fortschritt + "%";
      $("xp-level").textContent = String(Z.fortschritt);
      const leiste = $("xp-leiste");
      leiste.setAttribute("aria-valuenow", String(Z.fortschritt));
      leiste.setAttribute("aria-valuetext", Z.fortschritt + " Prozent");
      const f = $("f3-fortschritt");
      if (f) f.textContent = Z.fortschritt + " %";
      krawallAktualisieren();
    }
  };

  /* ---------- Schnellleiste (Hotbar) ---------- */
  const SLOTS = [
    { name: "Brücke", icon: "stern", ziel: "bruecke" },
    { name: "Werft", icon: "hammer", ziel: "werft" },
    { name: "Modell", icon: "wuerfel", ziel: "modell" },
    { name: "Innenraum", icon: "ernte", ziel: "innenraum" },
    { name: "Werft-Log", icon: "buch", ziel: "log-bereich" },
    { name: "Meilensteine", icon: "klinge", ziel: "meilensteine" },
    { name: "Besatzung", icon: "kopf", ziel: "besatzung" },
    { name: "Bordterminal", icon: "term", ziel: "terminal" },
    { name: "Erfolge", icon: "pokal", ziel: "erfolge" }
  ];

  function springe(id) {
    const n = $(id);
    if (!n) return;
    n.scrollIntoView({ block: "start" });
    const h = n.querySelector("h2");
    if (h) h.focus({ preventScroll: true });
  }

  const Hud = {
    knoepfe: [], tonKnopf: null,
    bauen() {
      const bar = $("hotbar");
      SLOTS.forEach((s, i) => {
        const b = el("button", "slot");
        b.type = "button";
        b.dataset.tip = s.name;
        b.setAttribute("aria-label", s.name + " (Taste " + (i + 1) + ")");
        b.setAttribute("aria-keyshortcuts", String(i + 1));
        b.dataset.ziel = s.ziel;
        const nr = el("span", "slot-nr", String(i + 1));
        nr.setAttribute("aria-hidden", "true");
        b.append(icon(s.icon), nr);
        b.addEventListener("click", () => this.waehlen(i));
        bar.append(b);
        this.knoepfe.push(b);
      });

      // Zwei Schnellaktionen oben rechts: Hyperraum (H) und Ton (M)
      const akt = $("aktionen");
      const mk = (name, taste, sym, fn) => {
        const b = el("button", "slot slot-akt");
        b.type = "button";
        b.dataset.tip = name;
        b.setAttribute("aria-label", name + " (Taste " + taste + ")");
        b.setAttribute("aria-keyshortcuts", taste.toLowerCase());
        const nr = el("span", "slot-nr", taste);
        nr.setAttribute("aria-hidden", "true");
        b.append(icon(sym), nr);
        b.addEventListener("click", fn);
        akt.append(b);
        return b;
      };
      mk("Hyperraum-Sprung", "H", "hyper", () => Hyper.sprung());
      this.tonKnopf = mk("Ton", "M", "tonaus", () => this.tonUmschalten());
      this.tonAnzeige();

      if ("IntersectionObserver" in window) {
        const io = new IntersectionObserver((eintraege) => {
          eintraege.forEach((e) => { if (e.isIntersecting) this.aktiv(e.target.id); });
        }, { rootMargin: "-45% 0px -50% 0px" });
        SLOTS.forEach((s) => { const n = $(s.ziel); if (n) io.observe(n); });
      }
      let wartet = false;
      window.addEventListener("scroll", () => {
        if (wartet) return;
        wartet = true;
        setTimeout(() => {
          wartet = false;
          const de = document.documentElement;
          if (window.innerHeight + window.scrollY >= de.scrollHeight - 60) freischalten("weitgereist");
        }, 200);
      }, { passive: true });
    },
    aktiv(id) {
      Z.abschnitt = id;
      this.knoepfe.forEach((b) => {
        if (b.dataset.ziel === id) b.setAttribute("aria-current", "true");
        else b.removeAttribute("aria-current");
      });
    },
    waehlen(i) {
      const s = SLOTS[i];
      if (s) springe(s.ziel);
    },
    tonUmschalten(an) {
      Z.ton = an === undefined ? !Z.ton : !!an;
      schreiben("venator-ton", Z.ton ? "an" : "aus");
      this.tonAnzeige();
      if (Z.ton) Ton.klick();
    },
    tonAnzeige() {
      const b = this.tonKnopf;
      if (!b) return;
      b.setAttribute("aria-pressed", Z.ton ? "true" : "false");
      b.setAttribute("aria-label", "Ton " + (Z.ton ? "an" : "aus") + " (Taste M)");
      b.dataset.tip = "Ton: " + (Z.ton ? "an" : "aus");
      b.replaceChild(icon(Z.ton ? "tonan" : "tonaus"), b.firstChild);
    },
    puls() {
      const x = $("xp-leiste");
      x.classList.remove("puls");
      void x.offsetWidth;
      x.classList.add("puls");
    }
  };

  /* ---------- Eröffnung (Weltraum-Text) ---------- */
  const Film = {
    kopf: null, dyn: [],
    init() {
      this.kopf = $("bruecke");
      const K = CFG.krawall || {};
      $("intro").textContent = K.intro || "";
      $("krawall").addEventListener("animationend", (e) => {
        if (e.target === $("krawall")) this.ende();
      });
      $("film-skip").addEventListener("click", () => { this.ende(); $("film-nochmal").focus(); });
      $("film-nochmal").addEventListener("click", () => { this.start(); $("film-skip").focus(); });
      $("film-hyper").addEventListener("click", () => Hyper.sprung());
      $("text-lesen").open = reduce;
      if (reduce) this.kopf.dataset.phase = "ende";
    },
    start() {
      if (reduce) { $("text-lesen").open = true; return; }
      this.kopf.dataset.phase = "ende";
      void this.kopf.offsetWidth;
      this.kopf.dataset.phase = "film";
    },
    ende() { this.kopf.dataset.phase = "ende"; }
  };

  function krawallText() {
    const p = Z.fortschritt;
    const l = msListe();
    let t = "Der Bau steht bei " + p + " Prozent" + (l.length ? " (" + l.filter(msFertig).length + " von " + l.length + " Meilensteinen)" : "") + ".";
    if (Z.letzter && Z.letzter.notiz) {
      t += " Zuletzt gemeldet von " + Z.letzter.spieler + ": „" + Z.letzter.notiz + "“";
    }
    return t;
  }
  function krawallAktualisieren() {
    const t = krawallText();
    Film.dyn.forEach((p) => { p.textContent = t; });
  }
  function krawallBauen() {
    const K = CFG.krawall || {};
    Film.dyn = [];
    [$("krawall"), $("krawall-flach")].forEach((box) => {
      box.replaceChildren();
      if (K.kapitel) box.append(el("p", "krawall-kapitel", K.kapitel));
      if (K.titel) box.append(el("p", "krawall-titel", K.titel));
      (K.absaetze || []).forEach((t) => box.append(el("p", "", t)));
      const dyn = el("p", "dyn", "");
      Film.dyn.push(dyn);
      box.append(dyn);
      if (K.schluss) box.append(el("p", "", K.schluss));
    });
    krawallAktualisieren();
  }

  /* ---------- Werft: Blöcke, abbaubarer Block, Rechner ---------- */
  const RAENGE = [[0, "Rekrut"], [16, "Fähnrich"], [64, "Leutnant"], [256, "Kommandant"], [1024, "Kapitän"], [2304, "Admiral"]];
  function rang(n) {
    let r = RAENGE[0], naechster = null;
    for (let i = 0; i < RAENGE.length; i++) {
      if (n >= RAENGE[i][0]) { r = RAENGE[i]; naechster = RAENGE[i + 1] || null; }
    }
    return { name: r[1], naechster };
  }

  const Werft = {
    init() {
      $("block-knopf").addEventListener("click", (e) => {
        const r = e.currentTarget.getBoundingClientRect();
        this.setzen(1);
        Fx.block(r.left + r.width / 2, r.top, 6);
      });
      this.anzeige();
    },
    anzeige() {
      const s = Math.floor(Z.bloecke / 64), rest = Z.bloecke % 64;
      $("zaehler").textContent = plural(s, "Stack", "Stacks") + " + " + plural(rest, "Block", "Blöcke");
      const rg = rang(Z.bloecke);
      $("rang").textContent = "Rang: " + rg.name + (rg.naechster ? " (nächster Rang bei " + rg.naechster[0] + " Blöcken)" : " (höchster Rang)");
    },
    setzen(n, leise) {
      const alt = Z.bloecke;
      Z.bloecke = Math.min(999999, Z.bloecke + n);
      schreiben("venator-bloecke", Z.bloecke);
      this.anzeige();
      if (!leise) Ton.setzen();
      if (Math.floor(Z.bloecke / 64) > Math.floor(alt / 64)) {
        toast("Stack voll", "64 Blöcke gesetzt.", "block");
        const r = $("zaehler").getBoundingClientRect();
        Fx.xp(r.left + r.width / 2, r.top, 5);
      }
      if (rang(alt).name !== rang(Z.bloecke).name) toast("Rang erreicht", rang(Z.bloecke).name, "pokal");
      if (Z.bloecke >= 64) freischalten("stack");
    }
  };

  const Bau = {
    stufe: 0, gebrochen: false, cv: null, cx: null, zelle: 6, linien: [],
    init() {
      this.cv = $("risse"); this.cx = this.cv.getContext("2d");
      this.groesse();
      window.addEventListener("resize", () => this.groesse());
      $("bauplatz").addEventListener("click", (e) => this.schlag(e));
    },
    groesse() {
      const b = $("bauplatz");
      this.cv.width = b.clientWidth; this.cv.height = b.clientHeight;
      this.machen();
      this.zeichnen();
    },
    machen() {
      const z = this.zelle, W = Math.floor(this.cv.width / z), H = Math.floor(this.cv.height / z);
      let seed = 7;
      const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
      this.linien = [];
      for (let l = 0; l < 6; l++) {
        let x = Math.floor(W / 2) + Math.floor(rnd() * 6 - 3), y = Math.floor(H * 0.45) + Math.floor(rnd() * 4 - 2);
        const ang = rnd() * Math.PI * 2, pfad = [];
        for (let i = 0; i < 16; i++) {
          if (x < 0 || y < 0 || x >= W || y >= H) break;
          pfad.push([x, y]);
          x += Math.round(Math.cos(ang + (rnd() - 0.5) * 0.9) * 1.4);
          y += Math.round(Math.sin(ang + (rnd() - 0.5) * 0.9) * 1.4);
        }
        this.linien.push(pfad);
      }
    },
    zeichnen() {
      const cx = this.cx, z = this.zelle;
      cx.clearRect(0, 0, this.cv.width, this.cv.height);
      cx.fillStyle = "rgba(0,0,0,0.62)";
      this.linien.forEach((pfad) => {
        const n = Math.ceil((pfad.length * this.stufe) / 10);
        for (let i = 0; i < n; i++) cx.fillRect(pfad[i][0] * z, pfad[i][1] * z, z, z);
      });
    },
    schlag(e) {
      if (this.gebrochen) return;
      this.stufe++;
      const b = $("bauplatz");
      Ton.abbau(this.stufe);
      if (!reduce) { b.classList.remove("schlag"); void b.offsetWidth; b.classList.add("schlag"); }
      const r = b.getBoundingClientRect();
      const mitte = !e || e.detail === 0;
      Fx.block(mitte ? r.left + r.width / 2 : e.clientX, mitte ? r.top + r.height / 2 : e.clientY, 4);
      this.zeichnen();
      $("bau-live").textContent = "Schlag " + this.stufe + " von 10.";
      if (this.stufe >= 10) this.brechen(r);
    },
    brechen(r) {
      this.gebrochen = true;
      Fx.block(r.left + r.width / 2, r.top + r.height / 2, 30);
      Ton.zerbrechen();
      $("bauplatz").classList.add("weg");
      $("bau-live").textContent = "Block abgebaut. Er erscheint gleich wieder.";
      freischalten("bergmann");
      setTimeout(() => {
        this.stufe = 0; this.gebrochen = false;
        $("bauplatz").classList.remove("weg");
        this.zeichnen();
        $("bau-live").textContent = "Der Block ist zurück.";
      }, 1600);
    }
  };

  const Rechner = {
    init() {
      const m = $("r-meter");
      if (CFG.schiffLaengeMeter) m.value = CFG.schiffLaengeMeter;
      $("r-bloecke").addEventListener("input", () => this.material());
      m.addEventListener("input", () => this.massstab());
      this.material();
      this.massstab();
    },
    zahl(id) {
      const raw = $(id).value.trim().replace(",", ".");
      const n = Number(raw);
      return raw === "" || !Number.isFinite(n) || n < 0 ? null : n;
    },
    material() {
      const n = this.zahl("r-bloecke"), out = $("r-out-1");
      if (n === null) { out.textContent = "Gib eine Zahl ein."; return; }
      const ganz = Math.floor(n), stacks = Math.floor(ganz / 64), rest = ganz % 64;
      const gesamt = Math.ceil(ganz / 64), sb = Math.ceil(gesamt / 27), dk = Math.ceil(gesamt / 54);
      out.textContent = plural(stacks, "Stack", "Stacks") + " + " + plural(rest, "Block", "Blöcke") +
        "\n" + plural(sb, "Shulkerbox", "Shulkerboxen") + " oder " + plural(dk, "Doppelkiste", "Doppelkisten");
    },
    massstab() {
      const n = this.zahl("r-meter"), out = $("r-out-2");
      if (n === null) { out.textContent = "Gib eine Zahl ein."; return; }
      const m = Number(CFG.massstab) > 0 ? Number(CFG.massstab) : 4;
      const bl = Math.round(n / m);
      out.textContent = n.toLocaleString("de-DE", { maximumFractionDigits: 2 }) + " m sind bei 1:" + m + " etwa " + plural(bl, "Block", "Blöcke") + ".";
    }
  };

  /* ---------- Werft-Log (gemeinsamer Speicher über Supabase) ---------- */
  const SP = CFG.speicher || {};
  const speicherAktiv = !!(SP.url && SP.key);
  const MELDUNGEN = {
    pin_falsch: "Das Passwort stimmt nicht.",
    spieler_ungueltig: "Der Name fehlt oder ist zu lang.",
    prozent_ungueltig: "Prozent muss eine ganze Zahl von 0 bis 100 sein.",
    notiz_zu_lang: "Die Notiz ist länger als 280 Zeichen.",
    eintrag_leer: "Trag eine Notiz ein.",
    meilenstein_ungueltig: "Dieser Meilenstein ist ungültig."
  };

  function apiKopf() {
    const h = { apikey: SP.key };
    // Alte Schlüssel (anon, beginnen mit eyJ) sind JWTs und gehören zusätzlich in Authorization.
    if (SP.key.indexOf("eyJ") === 0) h.Authorization = "Bearer " + SP.key;
    return h;
  }
  const apiBasis = () => SP.url.replace(/\/+$/, "");

  function formMeldung(text, fehler) {
    const m = $("f-meldung");
    m.textContent = text;
    m.classList.toggle("fehler", !!fehler);
  }

  function zeitText(iso) {
    const d = new Date(iso);
    return isNaN(d.getTime()) ? "" : d.toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short" });
  }

  function logZeigen(daten) {
    const liste = $("log"), status = $("log-status");
    liste.replaceChildren();
    Z.neuester = daten[0] || null;
    Z.letzter = daten.find((e) => e.notiz) || null;
    krawallAktualisieren();

    if (!daten.length) { status.textContent = "Noch keine Einträge. Schreib den ersten."; return; }
    status.textContent = "";
    daten.slice(0, 20).forEach((e) => {
      const li = el("li", "log-eintrag");
      const kopf = el("div", "log-kopf");
      kopf.append(el("strong", "", e.spieler), el("span", "log-zeit", zeitText(e.created_at)));
      if (e.prozent !== null && e.prozent !== undefined) kopf.append(el("span", "log-stufe", e.prozent + " %"));
      li.append(kopf);
      if (e.notiz) li.append(el("p", "log-notiz", e.notiz));
      liste.append(li);
    });
  }

  async function logLaden() {
    meilensteineLaden();
    try {
      const res = await fetch(
        apiBasis() + "/rest/v1/eintraege?select=id,created_at,spieler,prozent,notiz&order=id.desc&limit=50",
        { headers: apiKopf() }
      );
      if (!res.ok) throw new Error("HTTP " + res.status);
      logZeigen(await res.json());
    } catch (e) {
      $("log-status").textContent = "Der Speicher ist gerade nicht erreichbar. Der Fortschritt kann veraltet sein.";
    }
  }

  const Log = {
    init() {
      if (!speicherAktiv) {
        $("log-hinweis").textContent = "Der gemeinsame Speicher ist noch nicht verbunden. Sobald das erledigt ist, erscheinen hier die Einträge der Besatzung.";
        return;
      }
      $("log-hinweis").textContent = "Hier tragen beide Spieler ihren Fortschritt ein. Alle sehen die Einträge, schreiben darf nur, wer das Passwort kennt.";
      $("eintragen").hidden = false;

      const wahl = $("f-spieler");
      (CFG.spieler || []).forEach((s) => {
        const o = el("option", "", s.name);
        o.value = s.name;
        wahl.append(o);
      });
      const n = lesen("venator-name");
      if (n) wahl.value = n;
      const p = lesen("venator-pw");
      if (p) { $("f-pin").value = p; $("f-merken").checked = true; }

      $("log-form").addEventListener("submit", async (ev) => {
        ev.preventDefault();
        const spieler = wahl.value;
        const notiz = $("f-notiz").value.trim();
        const pin = $("f-pin").value;

        if (!notiz) return formMeldung(MELDUNGEN.eintrag_leer, true);
        if (!pin) return formMeldung("Bitte gib das Passwort ein.", true);

        const senden = $("f-senden");
        senden.disabled = true;
        formMeldung("Speichere ...", false);
        try {
          const res = await fetch(apiBasis() + "/rest/v1/rpc/eintrag_hinzufuegen", {
            method: "POST",
            headers: Object.assign({ "Content-Type": "application/json" }, apiKopf()),
            body: JSON.stringify({ p_pin: pin, p_spieler: spieler, p_prozent: null, p_notiz: notiz || null })
          });
          if (!res.ok) {
            let code = "";
            try { code = (await res.json()).message || ""; } catch (e) {}
            return formMeldung(MELDUNGEN[code] || "Das hat nicht geklappt (Fehler " + res.status + ").", true);
          }
          if ($("f-merken").checked) { schreiben("venator-name", spieler); schreiben("venator-pw", pin); }
          else entfernen("venator-pw");
          $("f-notiz").value = "";
          formMeldung("", false);
          toast("Eintrag gespeichert", spieler, "buch");
          Ton.erfolg();
          await logLaden();
        } catch (e) {
          formMeldung("Keine Verbindung zum Speicher.", true);
        } finally {
          senden.disabled = false;
        }
      });

      logLaden();
      // Alle 30 Sekunden nachladen, solange die Seite sichtbar ist
      setInterval(() => { if (document.visibilityState === "visible") logLaden(); }, 30000);
      document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") logLaden(); });
    }
  };

  /* ---------- Meilensteine als Klingen ---------- */
  const MS_KLINGEN = [];   // { m, b, zeigen(fertig, von) }

  function msAnwenden() {
    MS_KLINGEN.forEach((k) => {
      const s = MS.stand[msId(k.m)];
      k.zeigen(msFertig(k.m), s && s.fertig ? s.von : "");
    });
    const l = msListe(), n = l.filter(msFertig).length;
    if (l.length) {
      $("ms-zaehler").textContent = n + " von " + l.length + " Meilensteinen gezündet. Baufortschritt: " + msProzent() + " %.";
    }
    Fortschritt.setzen(msProzent());
  }

  async function meilensteineLaden() {
    if (!speicherAktiv || !msListe().length) return;
    try {
      const res = await fetch(apiBasis() + "/rest/v1/meilensteine?select=schluessel,fertig,von,geaendert", { headers: apiKopf() });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const daten = await res.json();
      const stand = {};
      daten.forEach((r) => { stand[r.schluessel] = { fertig: !!r.fertig, von: r.von || "", geaendert: r.geaendert }; });
      MS.stand = stand;
      MS.geladen = true;
      msAnwenden();
    } catch (e) { /* alter Stand bleibt sichtbar */ }
  }

  function msDialogOeffnen(k) {
    const dlg = $("ms-dialog");
    const neu = k.b.getAttribute("aria-pressed") !== "true";
    $("ms-titel").textContent = neu ? "Meilenstein zünden" : "Meilenstein wieder öffnen";
    $("ms-text").textContent = (neu ? "„" + k.m.titel + "“ als erledigt markieren?" : "„" + k.m.titel + "“ wieder auf offen setzen?") + " Alle sehen die Änderung.";
    $("ms-meldung").textContent = ""; $("ms-meldung").classList.remove("fehler");
    const wahl = $("ms-spieler");
    wahl.replaceChildren();
    (CFG.spieler || []).forEach((p) => { const o = el("option", "", p.name); o.value = p.name; wahl.append(o); });
    const n = lesen("venator-name"); if (n) wahl.value = n;
    const p = lesen("venator-pw");
    $("ms-pin").value = p || "";
    $("ms-merken").checked = !!p;
    dlg._k = k; dlg._neu = neu;
    if (typeof dlg.showModal === "function") dlg.showModal(); else dlg.setAttribute("open", "");
    $("ms-pin").focus();
  }

  function msDialogInit() {
    const dlg = $("ms-dialog"), form = $("ms-form");
    const zu = () => { if (typeof dlg.close === "function") dlg.close(); else dlg.removeAttribute("open"); };
    $("ms-abbruch").addEventListener("click", zu);
    form.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      const k = dlg._k, neu = dlg._neu, pin = $("ms-pin").value, spieler = $("ms-spieler").value;
      const meld = (t, fehler) => { const m = $("ms-meldung"); m.textContent = t; m.classList.toggle("fehler", !!fehler); };
      if (!pin) return meld("Bitte gib das Passwort ein.", true);
      const ok = $("ms-ok");
      ok.disabled = true; meld("Speichere ...", false);
      try {
        const res = await fetch(apiBasis() + "/rest/v1/rpc/meilenstein_setzen", {
          method: "POST",
          headers: Object.assign({ "Content-Type": "application/json" }, apiKopf()),
          body: JSON.stringify({ p_pin: pin, p_schluessel: msId(k.m), p_fertig: neu, p_spieler: spieler })
        });
        if (!res.ok) {
          let code = "";
          try { code = (await res.json()).message || ""; } catch (e) {}
          return meld(MELDUNGEN[code] || "Das hat nicht geklappt (Fehler " + res.status + ").", true);
        }
        if ($("ms-merken").checked) { schreiben("venator-name", spieler); schreiben("venator-pw", pin); }
        else entfernen("venator-pw");
        MS.stand[msId(k.m)] = { fertig: neu, von: spieler, geaendert: new Date().toISOString() };
        zu();
        msAnwenden();
        Ton.saber(neu);
        if (neu) {
          toast("Meilenstein gezündet", k.m.titel, "klinge");
          freischalten("zuendung");
          const r = k.b.getBoundingClientRect();
          Fx.xp(r.left + r.width / 2, r.top + r.height / 2, 6);
        } else toast("Meilenstein wieder offen", k.m.titel, "klinge");
        meilensteineLaden();
      } catch (e) {
        meld("Keine Verbindung zum Speicher.", true);
      } finally {
        ok.disabled = false;
      }
    });
  }

  function meilensteineBauen() {
    const farben = ["#4aa8ff", "#4cff7a", "#ff5a4a", "#ffd84a", "#b36bff", "#ffffff"];
    const liste = $("adv-liste");
    if (speicherAktiv) {
      $("ms-hinweis").textContent = "Klick auf eine Klinge, um einen Meilenstein zu zünden oder wieder zu öffnen. Dafür brauchst du das Passwort der Besatzung. Der Baufortschritt wird daraus berechnet.";
      msDialogInit();
    } else {
      $("ms-hinweis").textContent = "Der gemeinsame Speicher ist nicht verbunden. Du kannst Klingen nur für dich zünden, der Baufortschritt ändert sich dadurch nicht.";
    }
    msListe().forEach((m, i) => {
      const b = el("button", "klinge");
      b.type = "button";
      b.style.setProperty("--k", m.farbe || farben[i % farben.length]);
      const status = el("span", "klinge-status");
      const kopf = el("span", "klinge-kopf");
      kopf.append(el("span", "klinge-titel", m.titel), status);
      const bahn = el("span", "klinge-bahn");
      bahn.setAttribute("aria-hidden", "true");
      bahn.append(el("span", "griff"), el("span", "schneide"));
      b.append(kopf, el("span", "klinge-text", m.text || ""), bahn);

      const zeigen = (fertig, von) => {
        b.setAttribute("aria-pressed", fertig ? "true" : "false");
        status.textContent = fertig ? "Gezündet" + (von ? " · " + von : "") : "Offen";
      };
      zeigen(msFertig(m), "");
      const k = { m, b, zeigen };
      MS_KLINGEN.push(k);

      b.addEventListener("click", () => {
        if (speicherAktiv) return msDialogOeffnen(k);
        const neu = b.getAttribute("aria-pressed") !== "true";
        zeigen(neu, "");
        Ton.saber(neu);
        if (neu) {
          toast("Meilenstein gezündet", m.titel, "klinge");
          freischalten("zuendung");
          const r = b.getBoundingClientRect();
          Fx.xp(r.left + r.width / 2, r.top + r.height / 2, 6);
        }
      });
      liste.append(b);
    });
    msAnwenden();
  }

  /* ---------- Besatzung und Holo-Funk ---------- */
  function besatzungBauen() {
    const box = $("spieler");
    (CFG.spieler || []).forEach((s) => {
      const zeile = el("div", "spieler-zeile");
      const slot = el("div", "slot-gross", (s.name || "?").charAt(0).toUpperCase());
      slot.setAttribute("aria-hidden", "true");
      const info = el("div");
      info.append(el("div", "spieler-name", s.name), el("div", "spieler-rolle", s.rolle));
      zeile.append(slot, info);
      box.append(zeile);
    });
  }

  const Funk = {
    idx: -1, letzte: null, timer: null,
    init() { $("funk-knopf").addEventListener("click", () => this.senden()); },
    senden() {
      const liste = CFG.funksprueche && CFG.funksprueche.length ? CFG.funksprueche : ["Keine Funksprüche eingetragen."];
      let i;
      do { i = Math.floor(Math.random() * liste.length); } while (i === this.idx && liste.length > 1);
      this.idx = i;
      const crew = CFG.spieler && CFG.spieler.length ? CFG.spieler : [{ name: "Besatzung" }];
      const von = crew[Math.floor(Math.random() * crew.length)].name;
      const text = liste[i];

      if (this.letzte) {
        const v = $("funk-verlauf");
        const li = el("li");
        li.append(el("strong", "", this.letzte.von + ": "), document.createTextNode(this.letzte.text));
        v.prepend(li);
        while (v.children.length > 4) v.removeChild(v.lastChild);
      }
      this.letzte = { von, text };

      $("holo-von").textContent = "Funkspruch von " + von;
      $("funk-live").textContent = von + ": " + text;
      const t = $("holo-text");
      clearInterval(this.timer);
      if (reduce) t.textContent = text;
      else {
        let n = 0;
        t.textContent = "";
        this.timer = setInterval(() => {
          n++;
          t.textContent = text.slice(0, n);
          if (n >= text.length) clearInterval(this.timer);
        }, 18);
        const holo = $("holo");
        holo.classList.remove("neu");
        void holo.offsetWidth;
        holo.classList.add("neu");
      }
      Ton.funk();
      Z.funk++;
      if (Z.funk >= 5) freischalten("funker");
    }
  };

  /* ---------- Bordterminal ---------- */
  const TP = { bruecke: "bruecke", werft: "werft", modell: "modell", innenraum: "innenraum", farmen: "innenraum", log: "log-bereich", meilensteine: "meilensteine", besatzung: "besatzung", terminal: "terminal", erfolge: "erfolge" };
  const KLINGEN = {
    blau: "#4aa8ff", blue: "#4aa8ff", gruen: "#4cff7a", green: "#4cff7a", rot: "#ff4a3d", red: "#ff4a3d",
    violett: "#b36bff", lila: "#b36bff", purple: "#b36bff", gelb: "#ffd84a", yellow: "#ffd84a", weiss: "#ffffff", white: "#ffffff"
  };
  const norm = (s) => String(s).toLowerCase().replace(/ü/g, "ue").replace(/ö/g, "oe").replace(/ä/g, "ae").replace(/ß/g, "ss");

  const Term = {
    out: null, eingabe: null, verlauf: [], pos: 0,
    init() {
      this.out = $("term-out"); this.eingabe = $("term-in");
      this.zeile("Bordterminal bereit. Tippe help oder tippe auf einen Vorschlag.");
      $("term-form").addEventListener("submit", (e) => {
        e.preventDefault();
        const t = this.eingabe.value;
        this.eingabe.value = "";
        if (t.trim()) { this.verlauf.push(t); this.pos = this.verlauf.length; }
        this.ausfuehren(t);
      });
      this.eingabe.addEventListener("keydown", (e) => {
        if (e.key === "ArrowUp" && this.verlauf.length) {
          e.preventDefault();
          this.pos = Math.max(0, this.pos - 1);
          this.eingabe.value = this.verlauf[this.pos] || "";
        } else if (e.key === "ArrowDown" && this.verlauf.length) {
          e.preventDefault();
          this.pos = Math.min(this.verlauf.length, this.pos + 1);
          this.eingabe.value = this.verlauf[this.pos] || "";
        }
      });
      const chips = $("term-chips");
      ["help", "hyperraum", "saber rot", "time set day", "tp modell", "inspect triebwerke", "farm eisen", "give @s 64", "f3"].forEach((c) => {
        const b = el("button", "chip", "/" + c);
        b.type = "button";
        b.addEventListener("click", () => this.ausfuehren(c));
        chips.append(b);
      });
    },
    zeile(text, klasse) {
      const p = el("p", klasse || "", text);
      this.out.append(p);
      while (this.out.children.length > 80) this.out.removeChild(this.out.firstChild);
      this.out.scrollTop = this.out.scrollHeight;
    },
    ausfuehren(roh) {
      const t = String(roh).trim().replace(/^\//, "");
      if (!t) return;
      this.zeile("/" + t, "ein");
      const teile = t.split(/\s+/);
      const cmd = norm(teile[0]);
      const arg = teile.slice(1);
      freischalten("kommando");

      switch (cmd) {
        case "help": case "hilfe":
          [
            "Befehle:",
            "help – diese Liste",
            "hyperraum – Sprung in den Hyperraum",
            "saber <farbe> – Klingenfarbe: blau, gruen, rot, violett, gelb, weiss",
            "time set <day|night> – Tag oder Nacht",
            "tp <ziel> – zu einem Abschnitt springen: " + Object.keys(TP).join(", "),
            "give @s <anzahl> – Blöcke bekommen",
            "inspect <teil> – ein Teil des Schiffsmodells ansehen (ohne Namen: Liste)",
            "farm <name> – einen Raum im Innenraum ansehen (ohne Namen: Liste)",
            "fortschritt – aktueller Baustand",
            "crew – die Besatzung",
            "kill @e – Gegner entfernen",
            "f3 – Debug-Ansicht ein oder aus",
            "ton <an|aus> – Ton schalten",
            "erfolge – Stand der Erfolge",
            "say <text> – eine Nachricht funken",
            "clear – Terminal leeren",
            "reset – Blöcke und Erfolge auf null"
          ].forEach((l) => this.zeile(l));
          break;
        case "hyperraum": case "hyperspace": case "jump":
          this.zeile("Hyperantrieb läuft an ...", "gut");
          Hyper.sprung();
          break;
        case "saber": case "lichtschwert": {
          const farbe = KLINGEN[norm(arg[0] || "")];
          if (!farbe) { this.zeile("Unbekannte Farbe. Probier: blau, gruen, rot, violett, gelb, weiss.", "fehler"); break; }
          document.documentElement.style.setProperty("--alle", farbe);
          this.zeile("Alle Klingen leuchten jetzt in " + norm(arg[0]) + ".", "gut");
          Ton.saber(true);
          freischalten("klinge");
          break;
        }
        case "time": {
          const w = norm(arg[arg.length - 1] || "");
          if (w === "day" || w === "tag") { Zeit.setzen(true); this.zeile("Zeit gesetzt: Tag.", "gut"); }
          else if (w === "night" || w === "nacht") { Zeit.setzen(false); this.zeile("Zeit gesetzt: Nacht.", "gut"); }
          else this.zeile("Benutzung: time set day  oder  time set night", "fehler");
          break;
        }
        case "tp": {
          const ziel = TP[norm(arg[0] || "")];
          if (!ziel) { this.zeile("Unbekanntes Ziel. Möglich: " + Object.keys(TP).join(", "), "fehler"); break; }
          this.zeile("Teleportiert zu: " + norm(arg[0]) + ".", "gut");
          springe(ziel);
          break;
        }
        case "give": {
          const n = Math.floor(Number(arg[arg.length - 1]));
          if (!Number.isFinite(n) || n < 1) { this.zeile("Anzahl fehlt. Beispiel: give @s 64", "fehler"); break; }
          const m = Math.min(n, 2304);
          Werft.setzen(m, true);
          this.zeile(plural(m, "Block", "Blöcke") + " an dich gegeben.", "gut");
          Ton.xp();
          break;
        }
        case "inspect": case "teil": {
          const M = window.VenatorModell;
          if (!M || !M.bereit()) { this.zeile("Das Modell ist nicht geladen.", "fehler"); break; }
          const q = arg.join(" ");
          if (!q) { this.zeile("Teile: " + M.namen().join(", ")); break; }
          const t = M.finden(q);
          if (!t) { this.zeile("Kein Teil gefunden. Tippe inspect ohne Namen für die Liste.", "fehler"); break; }
          springe("modell");
          M.waehlen(t.id, { fliegen: true });
          this.zeile("Ausgewählt: " + t.titel + ".", "gut");
          break;
        }
        case "farm": case "raum": {
          const F = window.VenatorFarmen;
          if (!F) { this.zeile("Die Simulation ist nicht geladen.", "fehler"); break; }
          const q = arg.join(" ");
          if (!q) { this.zeile("Räume: " + F.namen().join(", ")); break; }
          const t = F.finden(q);
          if (!t) { this.zeile("Kein Raum gefunden. Tippe farm ohne Namen für die Liste.", "fehler"); break; }
          springe("innenraum");
          F.waehlen(t.id);
          this.zeile("Ausgewählt: " + t.titel + ".", "gut");
          break;
        }
        case "fortschritt": case "progress":
          this.zeile("Baufortschritt: " + Z.fortschritt + " Prozent (" + msListe().filter(msFertig).length + " von " + msListe().length + " Meilensteinen).");
          if (Z.neuester) {
            this.zeile("Letzter Eintrag: " + Z.neuester.spieler + (zeitText(Z.neuester.created_at) ? " (" + zeitText(Z.neuester.created_at) + ")" : "") +
              (Z.neuester.notiz ? ": " + Z.neuester.notiz : "."));
          }
          break;
        case "crew": case "besatzung":
          (CFG.spieler || []).forEach((s) => this.zeile(s.name + " – " + s.rolle));
          break;
        case "kill":
          this.zeile(/creeper/i.test(arg.join(" ")) ? "0 Creeper gefunden. Das Schiff ist sicher." : "Keine passenden Ziele gefunden.");
          break;
        case "f3":
          F3.umschalten();
          this.zeile("Debug-Ansicht: " + (F3.an ? "an" : "aus") + ".", "gut");
          break;
        case "ton": {
          const w = norm(arg[0] || "");
          if (w === "an" || w === "on") { Hud.tonUmschalten(true); this.zeile("Ton: an.", "gut"); }
          else if (w === "aus" || w === "off") { Hud.tonUmschalten(false); this.zeile("Ton: aus.", "gut"); }
          else this.zeile("Benutzung: ton an  oder  ton aus", "fehler");
          break;
        }
        case "erfolge":
          this.zeile("Erfolge: " + ERFOLGE.filter((e) => Z.erfolge.has(e.id)).length + " von " + ERFOLGE.length + ".");
          break;
        case "say": {
          const text = arg.join(" ");
          if (!text) { this.zeile("Benutzung: say <text>", "fehler"); break; }
          this.zeile("<Du> " + text);
          const liste = CFG.funksprueche || [];
          if (liste.length) setTimeout(() => this.zeile("<Brücke> " + liste[Math.floor(Math.random() * liste.length)]), 500);
          break;
        }
        case "clear":
          this.out.replaceChildren();
          break;
        case "reset":
          Z.bloecke = 0; schreiben("venator-bloecke", 0); Werft.anzeige();
          Z.erfolge.clear(); entfernen("venator-erfolge"); erfolgeZeigen();
          this.zeile("Blöcke und Erfolge zurückgesetzt.", "gut");
          break;
        default:
          this.zeile("Unbekannter Befehl: /" + teile[0] + ". Tipp: help", "fehler");
      }
    }
  };

  /* ---------- Debug-Ansicht (F3) ---------- */
  const F3 = {
    an: false, raf: 0, frames: 0, fps: 0, t0: 0,
    umschalten(an) {
      this.an = an === undefined ? !this.an : !!an;
      $("f3-overlay").hidden = !this.an;
      $("f3-knopf").setAttribute("aria-pressed", this.an ? "true" : "false");
      cancelAnimationFrame(this.raf);
      if (this.an) {
        this.t0 = performance.now(); this.frames = 0;
        this.zeichnen();
        this.raf = requestAnimationFrame(() => this.schleife());
      }
    },
    schleife() {
      if (!this.an) return;
      this.frames++;
      const j = performance.now();
      if (j - this.t0 >= 500) {
        this.fps = Math.round((this.frames * 1000) / (j - this.t0));
        this.frames = 0; this.t0 = j;
        this.zeichnen();
      }
      this.raf = requestAnimationFrame(() => this.schleife());
    },
    zeichnen() {
      const de = document.documentElement;
      const hoehe = Math.max(1, de.scrollHeight - window.innerHeight);
      const slot = SLOTS.find((s) => s.ziel === Z.abschnitt);
      const zeilen = [
        "Venator Werft (Browser-Edition)",
        "FPS: " + this.fps,
        "XYZ: 0 / " + Math.round(window.scrollY) + " / 0  (" + Math.round((window.scrollY / hoehe) * 100) + " % der Strecke)",
        "Abschnitt: " + (slot ? slot.name : Z.abschnitt),
        "Zeit: " + (Z.tag ? "Tag" : "Nacht"),
        "Sterne: " + Sterne.stars.length + (Z.hyper ? "  (Hyperraum)" : ""),
        "Blöcke gesetzt: " + Z.bloecke + " (" + Math.floor(Z.bloecke / 64) + " Stacks)",
        "Baufortschritt: " + Z.fortschritt + " %",
        "Erfolge: " + ERFOLGE.filter((e) => Z.erfolge.has(e.id)).length + "/" + ERFOLGE.length,
        "Ton: " + (Z.ton ? "an" : "aus")
      ];
      API.f3.forEach((f) => { try { const t = f(); if (t) zeilen.push(...String(t).split("\n")); } catch (e) {} });
      $("f3-overlay").replaceChildren(...zeilen.map((t) => el("p", "", t)));
    }
  };

  /* ---------- Tastatur: Ziffern wählen Slots, Geheimcode ---------- */
  const KONAMI = ["arrowup", "arrowup", "arrowdown", "arrowdown", "arrowleft", "arrowright", "arrowleft", "arrowright", "b", "a"];
  let konamiPos = 0;
  function tastaturStarten() {
    document.addEventListener("keydown", (e) => {
      const ziel = e.target;
      const tippt = ziel && ziel.closest && ziel.closest("input, textarea, select, [contenteditable]");
      if (tippt || e.ctrlKey || e.metaKey || e.altKey) return;
      const k = String(e.key).toLowerCase();
      if (/^[1-9]$/.test(k)) { Hud.waehlen(Number(k) - 1); konamiPos = 0; return; }
      if (k === "h") { Hyper.sprung(); konamiPos = 0; return; }
      if (k === "m") { Hud.tonUmschalten(); konamiPos = 0; return; }
      if (k === KONAMI[konamiPos]) {
        konamiPos++;
        if (konamiPos === KONAMI.length) {
          konamiPos = 0;
          freischalten("geheim");
          Werft.setzen(30, true);
          Fx.xp(window.innerWidth / 2, window.innerHeight / 2, 30);
          Hyper.sprung();
          toast("Geheimcode", "30 Extra-Blöcke für die Werft.", "pokal");
        }
      } else {
        konamiPos = k === KONAMI[0] ? 1 : 0;
      }
    });
  }

  /* ---------- Galerie (optional) ---------- */
  function galerieBauen() {
    if (!(CFG.bilder && CFG.bilder.length)) return;
    const g = $("galerie");
    CFG.bilder.forEach((b) => {
      const fig = el("figure");
      const img = document.createElement("img");
      img.src = b.datei;
      img.alt = b.text || "";
      img.loading = "lazy";
      fig.append(img);
      if (b.text) fig.append(el("figcaption", "", b.text));
      g.append(fig);
    });
    $("galerie-bereich").hidden = false;
  }

  /* ---------- Schnittstelle für modell.js und farmen.js ---------- */
  const API = {
    $, el, icon, toast, freischalten, Ton, Fx, reduce, Z, springe, plural, klammer, lesen, schreiben,
    blockChip, f3: []
  };
  window.VenatorApp = API;

  /* ---------- Start ---------- */
  function start() {
    Fx.init();
    Sterne.init();
    Hud.bauen();
    Fortschritt.setzen(Z.fortschritt);
    Werft.init();
    Bau.init();
    Rechner.init();
    Log.init();
    meilensteineBauen();
    besatzungBauen();
    Funk.init();
    Term.init();
    erfolgeZeigen();
    krawallBauen();
    Film.init();
    galerieBauen();
    tastaturStarten();
    $("f3-knopf").addEventListener("click", () => F3.umschalten());
    document.documentElement.dataset.zeit = "nacht";
    Hud.aktiv("bruecke");
  }

  start();
})();
