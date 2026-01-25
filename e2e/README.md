# E2E Testing - Authentication Optimization

## Overview

This project uses **Storage State** for authentication in E2E tests. This significantly improves test execution speed by authenticating once and reusing the session across all tests.

## How It Works

### 1. Setup Project (`auth.setup.ts`)

Before any tests run, Playwright executes the setup project which:

1. **Authenticates via API** - Uses `/api/auth/login` endpoint (faster than UI login)
2. **Verifies authentication** - Navigates to `/flashcards` to ensure the session is valid
3. **Saves storage state** - Stores cookies and localStorage to `.auth/user.json`

```typescript
// e2e/auth.setup.ts
setup("authenticate", async ({ page, request }) => {
  // Login via API
  await request.post("/api/auth/login", {
    data: { email, password }
  });
  
  // Verify authentication
  await page.goto("/flashcards");
  
  // Save session
  await page.context().storageState({ path: authFile });
});
```

### 2. Test Project Configuration (`playwright.config.ts`)

The main test project is configured to:

1. **Depend on setup** - Ensures authentication runs first
2. **Use storage state** - All tests start with authenticated session

```typescript
projects: [
  { name: "setup", testMatch: /.*\.setup\.ts/ },
  {
    name: "chromium",
    use: { storageState: ".auth/user.json" },
    dependencies: ["setup"]
  }
]
```

### 3. Tests (`*.spec.ts`)

Tests no longer need `beforeEach` login hooks:

```typescript
// ❌ OLD - Login before each test
test.describe("Flashcards", () => {
  test.beforeEach(async ({ authPage, testUser }) => {
    await authPage.login(testUser.email, testUser.password);
  });
  
  test("displays list", async ({ flashcardsPage }) => {
    await flashcardsPage.goto();
    // test code...
  });
});

// ✅ NEW - Already authenticated
test.describe("Flashcards", () => {
  test("displays list", async ({ flashcardsPage }) => {
    await flashcardsPage.goto();
    // test code...
  });
});
```

## Performance Benefits

### Before Optimization
- **Each test**: 
  - Navigate to `/login` (~500ms)
  - Fill form (~200ms)
  - Submit and wait for redirect (~1000ms)
  - **Total per test**: ~1.7s overhead
- **50 tests**: ~85 seconds wasted on authentication

### After Optimization
- **One-time setup**: ~2 seconds
- **Each test**: 0ms authentication overhead
- **50 tests**: ~2 seconds total for auth
- **Time saved**: ~83 seconds (98% reduction!)

## Directory Structure

```
e2e/
├── auth.setup.ts           # Authentication setup (runs once)
├── fixtures.ts             # Test fixtures with storage state
├── flashcards-crud.spec.ts # Tests (no login needed)
├── pages/                  # Page Object Models
│   ├── auth.page.ts
│   ├── flashcards.page.ts
│   └── ...
└── helpers.ts              # Test utilities

.auth/                      # Git-ignored
└── user.json              # Stored authentication state
```

## Testing Authentication Flows

If you need to test authentication itself (login, logout, etc.), you can still do so:

```typescript
test("user can login", async ({ page, authPage, testUser }) => {
  // Clear existing session first
  await page.context().clearCookies();
  
  // Now test login flow
  await authPage.login(testUser.email, testUser.password);
  await expect(page).toHaveURL("/flashcards");
});
```

## Configuration

### Environment Variables

Set these in `.env.test`:

```bash
E2E_USERNAME=test@example.com
E2E_PASSWORD=your-password
```

### Storage State Location

- **Path**: `.auth/user.json`
- **Git**: Ignored (in `.gitignore`)
- **Regeneration**: Automatic on each test run

## Troubleshooting

### Session Expired

If tests fail with authentication errors:

1. Delete `.auth/user.json`
2. Run tests again (setup will regenerate)

```bash
rm -rf .auth
npx playwright test
```

### Setup Fails

If `auth.setup.ts` fails:

1. Check credentials in `.env.test`
2. Ensure dev server is running
3. Check `/api/auth/login` endpoint is working

```bash
# Verify credentials
cat .env.test

# Test API manually
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"your-password"}'
```

### Tests Run in Parallel

Storage state works perfectly with parallel execution:
- Each test gets its own browser context
- All contexts share the same authenticated session
- No conflicts or race conditions

## Best Practices

### ✅ DO

- Use storage state for authenticated tests
- Keep `auth.setup.ts` simple and focused
- Clear cookies when testing authentication flows
- Regenerate storage state on test failure

### ❌ DON'T

- Commit `.auth/` directory to git
- Login in `beforeEach` for protected routes
- Share passwords in code (use env vars)
- Modify storage state manually

## Alternative: API Login Without Storage State

If you prefer API login per test (without storage state), you can use:

```typescript
// In fixtures.ts
export const test = base.extend({
  authenticatedPage: async ({ page, request }, use) => {
    // Login via API before each test
    await request.post("/api/auth/login", {
      data: {
        email: process.env.E2E_USERNAME,
        password: process.env.E2E_PASSWORD,
      },
    });
    await use(page);
  },
});

// In test
test("example", async ({ authenticatedPage }) => {
  await authenticatedPage.goto("/flashcards");
  // Already authenticated!
});
```

This is faster than UI login but slower than storage state.

## Comparison

| Method | Speed | Complexity | Best For |
|--------|-------|------------|----------|
| **Storage State** | ⚡⚡⚡ Fastest | Simple | Most tests |
| **API Login** | ⚡⚡ Fast | Medium | Per-test isolation |
| **UI Login** | ⚡ Slow | Simple | Auth flow tests |

## Migration Guide

To migrate other test files to use storage state:

1. **Remove** `beforeEach` login hooks:
```typescript
// Delete this
test.beforeEach(async ({ authPage, testUser }) => {
  await authPage.login(testUser.email, testUser.password);
});
```

2. **Tests work as-is** - They're already authenticated!

3. **For auth tests** - Clear cookies first:
```typescript
test("test auth", async ({ page }) => {
  await page.context().clearCookies();
  // Now test authentication...
});
```

## References

- [Playwright Authentication Guide](https://playwright.dev/docs/auth)
- [Storage State API](https://playwright.dev/docs/api/class-browsercontext#browser-context-storage-state)
- [Global Setup](https://playwright.dev/docs/test-global-setup-teardown)
