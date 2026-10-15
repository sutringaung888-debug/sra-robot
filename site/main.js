(function () {
  var header = document.querySelector(".site-header");
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.querySelector("#site-nav");

  function onScroll() {
    if (!header) return;
    header.classList.toggle("is-scrolled", window.scrollY > 8);
  }
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  function setNav(open) {
    if (!toggle || !nav) return;
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    nav.classList.toggle("is-open", open);
    document.body.classList.toggle("nav-open", open);
  }

  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = toggle.getAttribute("aria-expanded") !== "true";
      setNav(open);
      if (open) {
        var first = nav.querySelector("a");
        if (first) first.focus();
      }
    });
    nav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () { setNav(false); });
    });
  }

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && toggle && toggle.getAttribute("aria-expanded") === "true") {
      setNav(false);
      toggle.focus();
    }
  });

  window.addEventListener("resize", function () {
    if (window.innerWidth > 980) setNav(false);
  });

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var reveals = document.querySelectorAll(".reveal");
  if (!reduce && "IntersectionObserver" in window) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-in");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.14, rootMargin: "0px 0px -8% 0px" });
    reveals.forEach(function (el) { observer.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add("is-in"); });
  }

  document.querySelectorAll(".faq-item").forEach(function (item) {
    var button = item.querySelector("button");
    var panel = item.querySelector(".faq-panel");
    if (!button || !panel) return;
    button.addEventListener("click", function () {
      var willOpen = button.getAttribute("aria-expanded") !== "true";
      document.querySelectorAll(".faq-item").forEach(function (other) {
        var otherButton = other.querySelector("button");
        var otherPanel = other.querySelector(".faq-panel");
        if (!otherButton || !otherPanel) return;
        var openThis = willOpen && other === item;
        otherButton.setAttribute("aria-expanded", openThis ? "true" : "false");
        otherPanel.hidden = !openThis;
      });
    });
  });

  var form = document.querySelector(".signup-form");
  if (form) {
    var status = document.querySelector(".form-status");
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      if (!form.checkValidity()) {
        if (status) status.textContent = "Add your name, a real email, and what you want to hear about.";
        form.reportValidity();
        var invalid = form.querySelector(":invalid");
        if (invalid) invalid.focus();
        return;
      }
      if (status) status.textContent = "";
      var name = form.querySelector("#name").value.trim();
      var done = document.querySelector(".form-done");
      var who = done ? done.querySelector("[data-who]") : null;
      if (who) who.textContent = name;
      form.hidden = true;
      if (done) {
        done.hidden = false;
        done.focus();
      }
    });
  }
})();
