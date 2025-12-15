// ========== Debug (MOBILE system): press "D" to toggle ==========
(function () {
  const KEY = 'debug.v2';
  const root = document.documentElement;

  function isOn() { return root.getAttribute('data-debug') === '1'; }
  function set(on) {
    if (on) root.setAttribute('data-debug','1'); else root.removeAttribute('data-debug');
    localStorage.setItem(KEY, on ? '1' : '0');
    ensureLegend(on);
  }
  function ensureLegend(on) {
    let el = document.getElementById('debugLegend');
    if (!on) { if (el) el.remove(); return; }
    if (el) return;
    el = document.createElement('div');
    el.id = 'debugLegend';
    el.innerHTML = `
      <div class="row"><span class="sw blue"></span> Sections</div>
      <div class="row"><span class="sw green"></span> Containers / Cards</div>
      <div class="row"><span class="sw purple"></span> Measures / Gutters</div>
      <div class="row"><span class="sw orange"></span> Interactive</div>
      <div class="muted">Press “D” to toggle</div>
    `;
    document.body.appendChild(el);
  }

  // init from storage
  set(localStorage.getItem(KEY) === '1');

  // keyboard toggle
  document.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() !== 'd') return;
    set(!isOn());
  }, { passive: true });
})();

// ========== Viewport Mode Detection ==========
const VIEWPORT_BREAKPOINTS = {
  tablet: 768,
  desktop: 1024,
  largeDesktop: 1440
};

let currentViewportMode = '';

function resolveViewportMode(width) {
  if (width >= VIEWPORT_BREAKPOINTS.largeDesktop) return 'large-desktop';
  if (width >= VIEWPORT_BREAKPOINTS.desktop) return 'desktop';
  if (width >= VIEWPORT_BREAKPOINTS.tablet) return 'tablet';
  return 'mobile';
}

function applyViewportMode(mode) {
  if (!mode || mode === currentViewportMode) return;
  currentViewportMode = mode;
  if (document.body) {
    document.body.setAttribute('data-viewport', mode);
  }
  document.dispatchEvent(new CustomEvent('viewportchange', { detail: { viewport: mode } }));
}

function refreshViewportMode() {
  if (!document.body) return;
  const width = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
  applyViewportMode(resolveViewportMode(width));
}

window.addEventListener('resize', refreshViewportMode, { passive: true });
window.addEventListener('orientationchange', refreshViewportMode, { passive: true });

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', refreshViewportMode, { once: true });
}

refreshViewportMode();

// ========== Resume card text fitting ==========
(function () {
  const CARD_SELECTOR = '.resume-card';
  const LINE_SELECTOR = '.resume-card__line';

  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  function toNumber(value, fallback = 0) {
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function measureLineWidth(text, baseSize, style) {
    if (!context) return 0;
    const fontWeight = style.fontWeight || '400';
    const fontFamily = style.fontFamily || 'sans-serif';
    context.font = `${fontWeight} ${baseSize}px ${fontFamily}`;

    const letterSpacing = toNumber(style.letterSpacing);
    const spacingWidth = letterSpacing * Math.max(0, text.length - 1);
    return context.measureText(text).width + spacingWidth;
  }

  function fitLine(line, availableWidth) {
    const style = window.getComputedStyle(line);
    const baseSize = toNumber(style.fontSize);
    const minSize = toNumber(style.getPropertyValue('--resume-line-min-size'), baseSize);
    const maxSize = toNumber(style.getPropertyValue('--resume-line-max-size'), baseSize);
    const text = (line.textContent || '').trim();

    if (!baseSize || !text) return;

    const textWidth = measureLineWidth(text, baseSize, style);
    if (!textWidth || !availableWidth) return;

    const targetSize = Math.max(minSize, Math.min(maxSize, (availableWidth / textWidth) * baseSize));
    line.style.setProperty('--resume-line-size', `${targetSize}px`);
  }

  function fitCard(card) {
    const lines = card.querySelectorAll(LINE_SELECTOR);
    if (!lines.length) return;

    const styles = window.getComputedStyle(card);
    const paddingLeft = toNumber(styles.paddingLeft);
    const paddingRight = toNumber(styles.paddingRight);
    const availableWidth = card.clientWidth - paddingLeft - paddingRight;
    if (availableWidth <= 0) return;

    lines.forEach((line) => fitLine(line, availableWidth));
  }

  function initResumeCardFit() {
    const card = document.querySelector(CARD_SELECTOR);
    if (!card) return;

    const update = () => fitCard(card);
    update();

    const observer = new ResizeObserver(update);
    observer.observe(card);

    window.addEventListener('resize', update, { passive: true });
    document.addEventListener('viewportchange', update, { passive: true });
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(update).catch(() => {});
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initResumeCardFit, { once: true });
  } else {
    initResumeCardFit();
  }
})();

// ========== Timeline date width sync ==========
(function () {
  const TIMELINE_SELECTOR = '.section--timeline';
  const FIRST_DATE_SELECTOR = '.timeline-item:first-child .timeline-column--date';
  let rafId = 0;

  function measureAndApply() {
    rafId = 0;
    const timeline = document.querySelector(TIMELINE_SELECTOR);
    if (!timeline) return;
    const firstDateColumn = timeline.querySelector(FIRST_DATE_SELECTOR);
    if (!firstDateColumn) return;
    const width = firstDateColumn.getBoundingClientRect().width;
    if (!width) {
      timeline.style.removeProperty('--timeline-date-col');
      return;
    }
    timeline.style.setProperty('--timeline-date-col', `${width}px`);
  }

  function scheduleMeasurement() {
    if (rafId) return;
    rafId = window.requestAnimationFrame(measureAndApply);
  }

  function initTimelineWidthSync() {
    scheduleMeasurement();
    window.addEventListener('resize', scheduleMeasurement, { passive: true });
    document.addEventListener('viewportchange', scheduleMeasurement, { passive: true });
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(scheduleMeasurement).catch(() => {});
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTimelineWidthSync, { once: true });
  } else {
    initTimelineWidthSync();
  }
})();

// ========== Theme Handling (Light/Dark toggle only) ==========
const root = document.documentElement;
const toggle = document.getElementById('themeToggle');
const footerLogo = document.getElementById('footerLogo');
const trademarkLogo = document.getElementById('trademarkLogo');
const THEME_KEY = 'theme-mode';

function updateFooterLogo(mode) {
  if (!footerLogo) return;
  footerLogo.src = mode === 'dark' ? 'logo-white.svg' : 'logo-black.svg';
}

function updateTrademarkLogo(mode) {
  if (!trademarkLogo) return;
  const lightSrc = trademarkLogo.dataset.lightSrc || trademarkLogo.getAttribute('src');
  const darkSrc = trademarkLogo.dataset.darkSrc || lightSrc;
  const nextSrc = mode === 'dark' ? darkSrc : lightSrc;
  if (nextSrc && trademarkLogo.getAttribute('src') !== nextSrc) {
    trademarkLogo.setAttribute('src', nextSrc);
  }
}

function updateContactIcons(mode) {
  const icons = document.querySelectorAll('.contact-icon');
  icons.forEach((icon) => {
    const lightSrc = icon.dataset.lightSrc || icon.getAttribute('src');
    const darkSrc = icon.dataset.darkSrc || lightSrc;
    const nextSrc = mode === 'dark' ? darkSrc : lightSrc;
    if (nextSrc && icon.getAttribute('src') !== nextSrc) {
      icon.setAttribute('src', nextSrc);
    }
  });
}

// Detect system preference once (used if no saved choice)
const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

function applyTheme(mode) {
  root.setAttribute('data-theme', mode);
  if (toggle) toggle.textContent = mode.charAt(0).toUpperCase() + mode.slice(1);
  updateFooterLogo(mode);
  updateTrademarkLogo(mode);
  updateContactIcons(mode);
}
function getCurrentTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === 'light' || saved === 'dark') return saved;
  return systemPrefersDark ? 'dark' : 'light';
}
function toggleTheme() {
  const current = getCurrentTheme();
  const next = current === 'light' ? 'dark' : 'light';
  localStorage.setItem(THEME_KEY, next);
  applyTheme(next);
  document.dispatchEvent(new CustomEvent('themechange', { detail: { theme: next } }));
}
if (toggle) {
  toggle.addEventListener('click', toggleTheme);
  applyTheme(getCurrentTheme());
} else {
  applyTheme(getCurrentTheme());
}

function initMasterIconSelection() {
  const masterIconButtons = Array.from(document.querySelectorAll('.master-icons .contact-icon-link'));
  if (!masterIconButtons.length) return;

  let activeButton = masterIconButtons.find((button) => button.classList.contains('is-active')) || null;

  masterIconButtons.forEach((button) => {
    button.setAttribute('aria-pressed', button === activeButton ? 'true' : 'false');
    button.addEventListener('click', () => {
      if (activeButton === button) return;

      if (activeButton) {
        activeButton.classList.remove('is-active');
        activeButton.setAttribute('aria-pressed', 'false');
      }

      button.classList.add('is-active');
      button.setAttribute('aria-pressed', 'true');
      activeButton = button;
    });
  });
}

initMasterIconSelection();

// ========== Placeholder Mounts ==========
function mountAnimationDemo() {
  const container = document.getElementById('animationContainer');
  if (!container || typeof Matter === 'undefined') return;

  const { Engine, Render, Runner, Bodies, Composite, Mouse, MouseConstraint, Events, Body } = Matter;

  container.innerHTML = '';

  let width = container.clientWidth || container.offsetWidth || 640;
  let height = container.clientHeight || container.offsetHeight || 400;

  const engine = Engine.create();
  const world = engine.world;
  world.gravity.y = 0.5;

  function getStrokeColor() {
    const value = getComputedStyle(container).getPropertyValue('--shape-stroke') || '';
    const trimmed = value.trim();
    return trimmed || '#000';
  }

  function updateDebugInfo() {
    const ratio = window.devicePixelRatio || 1;
    const bodies = Composite.allBodies(world).length;
    const debugLabel = [
      `stage: ${Math.round(width)} × ${Math.round(height)} px`,
      `pixelRatio: ${ratio.toFixed(2)}`,
      `bodies: ${bodies}`
    ].join('\n');
    container.setAttribute('data-debug-info', debugLabel);
  }

  const render = Render.create({
    element: container,
    engine,
    options: {
      width,
      height,
      wireframes: false,
      background: 'transparent',
      pixelRatio: window.devicePixelRatio || 1
    }
  });

  Render.run(render);
  const runner = Runner.create();
  Runner.run(runner, engine);

  const overlay = document.createElement('div');
  overlay.className = 'animation-overlay';
  overlay.setAttribute('aria-hidden', 'true');
  container.appendChild(overlay);

  const wallOptions = { isStatic: true, render: { fillStyle: 'transparent' } };
  let ground;
  let ceiling;
  let leftWall;
  let rightWall;

  function addBounds() {
    ground = Bodies.rectangle(width / 2, height + 25, width, 50, wallOptions);
    ceiling = Bodies.rectangle(width / 2, -25, width, 50, wallOptions);
    leftWall = Bodies.rectangle(-25, height / 2, 50, height, wallOptions);
    rightWall = Bodies.rectangle(width + 25, height / 2, 50, height, wallOptions);
    Composite.add(world, [ground, ceiling, leftWall, rightWall]);
    updateDebugInfo();
  }

  addBounds();

  const shapeData = [
    { text: 'PAID SOCIAL' },
    { text: 'PAID DISPLAY' },
    { text: 'OPTIMIZATION' },
    { text: 'STRATEGY' },
    { text: 'B2B & B2C' },
    { text: 'GO-TO-MARKET' }
  ];

  const imageData = [
    {
      src: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iNTAiIGN5PSI1MCIgcj0iNTAiIGZpbGw9IiMwMDAwRkYiLz48cGF0aCBkPSJNMjAgNzVMMjAgMjVNMjAgNzVMODAgNzVNMzUgNjBMMzUgNDBNNTAgNjBMNTAgMzBNNjUgNjBMNjUgNDUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMyIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+PGNpcmNsZSBjeD0iMzUiIGN5PSI0MCIgcj0iNCIgZmlsbD0id2hpdGUiLz48Y2lyY2xlIGN4PSI1MCIgY3k9IjMwIiByPSI0IiBmaWxsPSJ3aGl0ZSIvPjxjaXJjbGUgY3g9IjY1IiBjeT0iNDUiIHI9IjQiIGZpbGw9IndoaXRlIi8+PHBhdGggZD0iTTM1IDQwTDUwIDMwTTUwIDMwTDY1IDQ1IiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjIiLz48Y2lyY2xlIGN4PSI1NSIgY3k9IjQ1IiByPSIxMiIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIzIiBmaWxsPSJub25lIi8+PHBhdGggZD0iTTYzIDM4TDcyIDI5TTcyIDI5TDc1IDMyTTcyIDI5TDY5IDI2IiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjMiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPjwvc3ZnPg==',
      width: 60,
      height: 60
    },
    {
      src: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iNTAiIGN5PSI1MCIgcj0iNTAiIGZpbGw9IiMwMDAwRkYiLz48cGF0aCBkPSJNNTAgMjVWMzBNMzAgMzBMMzQgMzRNNzAgMzBMNjYgMzRNMjUgNTBIMzBNNzAgNTBINzUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMyIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+PHBhdGggZD0iTTQwIDQ1QzQwIDM5LjQ3NzIgNDQuNDc3MiAzNSA1MCAzNUM1NS41MjI4IDM1IDYwIDM5LjQ3NzIgNjAgNDVDNjAgNDguNSA1OCA1Mi41IDU1IDU1SDQ1QzQyIDUyLjUgNDAgNDguNSA0MCA0NVoiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMyIgZmlsbD0ibm9uZSIvPjxwYXRoIGQ9Ik00NSA1NUg1NU00MyA2MEg1N000NSA2NUg1NSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIzIiBzdHJva2UtbGluZWNhcD0icm91bmQiLz48cGF0aCBkPSJNNDcgNDJMNTMgNDgiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMi41IiBzdHJva2UtbGluZWNhcD0icm91bmQiLz48L3N2Zz4=',
      width: 60,
      height: 60
    },
    {
      src: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iNTAiIGN5PSI1MCIgcj0iNTAiIGZpbGw9IiMwMDAwRkYiLz48cGF0aCBkPSJNNTAgMjBDNDUgMjUgNDAgMzUgNDAgNDVDNDAgNTUgNDUgNjAgNTAgNjVDNTUgNjAgNjAgNTUgNjAgNDVDNjAgMzUgNTUgMjUgNTAgMjBaIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjMiIGZpbGw9Im5vbmUiLz48Y2lyY2xlIGN4PSI1MCIgY3k9IjM1IiByPSI1IiBmaWxsPSJ3aGl0ZSIvPjxwYXRoIGQ9Ik40MCA0NUwzNSA1NUwzOCA1NVoiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMyIgZmlsbD0ibm9uZSIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPjxwYXRoIGQ9Ik02MCA0NUw2NSA1NUw2MiA1NVoiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMyIgZmlsbD0ibm9uZSIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPjxwYXRoIGQ9Ik00NSA2NUw0MCA3MEM0MCA3NSA0NSA3OCA1MCA3OEM1NSA3OCA2MCA3NSA2MCA3MEw1NSA2NSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIzIiBmaWxsPSJub25lIi8+PHBhdGggZD0iTTQ1IDY1SDU1IiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjMiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPjxwYXRoIGQ9Ik0zNSA3MEMzMiA3MiAzMCA3NSAzMiA3N0MzNCA3OSAzNyA3NyA0MCA3NSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIGZpbGw9Im5vbmUiLz48cGF0aCBkPSJNNjUgNzBDNjggNzIgNzAgNzUgNjggNzdDNjYgNzkgNjMgNzcgNjAgNzUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBmaWxsPSJub25lIi8+PHBhdGggZD0iTTQ1IDcyTDQ3IDc1TTUwIDcyTDUwIDc2TTU1IDcyTDUzIDc1IiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPjwvc3ZnPg==',
      width: 60,
      height: 60
    }
  ];

  const shapes = [];
  const labels = [];
  const images = [];

  function getTextWidth(text) {
    return text.length * 10 + 40;
  }

  const spawnBand = Math.min(height * 0.35, 180);
  const spawnOffset = 80;

  shapeData.forEach((data, i) => {
    const x = Math.random() * (width - 200) + 100;
    const y = Math.random() * spawnBand + spawnOffset;
    const w = getTextWidth(data.text);
    const h = 50;
    const cornerRadius = [0, 5, 10, 15, 20, 25][Math.floor(Math.random() * 6)];

    const shape = Bodies.rectangle(x, y, w, h, {
      chamfer: { radius: cornerRadius },
      restitution: 0.9,
      friction: 0.1,
      density: 0.001,
      render: {
        fillStyle: 'transparent',
        strokeStyle: getStrokeColor(),
        lineWidth: 2
      }
    });

    const label = document.createElement('div');
    label.className = 'shape-label';
    label.textContent = data.text;
    overlay.appendChild(label);
    labels.push(label);

    shapes.push(shape);
    Composite.add(world, shape);
  });

  imageData.forEach((data, i) => {
    const x = Math.random() * (width - 200) + 100;
    const y = Math.random() * spawnBand + spawnOffset;

    const shape = Bodies.rectangle(x, y, data.width, data.height, {
      chamfer: { radius: data.height / 2 },
      restitution: 0.9,
      friction: 0.1,
      density: 0.001,
      render: { fillStyle: 'transparent', strokeStyle: 'transparent', lineWidth: 0 }
    });

    const img = document.createElement('img');
    img.className = 'shape-image';
    img.src = data.src;
    img.alt = '';
    img.width = data.width;
    img.height = data.height;
    img.style.width = data.width + 'px';
    img.style.height = data.height + 'px';
    overlay.appendChild(img);
    images.push(img);

    shapes.push(shape);
    Composite.add(world, shape);
  });

  function updateShapeStrokes() {
    const color = getStrokeColor();
    shapes.forEach((shape) => {
      if (shape.render && shape.render.lineWidth > 0) {
        shape.render.strokeStyle = color;
      }
    });
  }

  updateShapeStrokes();
  updateDebugInfo();

  const mouse = Mouse.create(render.canvas);
  const mouseConstraint = MouseConstraint.create(engine, {
    mouse,
    constraint: { stiffness: 0.2, render: { visible: false } }
  });
  Composite.add(world, mouseConstraint);
  render.mouse = mouse;

  Events.on(mouseConstraint, 'mousemove', (event) => {
    const mousePos = event.mouse.position;
    shapes.forEach((shape) => {
      const dx = shape.position.x - mousePos.x;
      const dy = shape.position.y - mousePos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < 150) {
        const force = 0.008;
        const randomForce = { x: (Math.random() - 0.5) * force, y: (Math.random() - 0.5) * force };
        Body.applyForce(shape, shape.position, randomForce);
        Body.setAngularVelocity(shape, shape.angularVelocity + (Math.random() - 0.5) * 0.3);
      }
    });
  });

  const updateOverlays = () => {
    for (let i = 0; i < shapeData.length; i++) {
      const label = labels[i];
      const shape = shapes[i];
      label.style.left = shape.position.x + 'px';
      label.style.top = shape.position.y + 'px';
      label.style.transform = `translate(-50%, -50%) rotate(${shape.angle}rad)`;
    }
    for (let i = 0; i < imageData.length; i++) {
      const img = images[i];
      const shape = shapes[shapeData.length + i];
      img.style.left = shape.position.x + 'px';
      img.style.top = shape.position.y + 'px';
      img.style.transform = `translate(-50%, -50%) rotate(${shape.angle}rad)`;
    }
  };

  Events.on(engine, 'afterUpdate', updateOverlays);
  updateOverlays();
  updateDebugInfo();

  const handleThemeChange = () => {
    updateShapeStrokes();
  };
  document.addEventListener('themechange', handleThemeChange);

  const resizeHandler = () => {
    width = container.clientWidth || container.offsetWidth || width;
    height = container.clientHeight || container.offsetHeight || height;

    render.bounds.max.x = width;
    render.bounds.max.y = height;
    render.options.width = width;
    render.options.height = height;
    render.canvas.width = width;
    render.canvas.height = height;

    [ground, ceiling, leftWall, rightWall].forEach((body) => {
      if (body) Composite.remove(world, body);
    });

    addBounds();
    updateDebugInfo();
  };

  window.addEventListener('resize', resizeHandler, { passive: true });

  if (mouse.element) {
    mouse.element.removeEventListener('mousewheel', mouse.mousewheel);
    mouse.element.removeEventListener('DOMMouseScroll', mouse.mousewheel);
  }
}
function mountExperienceDemo() {
  const el = document.getElementById('experienceMount');
  if (!el) return;
  el.innerHTML = `
    <div class="experience-stack">
      <div class="custom-mount">
        <div class="experience-entry">
          <div class="experience-entry__company company">AMAZON</div>
          <div class="experience-entry__title title">Senior Product Marketing Manager, US Prime Paid Media</div>
          <div class="experience-entry__date date">2023 - Current</div>
          <div class="experience-entry__title title">Product Marketing Manager, US Prime Paid Media</div>
          <div class="experience-entry__date date">2023 - 2024</div>
          <div class="experience-entry__summary">MORE ➤</div>
          <div class="experience-entry__title title">Product Marketing Manager, Prime Access</div>
          <div class="experience-entry__date date">2022 - 2023</div>
          <div class="experience-entry__summary">MORE ➤</div>
        </div>
      </div>
      <div class="custom-mount">
        <div class="experience-entry">
          <div class="experience-entry__company company">THE WALL STREET JOURNAL</div>
          <div class="experience-entry__title title">
            Product &amp; Brand<wbr> <span class="no-wrap">Marketing Manager</span>
          </div>
          <div class="experience-entry__date date">2020 - 2022</div>
          <div class="experience-entry__summary">MORE ➤</div>
          <div class="experience-entry__title title">Growth Marketing Manager</div>
          <div class="experience-entry__date date">2019 - 2020</div>
          <div class="experience-entry__summary">MORE ➤</div>
        </div>
      </div>
      <div class="custom-mount">
        <div class="experience-entry">
          <div class="experience-entry__company company">THOMAS</div>
          <div class="experience-entry__title title">
            Team Lead,<wbr> <span class="no-wrap">Digital Marketing Strategy</span>
          </div>
          <div class="experience-entry__date date">2018 - 2019</div>
          <div class="experience-entry__summary">MORE ➤</div>
          <div class="experience-entry__title title">Digital Marketing Strategist</div>
          <div class="experience-entry__date date">2016 - 2018</div>
          <div class="experience-entry__summary">MORE ➤</div>
          <div class="experience-entry__title title">Junior Digital Marketing Strategist</div>
          <div class="experience-entry__date date">2015 - 2016</div>
          <div class="experience-entry__summary">MORE ➤</div>
        </div>
      </div>
      <div class="custom-mount">
        <div class="experience-entry">
          <div class="experience-entry__company company">EARLY CAREER</div>
          <div class="experience-entry__title title">Editorial Content Analyst</div>
          <div class="experience-entry__date date">Thomas | 2013 - 2015</div>
          <div class="experience-entry__summary">MORE ➤</div>
          <div class="experience-entry__title title">Copywriter</div>
          <div class="experience-entry__date date">Trusty Tails Pet Care | 2013 - 2015</div>
          <div class="experience-entry__summary">MORE ➤</div>
        </div>
      </div>
    </div>
  `;
}

// ========== Header text fitting (fills target width) ==========
(function fitHeader() {
  const measureEl = document.querySelector('#header .header-measure');
  const textEl = document.getElementById('headerText');
  if (!measureEl || !textEl) return;

  const words = Array.from(textEl.querySelectorAll('.header-text__word'));
  if (words.length === 0) return;

  function targetWidth() { return measureEl.clientWidth; }

  function fitWord(word, maxWidth) {
    word.style.fontSize = '50px';
    word.style.display = 'inline-block';
    word.style.whiteSpace = 'nowrap';
    word.style.width = 'auto';

    let low = 6, high = 2400;
    for (let i = 0; i < 22; i++) {
      const mid = (low + high) / 2;
      word.style.fontSize = mid + 'px';
      const w = word.scrollWidth;
      if (w > maxWidth) high = mid; else low = mid;
    }

    word.style.fontSize = (low - 0.5) + 'px';
    word.style.display = 'block';
    word.style.whiteSpace = '';
    word.style.width = '100%';
  }

  function fit() {
    const maxW = targetWidth();
    if (maxW <= 0) return;

    const viewport = document.body ? document.body.getAttribute('data-viewport') : '';
    if (viewport === 'mobile') {
      textEl.style.whiteSpace = '';
      textEl.style.display = '';
      textEl.style.width = '';
      textEl.style.fontSize = '';

      words.forEach(word => {
        word.style.fontSize = '';
        word.style.display = '';
        word.style.whiteSpace = '';
        word.style.width = '';
        fitWord(word, maxW);
      });
    } else {
      words.forEach(word => {
        word.style.fontSize = '';
        word.style.display = '';
        word.style.whiteSpace = '';
        word.style.width = '';
      });

      textEl.style.whiteSpace = 'nowrap';
      textEl.style.display = 'inline-block';
      textEl.style.width = 'auto';

      textEl.style.fontSize = '50px';
      let low = 6, high = 2400;
      for (let i = 0; i < 22; i++) {
        const mid = (low + high) / 2;
        textEl.style.fontSize = mid + 'px';
        const w = textEl.scrollWidth;
        if (w > maxW) high = mid; else low = mid;
      }
      textEl.style.fontSize = (low - 0.5) + 'px';
    }
  }

  if ('ResizeObserver' in window) {
    const ro = new ResizeObserver(fit);
    ro.observe(measureEl);
  } else {
    window.addEventListener('resize', fit, { passive: true });
  }

  document.addEventListener('viewportchange', fit, { passive: true });

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(fit);
  } else {
    setTimeout(fit, 0);
  }

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) fit();
  });

  fit();
})();

// ========== Subhead: line-by-line text fitting within the box ==========
(function fitSubhead() {
  const box = document.querySelector('#subhead .subhead-box');
  const lines = document.querySelectorAll('#subhead .subhead-line');
  if (!box || lines.length === 0) return;

  function paddingX(el) {
    const cs = getComputedStyle(el);
    return (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0);
  }

  function fitLine(line, maxWidth) {
    line.style.display = 'inline-block';
    line.style.whiteSpace = 'nowrap';

    let low = 6, high = 320; // safe bounds for subhead
    for (let i = 0; i < 18; i++) {
      const mid = (low + high) / 2;
      line.style.fontSize = mid + 'px';
      const w = line.scrollWidth;
      if (w > maxWidth) high = mid; else low = mid;
    }
    line.style.fontSize = (low - 0.5) + 'px';
  }

  function fitAll() {
    const maxW = box.clientWidth - paddingX(box);
    if (maxW <= 0) return;
    lines.forEach(line => fitLine(line, maxW));
  }

  if ('ResizeObserver' in window) {
    const ro = new ResizeObserver(fitAll);
    ro.observe(box);
  } else {
    window.addEventListener('resize', fitAll, { passive: true });
  }

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(fitAll);
  } else {
    setTimeout(fitAll, 0);
  }

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) fitAll();
  });

  fitAll();
})();

// ========== Mount demos on DOM ready ==========
document.addEventListener('DOMContentLoaded', () => {
  mountAnimationDemo();
  mountExperienceDemo();

  // Make the SUBHEAD ARROW act as the theme toggle (click/keyboard)
  const arrow = document.querySelector('#subhead .subhead-arrow');
  if (arrow) {
    arrow.setAttribute('role', 'button');
    arrow.setAttribute('tabindex', '0');
    arrow.setAttribute('aria-label', 'Toggle theme (Light/Dark)');
    arrow.addEventListener('click', toggleTheme);
    arrow.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleTheme();
      }
    });
  }
});
