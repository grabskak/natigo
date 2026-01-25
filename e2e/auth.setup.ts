/**
 * Authentication Setup for E2E Tests
 *
 * This file runs once before all tests to create an authenticated session
 * and save it to storage state. This significantly speeds up test execution
 * by avoiding repeated UI login flows.
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

  // Submit form
  await submitButton.click();

  console.log("[AUTH SETUP] Form submitted, waiting for redirect");

  // Wait for successful redirect to flashcards page
  await page.waitForURL("/flashcards", { timeout: 15000 });

  console.log("[AUTH SETUP] Redirected to flashcards");

  // Verify we're actually logged in by checking for authenticated content
  // (e.g., the generate button should be visible for authenticated users)
  await expect(page.getByTestId("flashcards-generate-button")).toBeVisible({ timeout: 5000 });

  console.log("[AUTH SETUP] Authentication verified, saving storage state");

  // Save signed-in state to 'authFile'
  await page.context().storageState({ path: authFile });

  console.log("[AUTH SETUP] Storage state saved");
});
