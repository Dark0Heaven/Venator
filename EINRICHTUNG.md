# Einrichtung des gemeinsamen Werft-Logs

Der Werft-Log braucht einen kleinen Online-Speicher, damit ihr beide die Einträge des anderen seht. Dafür nutzt die Seite Supabase (kostenloser Plan reicht). Die Einrichtung dauert etwa 10 Minuten und ist einmalig.

## 1. Supabase-Projekt anlegen

1. Auf supabase.com ein kostenloses Konto erstellen.
2. Ein neues Projekt anlegen, zum Beispiel mit dem Namen `venator`. Als Region eine europäische wählen, etwa Frankfurt.
3. Das Datenbank-Passwort, das Supabase verlangt, irgendwo sicher notieren. Die Seite braucht es nicht.

## 2. Speicher einrichten

1. Im Projekt links **SQL Editor** öffnen und ein neues Skript anlegen.
2. Den Inhalt von `supabase-setup.sql` einfügen.
3. Im Skript `HIER-DEIN-PASSWORT` durch euer gemeinsames Passwort ersetzen. Wählt mindestens 8 Zeichen und nichts, was ihr woanders benutzt. Dieses Passwort tippt ihr später beim Eintragen auf der Seite ein.
4. Auf **Run** klicken. Es sollte "Success" erscheinen.

## 3. Seite mit dem Speicher verbinden

1. Im Supabase-Dashboard unter **Settings → API Keys** (oder über den Knopf **Connect**) die **Project URL** und den **Publishable key** kopieren. Der Key beginnt mit `sb_publishable_`.
2. In `config.js` bei `speicher` eintragen:

```js
speicher: {
  url: "https://DEIN-PROJEKT.supabase.co",
  key: "sb_publishable_..."
},
```

3. Namen und Rollen bei `spieler` ersetzen, falls noch nicht geschehen.

Der Publishable Key darf im Seitencode stehen, er ist für genau diesen Zweck gedacht. Den **Secret key** dagegen niemals in die Seite schreiben.

## 4. Seite veröffentlichen

Die Dateien `index.html`, `style.css`, `config.js`, `app.js`, `modell.js` und `farmen.js` sowie der Ordner `assets` (mit `Venator_Modell.glb`) müssen zusammen im selben Ordner liegen. Legt sie auf einen kostenlosen Hoster, zum Beispiel GitHub Pages oder Netlify (Drag-and-drop mit dem ganzen Ordner). Danach öffnet jeder die Adresse, sieht den Log, und ihr beide tragt über **Eintrag schreiben** mit dem Passwort ein.

## Die Seite anpassen

Fast alles, was ihr ändern wollt, steht in `config.js`:

- **Texte:** Eröffnungstext, Meilensteine, Namen der Besatzung und die Funksprüche.
- **Zahlen:** Maßstab, Startwert des Fortschritts und, wenn ihr sie kennt, die Länge des Originals für den Rechner.
- **Meilensteine:** Mit `fertig: true` leuchtet eine Klinge schon beim Laden. Mit `farbe: "#4aa8ff"` bekommt sie eine feste Farbe.
- **Screenshots:** Bilddateien in den Ordner legen und bei `bilder` eintragen. Solange die Liste leer ist, bleibt der Bereich ausgeblendet.

Die Seite zeigt keinen Nachbau des Schiffs und keine Figuren oder Logos aus den Filmen. Alles Gezeichnete ist selbst gemacht.

## 3D-Modell und Innenraum

- **Modell:** `assets/Venator_Modell.glb` wird direkt im Browser angezeigt, ohne Zusatzprogramm. Ziehen dreht das Schiff, das Mausrad oder Zwei-Finger-Zoom zoomt (das Mausrad nur, wenn das Modell angeklickt ist), ein Klick auf ein Teil zeigt Beschreibung und Bauvorschlag, ein Doppelklick fliegt heran. Mit Esc hebt ihr die Auswahl auf, mit R kehrt die Ansicht zurück.
- **Teile und Blöcke ändern:** Alles steht in `config.js` unter `modell.teile`. Die Blocklisten sind Vorschläge und frei änderbar. Die Kommentare dort erklären, wie ein Teil am Modell festgelegt wird (`bereiche`, `blick`).
- **Anderes Modell:** Die neue `.glb`-Datei in `assets` legen und `datei` anpassen. Die Bereiche sind auf das aktuelle Modell zugeschnitten und müssen dann neu ausgemessen werden. Mit F3 zeigt die Seite die Koordinaten unter dem Mauszeiger an.
- **Innenraum:** Die Simulation in `farmen.js` ist eine vereinfachte Zeichnung mit stark verkürzten Zeiten, keine echte Redstone-Rechnung. Texte, Schritte und Bauvorschläge der sechs Räume stehen in `config.js` unter `innenraum`.
- Die Simulation pausiert, sobald sie nicht im Bild ist, und startet pausiert, wenn "Bewegung reduzieren" eingestellt ist.

## Kleine Extras auf der Seite

- Ziffern **1 bis 9** springen zu den Abschnitten der Schnellleiste. Die Taste **H** löst den Hyperraum-Sprung aus, **M** schaltet den Ton ein oder aus. Der Ton ist standardmäßig aus.
- Im **Bordterminal** gibt es Befehle wie `help`, `saber rot`, `time set day`, `give @s 64`, `tp werft`, `inspect triebwerke` und `farm eisen`.
- Es gibt **13 Erfolge**, ein paar davon sind versteckt. Sie werden nur im Browser des jeweiligen Besuchers gespeichert.
- Wer die Eröffnung nicht sehen will, kann sie überspringen. Bei eingeschalteter Systemeinstellung "Bewegung reduzieren" läuft sie gar nicht erst ab, der Text steht dann zum Lesen bereit.

## Gut zu wissen

- **Pausierung:** Kostenlose Supabase-Projekte werden pausiert, wenn sie 7 Tage lang kaum Anfragen bekommen. Jedes Öffnen der Seite zählt als Anfrage. Falls es trotzdem passiert, lässt sich das Projekt im Dashboard wieder starten, die Daten bleiben erhalten.
- **Schutz:** Lesen darf jeder, Schreiben nur mit Passwort, und das wird auf dem Server geprüft. Ein langes Passwort ist wichtig, weil sonst jemand beliebig oft raten könnte.
- **Passwort ändern:** Das Skript mit einem neuen Passwort noch einmal ausführen. Die Einträge bleiben erhalten.
- **Gespeicherte Skripte:** Der SQL Editor merkt sich das Skript samt Passwort. Wer das Skript danach löschen möchte, kann das im Dashboard tun.
