# E2E Tests Documentation

## Overview

This directory contains comprehensive end-to-end tests for the Natigo flashcard application. The tests cover the critical user journey: **Authentication → Flashcard List → Generation → Review → Save → List → CRUD Operations**.

## Test Structure

### Test Files

1. **`auth.spec.ts`** - Authentication flows
   - Login (successful, failed, validation)
   - Registration (successful, validation, email confirmation)
   - Logout
   - Middleware protection

2. **`generation.spec.ts`** - Flashcard generation
   - Happy path (valid text input)
   - Validation (min/max character limits)
   - Loading states
   - Error handling (rate limits, timeouts)

3. **`candidates-review.spec.ts`** - Review generated candidates
   - Display and navigation
   - Accept candidates
   - Edit candidates (enter edit mode, save, cancel)
   - Reject candidates
   - Save to collection
   - Error handling

4. **`flashcards-crud.spec.ts`** - Flashcard management
   - List display
   - Create (add new flashcard)
   - Read (display flashcard content)
   - Update (edit existing flashcard)
   - Delete (remove flashcard)
   - Validation

5. **`filters-sorting.spec.ts`** - List filtering and sorting
   - Sort by date (newest/oldest)
   - Sort alphabetically (A-Z/Z-A)
   - Filter by source (AI/Manual/All)
   - Pagination (if implemented)
   - Combined filters

6. **`critical-path-integration.spec.ts`** - Full integration tests
   - Complete user journey (register → generate → review → save → CRUD)
   - Quick happy path
   - Edge cases (all rejections, cancel before save)
   - Multiple generation cycles

### Support Files

- **`pages/`** - Page Object Model classes
  - `auth.page.ts` - Authentication page
  - `generate.page.ts` - Generation page
  - `candidates-review.page.ts` - Review page
  - `flashcards.page.ts` - Flashcard list and CRUD
  - `index.ts` - Exports all pages

- **`fixtures.ts`** - Test fixtures
  - Page objects
  - Test data (users, sample text)
  - Reusable test setup

- **`helpers.ts`** - Helper functions
  - `generateText()` - Create text of specific length
  - `clearAuth()` - Clear authentication
  - `waitForNetworkIdle()` - Wait for network requests
  - etc.

## Running Tests

### Run All Tests

```bash
npm run test:e2e
```

### Run Specific Test File

```bash
npx playwright test auth.spec.ts
```

### Run Tests in UI Mode

```bash
npx playwright test --ui
```

### Run Tests in Headed Mode (See Browser)

```bash
npx playwright test --headed
```

### Debug Tests

```bash
npx playwright test --debug
```

## Test Coverage

### Critical Path ✅

The main user flow is comprehensively tested:

1. **Authentication**
   - User registration
   - Email confirmation (UI only, actual email skipped in tests)
   - User login
   - Protected route access

2. **Navigation**
   - Landing on flashcards list after login
   - Navigate to generation page
   - Return to list after saving

3. **Generation**
   - Input text (1,000-10,000 characters)
   - Submit for AI generation
   - Wait for candidates to be created

4. **Review**
   - Display generated candidates
   - Accept candidates
   - Edit candidate content
   - Reject unwanted candidates
   - See live counter of accepted candidates

5. **Save**
   - Save accepted candidates to collection
   - Redirect to flashcard list
   - Verify flashcards appear

6. **CRUD Operations**
   - View all flashcards
   - Add manual flashcard
   - Edit existing flashcard
   - Delete flashcard

7. **Filters & Sorting**
   - Filter by source (AI/Manual)
   - Sort by date or alphabetically
   - Combine multiple filters

### Edge Cases Covered

- Empty states (no flashcards)
- Validation errors (all forms)
- Network errors (mocked in skipped tests)
- Rapid user interactions
- Very long content
- Cancel/abort operations
- Multiple cycles of generation

## Test Data

### Test Users

Defined in `fixtures.ts`:

```typescript
{
  email: "test@example.com",
  password: "testpassword"
}
```

### Sample Text

- `shortText` - 500 characters (below minimum)
- `longText` - 2,000 characters (valid)
- `maxText` - 10,000 characters (maximum)
- `tooLongText` - 10,001 characters (above maximum)

## Best Practices Used

### Page Object Model (POM)

All UI interactions are encapsulated in page objects:

```typescript
// Good ✅
await authPage.login(email, password);
await flashcardsPage.addFlashcard(front, back);

// Bad ❌
await page.fill('[data-testid="auth-email-input"]', email);
await page.click('[data-testid="auth-submit-button"]');
```

### Test Isolation

Each test is independent:
- `beforeEach` hooks set up clean state
- Tests don't depend on execution order
- Authentication is fresh for each test

### Descriptive Test Names

```typescript
test("successful login with valid credentials", async () => { ... });
test("validation: cannot create with empty front", async () => { ... });
```

### Fixtures for Reusability

Common setup extracted to fixtures:

```typescript
test("...", async ({ authPage, testUser, flashcardsPage }) => {
  // authPage, testUser, flashcardsPage are available automatically
});
```

### Data-testid Selectors

All interactive elements have stable `data-testid` attributes:

```typescript
await page.getByTestId("auth-email-input");
await page.getByTestId("flashcard-card-123-edit-button");
```

### Error Handling

Tests verify both success and failure paths:
- Valid data → success
- Invalid data → error message shown
- Network failures → graceful degradation

## Known Limitations

### Skipped Tests

Some tests are marked with `.skip()` due to:
- Missing API mocking setup (rate limits, timeouts)
- Features not yet implemented (pagination, search)
- Email confirmation (requires external service)

To enable:
1. Set up proper API mocking
2. Implement the feature
3. Remove `.skip()`

### Test Data Cleanup

Currently, tests may create data that persists. Consider:
- Using a dedicated test database
- Implementing cleanup hooks
- Resetting database before test runs

## Debugging Tips

### Use Playwright Inspector

```bash
npx playwright test --debug
```

### Take Screenshots on Failure

Already configured in `playwright.config.ts`:
```typescript
use: {
  screenshot: 'only-on-failure',
  trace: 'retain-on-failure',
}
```

### View Test Report

```bash
npx playwright show-report
```

### Check Network Requests

```typescript
page.on('request', request => console.log(request.url()));
page.on('response', response => console.log(response.status()));
```

## Maintenance

### Adding New Tests

1. Identify the user flow or feature to test
2. Create appropriate POM methods if needed
3. Write test in relevant spec file
4. Add necessary `data-testid` to components
5. Run and verify test passes

### Updating Tests

When UI changes:
1. Update POM locators first
2. Run tests to identify failures
3. Update test logic if behavior changed
4. Verify all related tests still pass

### Refactoring

- Keep POM methods focused and reusable
- Extract common patterns to helpers
- Update documentation when structure changes

## CI/CD Integration

Add to your CI pipeline:

```yaml
# Example GitHub Actions
- name: Run E2E Tests
  run: |
    npm install
    npx playwright install --with-deps
    npm run test:e2e
```

## Contact

For questions or issues with E2E tests, refer to:
- `TESTING.md` - General testing documentation
- `playwright.config.ts` - Playwright configuration
- `.ai/test-plan.md` - Overall test strategy

---

**Last Updated:** 2026-01-25
