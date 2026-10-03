// Tailwind build — scans pages and JS templates for class names.
// Output is committed (css/tailwind.css) so Cloudflare Pages needs no build step.
// Rebuild: npm run build:css (runs automatically in the pre-commit hook).
/** @type {import('tailwindcss').Config} */
export default {
    content: ['./*.html', './{character,dm,community,support}/**/*.html', './js/**/*.js', '!./js/vendor/**'],
    theme: { extend: {} },
    plugins: [],
};
