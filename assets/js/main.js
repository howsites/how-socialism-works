// Scroll effects + Typeform-style forms. No dependencies.
(() => {

  /* ---------- Reveal elements as they enter the viewport ---------- */
  const revealer = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) {
        e.target.classList.add("is-visible");
        revealer.unobserve(e.target);
      }
    }
  }, { threshold: 0.15, rootMargin: "0px 0px -8% 0px" });
  document.querySelectorAll(".reveal").forEach((el) => revealer.observe(el));

  /* ---------- Progress bar fallback + nav shadow ---------- */
  const root = document.documentElement;
  const nav = document.querySelector(".nav");
  const nativeProgress = CSS.supports("animation-timeline: scroll()");
  const onScroll = () => {
    const max = root.scrollHeight - innerHeight;
    if (!nativeProgress) root.style.setProperty("--p", max > 0 ? scrollY / max : 0);
    nav.classList.toggle("is-scrolled", scrollY > 10);
  };
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- Highlight the current section in the nav ---------- */
  const links = [...document.querySelectorAll(".nav__links a")];
  const sectionSpy = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      links.forEach((a) => a.classList.toggle("is-active", a.hash === "#" + e.target.id));
    }
  }, { rootMargin: "-45% 0px -50% 0px" });
  links.forEach((a) => {
    const target = document.querySelector(a.hash);
    if (target) sectionSpy.observe(target);
  });

  /* ---------- Sticky scrollytelling steps ---------- */
  document.querySelectorAll(".story").forEach((story) => {
    const visual = story.querySelector(".story__visual");
    const steps = story.querySelectorAll(".step");
    const stepSpy = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        steps.forEach((s) => s.classList.toggle("is-active", s === e.target));
        visual.dataset.active = e.target.dataset.step;
      }
    }, { rootMargin: "-45% 0px -45% 0px" });
    steps.forEach((s) => stepSpy.observe(s));
    steps[0]?.classList.add("is-active");
  });

  /* ---------- Typeform-style one-question-at-a-time forms ---------- */
  document.querySelectorAll("form.tf").forEach(initTypeform);

  function initTypeform(form) {
    const qs = [...form.querySelectorAll(".tf__q")];
    const bar = form.querySelector(".tf__bar span");
    const prev = form.querySelector("[data-prev]");
    const next = form.querySelector("[data-next]");
    const feedback = form.querySelector(".tf__feedback");
    const result = form.querySelector(".tf__result");
    const isQuiz = form.dataset.mode === "quiz";
    let i = 0;
    let score = 0;
    let checked = false; // quiz: has the current answer been graded yet?

    const value = (q) => {
      const r = q.querySelector("input[type=radio]:checked");
      if (r) return r.value;
      const t = q.querySelector(".tf__text");
      return t ? t.value.trim() : "";
    };

    function show(n) {
      qs[i].classList.remove("is-current");
      i = n;
      qs[i].classList.add("is-current");
      bar.style.width = `${(i / qs.length) * 100}%`;
      prev.disabled = i === 0 || isQuiz;
      next.textContent = i === qs.length - 1 && !isQuiz ? "Submit" : "OK ✓";
      checked = false;
      if (feedback) feedback.textContent = "";
      qs[i].querySelector(".tf__text")?.focus({ preventScroll: true });
    }

    function grade() {
      const q = qs[i];
      const v = value(q);
      if (!v) { feedback.textContent = "Pick an answer first."; return false; }
      const correct = v === q.dataset.answer;
      if (correct) score++;
      q.querySelectorAll("label").forEach((l) => {
        const val = l.querySelector("input").value;
        if (val === q.dataset.answer) l.classList.add("is-correct");
        else if (val === v) l.classList.add("is-wrong");
      });
      q.querySelectorAll("input").forEach((inp) => (inp.disabled = true));
      feedback.textContent = (correct ? "Correct! " : "Not quite. ") + (q.dataset.explain || "");
      next.textContent = i === qs.length - 1 ? "See results" : "Next →";
      checked = true;
      return true;
    }

    function finish() {
      qs[i].classList.remove("is-current");
      bar.style.width = "100%";
      form.querySelector(".tf__nav").hidden = true;
      if (feedback) feedback.textContent = "";
      result.hidden = false;
      if (isQuiz) {
        result.innerHTML = `<div class="score">${score}/${qs.length}</div>
          <p>${score === qs.length ? "Perfect score!" : "Scroll back up to review anything you missed."}</p>
          <button type="button" class="btn" data-restart>Try again</button>`;
        result.querySelector("[data-restart]").onclick = restart;
      } else {
        submitSurvey();
        result.innerHTML = `<div class="score">Thanks!</div><p>Your response has been recorded.</p>`;
      }
    }

    function submitSurvey() {
      const action = form.getAttribute("action");
      if (!action) return; // no backend configured
      fetch(action, { method: "POST", body: new FormData(form), headers: { Accept: "application/json" } })
        .catch(() => {});
    }

    function restart() {
      score = 0;
      form.reset();
      form.querySelectorAll("label").forEach((l) => l.classList.remove("is-correct", "is-wrong"));
      form.querySelectorAll("input").forEach((inp) => (inp.disabled = false));
      result.hidden = true;
      form.querySelector(".tf__nav").hidden = false;
      show(0);
    }

    function advance() {
      if (isQuiz && !checked) { grade(); return; }
      if (!isQuiz && !value(qs[i]) && qs[i].querySelector("input[type=radio]")) return;
      if (i < qs.length - 1) show(i + 1);
      else finish();
    }

    next.addEventListener("click", advance);
    prev.addEventListener("click", () => i > 0 && show(i - 1));
    form.addEventListener("submit", (e) => { e.preventDefault(); advance(); });

    // Picking a choice auto-advances (Typeform behaviour) for surveys; grades for quizzes.
    form.addEventListener("change", (e) => {
      if (e.target.type !== "radio") return;
      setTimeout(advance, isQuiz ? 0 : 350);
    });

    // Keyboard: letter keys pick options, Enter continues — only while the form is on screen.
    let onScreen = false;
    new IntersectionObserver(([e]) => (onScreen = e.isIntersecting), { threshold: 0.5 }).observe(form);
    document.addEventListener("keydown", (e) => {
      if (!onScreen || !result.hidden || e.metaKey || e.ctrlKey || e.altKey) return;
      const typing = e.target.matches("input[type=text], textarea");
      if (e.key === "Enter") { e.preventDefault(); advance(); return; }
      if (typing) return;
      const idx = e.key.toLowerCase().charCodeAt(0) - 97;
      const radios = qs[i].querySelectorAll("input[type=radio]");
      if (e.key.length === 1 && radios[idx] && !radios[idx].disabled) {
        radios[idx].checked = true;
        radios[idx].dispatchEvent(new Event("change", { bubbles: true }));
      }
    });

    show(0);
  }
})();
