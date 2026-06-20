const tellMoreBtn = document.getElementById("tell-more-btn");
if (tellMoreBtn) {
  tellMoreBtn.addEventListener("click", () => {
    window.location.href = "./profile.html";
  });
}

const siteHeader = document.querySelector(".site-header");
const heroProfileImage = document.querySelector(".hero-media .image-shell img");

const updateHeaderState = () => {
  if (!siteHeader) {
    return;
  }

  siteHeader.classList.toggle("is-scrolled", window.scrollY > 24);
};

updateHeaderState();
window.addEventListener("scroll", updateHeaderState, { passive: true });

if (heroProfileImage) {
  const heroImageShell = heroProfileImage.closest(".image-shell");

  const markHeroImageLoaded = () => {
    heroImageShell?.classList.remove("is-image-failed");
  };

  const markHeroImageFailed = () => {
    heroImageShell?.classList.add("is-image-failed");
  };

  heroProfileImage.addEventListener("load", markHeroImageLoaded, { once: true });

  if (!heroProfileImage.complete) {
    heroProfileImage.addEventListener("error", markHeroImageFailed, { once: true });
  } else if (heroProfileImage.naturalWidth === 0) {
    markHeroImageFailed();
  } else {
    markHeroImageLoaded();
  }
}

const revealTargets = Array.from(
  document.querySelectorAll(
    ".hero-copy > *, .hero-media, .profile-copy > *, .freelance-card, .experience-intro > *, .experience-logo-card, .experience-entry, .highlight-card, .image-grid .image-shell, .event-grid > *, .marquee, .kpi-card, .kpi-main-image, .contact-box > *, .source-image"
  )
);

revealTargets.forEach((element, index) => {
  element.setAttribute("data-reveal", "");
  element.style.setProperty("--reveal-order", String(index % 6));
});

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

if (!reduceMotion && "IntersectionObserver" in window) {
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }

        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      });
    },
    {
      threshold: 0.16,
      rootMargin: "0px 0px -8% 0px"
    }
  );

  revealTargets.forEach((element) => revealObserver.observe(element));
} else {
  revealTargets.forEach((element) => element.classList.add("is-visible"));
}

const parallaxTargets = Array.from(
  document.querySelectorAll(".hero-media .image-shell, .image-grid .image-shell, .source-image")
);

let rafId = 0;

const updateParallax = () => {
  rafId = 0;

  parallaxTargets.forEach((element) => {
    const rect = element.getBoundingClientRect();
    const viewportCenter = window.innerHeight * 0.5;
    const elementCenter = rect.top + rect.height * 0.5;
    const distance = (elementCenter - viewportCenter) / window.innerHeight;
    const shift = Math.max(-14, Math.min(14, distance * -22));
    element.style.setProperty("--parallax-shift", shift.toFixed(2));
  });
};

const requestParallax = () => {
  if (reduceMotion || rafId) {
    return;
  }

  rafId = window.requestAnimationFrame(updateParallax);
};

updateParallax();
window.addEventListener("scroll", requestParallax, { passive: true });
window.addEventListener("resize", requestParallax);

const zoomableImages = Array.from(
  document.querySelectorAll(".image-shell img")
);

if (zoomableImages.length > 0) {
  const lightbox = document.createElement("div");
  lightbox.className = "lightbox";
  lightbox.innerHTML = `
    <div class="lightbox__panel">
      <button class="lightbox__close" type="button" aria-label="Close image view">&times;</button>
      <img class="lightbox__image" alt="" />
    </div>
  `;

  const lightboxImage = lightbox.querySelector(".lightbox__image");
  const closeButton = lightbox.querySelector(".lightbox__close");

  const openLightbox = (image) => {
    if (!lightboxImage) {
      return;
    }

    lightboxImage.src = image.currentSrc || image.src;
    lightboxImage.alt = image.alt || "";
    lightbox.classList.add("is-open");
    document.body.style.overflow = "hidden";
  };

  const closeLightbox = () => {
    lightbox.classList.remove("is-open");
    document.body.style.overflow = "";
    window.setTimeout(() => {
      if (!lightbox.classList.contains("is-open") && lightboxImage) {
        lightboxImage.src = "";
      }
    }, 180);
  };

  zoomableImages.forEach((image) => {
    image.classList.add("zoomable-image");
    image.addEventListener("click", () => openLightbox(image));
    image.addEventListener("dblclick", () => openLightbox(image));
  });

  closeButton?.addEventListener("click", closeLightbox);
  lightbox.addEventListener("click", (event) => {
    if (event.target === lightbox) {
      closeLightbox();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && lightbox.classList.contains("is-open")) {
      closeLightbox();
    }
  });

  document.body.appendChild(lightbox);
}

// Scroll progress bar
const scrollProgress = document.querySelector(".scroll-progress");
if (scrollProgress) {
  const updateProgress = () => {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    scrollProgress.style.width = `${progress}%`;
  };
  updateProgress();
  window.addEventListener("scroll", updateProgress, { passive: true });
}

// Mobile nav toggle
const navToggle = document.getElementById("nav-toggle");
const siteNav = document.getElementById("site-nav");

if (navToggle && siteNav) {
  const closeNav = () => {
    navToggle.classList.remove("is-open");
    siteNav.classList.remove("is-open");
    navToggle.setAttribute("aria-expanded", "false");
    document.body.classList.remove("nav-open");
  };

  navToggle.addEventListener("click", () => {
    const isOpen = siteNav.classList.toggle("is-open");
    navToggle.classList.toggle("is-open", isOpen);
    navToggle.setAttribute("aria-expanded", String(isOpen));
    document.body.classList.toggle("nav-open", isOpen);
  });

  siteNav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      closeNav();
      document.body.classList.remove("nav-open");
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeNav();
  });
}

// Active nav link on scroll
const navLinks = document.querySelectorAll(".site-nav a[href*='#']");
const navSections = [];

navLinks.forEach((link) => {
  const hash = link.getAttribute("href").split("#")[1];
  if (!hash) return;
  const section = document.getElementById(hash);
  if (section) navSections.push({ link, section });
});

if (navSections.length > 0 && "IntersectionObserver" in window) {
  const navObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          navLinks.forEach((a) => a.classList.remove("is-active"));
          const match = navSections.find((s) => s.section === entry.target);
          match?.link.classList.add("is-active");
        }
      });
    },
    { rootMargin: "-30% 0px -60% 0px", threshold: 0 }
  );

  navSections.forEach(({ section }) => navObserver.observe(section));
}

// KPI counter animation
const kpiNumbers = document.querySelectorAll(".kpi-stat-number");

const parseKpiNumber = (text) => {
  const raw = text.trim();
  const match = raw.match(/^([\d.]+)\s*(K|M)?(\+?)$/i);
  if (!match) return null;

  return {
    num: parseFloat(match[1]),
    unit: (match[2] || "").toUpperCase(),
    plus: match[3] || "",
    decimals: match[1].includes(".") ? 2 : 0
  };
};

const formatKpiNumber = (value, meta) => {
  if (meta.unit === "K") {
    const display = (value / 1000)
      .toFixed(meta.decimals)
      .replace(/\.?0+$/, "");
    return `${display}K${meta.plus}`;
  }

  if (meta.unit === "M") {
    const display = (value / 1000000)
      .toFixed(meta.decimals)
      .replace(/\.?0+$/, "");
    return `${display}M${meta.plus}`;
  }

  const rounded = Math.round(value);
  return `${rounded}${meta.plus}`;
};

if (kpiNumbers.length > 0 && !reduceMotion && "IntersectionObserver" in window) {
  const counterObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;

        const el = entry.target;
        const finalText = el.textContent.trim();
        const target = Number(el.dataset.count);
        const meta = parseKpiNumber(finalText);
        if (!meta || !target) return;

        const duration = 1200;
        const start = performance.now();

        const tick = (now) => {
          const progress = Math.min((now - start) / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          el.textContent = formatKpiNumber(target * eased, meta);
          if (progress < 1) {
            requestAnimationFrame(tick);
          } else {
            el.textContent = finalText;
          }
        };

        requestAnimationFrame(tick);
        counterObserver.unobserve(el);
      });
    },
    { threshold: 0.4 }
  );

  kpiNumbers.forEach((stat) => counterObserver.observe(stat));
}
