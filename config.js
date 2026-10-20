/* ===========================================================
   HIER ANPASSEN: Alle Texte, Namen, Zahlen und Zugangsdaten.
   Die Datei lässt sich mit jedem Texteditor öffnen. Zeilen mit
   zwei Schrägstrichen davor sind Erklärungen und werden ignoriert.
   =========================================================== */
window.VENATOR_CONFIG = {

  // Startwert für den Baufortschritt in Prozent (0 bis 100).
  // Er gilt nur, solange noch kein Eintrag im Werft-Log steht.
  // Aktuell ein Platzhalter.
  fortschritt: 25,

  // Maßstab: So viele Meter des Originals entsprechen einem Block.
  // 1:4 bedeutet 4.
  massstab: 4,

  // Optional: Länge des Originals in Metern, wenn ihr sie kennt.
  // Mit einer Zahl füllt der Rechner das Feld schon vor.
  schiffLaengeMeter: null,

  // Gemeinsamer Speicher für den Werft-Log (Supabase), siehe EINRICHTUNG.md.
  // Der öffentliche Schlüssel darf hier stehen. Der geheime Schlüssel nie.
  // Bleibt einer der beiden Werte leer, läuft die Seite ohne Werft-Log.
  speicher: {
    url: "https://ukratqcykgfxutxruzbr.supabase.co",
    key: "sb_publishable_VnFFSdtmLCqnuyRc7thAGg_AzOAxWkB"
  },

  // Die Besatzung. Platzhalter, bitte durch eure Namen ersetzen.
  spieler: [
    { name: "Spieler 1", rolle: "Baumeister:in" },
    { name: "Spieler 2", rolle: "Baumeister:in" }
  ],

  // Der Eröffnungstext oben auf der Seite.
  // Der letzte Absatz mit dem aktuellen Baustand kommt automatisch dazu.
  krawall: {
    intro: "Vor langer Zeit, auf einem Server nicht allzu weit entfernt …",
    kapitel: "Kapitel I",
    titel: "Die Werft über dem Wasser",
    absaetze: [
      "Zwei Baumeister, eine Survival-Welt und ein Plan, der größer ist als jeder Chunk: ein Sternenzerstörer der Venator-Klasse, Block für Block im Maßstab 1:4.",
      "Die Hangartore oben am Rumpf sollen rot leuchten. Die Farmen müssen mit an Bord, so viele wie hineinpassen. Und das ganze Schiff soll schweben, hoch über dem Wasser, als hätte die Schwerkraft frei.",
      "Noch ist vieles nur Zeichnung und Plan. Aber die Besatzung gibt nicht auf. Stack um Stack soll ein Rumpf mit Schulter und Heckflügeln entstehen."
    ],
    schluss: "Möge der Redstone mit euch sein."
  },

  // Meilensteine. Mit fertig: true zeigt die Klinge schon beim Laden an.
  // Besucher können draufklicken, das gilt nur in ihrem Browser.
  // Optional: farbe: "#4aa8ff" legt die Klingenfarbe fest.
  meilensteine: [
    { titel: "Zeichnung und Aufbau", text: "Rumpfform mit Schulter und Heckflügeln festlegen", fertig: false },
    { titel: "3D-Ansicht", text: "Das Schiff im Browser drehen und prüfen", fertig: false },
    { titel: "Rohbau im Maßstab 1:4", text: "Der Rumpf steht", fertig: false },
    { titel: "Rote Hangartore", text: "Oben am Rumpf, wie auf dem Referenzbild", fertig: false },
    { titel: "Farmen eingebaut", text: "Alle, die platzmäßig hineinpassen", fertig: false },
    { titel: "Schwebetest", text: "Das Schiff hängt in der Luft über dem Wasser", fertig: false },
    { titel: "Werftbasis", text: "Kommt erst, wenn das Schiff steht", fertig: false }
  ],

  // Funksprüche für die Holo-Anzeige bei der Besatzung.
  funksprueche: [
    "Hat jemand die Treppe zum Maschinenraum gesehen? Eben war sie noch da.",
    "Creeper an Backbord!",
    "Wir brauchen mehr Eisen. Immer mehr Eisen.",
    "Das Schiff schwebt. Die Physik hat sich nicht gemeldet.",
    "Wer hat Lava neben den Hangar gestellt?",
    "Noch ein Stack Beton, dann ist die Schulter fertig.",
    "Ich habe nur kurz einen Block ersetzt.",
    "Die Farmen passen. Ich schwöre, die passen.",
    "Kurze Pause, der Hungerbalken blinkt.",
    "Bin gerade ins Wasser gefallen. Alles gut.",
    "Bitte keine Fackeln auf die Hangartore.",
    "Hyperantrieb noch nicht eingebaut. Bitte nicht aus dem Chunk springen.",
    "Achtung, Enderman im Maschinenraum. Nicht ansehen.",
    "Das ist kein Mond. Das ist ein Heckflügel.",
    "Schildgenerator offline. Wahrscheinlich fehlt ein Block.",
    "Die Kisten sind voll. Schon wieder.",
    "Landeerlaubnis? Wir schweben, wir landen nicht.",
    "Möge der Redstone mit euch sein."
  ],

  // ------------------------------------------------------------------
  // 3D-Modell zum Anklicken
  // ------------------------------------------------------------------
  // Das Modell steht in assets/Venator_Modell.glb. Alle Maße darin sind Meter,
  // geteilt durch den Maßstab oben ergibt das die Blöcke.
  //
  // Jedes Teil unten hat:
  //   id, titel, kurz, text   Name und Beschreibung im Infofeld
  //   bloecke                 Bauvorschlag: Blockname und wofür er dient
  //   masse, tipp             Größe in Blöcken und ein Bautipp (beides optional)
  //   bereiche                Wo das Teil am Modell sitzt (siehe unten)
  //   pin                     Wo die Markierung schwebt: [x, y, z] oder
  //                           { x, z, seite: "oben" | "unten" } (optional)
  //
  // Ein Bereich ist ein Quader in Metern: box: [xmin, xmax, ymin, ymax, zmin, zmax].
  // Bei sym: true gilt er gespiegelt auf beiden Seiten, dann gibt man x nur von 0 an.
  // Mit mesh: [...] lässt sich auf Materialgruppen des Modells einschränken
  // (Hull_Gray*, Windows_*, Engines_* und so weiter). Ohne mesh zählt alles.
  // Die Reihenfolge ist wichtig: Bei einem Klick gewinnt das erste passende Teil.
  // Im F3-Fenster (Taste F3 oder /f3) steht beim Zeigen auf das Modell die Position.
  // Das Modell zeigt nach +z mit dem Bug, die Triebwerke liegen bei -z.
  // 3D-Modell: Die Datei liegt im Ordner assets. Jedes Teil bekommt
  //   id, titel, kurz (eine Zeile), text, bloecke (Name und Rolle der
  //   Blöcke), masse und tipp. Das sind Vorschläge, ändert sie frei.
  // bereiche legt fest, wo das Teil am Modell sitzt: box ist ein Quader
  //   [x von, x bis, y von, y bis, z von, z bis] in Modell-Einheiten,
  //   mesh (optional) schränkt auf bestimmte Teile des Modells ein, und
  //   sym: true spiegelt den Quader auf die andere Seite. Die Reihenfolge
  //   der Teile zählt: Was weiter oben steht, gewinnt bei Überlappung.
  // blick (optional) legt die Kamera beim Heranfliegen fest: yaw und pitch
  //   in Grad. Mit spiegeln: false bleibt der Blick auf allen Seiten gleich.
  // Tipp: Mit der Taste F3 stehen die Koordinaten unter dem Mauszeiger,
  //   damit lassen sich neue Quader leicht ausmessen.
  modell: {
    datei: "assets/Venator_Modell.glb",
    ansicht: { yaw: 52, pitch: 24, abstand: 1250 },
    teile: [
      {
        id: "steuerduesen", titel: "Manövrierdüsen", kurz: "Zwei kleine Düsen in der Mitte des Hecks",
        text: "Die beiden kleinen Düsen sitzen zwischen den großen Triebwerken. Sie sind Ring und Leuchtfläche in klein und lassen das Heck dichter und technischer aussehen.",
        bloecke: [
          { name: "Polierter Schwarzstein", rolle: "Düsenmantel" },
          { name: "Seelaterne", rolle: "Leuchtfläche" },
          { name: "Hellblauer Beton", rolle: "Ring um die Mitte" }
        ],
        masse: "Durchmesser etwa 6 Blöcke",
        tipp: "Der Kreis mit 6 Blöcken Durchmesser ist schnell gesetzt. Zwei Blöcke tiefer als der Ring wirkt die Düse eingelassen.",
        blick: { yaw: 155, pitch: 12 },
        bereiche: [{ mesh: ["Engines_*"], box: [8, 31, 18, 48, -572, -400], sym: true }]
      },
      {
        id: "nebentriebwerke", titel: "Obere Triebwerke", kurz: "Zwei mittelgroße Düsen über den Hauptdüsen",
        text: "Oben am Heck sitzt ein weiteres Düsenpaar. Es ist kleiner als die Haupttriebwerke und ragt weniger weit nach hinten.",
        bloecke: [
          { name: "Polierter Schwarzstein", rolle: "Düsenmantel" },
          { name: "Seelaterne", rolle: "Leuchtfläche" },
          { name: "Hellblauer Beton", rolle: "Ring" }
        ],
        masse: "Durchmesser etwa 7 Blöcke",
        tipp: "Baut sie zuerst, bevor die Haupttriebwerke daneben stehen. Dann kommt ihr noch gut an alle Seiten.",
        blick: { yaw: 155, pitch: 20 },
        bereiche: [{ mesh: ["Engines_*"], box: [28, 60, 62, 96, -570, -405], sym: true }]
      },
      {
        id: "triebwerke", titel: "Haupttriebwerke", kurz: "Vier große Düsen am Heck",
        text: "Vier große Schubdüsen sitzen paarweise links und rechts am Heck. Das äußere Paar steht weiter vorn, das innere ragt am weitesten nach hinten. Jede Düse ist ein Mantel aus dunklem Metall mit blau leuchtender Mitte und einem Ring.",
        bloecke: [
          { name: "Polierter Schwarzstein", rolle: "Düsenmantel" },
          { name: "Tiefenschiefer-Fliesen", rolle: "Innenwand" },
          { name: "Seelaterne", rolle: "leuchtende Mitte" },
          { name: "Hellblauer Beton", rolle: "Ring um die Mitte" }
        ],
        masse: "Durchmesser etwa 15 Blöcke",
        tipp: "Setzt erst den Außenkreis mit 15 Blöcken und füllt danach nach innen. Der Seelaternen-Kern wirkt am besten, wenn dahinter alles dunkel bleibt.",
        blick: { yaw: 155, pitch: 12 },
        bereiche: [{ mesh: ["Engines_*"], box: [26, 150, -1, 74, -572, -390], sym: true }],
        pin: [57, 29, -580]
      },
      {
        id: "antennen", titel: "Sensormasten", kurz: "Dünne Antennen auf dem Kommandodeck",
        text: "Auf dem Kommandodeck stehen dünne Masten. Sie machen die Silhouette von oben unruhig und geben dem Turm eine Spitze.",
        bloecke: [
          { name: "Eisenstangen", rolle: "Mast" },
          { name: "Endstab", rolle: "Spitze" }
        ],
        masse: "etwa 5 Blöcke hoch",
        tipp: "Erst am Ende setzen, sonst stoßt ihr beim Bauen am Turm ständig dagegen.",
        bereiche: [{ mesh: ["Metal_Dark"], box: [0, 31, 252, 276, -306, -273], sym: true }]
      },
      {
        id: "bruecken_fenster", titel: "Brückenfenster", kurz: "Zwei Fensterbänder an der Front des Kommandodecks",
        text: "Hier schaut die Besatzung nach vorn. Die Fenster sind schmale, helle Bänder, die nachts leuchten.",
        bloecke: [
          { name: "Hellblau gefärbtes Glas", rolle: "Fensterscheibe" },
          { name: "Seelaterne", rolle: "Licht dahinter" },
          { name: "Schwarzer Beton", rolle: "Rahmen" }
        ],
        masse: "je etwa 5 × 1 Blöcke",
        tipp: "Die Seelaterne kommt einen Block hinter das Glas, dann leuchtet das Fenster, ohne zu blenden.",
        bereiche: [{ mesh: ["Windows_*"], box: [0, 41, 236, 252, -163, -148], sym: true }],
        pin: [28, 247, -148]
      },
      {
        id: "kommandodeck", titel: "Kommandodeck", kurz: "Die flache Platte oben auf dem Turm",
        text: "Oben auf dem Brückenturm liegt eine lange, flache Platte. Von hier aus lenkt die Besatzung das Schiff. Vorn sitzen die Brückenfenster, hinten die Masten.",
        bloecke: [
          { name: "Hellgrauer Beton", rolle: "Plattform" },
          { name: "Grauer Beton", rolle: "Kanten und Fugen" },
          { name: "Schwarzer Beton", rolle: "dunkle Felder" }
        ],
        masse: "etwa 20 × 5 × 41 Blöcke",
        tipp: "Baut die Platte erst einzeln am Boden und setzt sie später an den Turm. So bleibt sie gerade.",
        blick: { yaw: 30, pitch: 30 },
        bereiche: [{ mesh: ["Hull_Gray_Light", "Hull_Gray", "Panels_Dark", "Metal_Dark", "Windows_*"], box: [0, 43, 229, 256, -318, -146], sym: true }]
      },
      {
        id: "bruecke", titel: "Brückenturm", kurz: "Der Stufenturm in der Mitte des Rumpfes",
        text: "Der Turm wächst in Stufen aus dem Rumpf. Unten ist er am breitesten und wird nach oben schmaler, bis das Kommandodeck darauf liegt. Die Fensterreihen an den Stufen sind die Decks der Besatzung.",
        bloecke: [
          { name: "Hellgrauer Beton", rolle: "Stufen" },
          { name: "Grauer Beton", rolle: "Kanten" },
          { name: "Hellblau gefärbtes Glas", rolle: "Fenster" },
          { name: "Schwarzer Beton", rolle: "Fugen und Schächte" }
        ],
        masse: "etwa 33 Blöcke breit am Fuß, 33 Blöcke hoch",
        tipp: "Baut zuerst die unterste Stufe und legt jede weitere ein, zwei Blöcke schmaler darauf. Die Fenster setzt ihr zum Schluss.",
        blick: { yaw: 30, pitch: 18 },
        bereiche: [{ box: [0, 68, 118, 256, -330, 10], sym: true }],
        pin: [0, 190, -105]
      },
      {
        id: "geschuetze", titel: "Turbolaser-Türme", kurz: "Acht Geschütze auf sechseckigen Sockeln",
        text: "Je vier Geschütztürme stehen links und rechts auf dem Rumpf. Jeder sitzt auf einem Sechseck und hat einen schmalen Lauf. Sie sind die Bordkanonen des Schiffs.",
        bloecke: [
          { name: "Grauer Beton", rolle: "Gehäuse" },
          { name: "Schwarzer Beton", rolle: "Sockel und Schatten" },
          { name: "Eisenstangen", rolle: "Läufe" },
          { name: "Polierter Schwarzstein", rolle: "sechseckiger Sockel" }
        ],
        masse: "pro Turm etwa 4 × 3 × 5 Blöcke",
        tipp: "Baut einen Turm komplett vor und kopiert ihn dann. Mit dem Sechseck-Sockel erkennt man jeden Turm sofort.",
        blick: { yaw: 70, pitch: 32 },
        bereiche: [
          { mesh: ["Hull_Gray", "Panels_Dark", "Metal_Dark"], box: [76, 100, 104, 125, -68, -38], sym: true },
          { mesh: ["Hull_Gray", "Panels_Dark", "Metal_Dark"], box: [76, 100, 104, 125, -138, -108], sym: true },
          { mesh: ["Hull_Gray", "Panels_Dark", "Metal_Dark"], box: [76, 100, 104, 125, -208, -178], sym: true },
          { mesh: ["Hull_Gray", "Panels_Dark", "Metal_Dark"], box: [76, 100, 104, 125, -278, -248], sym: true }
        ],
        pin: [88, 128, -193]
      },
      {
        id: "rundluken", titel: "Orange Rundluken", kurz: "Zwei runde Platten im vorderen Rumpf",
        text: "Zwei runde, orange Platten mit dunkler Mitte liegen links und rechts vor dem Turm. Im Spiel eignen sie sich gut als Luken, die nach unten in den Innenraum führen.",
        bloecke: [
          { name: "Oranger Beton", rolle: "Scheibe" },
          { name: "Weißer Beton", rolle: "Rand" },
          { name: "Schwarzer Beton", rolle: "Mitte" }
        ],
        masse: "Durchmesser etwa 11 Blöcke",
        tipp: "Ein Kreis mit 11 Blöcken Durchmesser. Hinter der schwarzen Mitte könnt ihr eine Falltür für den Einstieg setzen.",
        blick: { pitch: 58 },
        bereiche: [{ mesh: ["Deck_Textured"], box: [60, 110, 60, 125, 62, 118], sym: true }],
        pin: { x: 85, z: 90, seite: "oben" }
      },
      {
        id: "hangartore", titel: "Rote Hangartore", kurz: "Zwei mal zehn Tore in der Rumpfmitte",
        text: "Vom Bug bis zur Mitte des Rumpfes ziehen sich zwei Reihen roter Tore. Jedes Tor ist ein eigenes Feld. Sie sind die auffälligste Farbe des Schiffs.",
        bloecke: [
          { name: "Roter Beton", rolle: "Tore" },
          { name: "Schwarzer Beton", rolle: "Mittelstrich und Fugen" },
          { name: "Grauer Beton", rolle: "Rahmen" },
          { name: "Klebriger Kolben", rolle: "zum Öffnen der Tore (optional)" }
        ],
        masse: "20 Tore, jedes etwa 8 × 12 Blöcke",
        tipp: "Baut erst einen Rahmen für ein Tor und kopiert ihn zwanzigmal. Wer sie öffnen will, setzt klebrige Kolben unter den roten Beton.",
        blick: { yaw: 90, pitch: 62 },
        bereiche: [{ mesh: ["Deck_Textured"], box: [-36, 36, 60, 125, 34, 556] }],
        pin: { x: 0, z: 300, seite: "oben" }
      },
      {
        id: "fluegelluken", titel: "Flügelluken", kurz: "Je fünf rote Balken auf den Heckflügeln",
        text: "Auf jedem Heckflügel liegen fünf rote Balken, oben und unten. Sie wirken wie kleine Hangars und lockern die große graue Fläche auf.",
        bloecke: [
          { name: "Roter Beton", rolle: "Luke" },
          { name: "Schwarzer Beton", rolle: "Rand" }
        ],
        masse: "je Balken etwa 13 × 3 Blöcke",
        tipp: "Messt den Abstand von einem Balken zum nächsten einmal und lasst ihn gleich. Das sieht sofort ordentlich aus.",
        blick: { pitch: 55 },
        bereiche: [{ mesh: ["Deck_Textured", "Underside_Textured"], box: [138, 242, 10, 100, -342, -274], sym: true }]
      },
      {
        id: "hangar_unten", titel: "Unterer Hangar", kurz: "Gelb umrahmte Öffnung an der Unterseite",
        text: "Unter dem Rumpf liegt eine große Öffnung mit gelbem Rahmen. Sie ist der Eingang für kleine Schiffe, wenn der Rumpf über dem Wasser schwebt.",
        bloecke: [
          { name: "Leuchtstein", rolle: "gelber Rahmen" },
          { name: "Schwarzer Beton", rolle: "Boden und Wände innen" },
          { name: "Gelb gefärbtes Glas", rolle: "Abdeckung des Rahmens" }
        ],
        masse: "etwa 18 × 28 Blöcke",
        tipp: "Der gelbe Rahmen wirkt am stärksten, wenn er nachts leuchtet. Setzt dafür Leuchtstein statt gefärbtes Glas.",
        blick: { yaw: 120, pitch: -40, spiegeln: false },
        bereiche: [{ box: [-42, 42, 0, 46, -92, 38] }],
        pin: { x: 0, z: -25, seite: "unten" }
      },
      {
        id: "rote_linie", titel: "Rote Unterseiten-Linie", kurz: "Roter Strich entlang des Bauches",
        text: "Unter dem Rumpf läuft ein roter Strich vom Hangar bis zum Bug. Er hat zwei breitere Stellen und bricht die graue Unterseite auf.",
        bloecke: [
          { name: "Roter Beton", rolle: "Linie" },
          { name: "Grauer Beton", rolle: "Umgebung" }
        ],
        masse: "2 bis 3 Blöcke breit, etwa 130 Blöcke lang",
        tipp: "Legt die Linie zuerst mit einer Reihe Wolle als Hilfe aus und tauscht sie danach gegen Beton.",
        blick: { yaw: 120, pitch: -40, spiegeln: false },
        bereiche: [
          { mesh: ["Red_Stripes"], box: [-30, 30, 0, 60, 0, 600] },
          { mesh: ["Underside_Textured"], box: [-14, 14, 0, 45, 28, 552] }
        ]
      },
      {
        id: "kuehlgitter", titel: "Kühlgitter", kurz: "Dunkles Gitter an der Unterseite hinten",
        text: "Zwischen dem Hangar und den Triebwerken liegt unten ein langes, dunkles Gitter. Es sieht aus wie ein Abluftschacht für die Maschinen.",
        bloecke: [
          { name: "Schwarzer Beton", rolle: "Grundfläche" },
          { name: "Eisenfalltür", rolle: "Gitterstäbe" },
          { name: "Grauer Beton", rolle: "Rand" }
        ],
        masse: "etwa 17 × 70 Blöcke",
        tipp: "Setzt die Falltüren geöffnet in Reihen. Sie ergeben von unten gesehen das Gittermuster.",
        blick: { yaw: 120, pitch: -40, spiegeln: false },
        bereiche: [{ mesh: ["Underside_Textured"], box: [-37, 37, 0, 45, -396, -112] }]
      },
      {
        id: "fenster", titel: "Fensterreihen", kurz: "Helle und dunkle Fenster am Rumpf",
        text: "Überall am Rumpf sitzen kleine Fenster. Die hellen leuchten blau, die dunklen sind abgeschaltet. Zusammen geben sie dem Schiff ein Gefühl von Größe.",
        bloecke: [
          { name: "Hellblau gefärbtes Glas", rolle: "leuchtende Fenster" },
          { name: "Seelaterne", rolle: "Licht dahinter" },
          { name: "Schwarz gefärbtes Glas", rolle: "dunkle Fenster" }
        ],
        masse: "meist 1 bis 3 Blöcke breit",
        tipp: "Ein dunkles Fenster zwischen zwei hellen wirkt echter als eine durchgehende Reihe.",
        bereiche: [{ mesh: ["Windows_*"], box: [-300, 300, 0, 300, -600, 600] }]
      },
      {
        id: "fluegel", titel: "Heckflügel", kurz: "Die beiden breiten Flächen am Heck",
        text: "Hinter der Rumpfmitte schwingen zwei breite Flügel nach außen. Sie machen das Schiff am Heck am breitesten und tragen die roten Flügelluken.",
        bloecke: [
          { name: "Hellgrauer Beton", rolle: "Fläche" },
          { name: "Grauer Beton", rolle: "Kanten" },
          { name: "Steinziegel", rolle: "Strukturlinien" }
        ],
        masse: "je etwa 34 Blöcke breit, 60 Blöcke lang, 7 Blöcke dick",
        tipp: "Baut die Flügelkante zuerst als Dreieck und füllt die Fläche dann auf. Sie ist an jeder Stelle gleich dick.",
        blick: { pitch: 42 },
        bereiche: [{ box: [135, 280, 0, 110, -398, -150], sym: true }],
        pin: { x: 215, z: -250, seite: "oben" }
      },
      {
        id: "bug", titel: "Bug", kurz: "Die lange Keilspitze vorn",
        text: "Der Rumpf läuft vorn zu einer schmalen Spitze zu. Von hier aus gesehen wirkt das Schiff wie ein Pfeil, der über das Wasser zeigt.",
        bloecke: [
          { name: "Hellgrauer Beton", rolle: "Hülle" },
          { name: "Grauer Beton", rolle: "Kanten" },
          { name: "Roter Beton", rolle: "Beginn der Tore" }
        ],
        masse: "Spitze etwa 12 Blöcke breit",
        tipp: "Baut den Bug zuerst und richtet danach alles andere an seiner Mittellinie aus.",
        blick: { yaw: 40, pitch: 28 },
        bereiche: [{ box: [0, 80, 0, 130, 420, 572], sym: true }],
        pin: { x: 0, z: 560, seite: "oben" }
      },
      {
        id: "details", titel: "Aufbauten und Details", kurz: "Kleine dunkle Kästen und Platten",
        text: "Auf dem ganzen Rumpf sitzen kleine Kästen, Leitungen und Platten. Einzeln fallen sie kaum auf, zusammen machen sie den Rumpf lebendig.",
        bloecke: [
          { name: "Schwarzer Beton", rolle: "Kästen" },
          { name: "Grauer Beton", rolle: "Platten" },
          { name: "Tiefenschiefer-Fliesen", rolle: "Strukturen" }
        ],
        masse: "meist 1 bis 4 Blöcke groß",
        tipp: "Streut sie unregelmäßig. Wenn sie ein Raster bilden, sieht der Rumpf künstlich aus.",
        bereiche: [{ mesh: ["Panels_Dark", "Metal_Dark"], box: [-300, 300, 0, 300, -600, 600] }]
      },
      {
        id: "rumpf", titel: "Rumpfpanzerung", kurz: "Die graue Hülle des Schiffs", fallback: true,
        text: "Die Hülle besteht aus gestapelten Schichten in drei Grautönen. So bekommt der Rumpf Tiefe, auch wenn er flach aussieht. Das ganze Schiff ist im Maßstab 1:4 gebaut: ein Block ist vier Meter.",
        bloecke: [
          { name: "Hellgrauer Beton", rolle: "Hauptfläche" },
          { name: "Grauer Beton", rolle: "Schichten und Kanten" },
          { name: "Glatter Stein", rolle: "helle Akzente" },
          { name: "Steinziegel", rolle: "Strukturlinien" }
        ],
        masse: "etwa 285 × 139 × 68 Blöcke (Länge × Breite × Höhe)",
        tipp: "Wechselt die Grautöne in Streifen und Feldern, nicht Block für Block. Das wirkt wie Panzerplatten.",
        bereiche: [{ mesh: ["Hull_Gray*", "Deck_Textured", "Underside_Textured"], box: [-300, 300, 0, 300, -600, 600] }]
      }
    ]
  },

  // ------------------------------------------------------------------
  // Innenraum-Simulation (Beispiel mit Farmen)
  // ------------------------------------------------------------------
  // Eine vereinfachte Zeichnung. Die Zeiten sind stark verkürzt. Wie schnell eine
  // Farm im Spiel wirklich ist, hängt von Bauweise und Version ab.
  // Innenraum-Simulation: Texte zu den sechs Räumen. Die Zeichnung selbst
  // steht in farmen.js. Pro Raum: titel, kurz, text, schritte, bloecke, hinweis.
  innenraum: {
    farmen: [
      {
        id: "getreide", titel: "Getreidefarm", kurz: "Weizen wächst, Wasser wäscht ihn weg",
        text: "Der Weizen wächst auf Ackerboden, der von Wasser feucht gehalten wird. Ist er reif, löst ein Spender einen Wasserstrom aus. Er spült die Ernte in einen Trichter, der sie in die Truhe leitet.",
        schritte: ["Die Pflanzen wachsen in acht Stufen.", "Sind sie reif, strömt Wasser über das Beet.", "Die Ernte schwimmt zum Trichter und landet in der Truhe.", "Danach sät man neu."],
        bloecke: [
          { name: "Ackerboden", rolle: "Beet" }, { name: "Wasser", rolle: "hält den Boden feucht" },
          { name: "Spender", rolle: "löst den Wasserstrom aus" }, { name: "Trichter", rolle: "sammelt die Ernte" },
          { name: "Truhe", rolle: "Lager" }
        ],
        hinweis: "Wasser hält Ackerboden bis vier Blöcke Abstand feucht."
      },
      {
        id: "zuckerrohr", titel: "Zuckerrohrfarm", kurz: "Beobachter und Kolben ernten automatisch",
        text: "Zuckerrohr wächst am Wasser auf Sand. Ein Beobachter bemerkt das Wachstum und schaltet einen Kolben. Der Kolben schneidet das obere Stück ab, die untere Pflanze wächst weiter.",
        schritte: ["Das Rohr wächst am Wasser auf Sand.", "Der Beobachter bemerkt, dass es gewachsen ist.", "Der Kolben schneidet das obere Stück ab.", "Der Trichter darunter sammelt die Stücke."],
        bloecke: [
          { name: "Sand", rolle: "Boden" }, { name: "Wasser", rolle: "neben dem Rohr" },
          { name: "Beobachter", rolle: "bemerkt das Wachstum" }, { name: "Kolben", rolle: "schneidet ab" },
          { name: "Trichter", rolle: "sammelt" }, { name: "Truhe", rolle: "Lager" }
        ],
        hinweis: "Zuckerrohr wächst nur auf Sand, Erde und ähnlichen Böden neben Wasser."
      },
      {
        id: "seetang", titel: "Seetangfarm", kurz: "Algen unter Wasser, geerntet von Kolben",
        text: "Seetang wächst unter Wasser nach oben. Beobachter bemerken, wann er gewachsen ist, und lassen Kolben die Spitzen abschneiden. Die Stücke treiben nach oben zu den Trichtern.",
        schritte: ["Der Seetang wächst in einer Wasserkammer.", "Beobachter schalten die Kolben.", "Die Spitzen treiben zur Oberfläche.", "Trichter fangen sie auf."],
        bloecke: [
          { name: "Wasser", rolle: "Kammer" }, { name: "Glas", rolle: "Wand der Kammer" },
          { name: "Beobachter", rolle: "bemerkt das Wachstum" }, { name: "Kolben", rolle: "schneidet ab" },
          { name: "Trichter", rolle: "sammelt" }, { name: "Truhe", rolle: "Lager" }
        ],
        hinweis: "Getrockneter Seetang brennt lange im Ofen."
      },
      {
        id: "monster", titel: "Monsterfarm", kurz: "Dunkle Plattform, Wasserströme, Fallschacht",
        text: "Auf einer dunklen Plattform entstehen Monster. Wasserströme schieben sie zum Rand und in einen tiefen Schacht. Der Fall verletzt sie, den letzten Schlag macht der Spieler am Boden. Erst der bringt Erfahrung.",
        schritte: ["Monster entstehen in der Dunkelheit der Plattform.", "Wasser schiebt sie zum Rand.", "Sie stürzen durch den Schacht.", "Unten schlägt der Spieler zu, die Beute landet im Trichter."],
        bloecke: [
          { name: "Schwarzer Beton", rolle: "dunkle Plattform" }, { name: "Wasser", rolle: "Strömung" },
          { name: "Falltür", rolle: "Rand der Plattform" }, { name: "Trichter", rolle: "sammelt die Beute" },
          { name: "Truhe", rolle: "Lager" }
        ],
        hinweis: "Fallschaden allein gibt keine Erfahrung. Der letzte Schlag muss vom Spieler kommen."
      },
      {
        id: "eisen", titel: "Eisenfarm", kurz: "Golems erzeugen Eisen",
        text: "Dorfbewohner in Angst lassen Eisengolems entstehen. Eine Falle am Boden lässt sie in eine Kammer fallen, wo sie Eisenbarren fallen lassen. Ein Trichter sammelt sie.",
        schritte: ["Dorfbewohner leben in einer geschlossenen Kammer.", "Daneben entsteht ein Golem auf der Plattform.", "Er fällt in die Falle und lässt Eisenbarren fallen.", "Trichter bringen sie zur Truhe."],
        bloecke: [
          { name: "Bett", rolle: "Dorfbewohner" }, { name: "Glas", rolle: "Kammerwand" },
          { name: "Lava", rolle: "Falle" }, { name: "Trichter", rolle: "sammelt Eisen" },
          { name: "Truhe", rolle: "Lager" }
        ],
        hinweis: "Eisenfarmen gibt es in vielen Bauformen. Diese ist die einfachste Skizze."
      },
      {
        id: "lager", titel: "Lagerhalle", kurz: "Alle Farmen laufen hier zusammen",
        text: "Hier stehen die Truhen für alles, was die Farmen liefern. In einer echten Anlage sortieren Trichter und Komparatoren die Gegenstände in die richtigen Truhen.",
        schritte: ["Förderbänder aus Wasser oder Trichtern bringen alles her.", "Ein Sortierer legt jede Sorte in ihre Truhe.", "Volle Truhen zeigen es mit einem Redstone-Signal."],
        bloecke: [
          { name: "Truhe", rolle: "Lager" }, { name: "Trichter", rolle: "Förderband" },
          { name: "Komparator", rolle: "Sortierer" }, { name: "Schild", rolle: "Beschriftung" }
        ],
        hinweis: "Eine Doppelkiste fasst 54 Stapel."
      }
    ]
  },

  // Eigene Screenshots: Bilddateien in den Ordner legen und eintragen, zum Beispiel
  // { datei: "bilder/rumpf.jpg", text: "Der Rumpf von vorn" }
  // Bleibt die Liste leer, wird der Bereich ausgeblendet.
  bilder: []
};
