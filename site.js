// Traelvia website behaviour. No dependencies, no network calls, no storage.
(() => {
  "use strict";

  document.documentElement.classList.add("js");
  const year = document.querySelector("[data-year]");
  if (year) year.textContent = new Date().getFullYear();

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const saveData = navigator.connection && navigator.connection.saveData;
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

  // ---------- Navigation background after scrolling ----------
  const nav = document.querySelector("[data-nav]");

  // ---------- Scroll-driven sky (palette stops from docs/DESIGN_SYSTEM.md) ----------
  const sky = document.querySelector(".sky");
  // [progress, skyTop, skyBottom, ridgeFar, ridgeMid, ridgeNear, stars, sun]
  const stops = [
    [0.00, "#13233d", "#30445e", "#3c526b", "#2d4257", "#21374b", 1.0, 0.0],
    [0.18, "#283853", "#8b768a", "#817c99", "#626c84", "#384f64", 0.6, 0.2],
    [0.34, "#6b87a1", "#f1baa5", "#c3b4c0", "#8795a7", "#4e7881", 0.1, 0.8],
    [0.52, "#77aabf", "#dce9df", "#bdd3d0", "#7eadb1", "#427d80", 0.0, 1.0],
    [0.70, "#7b8fa9", "#f7c28a", "#ccb6b0", "#998fa1", "#5a6979", 0.0, 0.9],
    [0.86, "#3e4b76", "#bd7892", "#a18aa7", "#74738e", "#41536d", 0.4, 0.3],
    [1.00, "#13233d", "#30445e", "#3c526b", "#2d4257", "#21374b", 1.0, 0.0]
  ];
  const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const mix = (a, b, t) => {
    const ca = hex(a), cb = hex(b);
    return "rgb(" + ca.map((c, i) => Math.round(c + (cb[i] - c) * t)).join(",") + ")";
  };
  // Ridges are darkened toward night so the content above stays readable.
  const shade = (rgb, k) => rgb.replace(/\d+/g, (n) => Math.round(n * k));

  function paintSky(progress) {
    if (!sky) return;
    let i = 0;
    while (i < stops.length - 2 && progress > stops[i + 1][0]) i++;
    const a = stops[i], b = stops[i + 1];
    const t = clamp((progress - a[0]) / (b[0] - a[0]), 0, 1);
    const s = sky.style;
    s.setProperty("--sky-top", mix(a[1], b[1], t));
    s.setProperty("--sky-bottom", mix(a[2], b[2], t));
    s.setProperty("--ridge-1", shade(mix(a[3], b[3], t), 0.55));
    s.setProperty("--ridge-2", shade(mix(a[4], b[4], t), 0.45));
    s.setProperty("--ridge-3", shade(mix(a[5], b[5], t), 0.4));
    s.setProperty("--stars", (a[6] + (b[6] - a[6]) * t).toFixed(3));
    s.setProperty("--sun", (a[7] + (b[7] - a[7]) * t).toFixed(3));
    // The sun travels an arc from the left horizon to the right one.
    const arc = clamp((progress - 0.15) / 0.75, 0, 1);
    s.setProperty("--sun-x", (8 + arc * 84).toFixed(2) + "vw");
    s.setProperty("--sun-y", (62 - Math.sin(arc * Math.PI) * 48).toFixed(2) + "vh");
    s.setProperty("--ridge-shift", (Math.sin(progress * Math.PI) * 18).toFixed(1) + "px");
  }

  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      if (nav) nav.classList.toggle("is-scrolled", window.scrollY > 30);
      paintSky(clamp(window.scrollY / max, 0, 1));
    });
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });
  onScroll();

  // ---------- Hero video: loaded lazily, paused off screen, skipped for reduced motion / data saver ----------
  const video = document.querySelector("[data-hero-video]");
  if (video && !reducedMotion && !saveData) {
    video.src = video.dataset.src;
    video.addEventListener("playing", () => video.classList.add("is-playing"), { once: true });
    const play = () => video.play().catch(() => {});
    new IntersectionObserver(([entry]) => (entry.isIntersecting ? play() : video.pause())).observe(video);
    document.addEventListener("visibilitychange", () => (document.hidden ? video.pause() : play()));
  }

  // Ticking race clock on the hero HUD chip (one in-game minute per second).
  const clock = document.querySelector("[data-clock]");
  const dial = document.querySelector(".hud-float .dial");
  if (clock && !reducedMotion) {
    let minutes = 5 * 60 + 42;
    setInterval(() => {
      minutes = (minutes + 1) % (24 * 60);
      const h = String(Math.floor(minutes / 60)).padStart(2, "0");
      const m = String(minutes % 60).padStart(2, "0");
      clock.textContent = h + ":" + m;
      if (dial) dial.style.setProperty("--dial", (minutes / 1440) * 360 + 140 + "deg");
    }, 1000);
  }

  // ---------- Reveal on scroll + number counters ----------
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      entry.target.querySelectorAll("[data-count]").forEach(countUp);
      revealObserver.unobserve(entry.target);
    });
  }, { threshold: 0.15 });
  document.querySelectorAll(".reveal").forEach((el) => revealObserver.observe(el));

  function countUp(el) {
    const target = Number(el.dataset.count);
    if (reducedMotion || !target) return;
    const start = performance.now(), duration = 1400;
    const step = (now) => {
      const t = clamp((now - start) / duration, 0, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = Math.round(target * eased).toLocaleString("en-US");
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  // ---------- Screenshot gallery ----------
  const gallery = document.querySelector("[data-gallery]");
  if (gallery) {
    const shots = [...gallery.querySelectorAll("[data-shot]")];
    const tabs = [...gallery.querySelectorAll("[data-tab]")];
    const duration = 6000;
    let index = 0, timer = 0, remaining = duration, startedAt = 0, paused = false, visible = false;

    tabs.forEach((tab, i) => {
      tab.id = "shot-tab-" + i;
      tab.setAttribute("aria-controls", "shot-" + i);
      shots[i].id = "shot-" + i;
      shots[i].setAttribute("role", "tabpanel");
      shots[i].setAttribute("aria-labelledby", tab.id);
      tab.tabIndex = i === 0 ? 0 : -1;
      tab.addEventListener("click", () => select(i, true));
    });
    gallery.style.setProperty("--dur", duration + "ms");

    function select(i, focus) {
      index = (i + shots.length) % shots.length;
      shots.forEach((s, n) => s.classList.toggle("is-active", n === index));
      tabs.forEach((t, n) => {
        t.setAttribute("aria-selected", String(n === index));
        t.tabIndex = n === index ? 0 : -1;
      });
      if (focus) tabs[index].focus({ preventScroll: true });
      // Keep the active tab visible on narrow screens where the tab row scrolls.
      const row = tabs[index].parentElement;
      if (row.scrollWidth > row.clientWidth) row.scrollTo({ left: tabs[index].offsetLeft - 20, behavior: reducedMotion ? "auto" : "smooth" });
      remaining = duration;
      schedule();
    }
    function schedule() {
      clearTimeout(timer);
      const running = !reducedMotion && visible && !paused;
      gallery.classList.toggle("is-paused", !running);
      if (!running) return;
      startedAt = performance.now();
      timer = setTimeout(() => select(index + 1, false), remaining);
    }
    function pause() {
      if (paused) return;
      paused = true;
      remaining = Math.max(400, remaining - (performance.now() - startedAt));
      schedule();
    }
    function resume() { paused = false; schedule(); }

    gallery.addEventListener("pointerenter", pause);
    gallery.addEventListener("pointerleave", resume);
    gallery.addEventListener("focusin", pause);
    gallery.addEventListener("focusout", resume);
    gallery.querySelector("[role=tablist]").addEventListener("keydown", (e) => {
      const keys = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
      if (e.key in keys) { e.preventDefault(); select(index + keys[e.key], true); }
      if (e.key === "Home") { e.preventDefault(); select(0, true); }
      if (e.key === "End") { e.preventDefault(); select(shots.length - 1, true); }
    });
    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) { remaining = duration; select(index, false); } else { clearTimeout(timer); }
    }, { threshold: 0.35 }).observe(gallery);
  }

  // ---------- Pacing demo: hold to push, release to recover ----------
  const demo = document.querySelector("[data-demo]");
  if (demo) {
    const $ = (sel) => demo.querySelector(sel);
    const path = $("[data-demo-path]"), done = $("[data-demo-done]"), runner = $("[data-demo-runner]");
    const staminaBar = $("[data-demo-stamina]"), staminaN = $("[data-demo-stamina-n]");
    const effortBar = $("[data-demo-effort]"), breathMark = $("[data-demo-breath]");
    const distEl = $("[data-demo-dist]"), togoEl = $("[data-demo-togo]"), paceEl = $("[data-demo-pace]"), gradeEl = $("[data-demo-grade]");
    const statusEl = $("[data-demo-status]");
    const length = path.getTotalLength();
    const courseKm = 3;
    // Profile scale: 600 SVG units = 3 km horizontally, 200 units = 300 m vertically.
    const metersX = 3000 / 600, metersY = 300 / 200;

    done.style.strokeDasharray = length + " " + length;
    let along = 0, effort = 0.3, stamina = 100, holding = false, finishedAt = 0, last = 0, running = false, frame = 0, status = "";

    function gradeAt(l) {
      const p0 = path.getPointAtLength(Math.max(0, l - 4)), p1 = path.getPointAtLength(Math.min(length, l + 4));
      const dx = (p1.x - p0.x) * metersX;
      return dx > 0 ? ((p0.y - p1.y) * metersY) / dx : 0;
    }
    function setStatus(text) {
      if (text === status) return;
      status = text;
      statusEl.textContent = text;
    }

    function tick(now) {
      const dt = Math.min(0.05, (now - last) / 1000 || 0);
      last = now;

      if (finishedAt) {
        if (now - finishedAt > 2200) { along = 0; stamina = 100; finishedAt = 0; }
      } else {
        const grade = gradeAt(along);
        // The breath line: how hard you can run without burning stamina. It drops as stamina empties.
        const breath = 0.35 + (stamina / 100) * 0.4;
        const cap = stamina <= 0 ? 0.3 : 1;
        const target = holding ? cap : 0.3;
        effort += (target - effort) * Math.min(1, dt * (holding ? 3.2 : 2.2));

        const over = effort - breath;
        const climb = Math.max(0, grade) * 6;
        stamina += over > 0 ? -over * (26 + climb * 22) * dt : (6 + Math.max(0, -grade) * 60) * dt;
        stamina = clamp(stamina, 0, 100);

        // Speed in m/s: effort drives it, climbs slow it down, descents help.
        const speed = clamp((2 + effort * 4.6) * (1 - grade * 3.2), 0.8, 7.5);
        const metersPerUnit = (courseKm * 1000) / length;
        along = Math.min(length, along + ((speed * dt) / metersPerUnit) * 20);

        const km = (along / length) * courseKm;
        distEl.textContent = km.toFixed(2) + " km";
        togoEl.textContent = (courseKm - km).toFixed(1) + " km to go";
        const pace = 1000 / speed / 60;
        paceEl.textContent = Math.floor(pace) + ":" + String(Math.round((pace % 1) * 60) % 60).padStart(2, "0") + " /km";
        const g = Math.round(grade * 100);
        gradeEl.textContent = Math.abs(g) < 2 ? "Flat" : (g > 0 ? "+" : "") + g + "% grade";

        effortBar.style.setProperty("--v", effort.toFixed(3));
        effortBar.classList.toggle("is-over", over > 0.02);
        breathMark.style.setProperty("--b", (breath * 100).toFixed(1) + "%");
        staminaBar.style.setProperty("--v", (stamina / 100).toFixed(3));
        staminaBar.classList.toggle("is-low", stamina < 25);
        staminaN.textContent = Math.round(stamina);

        if (along >= length) { finishedAt = now; setStatus("Finish! Well paced."); }
        else if (stamina <= 0) setStatus("Legs empty — release and recover");
        else if (holding && over > 0.02) setStatus(grade > 0.04 ? "Pushing the climb — stamina draining" : "Above the breath line");
        else if (holding) setStatus("Pushing");
        else if (grade < -0.04) setStatus("Let the descent work");
        else setStatus(along === 0 ? "Hold to push" : stamina < 99 ? "Easy pace — breath coming back" : "Cruising — hold to push");
      }

      const p = path.getPointAtLength(along);
      runner.setAttribute("transform", "translate(" + p.x.toFixed(1) + " " + p.y.toFixed(1) + ")");
      done.style.strokeDashoffset = String(length - along);
      if (running) frame = requestAnimationFrame(tick);
    }

    const start = () => { if (!running) { running = true; last = performance.now(); frame = requestAnimationFrame(tick); } };
    const stop = () => { running = false; cancelAnimationFrame(frame); };
    const hold = (on) => { holding = on; demo.classList.toggle("is-holding", on); };

    demo.addEventListener("pointerdown", (e) => { if (e.button === 0) hold(true); });
    ["pointerup", "pointercancel", "pointerleave"].forEach((t) => demo.addEventListener(t, () => hold(false)));
    demo.addEventListener("contextmenu", (e) => e.preventDefault());
    demo.addEventListener("keydown", (e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); hold(true); } });
    demo.addEventListener("keyup", (e) => { if (e.key === " " || e.key === "Enter") hold(false); });
    demo.addEventListener("blur", () => hold(false));

    new IntersectionObserver(([entry]) => (entry.isIntersecting ? start() : stop())).observe(demo);
    tick(performance.now());
  }
})();
