import { type Page, type Locator } from "@playwright/test";

/**
 * Page Object Model for the Home/Index page
 */
export class HomePage {
  readonly page: Page;
  readonly heading: Locator;
  readonly loginButton: Locator;
  readonly registerButton: Locator;

  constructor(page: Page) {
    this.page = page;
    
    // Locators
    this.heading = page.getByRole("heading", { level: 1 });
    this.loginButton = page.getByRole("link", { name: /log in|sign in/i });
    this.registerButton = page.getByRole("link", { name: /register|sign up/i });
  }

  /**
   * Navigate to the home page
   */
  async goto() {
    await this.page.goto("/");
  }

  /**
   * Navigate to login page
   */
  async goToLogin() {
    await this.loginButton.click();
  }

  /**
   * Navigate to registration page
   */
  async goToRegister() {
    await this.registerButton.click();
  }
}
