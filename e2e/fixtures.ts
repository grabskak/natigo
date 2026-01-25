import { test as base, expect } from "@playwright/test";
import { AuthPage, GeneratePage, CandidatesReviewPage, FlashcardsPage } from "./pages";

/**
 * Test fixtures for E2E tests
 * Provides pre-configured page objects and test data
 *
 * NOTE: Tests automatically use authenticated storage state from auth.setup.ts
 * No manual login is required in individual tests!
 */

interface Fixtures {
  authPage: AuthPage;
  generatePage: GeneratePage;
  candidatesReviewPage: CandidatesReviewPage;
  flashcardsPage: FlashcardsPage;
  testUser: { email: string; password: string };
  longText: string;
}

/**
 * Extended test with fixtures
 * All tests using this fixture automatically have authenticated session
 */
export const test = base.extend<Fixtures>({
  // Auth page fixture (kept for tests that explicitly test auth flows)
  authPage: async ({ page }, use) => {
    const authPage = new AuthPage(page);
    await use(authPage);
  },

  // Generate page fixture
  generatePage: async ({ page }, use) => {
    const generatePage = new GeneratePage(page);
    await use(generatePage);
  },

  // Candidates review page fixture
  candidatesReviewPage: async ({ page }, use) => {
    const candidatesReviewPage = new CandidatesReviewPage(page);
    await use(candidatesReviewPage);
  },

  // Flashcards page fixture
  flashcardsPage: async ({ page }, use) => {
    const flashcardsPage = new FlashcardsPage(page);
    await use(flashcardsPage);
  },

  // Test user fixture (kept for reference, but login is done once in setup)
  testUser: async ({}, use) => {
    const testUser = {
      email: process.env.E2E_USERNAME || "test@gmail.com",
      password: process.env.E2E_PASSWORD || "tets!",
    };
    await use(testUser);
  },

  // Long text fixture (for generation)
  longText: async ({}, use) => {
    // Generate text with ~1500 characters (valid for generation)
    const baseText = "Lorem ipsum dolor sit amet, consectetur adipiscing elit. ";
    const longText = baseText.repeat(30); // ~1740 characters
    await use(longText);
  },
});

export { expect };
