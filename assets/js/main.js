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

  /* ---------- Hero title: once you scroll, the top row fades out and
     "It Doesn't Work." fades in underneath; back at the top it reverses ---------- */
  const logo = document.querySelector(".logo");
  const hero = document.querySelector(".hero");
  if (logo && hero) {
    const labels = [logo.getAttribute("aria-label"), logo.dataset.flipLabel];
    const update = () => {
      const flipped = scrollY > hero.offsetHeight * 0.12;
      if (flipped === logo.classList.contains("is-flipped")) return;
      logo.classList.toggle("is-flipped", flipped);
      logo.setAttribute("aria-label", labels[flipped ? 1 : 0]);
    };
    addEventListener("scroll", update, { passive: true });
    update();
  }

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
    const isPoll = form.dataset.mode === "poll"; // single opinion question, no score
    const isQuiz = form.dataset.mode === "quiz" || isPoll;
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
      if (bar) bar.style.width = `${(i / qs.length) * 100}%`;
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
      if (!q.dataset.answer) {
        // Opinion question: lock in the choice without marking right/wrong.
        q.querySelectorAll("input").forEach((inp) => (inp.disabled = true));
        feedback.textContent = q.dataset.explain || "";
        next.textContent = i === qs.length - 1 ? "See results" : "Next →";
        checked = true;
        return true;
      }
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
      if (bar) bar.style.width = "100%";
      form.querySelector(".tf__nav").hidden = true;
      if (feedback) feedback.textContent = "";
      result.hidden = false;
      if (isQuiz) {
        const total = qs.filter((q) => q.dataset.answer).length;
        result.innerHTML = `<div class="score">${score}/${total}</div>
          <p>${score === total ? "Perfect score!" : "Scroll back up to review anything you missed."}</p>
          <button type="button" class="btn" data-restart>Try again</button>`;
        result.querySelector("[data-restart]").onclick = restart;
      } else if (form.dataset.record) {
        showSummary();
      } else {
        submitSurvey();
        result.innerHTML = `<div class="score">Thanks!</div><p>Your response has been recorded.</p>`;
      }
    }

    // Visible text of an answer option, without its A/B/C key
    const optionText = (label) => {
      const c = label.cloneNode(true);
      c.querySelector(".key")?.remove();
      return c.textContent.trim();
    };

    // Answer summary for recorded question sets (e.g. the burger questions)
    function showSummary() {
      const answers = {};
      const rows = qs.map((q) => {
        const input = q.querySelector("input:checked");
        answers[input.name] = input.value;
        const prompt = q.querySelector("legend").cloneNode(true);
        prompt.querySelector(".tf__n")?.remove();
        const choice = optionText(input.closest("label"));
        return `<li><span>${prompt.innerHTML.trim()}</span><strong>${choice}</strong></li>`;
      });
      result.innerHTML = `<h3>Your answers</h3><ul class="tf__summary">${rows.join("")}</ul>
        <div class="tf__tally" aria-live="polite"></div>
        <button type="button" class="btn btn--ghost" data-restart>Change my answers</button>`;
      result.querySelector("[data-restart]").onclick = restart;
      window.Responses?.record(form.dataset.record, answers)
        .then((tally) => renderTally(result.querySelector(".tf__tally"), tally))
        .catch(() => {});
    }

    // "How everyone answered" bars, once a responses backend returns totals
    function renderTally(el, tally) {
      if (!tally) return;
      el.innerHTML = "<h3>How everyone answered</h3>" + qs.map((q) => {
        const name = q.querySelector("input").name;
        const counts = tally[name] || {};
        const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
        const prompt = q.querySelector("legend").cloneNode(true);
        prompt.querySelector(".tf__n")?.remove();
        const bars = [...q.querySelectorAll("label")].map((l) => {
          const v = l.querySelector("input").value;
          const pct = Math.round(((counts[v] || 0) / total) * 100);
          return `<div class="tally__row"><span>${optionText(l)}</span><div class="tally__bar"><i style="width:${pct}%"></i></div><b>${pct}%</b></div>`;
        }).join("");
        return `<div class="tally__q"><p>${prompt.innerHTML.trim()}</p>${bars}</div>`;
      }).join("");
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
      if (isQuiz && !checked) {
        if (grade() && isPoll) {
          next.textContent = "Continue ↓";
          form.classList.add("is-answered");
        }
        return;
      }
      if (isPoll) {
        form.closest("section")?.nextElementSibling?.scrollIntoView({ behavior: "smooth" });
        return;
      }
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
