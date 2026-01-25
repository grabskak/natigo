import { type Page, type Locator } from "@playwright/test";

/**
 * Page Object Model for Authentication (Login/Register)
 * Covers login, registration, and email confirmation flows
 */
export class AuthPage {
  readonly page: Page;

  // Form elements
  readonly form: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly submitButton: Locator;

  // Error messages
  readonly emailError: Locator;
  readonly passwordError: Locator;
  readonly confirmPasswordError: Locator;
  readonly formError: Locator;

  // Email confirmation
  readonly emailConfirmationMessage: Locator;
  readonly goToLoginLink: Locator;
  readonly changeEmailButton: Locator;

  // Links
  readonly registerLink: Locator;
  readonly loginLink: Locator;
  readonly resetPasswordLink: Locator;

  constructor(page: Page) {
    this.page = page;

    // Form
    this.form = page.getByTestId("auth-form");
    this.emailInput = page.getByTestId("auth-email-input");
    this.passwordInput = page.getByTestId("auth-password-input");
    this.confirmPasswordInput = page.getByTestId("auth-confirm-password-input");
    this.submitButton = page.getByTestId("auth-submit-button");

    // Errors
    this.emailError = page.getByTestId("auth-email-error");
    this.passwordError = page.getByTestId("auth-password-error");
    this.confirmPasswordError = page.getByTestId("auth-confirm-password-error");
    this.formError = page.getByTestId("auth-form-error");

    // Email confirmation
    this.emailConfirmationMessage = page.getByTestId("auth-email-confirmation-message");
    this.goToLoginLink = page.getByTestId("auth-go-to-login-link");
    this.changeEmailButton = page.getByTestId("auth-change-email-button");

    // Navigation links (using role + name as no testid)
    this.registerLink = page.getByRole("link", { name: /zarejestruj|sign up|register/i });
    this.loginLink = page.getByRole("link", { name: /zaloguj|log in|sign in/i });
    this.resetPasswordLink = page.getByRole("link", { name: /nie pamiętasz|forgot|reset password/i });
  }

  /**
   * Navigate to login page
   */
  async gotoLogin() {
    await this.page.goto("/login");
  }

  /**
   * Navigate to register page
   */
  async gotoRegister() {
    await this.page.goto("/register");
  }

  /**
   * Fill login credentials
   */
  async fillLoginCredentials(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
  }

  /**
   * Fill registration form
   */
  async fillRegisterForm(email: string, password: string, confirmPassword?: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.confirmPasswordInput.fill(confirmPassword ?? password);
  }

  /**
   * Submit the auth form
   */
  async submit() {
    await this.submitButton.click();
  }

  /**
   * Complete login flow
   */
  async login(email: string, password: string) {
    await this.gotoLogin();
    await this.fillLoginCredentials(email, password);
    await this.submit();
  }

  /**
   * Complete registration flow
   */
  async register(email: string, password: string, confirmPassword?: string) {
    await this.gotoRegister();
    await this.fillRegisterForm(email, password, confirmPassword);
    await this.submit();
  }

  /**
   * Check if email error is visible
   */
  async hasEmailError(): Promise<boolean> {
    return await this.emailError.isVisible();
  }

  /**
   * Check if password error is visible
   */
  async hasPasswordError(): Promise<boolean> {
    return await this.passwordError.isVisible();
  }

  /**
   * Check if form error is visible
   */
  async hasFormError(): Promise<boolean> {
    return await this.formError.isVisible();
  }

  /**
   * Get form error text
   */
  async getFormErrorText(): Promise<string | null> {
    return await this.formError.textContent();
  }

  /**
   * Check if email confirmation message is visible
   */
  async hasEmailConfirmation(): Promise<boolean> {
    return await this.emailConfirmationMessage.isVisible();
  }

  /**
   * Navigate to login from email confirmation
   */
  async goToLoginFromConfirmation() {
    await this.goToLoginLink.click();
  }

  /**
   * Navigate to register page
   */
  async goToRegisterPage() {
    await this.registerLink.click();
  }

  /**
   * Navigate to reset password page
   */
  async goToResetPassword() {
    await this.resetPasswordLink.click();
  }
}
