# UNISONO Factory

Sito di **UNISONO Factory** – Palazzo Guarnieri, Feltre (BL).

È la ricostruzione statica del sito WordPress pubblicato su [unisonofactory.com](https://unisonofactory.com),
con gli stessi testi, le stesse foto e la stessa grafica. Usa solo HTML, CSS e un po' di JavaScript:
nessun database, nessun plugin e nessuna installazione.

## Pagine

Gli indirizzi sono gli stessi del sito originale, quindi i link già condivisi continuano a funzionare.

| Pagina | File |
| --- | --- |
| Home | `index.html` |
| Jazz Cafè | `unisono-jazz-cafe-restaurant/index.html` |
| Scuola & Corsi (Centro di Musica) | `scuola-di-musica/index.html` |
| Music Ambassador Award | `music-ambassador-award/index.html` |
| Unisono Studios | `recording/index.html` |
| Evento – Live Mixing School 2026 | `live-mixing-school-2026/index.html` |
| Evento – M.S.S.M | `m-s-s-m/index.html` |
| Evento – Rita Marcotulli Ensemble | `rita-marcotulli-ensemble/index.html` |
| Novità – New Direction | `new-direction-live-at-unisono-studios/index.html` |
| Novità – Solitude di Danilo Memoli | `alvise-bortoloni-2/index.html` |

`scuola/index.html` rimanda automaticamente a *Scuola & Corsi*, come nel sito originale.

## Struttura

```
css/style.css     stile di tutto il sito (colori e font in cima, nelle variabili :root)
js/main.js        menu mobile, slideshow, caroselli, animazioni, modulo di contatto
assets/img/       foto e loghi (file originali del sito)
assets/pdf/       PDF delle masterclass e di Unisono Family
```

Font: **Abril Fatface** per i titoli grandi, **Lato** per menu e footer (Google Fonts),
font di sistema per il testo.

## Vedere il sito in locale

Basta aprire `index.html` nel browser. In alternativa, dalla cartella del progetto:

```
python3 -m http.server 8000
```

e poi apri http://localhost:8000

## Pubblicazione

Il sito è fatto di file statici, quindi si può pubblicare su qualsiasi hosting:
- **Aruba**: carica tutto il contenuto della cartella via FTP nella cartella principale del dominio;
- in alternativa Vercel, Netlify o GitHub Pages, senza nessuna configurazione.

## Differenze rispetto al sito WordPress

- **Modulo di contatto**: non c'è un server, quindi *Invia* apre il programma di posta
  con il messaggio già compilato, indirizzato a info@unisonojazz.it.
- **Ricerca**: l'icona della ricerca nel menu è stata tolta perché richiedeva WordPress.
- **Privacy Policy / Cookie Policy**: anche nel sito originale le pagine non esistono (errore 404).
  Per ora i link puntano a `#` e vanno collegati quando le pagine saranno pronte.
