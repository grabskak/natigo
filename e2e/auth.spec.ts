/**
 * E2E Tests - Authentication Flow
 * Tests for login, registration, and email confirmation
 */

import { test, expect } from "./fixtures";
import { clearAuth } from "./helpers";

test.describe("Authentication - Login", () => {
  test.beforeEach(async ({ page }) => {
    await clearAuth(page);
  });

  test("successful login with valid credentials", async ({ authPage, testUser }) => {
    await authPage.gotoLogin();

    // Fill credentials
    await authPage.fillLoginCredentials(testUser.email, testUser.password);
    await authPage.submit();

    // Should redirect to flashcards
    await expect(authPage.page).toHaveURL("/flashcards");

    // Should not show any errors
    await expect(authPage.formError).not.toBeVisible();
  });

  test("failed login with invalid email", async ({ authPage }) => {
    await authPage.gotoLogin();

    // Try invalid email
    await authPage.fillLoginCredentials("nonexistent@example.com", "wrongpassword");
    await authPage.submit();

    // Should show error (neutral message)
    await expect(authPage.formError).toBeVisible();
    const errorText = await authPage.getFormErrorText();
    expect(errorText).toContain("Invalid email or password");

    // Should stay on login page
    await expect(authPage.page).toHaveURL(/\/login/);
  });

  test("failed login with invalid password", async ({ authPage, testUser }) => {
    await authPage.gotoLogin();

    // Try valid email but wrong password
    await authPage.fillLoginCredentials(testUser.email, "wrongpassword123");
    await authPage.submit();

    // Should show error (neutral message)
    await expect(authPage.formError).toBeVisible();
    const errorText = await authPage.getFormErrorText();
    expect(errorText).toContain("Invalid email or password");
  });

  test("validation: empty email", async ({ authPage }) => {
    await authPage.gotoLogin();

    // Try to submit with empty email
    await authPage.passwordInput.fill("password123");
    await authPage.submit();

    // Should show email validation error
    await expect(authPage.emailError).toBeVisible();
    const errorText = await authPage.emailError.textContent();
    expect(errorText).toContain("wymagany");
  });

  test("validation: empty password", async ({ authPage, testUser }) => {
    await authPage.gotoLogin();

    // Try to submit with empty password
    await authPage.emailInput.fill(testUser.email);
    await authPage.submit();

    // Should show password validation error
    await expect(authPage.passwordError).toBeVisible();
    const errorText = await authPage.passwordError.textContent();
    expect(errorText).toContain("wymagane");
  });

  test("validation: invalid email format", async ({ authPage }) => {
    await authPage.gotoLogin();

    // Try invalid email format
    await authPage.emailInput.fill("notanemail");
    await authPage.passwordInput.fill("password123");
    await authPage.submit();

    // Should show email format error
    await expect(authPage.emailError).toBeVisible();
    const errorText = await authPage.emailError.textContent();
    expect(errorText).toMatch(/poprawny|valid/i);
  });

  test("redirect to register page", async ({ authPage }) => {
    await authPage.gotoLogin();

    // Click register link
    await authPage.goToRegisterPage();

    // Should navigate to register
    await expect(authPage.page).toHaveURL(/\/register/);
  });

  test("redirect to reset password page", async ({ authPage }) => {
    await authPage.gotoLogin();

    // Click reset password link
    await authPage.goToResetPassword();

    // Should navigate to reset password
    await expect(authPage.page).toHaveURL(/\/reset-password/);
  });

  test("logged in user redirected from login page", async ({ authPage, testUser }) => {
    // First login
    await authPage.login(testUser.email, testUser.password);
    await expect(authPage.page).toHaveURL("/flashcards");

    // Try to access login page again
    await authPage.gotoLogin();

    // Should redirect back to flashcards
    await expect(authPage.page).toHaveURL("/flashcards");
  });
});

test.describe("Authentication - Registration", () => {
  test.beforeEach(async ({ page }) => {
    await clearAuth(page);
  });

  test("successful registration with valid data", async ({ authPage }) => {
    await authPage.gotoRegister();

    // Generate unique email
    const timestamp = Date.now();
    const email = `test-${timestamp}@example.com`;
    const password = "ValidPassword123!";

    // Fill registration form
    await authPage.fillRegisterForm(email, password, password);
    await authPage.submit();

    // Should show email confirmation message
    await expect(authPage.emailConfirmationMessage).toBeVisible();
    await expect(authPage.goToLoginLink).toBeVisible();

    // Message should contain the email
    const messageText = await authPage.emailConfirmationMessage.textContent();
    expect(messageText).toContain(email);
  });

  test("validation: password too short", async ({ authPage }) => {
    await authPage.gotoRegister();

    // Try short password
    await authPage.emailInput.fill("test@example.com");
    await authPage.passwordInput.fill("short");
    await authPage.confirmPasswordInput.fill("short");
    await authPage.submit();

    // Should show password length error
    await expect(authPage.passwordError).toBeVisible();
    const errorText = await authPage.passwordError.textContent();
    expect(errorText).toMatch(/8.*znak/i);
  });

  test("validation: passwords don't match", async ({ authPage }) => {
    await authPage.gotoRegister();

    // Fill with mismatched passwords
    await authPage.emailInput.fill("test@example.com");
    await authPage.passwordInput.fill("ValidPassword123!");
    await authPage.confirmPasswordInput.fill("DifferentPassword123!");
    await authPage.submit();

    // Should show password mismatch error
    await expect(authPage.confirmPasswordError).toBeVisible();
    const errorText = await authPage.confirmPasswordError.textContent();
    expect(errorText).toMatch(/takie same|match/i);
  });

  test("validation: email already in use", async ({ authPage, testUser }) => {
    await authPage.gotoRegister();

    // Try to register with existing email
    await authPage.fillRegisterForm(testUser.email, "NewPassword123!", "NewPassword123!");
    await authPage.submit();

    // Should show email already exists error
    await expect(authPage.formError).toBeVisible();
    const errorText = await authPage.getFormErrorText();
    expect(errorText).toMatch(/już.*zarejestrowany|already.*use/i);
  });

  test("email confirmation: navigate to login", async ({ authPage }) => {
    await authPage.gotoRegister();

    // Register
    const timestamp = Date.now();
    const email = `test-${timestamp}@example.com`;
    await authPage.fillRegisterForm(email, "Password123!", "Password123!");
    await authPage.submit();

    // Click go to login link
    await expect(authPage.emailConfirmationMessage).toBeVisible();
    await authPage.goToLoginFromConfirmation();

    // Should navigate to login page
    await expect(authPage.page).toHaveURL(/\/login/);

    // Email should be pre-filled (if implemented)
    // await expect(authPage.emailInput).toHaveValue(email);
  });

  test("email confirmation: change email", async ({ authPage }) => {
    await authPage.gotoRegister();

    // Register
    const email = `test-${Date.now()}@example.com`;
    await authPage.fillRegisterForm(email, "Password123!", "Password123!");
    await authPage.submit();

    // Click change email button
    await expect(authPage.emailConfirmationMessage).toBeVisible();
    await authPage.changeEmailButton.click();

    // Should return to registration form
    await expect(authPage.emailConfirmationMessage).not.toBeVisible();
    await expect(authPage.form).toBeVisible();
  });

  test("redirect to login page", async ({ authPage }) => {
    await authPage.gotoRegister();

    // Click login link
    const loginLink = authPage.page.getByRole("link", { name: /zaloguj|log in/i });
    await loginLink.click();

    // Should navigate to login
    await expect(authPage.page).toHaveURL(/\/login/);
  });

  test("logged in user redirected from register page", async ({ authPage, testUser }) => {
    // First login
    await authPage.login(testUser.email, testUser.password);
    await expect(authPage.page).toHaveURL("/flashcards");

    // Try to access register page
    await authPage.gotoRegister();

    // Should redirect back to flashcards
    await expect(authPage.page).toHaveURL("/flashcards");
  });
});

test.describe("Authentication - Logout", () => {
  test("successful logout", async ({ authPage, testUser, page }) => {
    // First login
    await authPage.login(testUser.email, testUser.password);
    await expect(page).toHaveURL("/flashcards");

    // TODO: Implement logout button in UI
    // For now, we can test by clearing auth manually
    await clearAuth(page);

    // Try to access protected page
    await page.goto("/flashcards");

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
  });

  test("after logout, cannot access protected pages", async ({ authPage, testUser, page }) => {
    // Login
    await authPage.login(testUser.email, testUser.password);

    // Logout
    await clearAuth(page);

    // Try protected pages
    await page.goto("/generations");
    await expect(page).toHaveURL(/\/login/);

    await page.goto("/flashcards");
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("Authentication - Middleware Protection", () => {
  test.beforeEach(async ({ page }) => {
    await clearAuth(page);
  });

  test("unauthenticated user redirected from /generations", async ({ page }) => {
    await page.goto("/generations");

    // Should redirect to login with next parameter
    await expect(page).toHaveURL(/\/login\?next=/);
  });

  test("unauthenticated user redirected from /flashcards", async ({ page }) => {
    await page.goto("/flashcards");

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
  });

  test("next parameter works after login", async ({ authPage, testUser, page }) => {
    // Try to access protected page
    await page.goto("/generations");
    await expect(page).toHaveURL(/\/login\?next=/);

    // Login
    await authPage.fillLoginCredentials(testUser.email, testUser.password);
    await authPage.submit();

    // Should redirect to originally requested page
    await expect(page).toHaveURL("/generations");
  });

  test("public pages accessible without auth", async ({ page }) => {
    // Home page should be accessible
    await page.goto("/");
    await expect(page).not.toHaveURL(/\/login/);

    // Login page accessible
    await page.goto("/login");
    await expect(page.getByTestId("auth-form")).toBeVisible();

    // Register page accessible
    await page.goto("/register");
    await expect(page.getByTestId("auth-form")).toBeVisible();
  });
});
