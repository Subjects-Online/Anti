/* ============================================================
   MAIN.JS — Full Animation Engine
   GSAP + ScrollTrigger + Three.js + Lenis + SplitType
   ============================================================ */

(() => {
  /* ── Register GSAP plugins ───────────────────── */
  gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);

  /* ── Lenis Smooth Scroll ─────────────────────── */
  const lenis = new Lenis({
    duration: 1.4,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    direction: 'vertical',
    smoothWheel: true,
  });

  function rafLoop(time) {
    lenis.raf(time);
    requestAnimationFrame(rafLoop);
  }
  requestAnimationFrame(rafLoop);

  // Sync GSAP ScrollTrigger with Lenis
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.lagSmoothing(0);

  /* ════════════════════════════════════════════════
     1. CUSTOM CURSOR
  ════════════════════════════════════════════════ */
  const cursor   = document.getElementById('cursor');
  const follower = document.getElementById('cursor-follower');
  let mouseX = 0, mouseY = 0;
  let followerX = 0, followerY = 0;

  document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX; mouseY = e.clientY;
    gsap.to(cursor, { x: mouseX, y: mouseY, duration: 0.08, ease: 'power2.out' });
  });

  function animateFollower() {
    followerX += (mouseX - followerX) * 0.1;
    followerY += (mouseY - followerY) * 0.1;
    gsap.set(follower, { x: followerX, y: followerY });
    requestAnimationFrame(animateFollower);
  }
  animateFollower();

  // Hover interactions
  document.querySelectorAll('a, button, .skill-card, .project-card, .magnetic').forEach((el) => {
    el.addEventListener('mouseenter', () => {
      cursor.classList.add('hovered');
      follower.classList.add('hovered');
    });
    el.addEventListener('mouseleave', () => {
      cursor.classList.remove('hovered');
      follower.classList.remove('hovered');
    });
  });

  /* ════════════════════════════════════════════════
     2. MAGNETIC BUTTONS
  ════════════════════════════════════════════════ */
  document.querySelectorAll('.magnetic').forEach((el) => {
    el.addEventListener('mousemove', (e) => {
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = (e.clientX - cx) * 0.35;
      const dy = (e.clientY - cy) * 0.35;
      gsap.to(el, { x: dx, y: dy, duration: 0.4, ease: 'power2.out' });
    });
    el.addEventListener('mouseleave', () => {
      gsap.to(el, { x: 0, y: 0, duration: 0.7, ease: 'elastic.out(1, 0.4)' });
    });
  });

  /* ════════════════════════════════════════════════
     3. THREE.JS HERO CANVAS — PARTICLE FIELD
  ════════════════════════════════════════════════ */
  (() => {
    const canvas = document.getElementById('hero-canvas');
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 5;

    /* ── Particles ── */
    const PARTICLE_COUNT = 3000;
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const colors    = new Float32Array(PARTICLE_COUNT * 3);
    const sizes     = new Float32Array(PARTICLE_COUNT);

    const colorPalette = [
      new THREE.Color('#7c3aed'),
      new THREE.Color('#06b6d4'),
      new THREE.Color('#a78bfa'),
      new THREE.Color('#38bdf8'),
      new THREE.Color('#ffffff'),
    ];

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;
      positions[i3]     = (Math.random() - 0.5) * 18;
      positions[i3 + 1] = (Math.random() - 0.5) * 12;
      positions[i3 + 2] = (Math.random() - 0.5) * 8;

      const c = colorPalette[Math.floor(Math.random() * colorPalette.length)];
      colors[i3] = c.r; colors[i3+1] = c.g; colors[i3+2] = c.b;
      sizes[i] = Math.random() * 2.5 + 0.5;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color',    new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('size',     new THREE.BufferAttribute(sizes, 1));

    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uTime:   { value: 0 },
        uMouse:  { value: new THREE.Vector2(0, 0) },
        uPixelRatio: { value: renderer.getPixelRatio() },
      },
      vertexShader: `
        attribute float size;
        attribute vec3 color;
        varying vec3 vColor;
        uniform float uTime;
        uniform vec2 uMouse;
        uniform float uPixelRatio;
        void main() {
          vColor = color;
          vec3 pos = position;
          float dist = distance(pos.xy, uMouse * vec2(9.0, 6.0));
          float repel = smoothstep(2.5, 0.0, dist);
          vec2 dir = normalize(pos.xy - uMouse * vec2(9.0, 6.0) + 0.001);
          pos.xy += dir * repel * 0.8;
          pos.y += sin(uTime * 0.3 + pos.x * 0.4) * 0.08;
          pos.x += cos(uTime * 0.2 + pos.z * 0.3) * 0.05;
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = size * uPixelRatio * (280.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        void main() {
          vec2 uv = gl_PointCoord - 0.5;
          float d = length(uv);
          if (d > 0.5) discard;
          float alpha = 1.0 - smoothstep(0.2, 0.5, d);
          gl_FragColor = vec4(vColor, alpha * 0.75);
        }
      `,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, vertexColors: true,
    });

    const particles = new THREE.Points(geo, mat);
    scene.add(particles);

    // Mouse tracking for particle repulsion
    let targetMX = 0, targetMY = 0;
    document.addEventListener('mousemove', (e) => {
      targetMX = (e.clientX / window.innerWidth)  * 2 - 1;
      targetMY = -(e.clientY / window.innerHeight) * 2 + 1;
    });

    let clock = new THREE.Clock();
    function render() {
      const elapsed = clock.getElapsedTime();
      mat.uniforms.uTime.value = elapsed;

      // Smooth mouse follow
      mat.uniforms.uMouse.value.x += (targetMX - mat.uniforms.uMouse.value.x) * 0.05;
      mat.uniforms.uMouse.value.y += (targetMY - mat.uniforms.uMouse.value.y) * 0.05;

      particles.rotation.y = elapsed * 0.04;
      particles.rotation.x = elapsed * 0.015;

      renderer.render(scene, camera);
      requestAnimationFrame(render);
    }
    render();

    // Resize
    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });
  })();

  /* ════════════════════════════════════════════════
     4. NAV SCROLL EFFECT
  ════════════════════════════════════════════════ */
  const nav = document.getElementById('nav');
  ScrollTrigger.create({
    start: 'top -80',
    onUpdate: (self) => {
      nav.classList.toggle('scrolled', self.scroll() > 80);
    },
  });

  /* ════════════════════════════════════════════════
     5. HERO ENTRANCE ANIMATION
  ════════════════════════════════════════════════ */
  const heroTl = gsap.timeline({ delay: 0.3 });
  heroTl
    .to('.hero__label', { opacity: 1, duration: 1, ease: 'power2.out' })
    .to('.line', {
      y: '0%', duration: 1.1, ease: 'power4.out', stagger: 0.12,
    }, '-=0.7')
    .to('.hero__sub',     { opacity: 1, y: 0, duration: 0.9, ease: 'power2.out' }, '-=0.6')
    .to('.hero__actions', { opacity: 1, y: 0, duration: 0.9, ease: 'power2.out' }, '-=0.7')
    .to('.hero__stats',   { opacity: 1, y: 0, duration: 0.9, ease: 'power2.out' }, '-=0.7')
    .to('.hero__scroll-hint', { opacity: 1, duration: 0.8 }, '-=0.4');

  /* ── Counter animation ── */
  document.querySelectorAll('.stat__num').forEach((el) => {
    const target = parseInt(el.dataset.target);
    gsap.to(el, {
      innerText: target,
      duration: 2,
      delay: 1.5,
      ease: 'power2.out',
      snap: { innerText: 1 },
      onUpdate() { el.innerText = Math.round(parseFloat(el.innerText)); },
    });
  });

  /* ════════════════════════════════════════════════
     6. SPLIT TEXT ANIMATIONS
  ════════════════════════════════════════════════ */
  document.querySelectorAll('.split-text').forEach((el) => {
    const split = new SplitType(el, { types: 'words,chars' });
    gsap.set(split.chars, { opacity: 0, y: 30, rotateX: -40 });
    ScrollTrigger.create({
      trigger: el,
      start: 'top 85%',
      onEnter: () => {
        gsap.to(split.chars, {
          opacity: 1, y: 0, rotateX: 0,
          duration: 0.7, ease: 'back.out(1.4)',
          stagger: 0.025,
        });
      },
    });
  });

  /* ════════════════════════════════════════════════
     7. REVEAL ANIMATIONS
  ════════════════════════════════════════════════ */
  gsap.utils.toArray('.reveal-up').forEach((el) => {
    gsap.to(el, {
      opacity: 1, y: 0, duration: 1, ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 88%' },
    });
  });

  gsap.utils.toArray('.reveal-scale').forEach((el) => {
    gsap.to(el, {
      opacity: 1, scale: 1, duration: 1.2, ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 82%' },
    });
  });

  /* ════════════════════════════════════════════════
     8. ABOUT — CIRCULAR TEXT ROTATION
  ════════════════════════════════════════════════ */
  // Already done via CSS animation

  /* ════════════════════════════════════════════════
     9. SKILLS — PROGRESS BAR FILL ON SCROLL
  ════════════════════════════════════════════════ */
  document.querySelectorAll('.skill-card').forEach((card, i) => {
    const fill  = card.querySelector('.skill-card__fill');
    const width = fill.dataset.width;

    gsap.set(card, { opacity: 0, y: 50 });

    ScrollTrigger.create({
      trigger: card,
      start: 'top 88%',
      onEnter: () => {
        gsap.to(card, { opacity: 1, y: 0, duration: 0.7, delay: i * 0.1, ease: 'power3.out' });
        gsap.to(fill, {
          width: width + '%',
          duration: 1.4, delay: i * 0.1 + 0.3,
          ease: 'power2.out',
        });
      },
    });
  });

  /* ════════════════════════════════════════════════
     10. PROJECTS — HORIZONTAL SCROLL DRAG
  ════════════════════════════════════════════════ */
  (() => {
    const track = document.querySelector('.projects__track');
    let isDown = false, startX = 0, scrollLeft = 0;
    const container = document.querySelector('.projects__horizontal');

    container.style.overflowX = 'scroll';
    container.style.cursor = 'grab';

    // GSAP horizontal scroll on mouse wheel
    container.addEventListener('wheel', (e) => {
      e.preventDefault();
      container.scrollLeft += e.deltaY * 1.5;
    }, { passive: false });

    // Drag
    container.addEventListener('mousedown', (e) => {
      isDown = true; startX = e.pageX - container.offsetLeft;
      scrollLeft = container.scrollLeft; container.style.cursor = 'grabbing';
    });
    container.addEventListener('mouseleave', () => { isDown = false; container.style.cursor = 'grab'; });
    container.addEventListener('mouseup',    () => { isDown = false; container.style.cursor = 'grab'; });
    container.addEventListener('mousemove',  (e) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - container.offsetLeft;
      const walk = (x - startX) * 2;
      container.scrollLeft = scrollLeft - walk;
    });

    // ScrollTrigger slide-in for cards
    gsap.utils.toArray('.project-card').forEach((card, i) => {
      gsap.from(card, {
        opacity: 0, x: 60, duration: 0.9, ease: 'power3.out',
        scrollTrigger: { trigger: card, start: 'top 90%', containerAnimation: undefined },
        delay: i * 0.1,
      });
    });
  })();

  /* ════════════════════════════════════════════════
     11. PARALLAX — HERO TITLE ON SCROLL
  ════════════════════════════════════════════════ */
  gsap.to('.hero__content', {
    y: -120,
    ease: 'none',
    scrollTrigger: {
      trigger: '.hero',
      start: 'top top',
      end: 'bottom top',
      scrub: true,
    },
  });

  /* ════════════════════════════════════════════════
     12. CONTACT FORM — SEND ANIMATION
  ════════════════════════════════════════════════ */
  const form = document.getElementById('contact-form');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const btn = form.querySelector('button');
      gsap.to(btn, {
        scale: 0.95, duration: 0.1, ease: 'power2.in', yoyo: true, repeat: 1,
        onComplete: () => {
          btn.innerHTML = '<span>Message Sent! ✓</span>';
          btn.style.background = 'linear-gradient(135deg,#22c55e,#15803d)';
          gsap.fromTo(btn, { scale: 0.9 }, { scale: 1, duration: 0.5, ease: 'back.out(1.7)' });
        },
      });
    });
  }

  /* ════════════════════════════════════════════════
     13. SMOOTH SCROLL NAV LINKS
  ════════════════════════════════════════════════ */
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const target = document.querySelector(link.getAttribute('href'));
      if (target) {
        lenis.scrollTo(target, { offset: -80, duration: 1.8 });
      }
    });
  });

  /* ════════════════════════════════════════════════
     14. SECTION ENTRANCE — STAGGER CHILDREN
  ════════════════════════════════════════════════ */
  gsap.utils.toArray('.section-tag').forEach((tag) => {
    gsap.from(tag, {
      opacity: 0, x: -30, duration: 0.8, ease: 'power3.out',
      scrollTrigger: { trigger: tag, start: 'top 90%' },
    });
  });

  /* ════════════════════════════════════════════════
     15. PAGE LOAD FADE IN
  ════════════════════════════════════════════════ */
  gsap.from('body', { opacity: 0, duration: 0.5 });

  /* ════════════════════════════════════════════════
     16. FLOATING ABOUT IMAGE
  ════════════════════════════════════════════════ */
  gsap.to('.about__image', {
    y: -15,
    duration: 3,
    ease: 'sine.inOut',
    yoyo: true,
    repeat: -1,
  });

  gsap.to('.about__image-bg', {
    scale: 1.15,
    duration: 4,
    ease: 'sine.inOut',
    yoyo: true,
    repeat: -1,
  });

  /* ════════════════════════════════════════════════
     17. SKILLS GRID — SCROLL PARALLAX
  ════════════════════════════════════════════════ */
  gsap.utils.toArray('.skill-card:nth-child(odd)').forEach((card) => {
    gsap.to(card, {
      y: -20,
      ease: 'none',
      scrollTrigger: {
        trigger: '.skills',
        start: 'top bottom',
        end: 'bottom top',
        scrub: 1.5,
      },
    });
  });

  /* ════════════════════════════════════════════════
     18. CONTACT — TITLE GRADIENT SHIFT
  ════════════════════════════════════════════════ */
  const contactSection = document.querySelector('.contact');
  if (contactSection) {
    ScrollTrigger.create({
      trigger: contactSection,
      start: 'top 60%',
      onEnter: () => {
        gsap.from('.contact__grid > *', {
          opacity: 0, y: 60, stagger: 0.2, duration: 1, ease: 'power3.out',
        });
      },
    });
  }

})();
