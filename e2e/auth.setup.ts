/**
 * Authentication Setup for E2E Tests
 *
 * This file runs once before all tests to create an authenticated session
 * and save it to storage state. This significantly speeds up test execution
 * by avoiding repeated UI login flows.
 *
 * IMPORTANT: Before running E2E tests, ensure the test user exists in Supabase:
 * 1. Set E2E_USERNAME and E2E_PASSWORD in .env.test
 * 2. Create the user in Supabase (either manually or via the register page)
 * 3. Confirm the user's email (check Supabase dashboard or disable email confirmation)
 */

import { test as setup, expect } from "@playwright/test";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const authFile = path.join(__dirname, "../.auth/user.json");

setup("authenticate", async ({ page }) => {
  const email = process.env.E2E_USERNAME || "test@gmail.com";
  const password = process.env.E2E_PASSWORD || "tets!";

  if (!process.env.E2E_USERNAME || !process.env.E2E_PASSWORD) {
    throw new Error(
      "E2E_USERNAME and E2E_PASSWORD must be set in .env.test file. " + "See e2e/README.md for setup instructions."
    );
  }

  console.log(`[AUTH SETUP] Attempting login with email: ${email}`);

  // Navigate to login page
  await page.goto("/login");
  await page.waitForLoadState("networkidle");

  console.log("[AUTH SETUP] Login page loaded");

  // Fill in login form using test IDs
  const emailInput = page.getByTestId("auth-email-input");
  const passwordInput = page.getByTestId("auth-password-input");
  const submitButton = page.getByTestId("auth-submit-button");

  await emailInput.waitFor({ state: "visible" });
  await emailInput.fill(email);

  await passwordInput.waitFor({ state: "visible" });
  await passwordInput.fill(password);

  console.log("[AUTH SETUP] Credentials filled, submitting form");

  // Submit form and wait for navigation
  await submitButton.click();

  // Check if login failed (error message appears)
  const errorMessage = page.getByTestId("auth-form-error");
  const hasError = await errorMessage.isVisible().catch(() => false);

  if (hasError) {
    const errorText = await errorMessage.textContent();
    throw new Error(
      `Login failed: ${errorText}\n\n` +
        `Please ensure:\n` +
        `1. The test user (${email}) exists in Supabase\n` +
        `2. The password in .env.test is correct\n` +
        `3. The user's email is confirmed (check Supabase dashboard)\n\n` +
        `You can create the test user by:\n` +
        `- Registering manually at http://localhost:3000/register\n` +
        `- Or creating it directly in Supabase dashboard`
    );
  }

  // Wait for successful redirect to flashcards page
  await page.waitForURL("/flashcards", { timeout: 10000 });

  console.log("[AUTH SETUP] Redirected to flashcards");

  // Verify we're actually logged in by checking for authenticated content
  // (e.g., the generate button should be visible for authenticated users)
  await expect(page.getByTestId("flashcards-generate-button")).toBeVisible({ timeout: 5000 });

  //console.log("[AUTH SETUP] Authentication verified, saving storage state");

  // Save signed-in state to 'authFile'
  await page.context().storageState({ path: authFile });

  //console.log("[AUTH SETUP] Storage state saved");
});
