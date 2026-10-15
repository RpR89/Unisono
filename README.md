# UNISONO Factory

Sito di **UNISONO Factory** – Palazzo Guarnieri, Feltre (BL), con un pannello di gestione
per modificare testi, immagini e locandine senza toccare il codice.

- Sito: **https://unisono-azure.vercel.app**
- Pannello: **https://unisono-azure.vercel.app/admin/**

## Il pannello di gestione

Si entra da `/admin/` con nome utente e password. Dal pannello si possono:

- **Locandine ed eventi**: aggiungere, modificare, nascondere, eliminare e riordinare le locandine
  della Home ("I prossimi eventi" e "Novità"). Ogni locandina ha la sua pagina con il testo dell'evento.
- **Home, Jazz Cafè, Scuola & Corsi, Unisono Studios, Music Ambassador Award**: cambiare testi,
  foto, sfondi, slideshow, masterclass e PDF di ogni sezione.
- **Contatti e piè di pagina**: telefono, email, social, dati della società, modulo di contatto, loghi.
- **Utenti**: aggiungere o togliere le persone che possono entrare e cambiare le loro password.

A destra c'è l'**anteprima dal vivo** della pagina, in versione computer o telefono.
Le modifiche vanno online solo quando si preme **Pubblica**: il sito si aggiorna in circa un minuto
e il pannello mostra "Pubblicato e online ✓" quando è pronto.
Se due persone pubblicano nello stesso momento, la seconda riceve un avviso invece di cancellare
il lavoro della prima.

Le immagini troppo grandi vengono ridotte automaticamente prima del caricamento (massimo 2400 pixel).
I PDF possono pesare al massimo 4 MB.

### Configurazione su Vercel (una volta sola)

Nel progetto Vercel → *Settings → Environment Variables* servono queste variabili:

| Variabile | Cosa contiene |
| --- | --- |
| `ADMIN_USER` | nome utente dell'amministratore principale |
| `ADMIN_PASSWORD` | la sua password (almeno 8 caratteri) |
| `SESSION_SECRET` | una frase segreta casuale di almeno 32 caratteri. **Non cambiarla**: serve anche a leggere l'elenco degli utenti |
| `GITHUB_TOKEN` | token GitHub con cui il pannello salva le modifiche (vedi sotto) |

Facoltative: `GITHUB_REPO` (predefinito `RpR89/Unisono`) e `GITHUB_BRANCH` (predefinito `main`).

**Token GitHub**: github.com → foto profilo → *Settings → Developer settings → Personal access tokens →
Fine-grained tokens → Generate new token*. Su *Repository access* scegli *Only select repositories* →
`RpR89/Unisono`; su *Permissions → Repository permissions* imposta **Contents: Read and write**.
Quando il token scade, creane uno nuovo e aggiorna `GITHUB_TOKEN` su Vercel.

Dopo aver aggiunto o cambiato le variabili, su Vercel apri *Deployments* e fai **Redeploy** dell'ultima versione.

L'amministratore principale non si può eliminare dal pannello e la sua password si cambia solo su Vercel:
serve anche per rientrare se qualcuno perde la propria password.

## Come funziona

```
content/site.json      testi e immagini di tutte le pagine
content/eventi.json    locandine, eventi e novità
content/utenti.enc.json  utenti del pannello (cifrato: il repository è pubblico)
assets/img, assets/pdf   foto e documenti originali
assets/uploads/          file caricati dal pannello
lib/render.mjs         modelli delle pagine (usati sia per pubblicare sia per l'anteprima)
lib/schema.mjs         campi modificabili nel pannello
scripts/build.mjs      genera il sito nella cartella dist/
api/                   funzioni del pannello su Vercel (accesso, salvataggio, caricamenti, utenti)
admin/                 interfaccia del pannello
css/, js/              stile e script del sito
```

Quando si preme *Pubblica*, il pannello salva su GitHub, in un unico commit, i contenuti aggiornati
e i file caricati. Vercel vede il nuovo commit, esegue `scripts/build.mjs` e pubblica il sito.
Lo storico di GitHub conserva ogni versione, quindi si può sempre tornare indietro.

## Sviluppo in locale

Serve Node.js 20 o più recente, senza altre dipendenze.

```
npm run dev     # sito su http://localhost:3000 e pannello su /admin/ (utente admin / admin)
npm test        # test automatici
npm run build   # genera il sito in dist/
```

In locale il pannello salva direttamente nei file del progetto e rigenera il sito.

Il dominio `unisonofactory.com` punta ancora al sito WordPress su Aruba.
Per spostarlo su Vercel: progetto su Vercel → *Settings → Domains*, poi si aggiornano i DNS su Aruba.

## Note

- **Modulo di contatto**: non c'è un server di posta, quindi *Invia* apre il programma di posta
  con il messaggio già compilato.
- **Privacy Policy / Cookie Policy**: anche nel sito originale le pagine non esistono.
  Si possono collegare dal pannello (*Contatti e piè di pagina → Loghi e pagine legali*).
