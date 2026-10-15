// UNISONO Factory — comportamenti dell'interfaccia
(function () {
  'use strict';

  document.documentElement.classList.add('js');

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

  // Modulo di contatto: apre il programma di posta con il messaggio già compilato
  document.querySelectorAll('form.contact-form').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var nome = form.elements.nome.value.trim();
      var email = form.elements.email.value.trim();
      var messaggio = form.elements.messaggio.value.trim();
      var subject = 'Richiesta informazioni dal sito - ' + nome;
      var body = messaggio + '\n\n' + nome + '\n' + email;
      window.location.href = 'mailto:' + form.dataset.to +
        '?subject=' + encodeURIComponent(subject) +
        '&body=' + encodeURIComponent(body);
    });
  });
})();
