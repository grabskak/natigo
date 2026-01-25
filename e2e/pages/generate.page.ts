import { type Page, type Locator } from "@playwright/test";

/**
 * Page Object Model for Generation Flow
 * Covers text input, validation, and flashcard generation
 */
export class GeneratePage {
  readonly page: Page;

  // Form elements
  readonly form: Locator;
  readonly inputTextarea: Locator;
  readonly submitButton: Locator;
  readonly clearButton: Locator;

  // Validation
  readonly validationError: Locator;

  // Character counter (using role/text as component doesn't have testid)
  readonly characterCounter: Locator;

  constructor(page: Page) {
    this.page = page;

    // Form
    this.form = page.getByTestId("generate-form");
    this.inputTextarea = page.getByTestId("generate-input-textarea");
    this.submitButton = page.getByTestId("generate-submit-button");
    this.clearButton = page.getByTestId("generate-clear-button");

    // Validation
    this.validationError = page.getByTestId("generate-validation-error");

    // Character counter (fallback to text content)
    this.characterCounter = page.locator('div:has-text("/10,000")').last();
  }

  /**
   * Navigate to generations page
   */
  async goto() {
    await this.page.goto("/generations");
  }

  /**
   * Fill text input
   */
  async fillText(text: string) {
    await this.inputTextarea.fill(text);
  }

  /**
   * Clear text input
   */
  async clearText() {
    await this.clearButton.click();
  }

  /**
   * Submit generation form
   */
  async submit() {
    await this.submitButton.click();
  }

  /**
   * Complete generation flow
   */
  async generate(text: string) {
    await this.fillText(text);
    await this.submit();
  }

  /**
   * Check if validation error is visible
   */
  async hasValidationError(): Promise<boolean> {
    return await this.validationError.isVisible();
  }

  /**
   * Get validation error text
   */
  async getValidationErrorText(): Promise<string | null> {
    return await this.validationError.textContent();
  }

  /**
   * Check if submit button is disabled
   */
  async isSubmitDisabled(): Promise<boolean> {
    return await this.submitButton.isDisabled();
  }

  /**
   * Check if form is in loading state
   */
  async isLoading(): Promise<boolean> {
    const buttonText = await this.submitButton.textContent();
    return buttonText?.includes("Generowanie") || false;
  }

  /**
   * Wait for generation to complete
   */
  async waitForGenerationComplete(timeout = 60000) {
    await this.page.waitForLoadState("networkidle", { timeout });
  }
}
