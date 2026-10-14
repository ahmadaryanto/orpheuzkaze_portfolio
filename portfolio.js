(() => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  // Footer year
  const year = $("#year");
  if (year) year.textContent = String(new Date().getFullYear());

  // Header state + scroll progress (rAF-throttled)
  const header = $(".header");
  const progress = $(".progress");
  let ticking = false;
  const onScroll = () => {
    ticking = false;
    const y = window.scrollY;
    header?.classList.toggle("is-scrolled", y > 24);
    if (progress) {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
    }
  };
  window.addEventListener("scroll", () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(onScroll);
    }
  }, { passive: true });
  onScroll();

  // Mobile nav
  const burger = $("#burger");
  const nav = $("#nav");
  const setNav = (open) => {
    nav?.classList.toggle("is-open", open);
    burger?.setAttribute("aria-expanded", String(open));
    burger?.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    document.body.classList.toggle("is-locked", open);
  };
  burger?.addEventListener("click", () => setNav(!nav.classList.contains("is-open")));
  $$("a", nav).forEach((a) => a.addEventListener("click", () => setNav(false)));
  window.addEventListener("resize", () => {
    if (window.innerWidth > 900) setNav(false);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && nav?.classList.contains("is-open")) setNav(false);
  });

  // Active nav link
  const navLinks = $$('.nav a[href^="#"]');
  const sections = navLinks
    .map((link) => ({ link, el: document.getElementById(link.getAttribute("href").slice(1)) }))
    .filter((s) => s.el);
  if ("IntersectionObserver" in window && sections.length) {
    const navObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        navLinks.forEach((a) => a.classList.remove("is-active"));
        sections.find((s) => s.el === entry.target)?.link.classList.add("is-active");
      });
    }, { rootMargin: "-40% 0px -55% 0px" });
    sections.forEach((s) => navObserver.observe(s.el));
  }

  // Seamless marquee: clone the group once
  $$(".marquee__track").forEach((track) => {
    const group = $(".marquee__group", track);
    if (!group) return;
    const clone = group.cloneNode(true);
    clone.setAttribute("aria-hidden", "true");
    $$("a", clone).forEach((a) => a.setAttribute("tabindex", "-1"));
    track.appendChild(clone);
  });

  // Reveal on scroll, staggered within siblings
  const revealEls = $$("[data-reveal]");
  const groups = new Map();
  revealEls.forEach((el) => {
    const n = groups.get(el.parentElement) || 0;
    groups.set(el.parentElement, n + 1);
    el.style.setProperty("--i", String(Math.min(n, 6)));
  });
  if (reduceMotion || !("IntersectionObserver" in window)) {
    revealEls.forEach((el) => el.classList.add("is-in"));
  } else {
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-in");
        revealObserver.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
    revealEls.forEach((el) => revealObserver.observe(el));
  }

  // Animated counters: keep the authored text as the final value
  const format = (value, sample) => {
    const m = sample.match(/^([\d.]+)\s*([KM]?)(\+?)$/i);
    if (!m) return sample;
    const unit = m[2].toUpperCase();
    const decimals = m[1].includes(".") ? 2 : 0;
    const div = unit === "M" ? 1e6 : unit === "K" ? 1e3 : 1;
    const shown = (value / div).toFixed(decimals).replace(/\.0+$|(\.\d*?)0+$/, "$1");
    return `${shown}${unit}${m[3]}`;
  };
  const counters = $$("[data-count]");
  if (!reduceMotion && "IntersectionObserver" in window) {
    const counterObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        counterObserver.unobserve(el);
        const finalText = el.textContent.trim();
        const target = Number(el.dataset.count);
        if (!target) return;
        const start = performance.now();
        const duration = 1400;
        const tick = (now) => {
          const t = Math.min((now - start) / duration, 1);
          const eased = 1 - Math.pow(1 - t, 4);
          el.textContent = t < 1 ? format(target * eased, finalText) : finalText;
          if (t < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
    }, { threshold: 0.5 });
    counters.forEach((el) => counterObserver.observe(el));
  }

  // Top posts: swap cards that have a post URL for the official X embed
  const postCards = $$(".post[data-post]").filter((card) => card.dataset.post.trim());
  if (postCards.length) {
    postCards.forEach((card) => {
      const url = card.dataset.post.trim().replace("://x.com/", "://twitter.com/");
      card.classList.add("post--embed");
      card.innerHTML = `<blockquote class="twitter-tweet" data-theme="dark" data-dnt="true"><a href="${url}"></a></blockquote>`;
    });
    const script = document.createElement("script");
    script.src = "https://platform.twitter.com/widgets.js";
    script.async = true;
    document.body.appendChild(script);
  }

  // Lightbox for gallery images
  const items = $$(".gallery__item");
  if (items.length) {
    const box = document.createElement("div");
    box.className = "lightbox";
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-modal", "true");
    box.innerHTML = '<button class="lightbox__close" type="button" aria-label="Close">&times;</button><img alt="" />';
    document.body.appendChild(box);
    const img = $("img", box);
    const closeBtn = $(".lightbox__close", box);
    let lastFocus = null;
    const close = () => {
      box.classList.remove("is-open");
      document.body.classList.remove("is-locked");
      lastFocus?.focus();
    };
    items.forEach((item) => item.addEventListener("click", () => {
      const inner = $("img", item);
      img.src = item.dataset.full || inner.currentSrc || inner.src;
      img.alt = inner.alt;
      lastFocus = item;
      box.classList.add("is-open");
      document.body.classList.add("is-locked");
      closeBtn.focus();
    }));
    closeBtn.addEventListener("click", close);
    box.addEventListener("click", (e) => { if (e.target === box) close(); });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && box.classList.contains("is-open")) close();
    });
  }

  // Copy email
  const toast = $(".toast");
  let toastTimer = 0;
  const showToast = (msg) => {
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add("is-on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("is-on"), 2000);
  };
  $$("[data-copy]").forEach((btn) => btn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(btn.dataset.copy);
      showToast("Email copied");
    } catch {
      window.location.href = `mailto:${btn.dataset.copy}`;
    }
  }));
})();
