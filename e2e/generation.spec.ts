/**
 * E2E Tests - Generation Flow
 * Tests for flashcard generation form and validation
 *
 * NOTE: These tests use authenticated storage state from auth.setup.ts
 */

import { test, expect } from "./fixtures";
import { generateText, waitForNetworkIdle } from "./helpers";

test.describe("Generation - Happy Path", () => {
  test("generate flashcards with valid text", async ({ generatePage, longText }) => {
    await generatePage.goto();

    // Fill and submit
    await generatePage.generate(longText);

    // Wait for generation to complete
    await generatePage.waitForGenerationComplete();

    // Should navigate to review page
    await expect(generatePage.page).toHaveURL(/\/generations/);

    // Should show candidates review
    const reviewContainer = generatePage.page.getByTestId("candidates-review-container");
    await expect(reviewContainer).toBeVisible();
  });

  test("character counter updates correctly", async ({ generatePage }) => {
    await generatePage.goto();

    // Initially should show 0
    const counter = generatePage.characterCounter;
    await expect(counter).toBeVisible();

    // Type text and check counter updates
    const text = generateText(1500);
    await generatePage.fillText(text);

    // Counter should reflect the text length
    const counterText = await counter.textContent();
    expect(counterText).toContain("1,500");
    expect(counterText).toContain("10,000");
  });

  test("clear button works", async ({ generatePage, longText }) => {
    await generatePage.goto();

    // Fill text
    await generatePage.fillText(longText);
    await expect(generatePage.inputTextarea).toHaveValue(longText);

    // Clear
    await generatePage.clearText();

    // Should be empty
    await expect(generatePage.inputTextarea).toHaveValue("");

    // Submit should be disabled
    await expect(generatePage.submitButton).toBeDisabled();
  });

  test("instructions visible", async ({ generatePage }) => {
    await generatePage.goto();

    // Should show instructions box
    const instructions = generatePage.page.locator("text=Instrukcja");
    await expect(instructions).toBeVisible();

    // Should mention character limits
    const instructionText = await generatePage.page
      .locator(".bg-blue-50, .dark\\:bg-blue-950\\/30")
      .first()
      .textContent();
    expect(instructionText).toContain("1");
    expect(instructionText).toContain("000");
    expect(instructionText).toContain("10");
  });
});

test.describe("Generation - Validation", () => {
  test("minimum 1000 characters required", async ({ generatePage }) => {
    await generatePage.goto();

    // Try with 999 characters
    const shortText = generateText(999);
    await generatePage.fillText(shortText);

    // Submit should be disabled
    await expect(generatePage.submitButton).toBeDisabled();

    // Should show validation error
    await expect(generatePage.validationError).toBeVisible();
    const errorText = await generatePage.getValidationErrorText();
    expect(errorText).toMatch(/1.*000/);
    expect(errorText).toContain("999");
  });

  test("maximum 10000 characters enforced", async ({ generatePage }) => {
    await generatePage.goto();

    // Try with 10001 characters
    const longText = generateText(10001);
    await generatePage.fillText(longText);

    // Submit should be disabled
    await expect(generatePage.submitButton).toBeDisabled();

    // Should show validation error
    await expect(generatePage.validationError).toBeVisible();
    const errorText = await generatePage.getValidationErrorText();
    expect(errorText).toMatch(/10.*000/);
    expect(errorText).toContain("10,001");
  });

  test("exact minimum (1000 chars) is valid", async ({ generatePage }) => {
    await generatePage.goto();

    // Exactly 1000 characters
    const text = generateText(1000);
    await generatePage.fillText(text);

    // Submit should be enabled
    await expect(generatePage.submitButton).toBeEnabled();

    // No validation error
    await expect(generatePage.validationError).not.toBeVisible();
  });

  test("exact maximum (10000 chars) is valid", async ({ generatePage }) => {
    await generatePage.goto();

    // Exactly 10000 characters
    const text = generateText(10000);
    await generatePage.fillText(text);

    // Submit should be enabled
    await expect(generatePage.submitButton).toBeEnabled();

    // No validation error
    await expect(generatePage.validationError).not.toBeVisible();
  });

  test("whitespace-only text is invalid", async ({ generatePage }) => {
    await generatePage.goto();

    // Fill with only whitespace
    await generatePage.fillText("   \n\n\t\t   ");

    // Submit should be disabled
    await expect(generatePage.submitButton).toBeDisabled();

    // Should show error (after trim, length is 0)
    await expect(generatePage.validationError).toBeVisible();
  });

  test("validation error disappears when valid", async ({ generatePage, longText }) => {
    await generatePage.goto();

    // First, trigger error with short text
    const shortText = generateText(500);
    await generatePage.fillText(shortText);
    await expect(generatePage.validationError).toBeVisible();

    // Now fill with valid text
    await generatePage.fillText(longText);

    // Error should disappear
    await expect(generatePage.validationError).not.toBeVisible();

    // Submit should be enabled
    await expect(generatePage.submitButton).toBeEnabled();
  });
});

test.describe("Generation - Loading State", () => {
  test("shows loading state during generation", async ({ generatePage, longText }) => {
    await generatePage.goto();

    // Fill and submit
    await generatePage.fillText(longText);
    await generatePage.submit();

    // Should show loading immediately
    const isLoading = await generatePage.isLoading();
    expect(isLoading).toBeTruthy();

    // Button should be disabled
    await expect(generatePage.submitButton).toBeDisabled();

    // Textarea should be disabled
    await expect(generatePage.inputTextarea).toBeDisabled();

    // Clear button should be disabled
    await expect(generatePage.clearButton).toBeDisabled();
  });

  test("loading message visible", async ({ generatePage, longText }) => {
    await generatePage.goto();

    await generatePage.fillText(longText);
    await generatePage.submit();

    // Should show loading text
    const buttonText = await generatePage.submitButton.textContent();
    expect(buttonText).toContain("Generowanie");

    // Should show timeout message
    const timeoutMessage = generatePage.page.locator("text=/60 sekund/i");
    await expect(timeoutMessage).toBeVisible();
  });
});

test.describe("Generation - Error Handling", () => {
  test.skip("handles rate limit error (429)", async ({ generatePage, longText, page }) => {
    await generatePage.goto();

    // TODO: Mock API to return 429
    // Generate multiple times to trigger rate limit
    for (let i = 0; i < 11; i++) {
      await generatePage.fillText(longText);
      await generatePage.submit();
      await waitForNetworkIdle(page);
    }

    // Should show rate limit error
    const errorDisplay = page.getByRole("alert");
    await expect(errorDisplay).toBeVisible();
    const errorText = await errorDisplay.textContent();
    expect(errorText).toMatch(/limit|exceeded/i);
  });

  test.skip("handles timeout error (504)", async ({ generatePage, longText, page }) => {
    await generatePage.goto();

    // TODO: Mock API to timeout
    await page.route("**/api/generations", (route) => {
      // Simulate timeout
      setTimeout(() => route.abort(), 61000);
    });

    await generatePage.generate(longText);

    // Should show timeout error
    const errorDisplay = page.getByRole("alert");
    await expect(errorDisplay).toBeVisible();
    const errorText = await errorDisplay.textContent();
    expect(errorText).toMatch(/timeout|60.*sekund/i);
  });

  test.skip("handles generic AI service error", async ({ generatePage, longText, page }) => {
    await generatePage.goto();

    // Mock API error
    await page.route("**/api/generations", (route) => {
      route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({
          error: {
            code: "AI_SERVICE_ERROR",
            message: "AI service temporarily unavailable",
          },
        }),
      });
    });

    await generatePage.generate(longText);

    // Should show error
    const errorDisplay = page.getByRole("alert");
    await expect(errorDisplay).toBeVisible();
  });
});

test.describe("Generation - Navigation", () => {
  test("can navigate to generations from flashcards", async ({ flashcardsPage, generatePage }) => {
    await flashcardsPage.goto();

    // Click generate button
    await flashcardsPage.goToGenerate();

    // Should be on generations page
    await expect(generatePage.page).toHaveURL("/generations");
    await expect(generatePage.form).toBeVisible();
  });

  test("page title and heading visible", async ({ generatePage }) => {
    await generatePage.goto();

    // Should have appropriate title
    await expect(generatePage.page).toHaveTitle(/genero|fiszk/i);

    // Should have heading
    const heading = generatePage.page.getByRole("heading", { level: 1 });
    await expect(heading).toBeVisible();
    const headingText = await heading.textContent();
    expect(headingText).toMatch(/genero|fiszk/i);
  });

  test("protected route - requires authentication", async ({ page, generatePage }) => {
    // Logout first
    await page.context().clearCookies();

    // Try to access
    await generatePage.goto();

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
  });
});
