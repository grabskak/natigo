# Testing Environment

This project uses Vitest for unit testing and Playwright for E2E testing.

## Unit Testing with Vitest

### Running Tests

```bash
# Run tests once
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage
```

### Writing Unit Tests

Unit tests are located alongside the code they test with `.test.ts` or `.test.tsx` extensions.

Example test structure:

```typescript
import { describe, it, expect } from "vitest";
import { render, screen } from "@/test/test-utils";
import { MyComponent } from "./MyComponent";

describe("MyComponent", () => {
  it("should render correctly", () => {
    render(<MyComponent />);
    expect(screen.getByText("Hello")).toBeInTheDocument();
  });
});
```

### Test Utilities

- `src/test/setup.ts` - Global test setup and mocks
- `src/test/test-utils.tsx` - Custom render function and utilities
- `src/test/mocks/` - Mock implementations (e.g., Supabase)

### Best Practices

- Use the `vi` object for mocks and spies
- Leverage `describe` blocks to group related tests
- Follow the Arrange-Act-Assert pattern
- Use meaningful test descriptions
- Mock external dependencies (API calls, Supabase, etc.)

## E2E Testing with Playwright

### Running E2E Tests

```bash
# Run E2E tests
npm run test:e2e

# Run E2E tests with UI
npm run test:e2e:ui

# Debug E2E tests
npm run test:e2e:debug

# Generate tests with codegen
npm run test:e2e:codegen
```

### Writing E2E Tests

E2E tests are located in the `e2e/` directory. Use the Page Object Model pattern for maintainability.

#### Page Object Example

```typescript
// e2e/pages/my-page.page.ts
import { type Page, type Locator } from "@playwright/test";

export class MyPage {
  readonly page: Page;
  readonly heading: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole("heading", { level: 1 });
  }

  async goto() {
    await this.page.goto("/my-page");
  }
}
```

#### Test Example

```typescript
// e2e/my-feature.spec.ts
import { test, expect } from "@playwright/test";
import { MyPage } from "./pages/my-page.page";

test.describe("My Feature", () => {
  test("should work correctly", async ({ page }) => {
    const myPage = new MyPage(page);
    await myPage.goto();
    
    await expect(myPage.heading).toBeVisible();
  });
});
```

### Best Practices

- Use Page Object Model for reusable page interactions
- Use semantic locators (getByRole, getByLabel, getByText)
- Implement proper test isolation with beforeEach/afterEach hooks
- Use expect assertions with specific matchers
- Leverage parallel execution for faster test runs
- Use traces and screenshots for debugging failures

## Configuration

- `vitest.config.ts` - Vitest configuration
- `playwright.config.ts` - Playwright configuration
- Tests run with jsdom environment for DOM testing
- E2E tests run against Chromium browser
- Coverage reports are generated in `coverage/` directory

## CI/CD Integration

Both test suites are configured to run in CI environments:

- Vitest runs with coverage reporting
- Playwright runs with retry logic and video recording on failure
- All tests must pass before deployment
