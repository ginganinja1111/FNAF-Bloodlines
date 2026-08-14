// ---------- CLICK SOUND ----------
// Plays on any link click, site-wide. For links that open a NEW page in the
// same tab, we briefly delay the navigation — otherwise the browser unloads
// the page instantly and the sound never gets a chance to play. Links that
// open in a new tab (target="_blank") don't need this, since the current
// page never unloads.
//
// The delay is read from the sound file's own length (once its metadata
// loads) instead of a guessed number, so it plays essentially in full no
// matter how long the file is. MAX_NAV_DELAY_MS is just a safety ceiling in
// case metadata hasn't loaded yet by the time someone clicks.

const clickSound = new Audio('ClickSound.mp3');
const MAX_NAV_DELAY_MS = 1200;
let navDelayMs = 400; // fallback used only if a click happens before metadata loads

clickSound.addEventListener('loadedmetadata', () => {
  navDelayMs = Math.min(clickSound.duration * 1000, MAX_NAV_DELAY_MS);
});

document.querySelectorAll('a[href]').forEach(link => {
  link.addEventListener('click', (e) => {
    // Always play the sound from the start, even on rapid repeat clicks.
    clickSound.currentTime = 0;
    clickSound.play().catch(() => {}); // ignore if the browser blocks it for some reason

    const opensNewTab = link.target === '_blank';
    if (!opensNewTab) {
      e.preventDefault();
      setTimeout(() => {
        window.location.href = link.href;
      }, navDelayMs);
    }
  });
});

// ---------- TAB NAV (hover icon + side panel) ----------
// The icon is a 7-frame sprite sheet. Instead of relying on a GIF (which the
// browser plays on its own loop with no scripting access, and can't be
// reversed), we step through the frames ourselves with setInterval — forward
// on hover-in, backward on hover-out. That's what makes the reverse-on-leave
// behavior possible at all.

const tabNav = document.getElementById('tabNav');
const tabIcon = document.getElementById('tabIcon');

const FRAME_COUNT = 7;
const FRAME_MS = 45; // time between frame steps

let currentFrame = 0;
let frameTimer = null;

function setFrame(i) {
  currentFrame = Math.max(0, Math.min(FRAME_COUNT - 1, i));
  const percent = (currentFrame / (FRAME_COUNT - 1)) * 100;
  tabIcon.style.backgroundPosition = `${percent}% 0`;
}

function playTo(target) {
  clearInterval(frameTimer);
  const direction = target > currentFrame ? 1 : -1;
  frameTimer = setInterval(() => {
    if (currentFrame === target) {
      clearInterval(frameTimer);
      return;
    }
    setFrame(currentFrame + direction);
  }, FRAME_MS);
}

function openNav() {
  tabNav.classList.add('is-open');
  tabIcon.setAttribute('aria-expanded', 'true');
  playTo(FRAME_COUNT - 1);
}

function closeNav() {
  tabNav.classList.remove('is-open');
  tabIcon.setAttribute('aria-expanded', 'false');
  playTo(0);
}

tabNav.addEventListener('mouseenter', openNav);
tabNav.addEventListener('mouseleave', closeNav);

// Keyboard/touch users: toggle on click since there's no hover to rely on.
tabIcon.addEventListener('click', () => {
  tabNav.classList.contains('is-open') ? closeNav() : openNav();
});

setFrame(0);

// ---------- SCROLL CUE ARROW ----------
// Same sprite-sheet-stepping trick as the tab icon, but this one just loops
// continuously (no hover/reverse needed) to replace the old CSS pulse animation.

const scrollCueArrow = document.getElementById('scrollCueArrow');
const ARROW_FRAME_COUNT = 81;
const ARROW_FRAME_MS = 100; // matches the original animation's pace

if (scrollCueArrow) {
  let arrowFrame = 0;
  setInterval(() => {
    arrowFrame = (arrowFrame + 1) % ARROW_FRAME_COUNT;
    const percent = (arrowFrame / (ARROW_FRAME_COUNT - 1)) * 100;
    scrollCueArrow.style.backgroundPosition = `${percent}% 0`;
  }, ARROW_FRAME_MS);
}

// ---------- HERO FADE ----------
// As the user scrolls through the first viewport height, fade + lift the logo
// and fade out the scroll cue.

const heroInner = document.getElementById('hero');
const heroLogoWrap = document.querySelector('.hero-inner');
const scrollCue = document.querySelector('.scroll-cue');

function updateHero() {
  if (!heroLogoWrap || !scrollCue) return; // this page has no hero section (e.g. characters.html)

  const vh = window.innerHeight;
  const progress = Math.min(Math.max(window.scrollY / vh, 0), 1); // 0 -> 1 over first screen

  heroLogoWrap.style.opacity = 1 - progress;
  heroLogoWrap.style.transform = `translateY(${progress * -40}px) scale(${1 - progress * 0.08})`;

  scrollCue.style.opacity = 1 - progress * 2.5; // disappears faster than the logo
}

// ---------- REEL SCRUB ----------
// Each .reel wrapper is tall (e.g. 500vh) so there's room to scroll "through"
// it. While its sticky child is pinned, we map scroll progress across that
// wrapper directly onto its own video's timeline. A page can have any number
// of .reel sections stacked back to back (e.g. characters.html has several)
// — each one is tracked and updated independently.

function formatTime(t) {
  const m = Math.floor(t / 60).toString().padStart(2, '0');
  const s = (t % 60).toFixed(1).padStart(4, '0');
  return `${m}:${s}`;
}

const reels = Array.from(document.querySelectorAll('.reel')).map(reelEl => {
  const video = reelEl.querySelector('.reel-video');
  const hudTime = reelEl.querySelector('.hud-time'); // optional — not every reel has a HUD
  const captions = reelEl.querySelectorAll('.caption'); // optional — not every reel has captions

  // Auto-add a "not final" disclaimer to every reel's sticky container.
  // Done here (once, in JS) instead of hand-editing every .reel block in
  // HTML, so any new character reel added later gets it automatically.
  const sticky = reelEl.querySelector('.reel-sticky');
  if (sticky && !sticky.querySelector('.reel-disclaimer')) {
    const disclaimer = document.createElement('div');
    disclaimer.className = 'reel-disclaimer';
    disclaimer.textContent = 'Footage not final — subject to change';
    sticky.appendChild(disclaimer);
  }

  return { reelEl, video, hudTime, captions };
});

// ---------- iOS VIDEO UNLOCK ----------
// iOS Safari will not load or decode ANY video frame data — even with
// preload="auto" and muted set as HTML attributes — until a video has been
// explicitly started via .play() from inside a real user gesture. Our reels
// only ever set video.currentTime during scroll; we never call .play(), so
// iOS never gets that unlock signal and the videos simply never load at all.
//
// Fix: on the very first touch (or click, for iPads with trackpads/mice)
// anywhere on the page, quietly play-then-immediately-pause every reel video
// once. That one silent play() is enough to unlock each video for
// programmatic seeking for the rest of the session.

let iosVideosUnlocked = false;

function unlockVideosForIOS() {
  if (iosVideosUnlocked) return;
  iosVideosUnlocked = true;

  reels.forEach(({ video }) => {
    if (!video) return;
    video.muted = true; // belt-and-suspenders — iOS sometimes needs this set via JS, not just the HTML attribute
    const playPromise = video.play();
    if (playPromise && playPromise.then) {
      playPromise.then(() => video.pause()).catch(() => {});
    }
  });
}

document.addEventListener('touchstart', unlockVideosForIOS, { once: true, passive: true });
document.addEventListener('click', unlockVideosForIOS, { once: true });

function updateReels() {
  if (reels.length === 0) return; // this page has no scroll-scrubbed reel (e.g. episodes.html)

  const vh = window.innerHeight;
  let anyPinned = false;

  reels.forEach(state => {
    const { reelEl, video, hudTime, captions } = state;
    if (!video) return;

    const rect = reelEl.getBoundingClientRect();
    const scrollableDistance = reelEl.offsetHeight - vh;
    const scrolledIntoReel = -rect.top;

    const isPinned = scrolledIntoReel >= 0 && scrolledIntoReel <= scrollableDistance;
    if (isPinned) anyPinned = true;

    const progress = Math.min(Math.max(scrolledIntoReel / scrollableDistance, 0), 1);

    // Check the video's live readyState each frame instead of caching a
    // one-time 'loadedmetadata' event — for small/local files that event
    // can fire before this listener even finishes attaching, silently
    // freezing the scrub at 0:00 with no error.
    if (video.readyState >= 1) { // HAVE_METADATA or higher — duration is safe to read
      video.currentTime = progress * video.duration;
      if (hudTime) hudTime.textContent = formatTime(video.currentTime);
    }

    captions.forEach(caption => {
      const [start, end] = caption.dataset.range.split(',').map(Number);
      const isVisible = progress >= start && progress <= end;
      caption.classList.toggle('is-visible', isVisible);
    });
  });

  // Hide the tab nav while ANY reel is actively pinned on screen — covers
  // the HUD-overlap case on the homepage, and keeps things immersive on
  // pages with multiple stacked reels too.
  if (tabNav) {
    tabNav.classList.toggle('is-hidden', anyPinned);
  }
}

// ---------- SCROLL LOOP ----------
// Batch scroll updates into a single requestAnimationFrame per frame
// instead of running on every raw scroll event.

let ticking = false;

function onScroll() {
  if (!ticking) {
    requestAnimationFrame(() => {
      updateHero();
      updateReels();
      ticking = false;
    });
    ticking = true;
  }
}

window.addEventListener('scroll', onScroll);
window.addEventListener('resize', onScroll);

// Run once on load in case the page loads mid-scroll (e.g. refresh).
updateHero();
updateReels();

// ---------- EPISODE ROW ARROWS ----------
// Scrolls a Netflix-style card row by roughly 3 cards per click. Guarded so
// it's a no-op on any page that doesn't have a row (querySelectorAll just
// returns an empty list there).

document.querySelectorAll('.episode-row-wrap').forEach(wrap => {
  const row = wrap.querySelector('.episode-row');
  const leftBtn = wrap.querySelector('.row-arrow-left');
  const rightBtn = wrap.querySelector('.row-arrow-right');
  if (!row || !leftBtn || !rightBtn) return;

  const scrollAmount = () => row.clientWidth * 0.75;

  leftBtn.addEventListener('click', () => {
    row.scrollBy({ left: -scrollAmount(), behavior: 'smooth' });
  });
  rightBtn.addEventListener('click', () => {
    row.scrollBy({ left: scrollAmount(), behavior: 'smooth' });
  });
});

// ---------- VIDEO LIGHTBOX (Teaser/Update cards) ----------

const videoModal = document.getElementById('videoModal');

if (videoModal) {
  const modalFrame = document.getElementById('videoModalFrame');
  const modalBackdrop = document.getElementById('videoModalBackdrop');
  const modalClose = document.getElementById('videoModalClose');

  function openVideoModal(videoId) {
    modalFrame.innerHTML = `<iframe src="https://www.youtube.com/embed/${videoId}?autoplay=1" title="YouTube video player" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>`;
    videoModal.classList.add('is-open');
    videoModal.setAttribute('aria-hidden', 'false');
  }

  function closeVideoModal() {
    videoModal.classList.remove('is-open');
    videoModal.setAttribute('aria-hidden', 'true');
    modalFrame.innerHTML = ''; // clears the iframe so the video actually stops, not just hides
  }

  document.querySelectorAll('.video-card').forEach(card => {
    const videoId = card.dataset.videoId;
    card.addEventListener('click', () => openVideoModal(videoId));
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openVideoModal(videoId);
      }
    });
  });

  modalBackdrop.addEventListener('click', closeVideoModal);
  modalClose.addEventListener('click', closeVideoModal);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && videoModal.classList.contains('is-open')) closeVideoModal();
  });
}
