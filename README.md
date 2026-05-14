# CTFrbt

> High-performance CTF platform with themeable CSS, inspired by CTFd's customization model.

## Philosophy

CTFrbt is designed to be **themeable via pure CSS** — just like CTFd allows custom themes through CSS overrides. The platform ships with a clean, generic base and supports drop-in theme folders.

### Theme System

Themes live in `src/lib/themes/`. Each theme is a self-contained folder:

```
src/lib/themes/
├── _base/              ← Generic base styles (always loaded)
│   ├── reset.css
│   ├── tokens.css      ← CSS custom properties (colors, spacing, fonts)
│   ├── layout.css
│   ├── components.css
│   └── responsive.css
│
└── fr0st/              ← First theme: retro-terminal CRT aesthetic
    ├── theme.css       ← Main theme overrides
    ├── effects.css     ← Optional: neon glow, CRT effects
    ├── animations.css  ← Theme-specific animations
    └── assets/         ← Theme-specific fonts, videos, images
```

To create a new theme, copy any existing theme folder, rename it, and modify the CSS custom properties and overrides.

## Stack

| Layer | Technology |
|---|---|
| Framework | SvelteKit |
| Runtime | Node.js |
| Database | SQLite (WAL mode) |
| Real-time | WebSockets |
| Cache | In-memory LRU |
| Styles | Vanilla CSS (themeable) |

## Development

```bash
pnpm install
pnpm dev
```

## License

See [LICENSE](./LICENSE).
