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
  let lastY = window.scrollY;
  const onScroll = () => {
    ticking = false;
    const y = window.scrollY;
    header?.classList.toggle("is-scrolled", y > 24);
    if (header && !document.body.classList.contains("is-locked")) {
      const delta = y - lastY;
      if (y < 120 || delta < -6) header.classList.remove("is-hidden");
      else if (delta > 6) header.classList.add("is-hidden");
    }
    lastY = y;
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

  // X profile: hydrate from data/x-profile.json. Null fields stay hidden.
  const xCard = $(".xcard");
  if (xCard && window.fetch) {
    const compact = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });
    const fmt = (v) => (typeof v === "number" ? compact.format(v) : String(v));
    const has = (v) => v !== null && v !== undefined && v !== "";
    const field = (name) => $(`[data-x="${name}"]`, xCard);

    fetch("./data/x-profile.json", { cache: "no-cache" })
      .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
      .then((x) => {
        ["displayName", "username", "joined"].forEach((k) => {
          if (has(x[k]) && field(k)) field(k).textContent = x[k];
        });
        if (has(x.avatar)) field("avatar").src = x.avatar;
        if (has(x.banner)) field("banner").src = x.banner;
        if (has(x.username)) field("follow").href = `https://x.com/intent/follow?screen_name=${encodeURIComponent(x.username)}`;
        field("verified").hidden = x.verified !== true;

        const bio = field("bio");
        bio.hidden = !has(x.bio);
        if (has(x.bio)) bio.textContent = x.bio;

        const loc = field("location");
        loc.hidden = !has(x.location);
        if (has(x.location)) loc.textContent = x.location;

        const site = field("website");
        site.hidden = !has(x.website);
        if (has(x.website)) {
          const a = document.createElement("a");
          a.href = x.website;
          a.target = "_blank";
          a.rel = "noreferrer";
          a.textContent = x.website.replace(/^https?:\/\//, "").replace(/\/$/, "");
          site.replaceChildren(a);
        }

        ["posts", "following", "followers"].forEach((k) => {
          const stat = $(`[data-x-stat="${k}"]`, xCard);
          stat.hidden = !has(x[k]);
          if (has(x[k])) field(k).textContent = fmt(x[k]);
        });
      })
      .catch(() => {
        /* keep the server-rendered values */
      });
  }

  // AI Creative Lab: gallery rendered from data/lab.json
  const labGrid = $("#lab-grid");
  if (labGrid && window.fetch) {
    const ICONS = {
      play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M7 4.5v15a1 1 0 0 0 1.5.86l12.5-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5z"/></svg>',
      clock: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M12 7v5l3 2" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
      zoom: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
      prev: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      next: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      x: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>',
      arrow: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17L17 7M9 7h8v8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
    };
    const canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

    // Tiny DOM builder; text always goes through textContent.
    const el = (tag, props = {}, ...kids) => {
      const node = document.createElement(tag);
      Object.entries(props).forEach(([k, v]) => {
        if (v === undefined || v === null || v === false) return;
        if (k === "class") node.className = v;
        else if (k === "html") node.innerHTML = v;
        else if (k === "text") node.textContent = v;
        else if (k === "style") node.style.cssText = v;
        else node.setAttribute(k, v === true ? "" : v);
      });
      kids.flat().filter(Boolean).forEach((kid) => node.append(kid));
      return node;
    };

    const chips = (item, withTools = true) => {
      const list = [];
      (item.categories || []).forEach((c) => list.push(el("li", { text: c })));
      if (item.language) list.push(el("li", { text: item.language }));
      if (withTools) (item.tools || []).forEach((t) => list.push(el("li", { class: "is-tool", text: t })));
      return list.length ? el("ul", { class: "chips-row" }, list) : null;
    };

    const toSeconds = (d) => (d || "").split(":").reduce((acc, n) => acc * 60 + Number(n || 0), 0);

    // Hover preview: lazily attach the video source, play muted, pause on leave.
    const attachPreview = (card, item) => {
      if (!canHover || item.type !== "video" || reduceMotion) return;
      const video = $("video", card);
      card.addEventListener("mouseenter", () => {
        if (!video.src) video.src = item.src;
        video.play().then(() => card.classList.add("is-previewing")).catch(() => {});
      });
      card.addEventListener("mouseleave", () => {
        card.classList.remove("is-previewing");
        video.pause();
      });
    };

    const spotlight = (card) => {
      card.addEventListener("pointermove", (e) => {
        const r = card.getBoundingClientRect();
        card.style.setProperty("--mx", `${e.clientX - r.left}px`);
        card.style.setProperty("--my", `${e.clientY - r.top}px`);
      });
    };

    // ---- Theater ----
    let theaterList = [];
    let theaterIndex = 0;
    let theaterReturn = null;
    const theater = el("div", { class: "theater", role: "dialog", "aria-modal": "true", "aria-label": "AI Creative Lab viewer" });
    const glow = el("div", { class: "theater__glow" });
    const count = el("span", { class: "theater__count" });
    const closeBtn = el("button", { class: "theater__btn", type: "button", "aria-label": "Close viewer", html: ICONS.close });
    const prevBtn = el("button", { class: "theater__btn theater__btn--prev", type: "button", "aria-label": "Previous", html: ICONS.prev });
    const nextBtn = el("button", { class: "theater__btn theater__btn--next", type: "button", "aria-label": "Next", html: ICONS.next });
    const frame = el("div", { class: "theater__frame" });
    const info = el("div", { class: "theater__info" });
    theater.append(
      glow,
      el("div", { class: "theater__bar" }, count, closeBtn),
      el("div", { class: "theater__stage" }, prevBtn, frame, nextBtn),
      info
    );
    document.body.appendChild(theater);

    const stopMedia = () => $$("video", frame).forEach((v) => { v.pause(); v.removeAttribute("src"); v.load(); });

    const showTheater = (i) => {
      theaterIndex = (i + theaterList.length) % theaterList.length;
      const item = theaterList[theaterIndex];
      stopMedia();
      frame.replaceChildren(
        item.type === "video"
          ? el("video", { src: item.src, poster: item.poster, controls: true, autoplay: true, playsinline: true, preload: "auto" })
          : el("img", { src: item.src, alt: item.title })
      );
      glow.style.backgroundImage = `url("${item.poster || item.src}")`;
      count.textContent = `${String(theaterIndex + 1).padStart(2, "0")} / ${String(theaterList.length).padStart(2, "0")}`;
      info.replaceChildren(...[
        el("h3", { text: item.title }),
        item.description ? el("p", { text: item.description }) : null,
        chips(item),
        item.link ? el("a", { class: "btn btn--primary btn--sm theater__link", href: item.link, target: "_blank", rel: "noreferrer", html: `${item.linkLabel ? "" : "View project "}${ICONS.arrow}` }) : null
      ].filter(Boolean));
      if (item.link && item.linkLabel) $(".theater__link", info).prepend(item.linkLabel + " ");
      const multi = theaterList.length > 1;
      prevBtn.hidden = !multi;
      nextBtn.hidden = !multi;
    };

    const openTheater = (list, i, from) => {
      theaterList = list;
      theaterReturn = from || document.activeElement;
      showTheater(i);
      theater.classList.add("is-open");
      document.body.classList.add("is-locked");
      closeBtn.focus();
    };

    const closeTheater = () => {
      theater.classList.remove("is-open");
      document.body.classList.remove("is-locked");
      stopMedia();
      theaterReturn?.focus();
    };

    closeBtn.addEventListener("click", closeTheater);
    prevBtn.addEventListener("click", () => showTheater(theaterIndex - 1));
    nextBtn.addEventListener("click", () => showTheater(theaterIndex + 1));
    theater.addEventListener("click", (e) => { if (e.target === theater || e.target.classList.contains("theater__stage")) closeTheater(); });
    document.addEventListener("keydown", (e) => {
      if (!theater.classList.contains("is-open")) return;
      if (e.key === "Escape") closeTheater();
      else if (e.key === "ArrowLeft" && theaterList.length > 1) showTheater(theaterIndex - 1);
      else if (e.key === "ArrowRight" && theaterList.length > 1) showTheater(theaterIndex + 1);
    });

    // ---- Render ----
    const renderFeature = (item, all) => {
      const host = $("#lab-feature");
      if (!item || !host) return;
      const card = el("button", { class: "feature", type: "button" },
        el("div", { class: "feature__media" },
          el("img", { src: item.poster || item.src, alt: "", loading: "lazy" }),
          item.type === "video" ? el("video", { muted: true, loop: true, playsinline: true, preload: "none" }) : null
        ),
        el("div", { class: "feature__body" },
          el("span", { class: "feature__badge mono", text: "Now showing" }),
          el("h3", { class: "feature__title", text: item.title }),
          item.description ? el("p", { class: "feature__desc", text: item.description }) : null,
          chips(item)
        ),
        el("span", { class: "feature__play", html: ICONS.play })
      );
      const v = $("video", card);
      if (v) v.muted = true;
      card.addEventListener("click", () => openTheater(all, all.indexOf(item), card));
      attachPreview(card, item);
      host.replaceChildren(card);
    };

    const renderGrid = (items) => {
      labGrid.replaceChildren(...items.map((item, n) => {
        const isVideo = item.type === "video";
        const card = el("button", {
          class: `lab-card${isVideo ? " lab-card--video" : ""}`,
          type: "button",
          style: `--n:${n}`
        },
          el("div", { class: "lab-card__media" },
            el("img", { src: item.poster || item.src, alt: "", loading: "lazy", decoding: "async" }),
            isVideo ? el("video", { muted: true, loop: true, playsinline: true, preload: "none" }) : null
          ),
          el("span", { class: "lab-card__shade" }),
          el("div", { class: "lab-card__top" },
            el("span", { class: "lab-card__cat", text: (item.categories || [])[0] || "" }),
            isVideo && item.duration ? el("span", { class: "lab-card__time", html: ICONS.clock }, item.duration) : null
          ),
          isVideo ? el("span", { class: "lab-card__play", html: ICONS.play }) : el("span", { class: "lab-card__zoom", html: ICONS.zoom }),
          el("div", { class: "lab-card__body" },
            el("h3", { class: "lab-card__title", text: item.title }),
            item.description ? el("p", { class: "lab-card__desc", text: item.description }) : null
          )
        );
        const v = $("video", card);
        if (v) v.muted = true;
        card.addEventListener("click", () => openTheater(items, n, card));
        attachPreview(card, item);
        if (canHover) spotlight(card);
        return card;
      }));
      $("#lab-empty").hidden = items.length > 0;
    };

    // "Made for X" rail: horizontally scrolling video cards that open the theater.
    const rail = $("#posts-rail");
    const renderRail = (posts) => {
      if (!rail || !posts.length) return;
      rail.replaceChildren(...posts.map((item, n) => {
        const card = el("button", { class: "post-card", type: "button" },
          el("div", { class: "post-card__media" },
            el("img", { src: item.poster || item.src, alt: "", loading: "lazy", decoding: "async" }),
            el("video", { muted: true, loop: true, playsinline: true, preload: "none" }),
            el("span", { class: "lab-card__play", html: ICONS.play })
          ),
          el("div", { class: "post-card__meta" },
            el("span", { class: "post-card__handle mono", html: ICONS.x }, "@orpheuskaze"),
            item.duration ? el("span", { class: "mono post-card__time" }, item.duration) : null
          ),
          el("h3", { class: "post-card__title", text: item.title }),
          item.language ? el("span", { class: "post-card__lang mono", text: item.language }) : null
        );
        const v = $("video", card);
        v.muted = true;
        card.addEventListener("click", () => {
          if (rail.dataset.dragged === "1") return;
          openTheater(posts, n, card);
        });
        attachPreview(card, item);
        return card;
      }));

      const step = () => (rail.firstElementChild?.getBoundingClientRect().width || 320) + 16;
      $$("[data-rail]").forEach((btn) => btn.addEventListener("click", () => {
        rail.scrollBy({ left: btn.dataset.rail === "next" ? step() : -step(), behavior: reduceMotion ? "auto" : "smooth" });
      }));
      const syncButtons = () => {
        const max = rail.scrollWidth - rail.clientWidth - 4;
        $$("[data-rail]").forEach((btn) => {
          btn.disabled = btn.dataset.rail === "prev" ? rail.scrollLeft <= 4 : rail.scrollLeft >= max;
        });
      };
      rail.addEventListener("scroll", syncButtons, { passive: true });
      window.addEventListener("resize", syncButtons);
      syncButtons();

      // Drag to scroll with a mouse; touch uses native scrolling.
      let down = false, startX = 0, startLeft = 0;
      rail.addEventListener("pointerdown", (e) => {
        if (e.pointerType !== "mouse") return;
        down = true; startX = e.clientX; startLeft = rail.scrollLeft; rail.dataset.dragged = "0";
      });
      window.addEventListener("pointermove", (e) => {
        if (!down) return;
        const dx = e.clientX - startX;
        if (Math.abs(dx) > 6) { rail.dataset.dragged = "1"; rail.classList.add("is-dragging"); }
        rail.scrollLeft = startLeft - dx;
      });
      window.addEventListener("pointerup", () => {
        down = false;
        rail.classList.remove("is-dragging");
        setTimeout(() => { rail.dataset.dragged = "0"; }, 0);
      });
      rail.addEventListener("keydown", (e) => {
        if (e.key === "ArrowRight") { e.preventDefault(); rail.scrollBy({ left: step(), behavior: "smooth" }); }
        if (e.key === "ArrowLeft") { e.preventDefault(); rail.scrollBy({ left: -step(), behavior: "smooth" }); }
      });
    };

    fetch("./data/lab.json", { cache: "no-cache" })
      .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
      .then(({ items = [] }) => {
        const videos = items.filter((i) => i.type === "video");
        const images = items.filter((i) => i.type === "image");
        const minutes = Math.round(videos.reduce((s, v) => s + toSeconds(v.duration), 0) / 60);

        const stats = $("#lab-stats");
        stats.replaceChildren(
          ...[["Videos", videos.length], ["Artworks", images.length], ["Minutes", minutes]]
            .filter(([, n]) => n > 0)
            .map(([label, n]) => el("div", {}, el("dt", { text: label }), el("dd", { text: String(n) })))
        );

        renderFeature(items.find((i) => i.featured) || videos[0], items);

        const filters = $$(".lab-filter");
        const matches = (f) => (f === "all" ? items : items.filter((i) => (i.categories || []).includes(f)));
        filters.forEach((btn) => {
          $("span", btn).textContent = String(matches(btn.dataset.filter).length).padStart(2, "0");
          btn.addEventListener("click", () => {
            filters.forEach((b) => {
              b.classList.toggle("is-active", b === btn);
              b.setAttribute("aria-pressed", String(b === btn));
            });
            renderGrid(matches(btn.dataset.filter));
          });
        });
        renderGrid(items);
        renderRail(items.filter((i) => i.id.startsWith("x-")));
      })
      .catch(() => {
        $("#lab-empty").hidden = false;
      });
  }

  // Project cards: play the demo clip on hover (desktop only).
  if (window.matchMedia("(hover: hover) and (pointer: fine)").matches && !reduceMotion) {
    $$(".repo-card__media[data-preview]").forEach((media) => {
      let video = null;
      media.addEventListener("mouseenter", () => {
        if (!video) {
          video = document.createElement("video");
          Object.assign(video, { src: media.dataset.preview, muted: true, loop: true, playsInline: true });
          media.appendChild(video);
        }
        video.play().then(() => media.classList.add("is-previewing")).catch(() => {});
      });
      media.addEventListener("mouseleave", () => {
        media.classList.remove("is-previewing");
        video?.pause();
      });
    });
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
