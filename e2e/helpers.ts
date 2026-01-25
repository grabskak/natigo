import { Page } from "@playwright/test";

/**
 * Test helpers and utilities for E2E tests
 */

/**
 * Wait for toast notification to appear
 */
export async function waitForToast(page: Page, message?: string) {
  const toast = page.locator("[data-sonner-toast]");
  await toast.waitFor({ state: "visible", timeout: 5000 });

  if (message) {
    await page.waitForSelector(`text=${message}`, { timeout: 5000 });
  }

  return toast;
}

/**
 * Wait for toast to disappear
 */
export async function waitForToastClose(page: Page) {
  const toast = page.locator("[data-sonner-toast]");
  await toast.waitFor({ state: "hidden", timeout: 10000 });
}

/**
 * Extract flashcard ID from card element
 */
export async function extractFlashcardId(cardLocator: any): Promise<string> {
  const testId = await cardLocator.getAttribute("data-testid");
  if (!testId) {
    throw new Error("Card does not have data-testid attribute");
  }
  return testId.replace("flashcard-card-", "");
}

/**
 * Generate test text with specific character count
 */
export function generateText(charCount: number, pattern = "Lorem ipsum "): string {
  const repetitions = Math.ceil(charCount / pattern.length);
  return pattern.repeat(repetitions).substring(0, charCount);
}

/**
 * Wait for network to be idle
 */
export async function waitForNetworkIdle(page: Page, timeout = 5000) {
  await page.waitForLoadState("networkidle", { timeout });
}

/**
 * Check if element is in viewport
 */
export async function isInViewport(page: Page, locator: any): Promise<boolean> {
  return await locator.evaluate((element: Element) => {
    const rect = element.getBoundingClientRect();
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
  });
}

/**
 * Scroll element into view
 */
export async function scrollIntoView(locator: any) {
  await locator.evaluate((element: Element) => {
    element.scrollIntoView({ behavior: "smooth", block: "center" });
  });
}

/**
 * Get current URL search params as object
 */
export async function getSearchParams(page: Page): Promise<Record<string, string>> {
  const url = new URL(page.url());
  const params: Record<string, string> = {};
  url.searchParams.forEach((value, key) => {
    params[key] = value;
  });
  return params;
}

/**
 * Login helper (reusable across tests)
 */
export async function quickLogin(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByTestId("auth-email-input").fill(email);
  await page.getByTestId("auth-password-input").fill(password);
  await page.getByTestId("auth-submit-button").click();
  await page.waitForURL("/flashcards", { timeout: 10000 });
}

/**
 * Clear local storage and cookies
 */
export async function clearAuth(page: Page) {
  await page.context().clearCookies();
  // Only clear localStorage if we're on a page (not about:blank)
  try {
    await page.evaluate(() => localStorage.clear());
  } catch {
    // Ignore if we can't access localStorage (e.g., on about:blank)
  }
}

/**
 * Mock API response for testing
 */
export async function mockApiResponse(page: Page, url: string | RegExp, response: any, status = 200) {
  await page.route(url, (route) => {
    route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify(response),
    });
  });
}

/**
 * Wait for API call to complete
 */
export async function waitForApiCall(page: Page, url: string | RegExp, timeout = 10000) {
  const responsePromise = page.waitForResponse(url, { timeout });
  return await responsePromise;
}

/**
 * Take screenshot with timestamp
 */
export async function takeTimestampedScreenshot(page: Page, name: string) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  await page.screenshot({
    path: `screenshots/${name}-${timestamp}.png`,
    fullPage: true,
  });
}

/**
 * Get element bounding box
 */
export async function getBoundingBox(locator: any) {
  return await locator.boundingBox();
}

/**
 * Random email generator for testing
 */
export function generateTestEmail(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  return `test-${timestamp}-${random}@example.com`;
}

/**
 * Random password generator
 */
export function generateTestPassword(length = 12): string {
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
  let password = "";
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
}
