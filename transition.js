/* ============================================================
   Page transition — GSAP MorphSVG "curtain" sweep
   - Departure: clicking a work card sweeps a colored curve up
     from the bottom (with the section name), then navigates.
   - Arrival: the destination page loads already covered, then
     the curve peels back down to reveal it (no white flash).
   Shared across the homepage and the four work pages.
   ============================================================ */
(function () {
  var TOTAL = 0.8; // seconds per direction

  // Three keyframes of the wavy curtain (path fills from its wavy
  // top edge down to y=100). EMPTY = nothing, WAVE = rising crest,
  // FULL = whole screen covered.
  var EMPTY = 'M 0 100 V 100 Q 50 100 100 100 V 100 z';
  var WAVE  = 'M 0 100 V 50 Q 50 0 100 50 V 100 z';
  var FULL  = 'M 0 100 V 0 Q 50 0 100 0 V 100 z';

  var reduce = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  // Poll briefly for GSAP (loaded from CDN at the end of the page).
  function gsapReady(cb, tries) {
    tries = tries || 0;
    if (window.gsap) {
      if (window.MorphSVGPlugin) {
        try { gsap.registerPlugin(MorphSVGPlugin); } catch (e) {}
      }
      cb();
    } else if (tries < 60) {
      setTimeout(function () { gsapReady(cb, tries + 1); }, 33);
    } else {
      cb(); // give up waiting; cb handles the no-gsap path
    }
  }

  ready(function () {
    var overlay = document.querySelector('.xt-overlay');
    if (!overlay) return;

    var root    = document.documentElement;
    var path    = overlay.querySelector('.xt-path');
    var s1      = overlay.querySelector('.xt-s1');
    var s2      = overlay.querySelector('.xt-s2');
    var label   = overlay.querySelector('.xt-label');
    var titleEl = overlay.querySelector('.xt-title');

    function setColors(c1, c2, ink) {
      if (c1) s1.setAttribute('stop-color', c1);
      if (c2) s2.setAttribute('stop-color', c2);
      if (ink) overlay.style.setProperty('--xt-ink', ink);
    }

    var hasMorph = function () { return window.gsap && window.MorphSVGPlugin; };

    // Reset everything (used on bfcache restore).
    window.addEventListener('pageshow', function (ev) {
      if (!ev.persisted) return;
      root.classList.remove('xt-leaving', 'xt-incoming');
      path.setAttribute('d', EMPTY);
      overlay.style.visibility = '';
      overlay.style.background = '';
      if (label) { label.style.opacity = ''; label.style.transform = ''; }
    });

    /* -------- ARRIVAL: peel the curtain away -------- */
    if (root.classList.contains('xt-incoming')) {
      var data = null;
      try { data = JSON.parse(sessionStorage.getItem('pageTransition') || 'null'); } catch (e) {}
      sessionStorage.removeItem('pageTransition');

      var ac1 = (data && data.c1) || '#9398B4';
      var ac2 = (data && data.c2) || '#363E4F';
      setColors(ac1, ac2);

      gsapReady(function () {
        // Hand off from the CSS solid cover to the SVG full cover,
        // in the same frame, so there is no flash.
        path.setAttribute('d', FULL);
        overlay.style.background = 'transparent';

        function finish() {
          root.classList.remove('xt-incoming');
          overlay.style.visibility = 'hidden';
        }

        if (reduce || !window.gsap) { finish(); return; }

        if (hasMorph()) {
          gsap.timeline({ onComplete: finish })
            .to(path, { duration: TOTAL * 0.5, morphSVG: WAVE,  ease: 'power2.in' })
            .to(path, { duration: TOTAL * 0.5, morphSVG: EMPTY, ease: 'power2.out' });
        } else {
          path.setAttribute('d', EMPTY);
          finish();
        }
      });
    }

    /* -------- DEPARTURE: sweep the curtain up on card click -------- */
    var cards = document.querySelectorAll('.disc[href][data-xt-c1]');
    Array.prototype.forEach.call(cards, function (card) {
      card.addEventListener('click', function (e) {
        // Let modified clicks (new tab, etc.) behave normally.
        if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();

        var href = card.getAttribute('href');
        var c1 = card.dataset.xtC1, c2 = card.dataset.xtC2, ink = card.dataset.xtInk;
        var titleNode = card.querySelector('.disc__name');
        var title = titleNode ? titleNode.textContent.trim() : '';

        if (reduce) { window.location.href = href; return; }

        // External links (the Photography gallery lives on Pixieset) just get
        // the cover sweep, then we leave — no "arrive covered" handoff, since
        // the destination isn't one of our pages.
        var external = /^https?:\/\//i.test(href);
        if (!external) {
          try {
            sessionStorage.setItem('pageTransition', JSON.stringify({ incoming: true, c1: c1, c2: c2 }));
          } catch (err) {}
        }

        setColors(c1, c2, ink);
        titleEl.textContent = title;
        root.classList.add('xt-leaving');
        path.setAttribute('d', EMPTY);

        gsapReady(function () {
          if (!window.gsap) { window.location.href = href; return; }

          var navigated = false;
          function go() { if (navigated) return; navigated = true; window.location.href = href; }

          gsap.set(label, { opacity: 0, y: 14 });

          if (hasMorph()) {
            gsap.timeline({ onComplete: function () { gsap.delayedCall(0.08, go); } })
              .to(path,  { duration: TOTAL * 0.5, morphSVG: WAVE, ease: 'power2.in' })
              .to(path,  { duration: TOTAL * 0.5, morphSVG: FULL, ease: 'power2.out' })
              .to(label, { duration: TOTAL * 0.5, opacity: 1, y: 0, ease: 'power2.out' }, '-=' + (TOTAL * 0.42));
          } else {
            path.setAttribute('d', FULL);
            gsap.to(label, { duration: 0.3, opacity: 1, y: 0, onComplete: function () { gsap.delayedCall(0.15, go); } });
          }

          // Safety net so navigation always happens.
          setTimeout(go, TOTAL * 1000 + 450);
        });
      });
    });
  });
})();
