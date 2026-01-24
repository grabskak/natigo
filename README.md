# Natigo

> AI-powered flashcard creation and spaced-repetition learning.

Natigo is a web application for automatically generating flashcards. Paste any text (1 000 – 10 000 characters), let large-language-models propose candidate cards, quickly review and edit them, then save the accepted ones to your private collection backed by spaced-repetition scheduling.

---

## Table of Contents

1. [Tech stack](#tech-stack)
2. [Getting started locally](#getting-started-locally)
3. [Available scripts](#available-scripts)
4. [Project scope](#project-scope)
5. [Project status](#project-status)
6. [License](#license)

---

## Tech stack

• **Frontend**  
- [Astro 5](https://astro.build/) – static-first framework  
- [React 19](https://react.dev/) – interactive islands/components  
- [TypeScript 5](https://www.typescriptlang.org/) – static typing  
- [Tailwind CSS 4](https://tailwindcss.com/) – utility-first styling  
- [shadcn/ui](https://ui.shadcn.com/) – accessible React components

• **Backend**  
- [Supabase](https://supabase.com/) – PostgreSQL, authentication & edge functions  
- Row-Level-Security enforced for per-user data privacy

• **AI Integration**  
- [OpenRouter.ai](https://openrouter.ai/) – access to OpenAI, Anthropic, Google & other models

• **Testing**  
- [Vitest](https://vitest.dev/) – unit & integration testing framework  
- [Playwright](https://playwright.dev/) – end-to-end testing  
- [Testing Library](https://testing-library.com/) – component testing utilities  
- [MSW](https://mswjs.io/) – API mocking for tests

• **Tooling**  
- ESLint + Prettier with `lint-staged`  
- Husky Git hooks  
- GitHub Actions for CI / CD  
- Docker & DigitalOcean for hosting

---

## Getting started locally

### Prerequisites

* Node.js `24.11.1` (see `.nvmrc`)


```bash
# 1. Clone the repository
$ git clone https://github.com/grabskak/natigo.git
$ cd natigo

# 2. Install dependencies
$ npm install   # or pnpm install

# 3. Configure environment variables
$ cp .env.example .env
# 👉  Fill in SUPABASE_URL, SUPABASE_ANON_KEY, OPENROUTER_API_KEY …

# 4. Start the dev server
$ npm run dev
# open http://localhost:4321
```

To build a production bundle run:

```bash
npm run build
```

---

## Available scripts

The following npm scripts are defined in `package.json`:

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Astro in dev mode with hot-reload |
| `npm run build` | Build a static production bundle |
| `npm run preview` | Preview the production build locally |
| `npm run astro` | Run arbitrary Astro CLI commands |
| `npm run lint` | Run ESLint over the entire project |
| `npm run lint:fix` | ESLint with automatic fixes |
| `npm run format` | Run Prettier formatting |
| `npm run test` | Run all unit tests with Vitest |
| `npm run test:e2e` | Run end-to-end tests with Playwright |

---

## Project scope

MVP delivers the following key capabilities:

* Private user accounts (email + password) powered by Supabase Auth.
* Manual CRUD for flashcards (front / back fields).
* AI generation of candidate flashcards from pasted text (1 k – 10 k chars).
* Review workflow – accept, edit, or reject each candidate before bulk save.
* Integration with a ready-made spaced-repetition algorithm for study sessions.
* Basic product analytics stored in database logs (no external analytics).

Out of scope for MVP:

* Mobile applications.
* Advanced custom SRS algorithms.
* Import/export in formats other than raw text.
* Sharing decks between users.
* Integrations with external learning platforms.

For full functional and non-functional requirements see [`./.ai/prod.md`](./.ai/prod.md).

---

## Project status

| Version | Stage | Build | Coverage |
|---------|-------|-------|----------|
| `0.0.1` | 🛠️ Active development (MVP) | ![CI](https://github.com/grabskak/natigo/actions/workflows/ci.yml/badge.svg) | — |

Roadmap:

1. Finish authentication flow & RLS.
2. Implement AI generation screen & reviewer UI.
3. Integrate SRS queue & study session.
4. Deploy preview to DigitalOcean.

---

## License

This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for details.

