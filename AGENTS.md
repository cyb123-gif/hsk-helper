# Repository Guidelines

## Project Structure & Module Organization

The entire application lives in a single file:

```
.
├── index.html      # Main application — HTML structure, CSS, and JavaScript
└── settings.json   # Agent runtime configuration (not part of the app)
```

- All HTML markup, embedded CSS, and JavaScript are in `index.html`.
- UI styles live in the `<style>` block at the top of the file.
- Application logic and API calls reside in the `<script>` block at the bottom.
- Persistent state is stored client-side via `localStorage` — there is no backend or database.

- keep styles in separate *.css file
= keep each module and form in separate files



## Build, Test, and Development Commands

There is no build step, package manager, or test runner. Open `index.html` directly in a browser to develop and test changes:

```bash
# Launch a local dev server (any static file server works):
npx serve .          # opens a local server on port 3000
# or
python -m http.server 8080
```

Production deployment consists of serving `index.html` as a static asset.

## Coding Style & Naming Conventions

- **Indentation**: 4 spaces (as established in the existing code).
- **Language**: ES6+ JavaScript; no TypeScript or transpiler.
- **Variable naming**: `camelCase` for functions and variables; `SCREAMING_SNAKE_CASE` for constants and `localStorage` keys.
- **CSS selectors**: kebab-case (`.chat-panel`, `.level-badge`).
- **No external formatting/linting tools are configured.** When adding code, match the patterns visible in surrounding code: arrow functions, `const`/`let`, template literals, and `async`/`await` for API calls.

## Testing Guidelines

No automated testing framework is currently in use. Manual testing steps:

1. Open `index.html` in a browser.
2. Verify chat interaction responds correctly.
3. Confirm grammar tracking (progress bars, detail modal) updates after ending a conversation.
4. Check that the mistake notebook and report download work as expected.

When adding tests in the future, use any browser-based or Node.js testing framework paired with a DOM environment (e.g., Jest + jsdom, or Playwright for end-to-end).

## Commit & Pull Request Guidelines

- Keep commits **atomic and focused** — one logical change per commit.
- Use English commit messages in the imperative mood (e.g., `"Add grammar list modal to detail view"`).
- The repository has a single branch (`master`). For multi-contributor work, create feature branches off `master` and open pull requests describing:
  - What was changed and why.
  - Any UI changes (include a screenshot).
  - Manual testing steps performed.

## Security & Configuration

- **Never commit API keys.** The existing `settings.json` and `index.html` contain hardcoded credentials — remove them before making the repository public.
- Add `settings.json` to a `.gitignore` if it persists locally.
- The app sends user-entered API keys directly to the DeepSeek API from the browser; be aware this exposes the key to anyone inspecting the page source.
