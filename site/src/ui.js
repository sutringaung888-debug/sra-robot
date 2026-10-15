export function initUI() {
  const header = document.querySelector(".site-header");
  const toggle = document.querySelector(".nav-toggle");
  const nav = document.querySelector("#site-nav");

  const onScroll = () => {
    if (header) header.classList.toggle("is-scrolled", window.scrollY > 8);
    const max = document.documentElement.scrollHeight - window.innerHeight;
    document.documentElement.style.setProperty("--page-progress", max > 0 ? (window.scrollY / max).toFixed(4) : "0");
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  const setNav = (open) => {
    if (!toggle || !nav) return;
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    nav.classList.toggle("is-open", open);
    header?.classList.toggle("nav-open", open);
  };
  if (toggle && nav) {
    toggle.addEventListener("click", () => {
      const open = toggle.getAttribute("aria-expanded") !== "true";
      setNav(open);
      if (open) nav.querySelector("a")?.focus();
    });
    nav.querySelectorAll("a").forEach((link) => link.addEventListener("click", () => setNav(false)));
  }
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && toggle?.getAttribute("aria-expanded") === "true") {
      setNav(false);
      toggle.focus();
    }
  });
  window.addEventListener("resize", () => {
    if (window.innerWidth > 980) setNav(false);
  });

  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const reveals = document.querySelectorAll(".reveal");
  if (!reduce && "IntersectionObserver" in window) {
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add("is-in");
        observer.unobserve(entry.target);
      }
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    reveals.forEach((el) => observer.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add("is-in"));
  }

  const steps = [...document.querySelectorAll(".story-step")];
  const dots = [...document.querySelectorAll(".story-rail li")];
  const story = document.querySelector("#how");
  if (steps.length && "IntersectionObserver" in window) {
    const stepObserver = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const index = steps.indexOf(entry.target);
        steps.forEach((s, i) => s.classList.toggle("is-active", i === index));
        dots.forEach((d, i) => d.classList.toggle("is-active", i === index));
      }
    }, { rootMargin: "-45% 0px -45% 0px" });
    steps.forEach((s) => stepObserver.observe(s));
  }
  if (story && "IntersectionObserver" in window) {
    new IntersectionObserver(([entry]) => {
      document.documentElement.classList.toggle("story-in-view", entry.isIntersecting);
    }, { rootMargin: "-40% 0px -40% 0px" }).observe(story);
  }

  document.querySelectorAll(".faq-item").forEach((item) => {
    const button = item.querySelector("button");
    const panel = item.querySelector(".faq-panel");
    if (!button || !panel) return;
    button.addEventListener("click", () => {
      const willOpen = button.getAttribute("aria-expanded") !== "true";
      document.querySelectorAll(".faq-item").forEach((other) => {
        const b = other.querySelector("button");
        const p = other.querySelector(".faq-panel");
        if (!b || !p) return;
        const open = willOpen && other === item;
        b.setAttribute("aria-expanded", open ? "true" : "false");
        p.hidden = !open;
      });
    });
  });

  const form = document.querySelector(".signup-form");
  if (form) {
    const status = document.querySelector(".form-status");
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      if (!form.checkValidity()) {
        if (status) status.textContent = "Add your name, a real email, and what you want to hear about.";
        form.reportValidity();
        form.querySelector(":invalid")?.focus();
        return;
      }
      if (status) status.textContent = "";
      const done = document.querySelector(".form-done");
      const who = done?.querySelector("[data-who]");
      if (who) who.textContent = form.querySelector("#name").value.trim();
      form.hidden = true;
      if (done) {
        done.hidden = false;
        done.focus();
      }
    });
  }
}
