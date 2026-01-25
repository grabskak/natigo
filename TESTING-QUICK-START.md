# Testing Quick Start Guide

## Prerequisites

All testing dependencies are already installed. If you need to reinstall:

```bash
# Install all dependencies
npm install
```

For Playwright, you may need to install browsers:

```bash
npx playwright install chromium
```

## Running Tests

### Unit Tests (Vitest)

```bash
# Run all unit tests once
npm test

# Run tests in watch mode (auto-reruns on file changes)
npm run test:watch

# Run tests with visual UI
npm run test:ui

# Run tests with coverage report
npm run test:coverage
```

### E2E Tests (Playwright)

⚠️ **Important**: Make sure the dev server is running before E2E tests!

```bash
# Terminal 1: Start dev server
npm run dev

# Terminal 2: Run E2E tests
npm run test:e2e

# Or use the built-in webServer (starts dev server automatically)
npm run test:e2e

# Run with interactive UI
npm run test:e2e:ui

# Debug tests step-by-step
npm run test:e2e:debug

# Generate new tests interactively
npm run test:e2e:codegen
```

## Writing Your First Test

### Unit Test Example

Create a file next to your component: `MyComponent.test.tsx`

```typescript
import { describe, it, expect } from "vitest";
import { render, screen } from "@/test/test-utils";
import { MyComponent } from "./MyComponent";

describe("MyComponent", () => {
  it("should render text", () => {
    render(<MyComponent text="Hello" />);
    expect(screen.getByText("Hello")).toBeInTheDocument();
  });
});
```

### E2E Test Example

1. Create a Page Object in `e2e/pages/my-page.page.ts`:

```typescript
import { type Page, type Locator } from "@playwright/test";

export class MyPage {
  readonly page: Page;
  readonly myButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.myButton = page.getByRole("button", { name: /click me/i });
  }

  async goto() {
    await this.page.goto("/my-page");
  }
}
```

2. Create a test in `e2e/my-feature.spec.ts`:

```typescript
import { test, expect } from "@playwright/test";
import { MyPage } from "./pages/my-page.page";

test("should click button", async ({ page }) => {
  const myPage = new MyPage(page);
  await myPage.goto();
  
  await myPage.myButton.click();
  await expect(page).toHaveURL(/success/);
});
```

## Test Structure

```
natigo/
├── src/
│   ├── components/
│   │   └── MyComponent.test.tsx      # Component tests
│   ├── lib/
│   │   └── utils.test.ts             # Utility tests
│   └── test/
│       ├── setup.ts                  # Global test setup
│       ├── test-utils.tsx            # Custom render & utilities
│       └── mocks/
│           └── supabase.mock.ts      # Mock implementations
├── e2e/
│   ├── pages/
│   │   ├── home.page.ts              # Page Object Models
│   │   └── login.page.ts
│   ├── home.spec.ts                  # E2E test specs
│   └── login.spec.ts
├── vitest.config.ts                  # Vitest configuration
└── playwright.config.ts              # Playwright configuration
```

## Tips

### Unit Testing Tips

- Use `vi.mock()` to mock external dependencies
- Use `screen.debug()` to see the current DOM state
- Use `userEvent` from `@testing-library/user-event` for realistic interactions
- Mock Supabase client using `createMockSupabaseClient()` from test utils

### E2E Testing Tips

- Always use Page Object Model pattern
- Use semantic locators: `getByRole`, `getByLabel`, `getByText`
- Use `test.beforeEach()` for common setup
- Use `--debug` flag to step through tests
- Use codegen to generate test code: `npm run test:e2e:codegen`
- Check traces in `playwright-report/` after test failures

## Debugging

### Vitest Debugging

```bash
# See which tests are running
npm run test:ui

# Debug in VS Code
# Add breakpoint, then run "JavaScript Debug Terminal" and run tests
```

### Playwright Debugging

```bash
# Step through tests with Playwright Inspector
npm run test:e2e:debug

# View trace of last test run
npx playwright show-trace trace.zip
```

## Common Issues

### "Cannot find module '@/...'"

Make sure path aliases are configured in both `tsconfig.json` and test configs.

### E2E tests timing out

1. Check if dev server is running
2. Increase timeout in `playwright.config.ts`
3. Check network requests in trace viewer

### Tests pass locally but fail in CI

1. Ensure deterministic test data
2. Add proper waits for async operations
3. Check for race conditions

## Next Steps

1. Write tests for new features before implementing them (TDD)
2. Run tests before committing code
3. Review test coverage reports regularly
4. Update Page Objects when UI changes
5. Keep tests maintainable and DRY

For more details, see [TESTING.md](./TESTING.md)
