// Descrizione dei campi modificabili nel pannello /admin.
// Ogni gruppo corrisponde a una sezione della pagina; "sel" è la parte della pagina
// su cui si sposta l'anteprima quando si modifica quel gruppo.
//
// Tipi di campo:
//   text      riga di testo
//   lines     testo su più righe (gli "a capo" restano)
//   rich      testo formattato (grassetto, corsivo, titoli, elenchi, link)
//   image     immagine            images  più immagini (slideshow, galleria)
//   pdf       documento PDF       url     indirizzo web
//   link      pagina del sito oppure indirizzo web
//   list      elenco di elementi con i propri campi

export const LINK_OPTIONS = [
  ['', '— nessun link —'],
  ['home', 'Home'],
  ['eventi', 'Home › I prossimi eventi'],
  ['masterclass', 'Home › Masterclass'],
  ['jazzcafe', 'Jazz Cafè'],
  ['scuola', 'Scuola & Corsi'],
  ['award', 'Music Ambassador Award'],
  ['studios', 'Unisono Studios'],
  ['dove', 'Home › Dove siamo'],
  ['archivio', 'Eventi passati'],
];

const seo = (path, sel) => ({ titolo: 'Google e condivisione', path, sel, aiuto: 'Breve descrizione (circa 150 caratteri) che compare su Google e quando la pagina viene condivisa su WhatsApp o Facebook. Se resta vuota si usa l\'inizio del testo della pagina.', campi: [
  { k: 'descrizione', tipo: 'lines', label: 'Descrizione' },
] });

const scheda = { tipo: 'list', etichetta: 'titolo', nuovo: { titolo: 'Nuova scheda', immagine: '', link: 'home' }, campi: [
  { k: 'titolo', tipo: 'text', label: 'Titolo' },
  { k: 'immagine', tipo: 'image', label: 'Immagine', facoltativo: true },
  { k: 'link', tipo: 'link', label: 'Porta a' },
] };

export const SECTIONS = [
  {
    id: 'home', titolo: 'Home', icona: '⌂', anteprima: 'home',
    gruppi: [
      { titolo: 'Immagine iniziale', path: 'home.hero', sel: '.hero', campi: [
        { k: 'sfondo', tipo: 'image', label: 'Foto di sfondo' },
        { k: 'logo', tipo: 'image', label: 'Logo al centro' },
        { k: 'frase', tipo: 'lines', label: 'Frase sotto il logo' },
        { k: 'pulsante_eventi', tipo: 'text', label: 'Pulsante verso gli eventi (vuoto = nascosto)' },
        { k: 'pulsante_prenota', tipo: 'text', label: 'Pulsante per prenotare su WhatsApp (vuoto = nascosto)' },
      ] },
      { titolo: 'I prossimi eventi', path: 'home.eventi', sel: '#events', aiuto: 'Le locandine si gestiscono nella sezione "Locandine ed eventi".', campi: [
        { k: 'etichetta', tipo: 'text', label: 'Scritta piccola sopra il titolo' },
        { k: 'titolo', tipo: 'text', label: 'Titolo' },
        { k: 'testo', tipo: 'rich', label: 'Testo introduttivo' },
        { k: 'pulsante', tipo: 'text', label: 'Scritta del pulsante sotto ogni locandina' },
        { k: 'vuoto', tipo: 'lines', label: 'Messaggio quando non ci sono eventi in programma' },
        { k: 'info', tipo: 'text', label: 'Scritta prima del telefono' },
      ] },
      { titolo: 'Novità', path: 'home.novita', sel: '#novita', aiuto: 'Le copertine si gestiscono in "Locandine ed eventi" scegliendo "Novità".', campi: [
        { k: 'etichetta', tipo: 'text', label: 'Scritta piccola sopra il titolo' },
        { k: 'titolo', tipo: 'text', label: 'Titolo' },
        { k: 'testo', tipo: 'rich', label: 'Testo introduttivo' },
        { k: 'logo', tipo: 'image', label: 'Logo (Unisono Records)' },
        { k: 'pulsante', tipo: 'text', label: 'Scritta del pulsante sotto ogni copertina' },
        { k: 'info', tipo: 'text', label: 'Scritta prima del telefono' },
      ] },
      { titolo: 'Masterclass', path: 'home.masterclass', sel: '#masterclass', campi: [
        { k: 'etichetta', tipo: 'text', label: 'Scritta piccola sopra il titolo' },
        { k: 'testo', tipo: 'rich', label: 'Testo introduttivo (facoltativo)' },
        { k: 'titolo', tipo: 'text', label: 'Titolo' },
        { k: 'corsi', tipo: 'list', label: 'Masterclass', etichetta: 'testo', nuovo: { immagine: '', testo: '<p><strong>NUOVA MASTERCLASS</strong><br>DOCENTE</p><p>Descrizione<br>Date</p>', pdf: '', pulsante: 'DOWNLOAD INFO', data_fine: '' }, campi: [
          { k: 'data_fine', tipo: 'date', label: 'Ultimo giorno', aiuto: 'Dopo questa data la masterclass resta nella Home con l\'etichetta "Concluso". Per toglierla, eliminala dall\'elenco.' },
          { k: 'immagine', tipo: 'image', label: 'Foto' },
          { k: 'testo', tipo: 'rich', label: 'Testo' },
          { k: 'pdf', tipo: 'pdf', label: 'PDF con le informazioni' },
          { k: 'pulsante', tipo: 'text', label: 'Scritta del link' },
        ] },
      ] },
      { titolo: 'Un mondo di musica', path: 'home.mondo', sel: '.mondo', campi: [
        { k: 'etichetta', tipo: 'text', label: 'Scritta piccola sopra il titolo' },
        { k: 'sfondo', tipo: 'image', label: 'Foto di sfondo' },
        { k: 'logo', tipo: 'image', label: 'Logo' },
        { k: 'titolo', tipo: 'text', label: 'Titolo' },
        { k: 'testo', tipo: 'rich', label: 'Testo' },
      ] },
      { titolo: 'Jazz Cafè', path: 'home.jazz', sel: '.jazz', campi: [
        { k: 'etichetta', tipo: 'text', label: 'Scritta piccola sopra il titolo' },
        { k: 'sfondo', tipo: 'image', label: 'Foto di sfondo' },
        { k: 'logo', tipo: 'image', label: 'Logo' },
        { k: 'titolo', tipo: 'lines', label: 'Titolo grande' },
        { k: 'pulsante', tipo: 'text', label: 'Scritta del pulsante' },
        { k: 'testo', tipo: 'rich', label: 'Testo' },
      ] },
      { titolo: 'Centro di Musica', path: 'home.centro', sel: '.centro', campi: [
        { k: 'etichetta', tipo: 'text', label: 'Scritta piccola sopra il titolo' },
        { k: 'sfondo', tipo: 'image', label: 'Foto di sfondo' },
        { k: 'logo', tipo: 'image', label: 'Logo' },
        { k: 'testo', tipo: 'rich', label: 'Testo' },
        { ...scheda, k: 'schede', label: 'Schede del carosello' },
        { k: 'nota', tipo: 'text', label: 'Nota sotto il carosello' },
      ] },
      { titolo: 'Unisono Studios', path: 'home.studios', sel: '.studios', campi: [
        { k: 'etichetta', tipo: 'text', label: 'Scritta piccola sopra il titolo' },
        { k: 'sfondo', tipo: 'image', label: 'Foto di sfondo' },
        { k: 'titolo', tipo: 'lines', label: 'Titolo grande' },
        { k: 'pulsante', tipo: 'text', label: 'Scritta del pulsante' },
        { k: 'testo', tipo: 'rich', label: 'Testo' },
      ] },
      { titolo: 'Unisono Family', path: 'home.family', sel: '.family', campi: [
        { k: 'etichetta', tipo: 'text', label: 'Scritta piccola sopra il titolo' },
        { k: 'titolo', tipo: 'lines', label: 'Titolo grande' },
        { k: 'testo', tipo: 'rich', label: 'Testo' },
        { k: 'pulsante', tipo: 'text', label: 'Scritta del pulsante' },
        { k: 'pdf', tipo: 'pdf', label: 'PDF (roster degli artisti)' },
        { k: 'immagine', tipo: 'image', label: 'Foto' },
      ] },
      { titolo: 'Palazzo Guarnieri', path: 'home.palazzo', sel: '.palazzo', campi: [
        { k: 'etichetta', tipo: 'text', label: 'Scritta piccola sopra il titolo' },
        { k: 'sfondo', tipo: 'image', label: 'Foto di sfondo' },
        { k: 'titolo', tipo: 'text', label: 'Titolo' },
        { k: 'sottotitolo', tipo: 'text', label: 'Seconda riga del titolo' },
        { k: 'testo', tipo: 'rich', label: 'Testo' },
      ] },
      { titolo: 'Photogallery', path: 'home.gallery', sel: '.gallery', campi: [
        { k: 'etichetta', tipo: 'text', label: 'Scritta piccola sopra il titolo' },
        { k: 'visibile', tipo: 'bool', label: 'Mostra questa sezione' },
        { k: 'sfondo', tipo: 'image', label: 'Foto di sfondo' },
        { k: 'immagini', tipo: 'images', label: 'Le tre foto sovrapposte', max: 3 },
        { k: 'titolo', tipo: 'text', label: 'Titolo' },
        { k: 'testo', tipo: 'rich', label: 'Testo' },
        { k: 'pulsante', tipo: 'text', label: 'Scritta del pulsante' },
        { k: 'link', tipo: 'link', label: 'Il pulsante porta a' },
      ] },
      { titolo: 'Dove siamo', path: 'home.dove', sel: '#dove-siamo', aiuto: 'Telefono, email e orari si modificano in "Contatti e piè di pagina".', campi: [
        { k: 'etichetta', tipo: 'text', label: 'Scritta piccola sopra il titolo' },
        { k: 'visibile', tipo: 'bool', label: 'Mostra questa sezione' },
        { k: 'titolo', tipo: 'lines', label: 'Titolo' },
        { k: 'testo', tipo: 'rich', label: 'Testo' },
        { k: 'indirizzo', tipo: 'lines', label: 'Indirizzo' },
        { k: 'mappa', tipo: 'url', label: 'Link a Google Maps' },
        { k: 'pulsante_mappa', tipo: 'text', label: 'Scritta del pulsante della mappa' },
        { k: 'immagine', tipo: 'image', label: 'Foto' },
      ] },
      { titolo: 'Sponsor', path: 'home.sponsor', sel: '.sponsor', campi: [
        { k: 'etichetta', tipo: 'text', label: 'Scritta piccola sopra il titolo' },
        { k: 'titolo', tipo: 'text', label: 'Titolo' },
        { k: 'immagine', tipo: 'image', label: 'Riquadro sponsor e partner' },
        { k: 'banner', tipo: 'image', label: 'Banner sotto (es. POC Regione del Veneto)', facoltativo: true },
        { k: 'link', tipo: 'url', label: 'Il banner porta a' },
      ] },
    ],
  },
  {
    id: 'jazzcafe', titolo: 'Jazz Cafè', icona: '♪', anteprima: 'jazzcafe',
    gruppi: [
      { titolo: 'Intestazione', path: 'jazzcafe.hero', sel: '.jc-hero', campi: [
        { k: 'sfondo', tipo: 'image', label: 'Foto di sfondo' },
        { k: 'titolo', tipo: 'text', label: 'Titolo' },
      ] },
      { titolo: 'I concerti', path: 'jazzcafe.concerti', sel: '.jc-concerti', campi: [
        { k: 'titolo', tipo: 'text', label: 'Titolo' },
        { k: 'testo', tipo: 'rich', label: 'Testo' },
        { k: 'immagine', tipo: 'image', label: 'Foto' },
        { k: 'frase', tipo: 'text', label: 'Frase grande sotto la foto' },
      ] },
      { titolo: 'Il ristorante', path: 'jazzcafe.ristorante', sel: '.ristorante', campi: [
        { k: 'foto', tipo: 'images', label: 'Foto dello slideshow' },
        { k: 'titolo', tipo: 'text', label: 'Titolo' },
        { k: 'testo', tipo: 'rich', label: 'Testo' },
      ] },
      seo('jazzcafe', '.jc-hero'),
    ],
  },
  {
    id: 'scuola', titolo: 'Scuola & Corsi', icona: '✎', anteprima: 'scuola',
    gruppi: [
      { titolo: 'Intestazione', path: 'scuola.hero', sel: '.scuola-hero', campi: [
        { k: 'titolo', tipo: 'text', label: 'Titolo' },
        { k: 'sfondo', tipo: 'image', label: 'Foto di sfondo', facoltativo: true },
      ] },
      { titolo: 'Fascia rossa iniziale', path: 'scuola.intro', sel: '.band', campi: [
        { k: 'titolo', tipo: 'lines', label: 'Titolo' },
        { k: 'sottotitolo', tipo: 'text', label: 'Sottotitolo' },
      ] },
      { titolo: 'Il Centro di Musica', path: 'scuola.centro', sel: '.split-full', campi: [
        { k: 'immagine', tipo: 'image', label: 'Foto' },
        { k: 'titolo', tipo: 'text', label: 'Titolo' },
        { k: 'testo', tipo: 'rich', label: 'Testo' },
      ] },
      { titolo: 'Fascia rossa centrale', path: 'scuola.banda', sel: '.band.small', campi: [
        { k: 'testo', tipo: 'text', label: 'Testo' },
      ] },
      { titolo: 'I corsi', path: 'scuola.corsi', sel: '.corsi', campi: [
        { k: 'titolo', tipo: 'text', label: 'Titolo' },
        { k: 'testo', tipo: 'rich', label: 'Elenco dei corsi' },
      ] },
      { titolo: 'Master class', path: 'scuola.masterclass', sel: '.corsi', campi: [
        { k: 'titolo', tipo: 'text', label: 'Titolo' },
        { k: 'corsi', tipo: 'list', label: 'Masterclass', etichetta: 'titolo', nuovo: { titolo: 'NUOVA MASTERCLASS', testo: 'Per ulteriori info scarica il PDF cliccando il tasto qui sotto', pdf: '', pulsante: 'Download PDF' }, campi: [
          { k: 'titolo', tipo: 'text', label: 'Titolo' },
          { k: 'testo', tipo: 'text', label: 'Testo' },
          { k: 'pdf', tipo: 'pdf', label: 'PDF' },
          { k: 'pulsante', tipo: 'text', label: 'Scritta del pulsante' },
        ] },
      ] },
      { titolo: 'Workshop e altre attività', path: 'scuola.workshop', sel: '.workshop', campi: [
        { k: 'testo', tipo: 'rich', label: 'Testo' },
      ] },
      { titolo: 'Fascia "Le lezioni…"', path: 'scuola.banda2', sel: '.band.bg-photo', campi: [
        { k: 'sfondo', tipo: 'image', label: 'Foto di sfondo' },
        { k: 'testo', tipo: 'text', label: 'Testo' },
      ] },
      { titolo: 'Ti potrebbe interessare anche', path: 'scuola.correlati', sel: '.related', campi: [
        { k: 'titolo', tipo: 'text', label: 'Titolo' },
        { k: 'sfondo', tipo: 'image', label: 'Foto di sfondo' },
        { ...scheda, k: 'schede', label: 'Schede' },
      ] },
      seo('scuola', '.scuola-hero'),
    ],
  },
  {
    id: 'studios', titolo: 'Unisono Studios', icona: '◉', anteprima: 'studios',
    gruppi: [
      { titolo: 'Intestazione', path: 'studios.hero', sel: '.studios-hero', campi: [
        { k: 'sfondo', tipo: 'image', label: 'Foto di sfondo' },
        { k: 'logo', tipo: 'image', label: 'Logo' },
        { k: 'titolo', tipo: 'text', label: 'Titolo' },
      ] },
      { titolo: 'Foto della regia', path: 'studios.galleria', sel: '.studio-gallery', campi: [
        { k: 'sfondo', tipo: 'image', label: 'Foto di sfondo' },
        { k: 'foto', tipo: 'images', label: 'Foto dello slideshow' },
      ] },
      { titolo: 'Control room & Iso booth', path: 'studios.control', sel: '.bg-grigio', campi: [
        { k: 'titolo', tipo: 'text', label: 'Titolo' },
        { k: 'testo', tipo: 'rich', label: 'Testo' },
      ] },
      { titolo: 'Le sale', path: 'studios', sel: '.hall', campi: [
        { k: 'sale', tipo: 'list', label: 'Sale', etichetta: 'titolo', nuovo: { titolo: 'NUOVA SALA', sfondo: '', foto: [], testo: '<p>Descrizione della sala</p>' }, campi: [
          { k: 'titolo', tipo: 'text', label: 'Nome della sala' },
          { k: 'testo', tipo: 'rich', label: 'Descrizione' },
          { k: 'foto', tipo: 'images', label: 'Foto dello slideshow' },
          { k: 'sfondo', tipo: 'image', label: 'Foto di sfondo dietro lo slideshow', facoltativo: true },
        ] },
      ] },
      { titolo: 'I nostri servizi', path: 'studios.servizi', sel: '.servizi', campi: [
        { k: 'titolo', tipo: 'text', label: 'Titolo' },
        { k: 'testo', tipo: 'rich', label: 'Testo' },
      ] },
      seo('studios', '.studios-hero'),
    ],
  },
  {
    id: 'award', titolo: 'Music Ambassador Award', icona: '★', anteprima: 'award',
    gruppi: [
      { titolo: 'Intestazione', path: 'award.hero', sel: '.maa-hero', campi: [
        { k: 'sfondo', tipo: 'image', label: 'Foto di sfondo' },
        { k: 'titolo', tipo: 'lines', label: 'Titolo' },
      ] },
      { titolo: 'Una visione per gli artisti', path: 'award.visione', sel: '.maa-visione', campi: [
        { k: 'titolo', tipo: 'text', label: 'Titolo' },
        { k: 'testo', tipo: 'rich', label: 'Testo' },
        { k: 'immagine', tipo: 'image', label: 'Foto' },
      ] },
      { titolo: 'Vincitori', path: 'award.vincitori', sel: '.maa-list', campi: [
        { k: 'sfondo', tipo: 'image', label: 'Foto di sfondo' },
        { k: 'titolo', tipo: 'lines', label: 'Titolo' },
        { k: 'testo', tipo: 'rich', label: 'Elenco dei vincitori' },
      ] },
      { titolo: 'Fascia rossa', path: 'award.banda', sel: '.band.bg-rosso-scuro', campi: [
        { k: 'testo', tipo: 'text', label: 'Testo' },
      ] },
      { titolo: 'Ti potrebbe interessare anche', path: 'award.correlati', sel: '.related', campi: [
        { k: 'titolo', tipo: 'text', label: 'Titolo' },
        { k: 'sfondo', tipo: 'image', label: 'Foto di sfondo' },
        { ...scheda, k: 'schede', label: 'Schede' },
      ] },
      seo('award', '.maa-hero'),
    ],
  },
  {
    id: 'generale', titolo: 'Contatti e piè di pagina', icona: '☎', anteprima: 'scuola',
    gruppi: [
      { titolo: 'Contatti', path: 'contatti', sel: '.site-footer', aiuto: 'Il telefono compare anche nella Home, sotto eventi e novità.', campi: [
        { k: 'telefono', tipo: 'text', label: 'Telefono' },
        { k: 'whatsapp', tipo: 'text', label: 'Numero WhatsApp (per i pulsanti "Prenota")' },
        { k: 'orari', tipo: 'lines', label: 'Orari di apertura (vuoto = non mostrati)' },
        { k: 'email', tipo: 'text', label: 'Email' },
        { k: 'email_privacy', tipo: 'text', label: 'Email per la privacy' },
        { k: 'facebook', tipo: 'url', label: 'Pagina Facebook' },
        { k: 'instagram', tipo: 'url', label: 'Profilo Instagram' },
      ] },
      { titolo: 'Dati della società', path: 'azienda', sel: '.site-footer', campi: [
        { k: 'nome', tipo: 'text', label: 'Ragione sociale' },
        { k: 'indirizzo', tipo: 'lines', label: 'Indirizzo' },
        { k: 'dati_fiscali', tipo: 'lines', label: 'Dati fiscali' },
      ] },
      { titolo: 'Modulo di contatto', path: 'modulo', sel: '.scrivici', aiuto: 'Compare in fondo alle pagine Scuola & Corsi e Music Ambassador Award.', campi: [
        { k: 'titolo', tipo: 'lines', label: 'Titolo grande' },
        { k: 'sottotitolo', tipo: 'text', label: 'Titolo del modulo' },
        { k: 'testo', tipo: 'rich', label: 'Testo' },
        { k: 'email_destinatario', tipo: 'text', label: 'I messaggi vengono inviati a' },
        { k: 'sfondo', tipo: 'image', label: 'Foto di sfondo' },
      ] },
      { titolo: 'Loghi e pagine legali', path: 'generale', sel: '.site-footer', campi: [
        { k: 'logo_header', tipo: 'image', label: 'Logo in alto (menu)' },
        { k: 'logo_footer', tipo: 'image', label: 'Logo in fondo alla pagina' },
        { k: 'sfondo_footer', tipo: 'image', label: 'Foto di sfondo del piè di pagina' },
        { k: 'privacy_url', tipo: 'url', label: 'Privacy Policy esterna (vuoto = pagina del sito)' },
        { k: 'cookie_url', tipo: 'url', label: 'Cookie Policy esterna (vuoto = pagina del sito)' },
      ] },
      { titolo: 'Prenotazioni', path: 'generale', sel: '.site-header', campi: [
        { k: 'pulsante_prenota', tipo: 'text', label: 'Scritta del pulsante nel menu' },
        { k: 'messaggio_whatsapp', tipo: 'text', label: 'Messaggio già scritto quando si apre WhatsApp' },
      ] },
      { titolo: 'Google e condivisione', path: 'generale', sel: '.hero', campi: [
        { k: 'titolo_home', tipo: 'text', label: 'Titolo della Home su Google' },
        { k: 'descrizione', tipo: 'lines', label: 'Descrizione della Home su Google (circa 150 caratteri)' },
        { k: 'url_sito', tipo: 'url', label: 'Indirizzo del sito', aiuto: 'Da cambiare quando il dominio unisonofactory.com passerà a Vercel.' },
      ] },
    ],
  },
  {
    id: 'legali', titolo: 'Privacy e cookie', icona: '§', anteprima: 'privacy',
    gruppi: [
      { titolo: 'Privacy Policy', path: 'legali', sel: '.legal', aiuto: 'Testo preparato come base: fallo verificare da un consulente prima di considerarlo definitivo.', campi: [
        { k: 'privacy', tipo: 'rich', label: 'Testo' },
      ] },
      { titolo: 'Cookie Policy', path: 'legali', sel: '.legal', campi: [
        { k: 'cookie', tipo: 'rich', label: 'Testo' },
      ] },
    ],
  },
];

// Campi della scheda di un evento o di una novità
export const EVENT_FIELDS = [
  { k: 'titolo', tipo: 'text', label: 'Titolo', aiuto: 'Compare sotto la locandina nella Home e nella scheda del browser.' },
  { k: 'tipo', tipo: 'select', label: 'Dove compare nella Home', opzioni: [['evento', 'I prossimi eventi'], ['novita', 'Novità']] },
  { k: 'data', tipo: 'date', label: 'Data', aiuto: 'Gli eventi vengono messi in ordine di data e, finiti, passano da soli tra gli "Eventi passati".' },
  { k: 'data_fine', tipo: 'date', label: 'Ultimo giorno (solo se dura più giorni)' },
  { k: 'orario', tipo: 'text', label: 'Orario', aiuto: 'Ad esempio: ore 21.30 · oppure: doppio set 19.30 e 21.30' },
  { k: 'luogo', tipo: 'text', label: 'Sala o luogo', aiuto: 'Ad esempio: Modern Hall' },
  { k: 'sottotitolo', tipo: 'text', label: 'Sottotitolo (solo per le Novità)', aiuto: 'Compare sotto la copertina, ad esempio: artista · formato · data di uscita' },
  { k: 'locandina', tipo: 'image', label: 'Locandina o copertina' },
  { k: 'testo', tipo: 'rich', label: 'Testo della pagina' },
  { k: 'immagine_home', tipo: 'image', label: 'Immagine per la Home (solo se diversa dalla locandina)', facoltativo: true },
  { k: 'visibile', tipo: 'bool', label: 'Mostra nella Home' },
];
