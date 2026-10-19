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
2. In `index.html` ganz unten im Script-Teil bei `speicher` eintragen:

```js
speicher: {
  url: "https://DEIN-PROJEKT.supabase.co",
  key: "sb_publishable_..."
},
```

3. Namen und Rollen bei `spieler` ersetzen, falls noch nicht geschehen.

Der Publishable Key darf im Seitencode stehen, er ist für genau diesen Zweck gedacht. Den **Secret key** dagegen niemals in die Seite schreiben.

## 4. Seite veröffentlichen

Die `index.html` auf einen kostenlosen Hoster legen, zum Beispiel GitHub Pages oder Netlify (Drag-and-drop). Danach öffnet jeder die Adresse, sieht den Log, und ihr beide tragt über **Eintrag schreiben** mit dem Passwort ein.

## Gut zu wissen

- **Pausierung:** Kostenlose Supabase-Projekte werden pausiert, wenn sie 7 Tage lang kaum Anfragen bekommen. Jedes Öffnen der Seite zählt als Anfrage. Falls es trotzdem passiert, lässt sich das Projekt im Dashboard wieder starten, die Daten bleiben erhalten.
- **Schutz:** Lesen darf jeder, Schreiben nur mit Passwort, und das wird auf dem Server geprüft. Ein langes Passwort ist wichtig, weil sonst jemand beliebig oft raten könnte.
- **Passwort ändern:** Das Skript mit einem neuen Passwort noch einmal ausführen. Die Einträge bleiben erhalten.
- **Gespeicherte Skripte:** Der SQL Editor merkt sich das Skript samt Passwort. Wer das Skript danach löschen möchte, kann das im Dashboard tun.
