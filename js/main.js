// UNISONO Factory — comportamenti dell'interfaccia
(function () {
  'use strict';

  document.documentElement.classList.add('js');

  // Anteprima del nuovo stile: un'etichetta permette di confrontarlo con quello attuale
  if (document.documentElement.classList.contains('tema-nuovo')) {
    var badge = document.createElement('div');
    badge.className = 'stile-badge';
    badge.innerHTML = 'Anteprima nuovo stile · <a href="?stile=attuale">torna all\'attuale</a>';
    document.body.appendChild(badge);
  }

  var header = document.querySelector('.site-header');
  var toggle = document.querySelector('.menu-toggle');
  var toTop = document.querySelector('.to-top');

  // Menu mobile
  if (toggle && header) {
    toggle.addEventListener('click', function () {
      var open = header.classList.toggle('menu-open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      document.body.style.overflow = open ? 'hidden' : '';
    });

    header.querySelectorAll('.main-nav a').forEach(function (link) {
      link.addEventListener('click', function () {
        header.classList.remove('menu-open');
        toggle.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      });
    });
  }

  // Numero di articoli nel carrello, accanto all'icona nel menu
  try {
    var carrello = JSON.parse(localStorage.getItem('unisono-carrello') || '[]');
    var pezzi = carrello.reduce(function (t, r) { return t + (r.quantita || 0); }, 0);
    document.querySelectorAll('.cart-count').forEach(function (el) { el.textContent = pezzi; el.hidden = !pezzi; });
  } catch (e) { /* navigazione privata */ }

  // Header trasparente in home che diventa scuro scorrendo + pulsante "torna su"
  function onScroll() {
    var y = window.scrollY;
    if (header) header.classList.toggle('scrolled', y > 60);
    if (toTop) toTop.classList.toggle('visible', y > 400);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  if (toTop) {
    toTop.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // Caroselli con frecce
  document.querySelectorAll('.carousel').forEach(function (carousel) {
    var track = carousel.querySelector('.carousel-track');
    var prev = carousel.querySelector('.carousel-btn.prev');
    var next = carousel.querySelector('.carousel-btn.next');
    if (!track) return;

    function step(dir) {
      var tile = track.querySelector('.tile');
      var width = tile ? tile.getBoundingClientRect().width : track.clientWidth;
      var max = track.scrollWidth - track.clientWidth;
      var target = track.scrollLeft + dir * width;
      if (target > max + 2) target = 0;
      if (target < -2) target = max;
      track.scrollTo({ left: target, behavior: 'smooth' });
    }

    if (prev) prev.addEventListener('click', function () { step(-1); });
    if (next) next.addEventListener('click', function () { step(1); });
  });

  // Slideshow di immagini in dissolvenza
  document.querySelectorAll('.slideshow').forEach(function (show) {
    var slides = show.querySelectorAll('img');
    if (slides.length < 2) {
      if (slides[0]) slides[0].classList.add('active');
      return;
    }

    var dots = document.createElement('div');
    dots.className = 'slide-dots';
    var current = 0;
    var timer;

    function go(i) {
      slides[current].classList.remove('active');
      dots.children[current].classList.remove('active');
      current = (i + slides.length) % slides.length;
      slides[current].classList.add('active');
      dots.children[current].classList.add('active');
    }

    function start() {
      clearInterval(timer);
      timer = setInterval(function () { go(current + 1); }, 4500);
    }

    slides.forEach(function (_, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('aria-label', 'Immagine ' + (i + 1));
      b.addEventListener('click', function () { go(i); start(); });
      dots.appendChild(b);
    });

    show.appendChild(dots);
    slides[0].classList.add('active');
    dots.children[0].classList.add('active');
    start();
  });

  // Comparsa degli elementi durante lo scorrimento
  var reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('in'); });
  }

  // Eventi passati: le pagine sono statiche, quindi il browser nasconde ciò che è già concluso
  var today = (function () {
    try { return new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Rome' }); }
    catch (e) { return new Date().toISOString().slice(0, 10); }
  })();
  var archive = document.querySelector('.archivio');
  var homeCards = document.querySelector('#events .cards');
  document.querySelectorAll('[data-fine]').forEach(function (el) {
    if (homeCards && homeCards.contains(el)) return;
    var past = el.getAttribute('data-fine') < today;
    if (el.classList.contains('event-box')) {
      el.querySelector('.event-past').hidden = !past;
      el.querySelector('.event-actions').hidden = past;
    } else if (archive && archive.contains(el)) {
      el.hidden = !past;
    } else if (past) {
      el.hidden = true;
    }
  });
  // Locandine della Home: gli eventi in programma e, se sono meno di 3, gli ultimi già svolti
  if (homeCards) {
    var all = Array.prototype.slice.call(homeCards.querySelectorAll('.card'));
    var isOver = function (c) { return c.dataset.fine && c.dataset.fine < today; };
    var upcoming = all.filter(function (c) { return !isOver(c); });
    var over = all.filter(isOver).sort(function (a, b) { return a.dataset.fine < b.dataset.fine ? 1 : -1; });
    var fill = Math.max(0, 3 - upcoming.length);
    upcoming.forEach(function (c) { c.hidden = false; c.classList.remove('is-past'); });
    over.forEach(function (c, i) {
      c.classList.add('is-past');
      c.hidden = i >= fill;
      var btn = c.querySelector('.btn');
      if (btn && btn.dataset.labelPast) btn.textContent = btn.dataset.labelPast;
      homeCards.appendChild(c);
    });
  }
  // Masterclass: restano visibili, quelle concluse prendono l'etichetta "Concluso"
  document.querySelectorAll('[data-mc-fine]').forEach(function (el) {
    el.classList.toggle('is-past', el.getAttribute('data-mc-fine') < today);
  });
  var empty = document.querySelector('#events .cards-empty');
  if (homeCards && empty) empty.hidden = !!homeCards.querySelector('.card:not([hidden])');

  // Modulo di contatto: invia il messaggio con WhatsApp oppure con il programma di posta
  document.querySelectorAll('form.contact-form').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var nome = form.elements.nome.value.trim();
      var email = form.elements.email.value.trim();
      var messaggio = form.elements.messaggio.value.trim();
      var via = e.submitter && e.submitter.value === 'email' ? 'email' : 'whatsapp';
      if (via === 'whatsapp' && form.dataset.wa) {
        var text = 'Ciao, sono ' + nome + ' (' + email + ').\n\n' + messaggio;
        window.open(form.dataset.wa + '?text=' + encodeURIComponent(text), '_blank', 'noopener');
        return;
      }
      var subject = 'Richiesta informazioni dal sito - ' + nome;
      var body = messaggio + '\n\n' + nome + '\n' + email;
      window.location.href = 'mailto:' + form.dataset.to +
        '?subject=' + encodeURIComponent(subject) +
        '&body=' + encodeURIComponent(body);
    });
  });
})();
