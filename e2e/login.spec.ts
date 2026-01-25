import { test, expect } from "@playwright/test";
import { LoginPage } from "./pages/login.page";

test.describe("Login Page", () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.goto();
  });

  test("should display login form elements", async ({ page }) => {
    // Verify page title
    await expect(page).toHaveTitle(/natigo/i);

    // Verify form elements are visible
    await expect(loginPage.emailInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(loginPage.submitButton).toBeVisible();
  });

  test("should show validation error for empty form submission", async () => {
    await loginPage.submit();

    // Browser native validation should prevent submission
    // or app should show validation message
    await expect(loginPage.emailInput).toBeFocused();
  });

  test("should show error for invalid credentials", async () => {
    await loginPage.login("invalid@example.com", "wrongpassword");

    // Wait for error message to appear
    await expect(loginPage.errorMessage).toBeVisible({ timeout: 5000 });

    const errorText = await loginPage.getErrorText();
    expect(errorText).toBeTruthy();
  });

  test("should navigate to registration page", async ({ page }) => {
    await loginPage.goToRegister();

    // Verify navigation
    await expect(page).toHaveURL(/\/register/);
  });

  test("should navigate to reset password page", async ({ page }) => {
    await loginPage.goToResetPassword();

    // Verify navigation
    await expect(page).toHaveURL(/\/reset-password/);
  });

  test("should have proper accessibility attributes", async ({ page }) => {
    // Check form labels
    await expect(loginPage.emailInput).toHaveAttribute("type", "email");
    await expect(loginPage.passwordInput).toHaveAttribute("type", "password");

    // Check form has proper structure
    const form = page.locator("form");
    await expect(form).toBeVisible();
  });
});
