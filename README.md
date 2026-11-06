# How Socialism Works

A single-page, scroll-animated explainer with Typeform-style interactive sections. Plain HTML, CSS and JavaScript, with no build step. It's hosted on GitHub Pages.

## Structure

```
index.html            page content (sections)
assets/css/style.css  styles, scroll-reveal and sticky-scroll effects
assets/js/main.js     scroll observers + Typeform-style form engine
```

## Adding content

- **Animated section:** add `class="reveal"` to any element. Add `style="--d:1"` (2, 3, …) to stagger elements.
- **Typeform-style form:** copy a `<form class="tf">` block. Each `<fieldset class="tf__q">` is one screen.
  - `data-mode="quiz"`: set `data-answer` and `data-explain` on each question.
  - `data-mode="survey"`: set the form's `action` to a form service URL (for example Formspree) to collect responses.
- **New page:** create `another-page.html` and link the same `assets/` files.

## Run locally

```
python3 -m http.server 8000
```

Then open http://localhost:8000.
