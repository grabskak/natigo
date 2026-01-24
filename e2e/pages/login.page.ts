import { type Page, type Locator } from "@playwright/test";

/**
 * Page Object Model for the Login page
 * Encapsulates page interactions and element locators
 */
export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;
  readonly registerLink: Locator;
  readonly resetPasswordLink: Locator;

  constructor(page: Page) {
    this.page = page;
    
    // Locators
    this.emailInput = page.getByLabel(/email/i);
    this.passwordInput = page.getByLabel(/password/i);
    this.submitButton = page.getByRole("button", { name: /sign in|log in/i });
    this.errorMessage = page.getByRole("alert");
    this.registerLink = page.getByRole("link", { name: /register|sign up/i });
    this.resetPasswordLink = page.getByRole("link", { name: /forgot password|reset password/i });
  }

  /**
   * Navigate to the login page
   */
  async goto() {
    await this.page.goto("/login");
  }

  /**
   * Fill in login credentials
   */
  async fillCredentials(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
  }

  /**
   * Submit the login form
   */
  async submit() {
    await this.submitButton.click();
  }

  /**
   * Complete login flow
   */
  async login(email: string, password: string) {
    await this.fillCredentials(email, password);
    await this.submit();
  }

  /**
   * Check if error message is visible
   */
  async hasError() {
    return await this.errorMessage.isVisible();
  }

  /**
   * Get error message text
   */
  async getErrorText() {
    return await this.errorMessage.textContent();
  }

  /**
   * Navigate to registration page
   */
  async goToRegister() {
    await this.registerLink.click();
  }

  /**
   * Navigate to reset password page
   */
  async goToResetPassword() {
    await this.resetPasswordLink.click();
  }
}
