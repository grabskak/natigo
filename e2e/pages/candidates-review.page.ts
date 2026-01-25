import { type Page, type Locator } from "@playwright/test";

/**
 * Page Object Model for Candidates Review
 * Covers candidate cards, decisions, and save actions
 */
export class CandidatesReviewPage {
  readonly page: Page;

  // Container
  readonly container: Locator;
  readonly error: Locator;

  // Save actions bar
  readonly saveActionsBar: Locator;
  readonly saveCounter: Locator;
  readonly saveButton: Locator;
  readonly cancelButton: Locator;

  constructor(page: Page) {
    this.page = page;

    // Container
    this.container = page.getByTestId("candidates-review-container");
    this.error = page.getByTestId("candidates-review-error");

    // Save actions
    this.saveActionsBar = page.getByTestId("save-actions-bar");
    this.saveCounter = page.getByTestId("save-actions-counter");
    this.saveButton = page.getByTestId("save-actions-save-button");
    this.cancelButton = page.getByTestId("save-actions-cancel-button");
  }

  /**
   * Get candidate card by sequence number (1-based)
   */
  getCandidateCard(sequenceNumber: number) {
    return new CandidateCard(this.page, sequenceNumber);
  }

  /**
   * Accept candidate by sequence number
   */
  async acceptCandidate(sequenceNumber: number) {
    await this.getCandidateCard(sequenceNumber).accept();
  }

  /**
   * Reject candidate by sequence number
   */
  async rejectCandidate(sequenceNumber: number) {
    await this.getCandidateCard(sequenceNumber).reject();
  }

  /**
   * Edit candidate by sequence number
   */
  async editCandidate(sequenceNumber: number, front: string, back: string) {
    const card = this.getCandidateCard(sequenceNumber);
    await card.startEdit();
    await card.fillEditForm(front, back);
    await card.saveEdit();
  }

  /**
   * Get save counter text
   */
  async getSaveCounterText(): Promise<string | null> {
    return await this.saveCounter.textContent();
  }

  /**
   * Save accepted flashcards
   */
  async save() {
    await this.saveButton.click();
  }

  /**
   * Cancel and return to form
   */
  async cancel() {
    await this.cancelButton.click();
    // Handle confirm dialog
    await this.page.on("dialog", (dialog) => dialog.accept());
  }

  /**
   * Check if save button is disabled
   */
  async isSaveDisabled(): Promise<boolean> {
    return await this.saveButton.isDisabled();
  }

  /**
   * Check if error is visible
   */
  async hasError(): Promise<boolean> {
    return await this.error.isVisible();
  }

  /**
   * Get error text
   */
  async getErrorText(): Promise<string | null> {
    return await this.error.textContent();
  }

  /**
   * Wait for review container to be visible
   */
  async waitForReview() {
    await this.container.waitFor({ state: "visible" });
  }
}

/**
 * Represents a single candidate card
 */
export class CandidateCard {
  readonly page: Page;
  readonly sequenceNumber: number;

  // Locators
  readonly card: Locator;
  readonly numberBadge: Locator;
  readonly acceptButton: Locator;
  readonly rejectButton: Locator;
  readonly editButton: Locator;
  readonly saveEditButton: Locator;
  readonly cancelEditButton: Locator;
  readonly frontInput: Locator;
  readonly backTextarea: Locator;

  constructor(page: Page, sequenceNumber: number) {
    this.page = page;
    this.sequenceNumber = sequenceNumber;

    // Card elements
    this.card = page.getByTestId(`candidate-card-${sequenceNumber}`);
    this.numberBadge = page.getByTestId(`candidate-number-${sequenceNumber}`);
    this.acceptButton = page.getByTestId(`candidate-accept-button-${sequenceNumber}`);
    this.rejectButton = page.getByTestId(`candidate-reject-button-${sequenceNumber}`);
    this.editButton = page.getByTestId(`candidate-edit-button-${sequenceNumber}`);
    this.saveEditButton = page.getByTestId(`candidate-save-edit-button-${sequenceNumber}`);
    this.cancelEditButton = page.getByTestId(`candidate-cancel-edit-button-${sequenceNumber}`);
    this.frontInput = page.getByTestId(`candidate-front-input-${sequenceNumber}`);
    this.backTextarea = page.getByTestId(`candidate-back-textarea-${sequenceNumber}`);
  }

  /**
   * Accept the candidate
   */
  async accept() {
    await this.acceptButton.click();
  }

  /**
   * Reject the candidate
   */
  async reject() {
    await this.rejectButton.click();
  }

  /**
   * Start editing the candidate
   */
  async startEdit() {
    await this.editButton.click();
  }

  /**
   * Fill edit form
   */
  async fillEditForm(front: string, back: string) {
    await this.frontInput.fill(front);
    await this.backTextarea.fill(back);
  }

  /**
   * Save edit
   */
  async saveEdit() {
    await this.saveEditButton.click();
  }

  /**
   * Cancel edit
   */
  async cancelEdit() {
    await this.cancelEditButton.click();
  }

  /**
   * Check if card is visible
   */
  async isVisible(): Promise<boolean> {
    return await this.card.isVisible();
  }

  /**
   * Get card status (from badge text)
   */
  async getStatus(): Promise<string | null> {
    const badge = this.card.locator("span.inline-flex").nth(1);
    return await badge.textContent();
  }
}
