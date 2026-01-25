import { test as base, expect } from "@playwright/test";
import {
  AuthPage,
  GeneratePage,
  CandidatesReviewPage,
  FlashcardsPage,
} from "./pages";

/**
 * Test fixtures for E2E tests
 * Provides pre-configured page objects and test data
 */

type Fixtures = {
  authPage: AuthPage;
  generatePage: GeneratePage;
  candidatesReviewPage: CandidatesReviewPage;
  flashcardsPage: FlashcardsPage;
  testUser: { email: string; password: string };
  longText: string;
};

/**
 * Extended test with fixtures
 */
export const test = base.extend<Fixtures>({
  // Auth page fixture
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

  // Test user fixture
  testUser: async ({}, use) => {
    // TODO: Replace with actual test user from seed data
    const testUser = {
      email: process.env.TEST_USER_EMAIL || "test@example.com",
      password: process.env.TEST_USER_PASSWORD || "password123",
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
