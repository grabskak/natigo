import { type Page, type Locator } from "@playwright/test";

/**
 * Page Object Model for Flashcards List
 * Covers list view, filters, CRUD operations
 */
export class FlashcardsPage {
  readonly page: Page;

  // Header
  readonly generateButton: Locator;
  readonly addButton: Locator;

  // Filters
  readonly sourceFilter: Locator;
  readonly sortFilter: Locator;
  readonly orderFilter: Locator;

  // Modal
  readonly modal: FlashcardModal;

  // Delete dialog
  readonly deleteDialog: DeleteFlashcardDialog;

  constructor(page: Page) {
    this.page = page;

    // Header
    this.generateButton = page.getByTestId("flashcards-generate-button");
    this.addButton = page.getByTestId("flashcards-add-button");

    // Filters
    this.sourceFilter = page.getByTestId("flashcards-source-filter");
    this.sortFilter = page.getByTestId("flashcards-sort-filter");
    this.orderFilter = page.getByTestId("flashcards-order-filter");

    // Modal and dialog
    this.modal = new FlashcardModal(page);
    this.deleteDialog = new DeleteFlashcardDialog(page);
  }

  /**
   * Navigate to flashcards page
   */
  async goto() {
    await this.page.goto("/flashcards");
  }

  /**
   * Navigate to generations page
   */
  async goToGenerate() {
    await this.generateButton.click();
  }

  /**
   * Open add flashcard modal
   */
  async openAddModal() {
    await this.addButton.click();
  }

  /**
   * Filter by source
   */
  async filterBySource(source: "all" | "manual" | "ai-full" | "ai-edited") {
    await this.sourceFilter.click();
    await this.page.getByRole("option", { name: this.getSourceLabel(source) }).click();
  }

  /**
   * Filter by sort field
   */
  async filterBySort(sort: "created_at" | "updated_at") {
    await this.sortFilter.click();
    const label = sort === "created_at" ? "Data utworzenia" : "Data aktualizacji";
    await this.page.getByRole("option", { name: label }).click();
  }

  /**
   * Filter by order
   */
  async filterByOrder(order: "asc" | "desc") {
    await this.orderFilter.click();
    const label = order === "desc" ? "Najnowsze najpierw" : "Najstarsze najpierw";
    await this.page.getByRole("option", { name: label }).click();
  }

  /**
   * Get flashcard card by ID
   */
  getFlashcardCard(flashcardId: string) {
    return new FlashcardCard(this.page, flashcardId);
  }

  /**
   * Get all flashcard cards
   */
  getAllFlashcardCards() {
    return this.page.locator('[data-testid^="flashcard-card-"]');
  }

  /**
   * Get first flashcard card
   */
  getFirstFlashcardCard() {
    return this.getAllFlashcardCards().first();
  }

  /**
   * Get flashcard count
   */
  async getFlashcardCount(): Promise<number> {
    return await this.getAllFlashcardCards().count();
  }

  /**
   * Add flashcard via modal
   */
  async addFlashcard(front: string, back: string) {
    await this.openAddModal();
    await this.modal.fill(front, back);
    await this.modal.submit();
  }

  /**
   * Wait for flashcards to load
   */
  async waitForFlashcards() {
    await this.page.waitForLoadState("networkidle");
  }

  /**
   * Helper: Get source label in Polish
   */
  private getSourceLabel(source: string): string {
    const labels: Record<string, string> = {
      all: "Wszystkie źródła",
      manual: "Ręczne",
      "ai-full": "Wygenerowane przez AI",
      "ai-edited": "Edytowane AI",
    };
    return labels[source] || source;
  }
}

/**
 * Represents a single flashcard card
 */
export class FlashcardCard {
  readonly page: Page;
  readonly flashcardId: string;

  // Locators
  readonly card: Locator;
  readonly menuButton: Locator;
  readonly editMenuItem: Locator;
  readonly deleteMenuItem: Locator;

  constructor(page: Page, flashcardId: string) {
    this.page = page;
    this.flashcardId = flashcardId;

    // Card elements
    this.card = page.getByTestId(`flashcard-card-${flashcardId}`);
    this.menuButton = page.getByTestId(`flashcard-menu-button-${flashcardId}`);
    this.editMenuItem = page.getByTestId(`flashcard-edit-menu-item-${flashcardId}`);
    this.deleteMenuItem = page.getByTestId(`flashcard-delete-menu-item-${flashcardId}`);
  }

  /**
   * Open card menu
   */
  async openMenu() {
    await this.menuButton.click();
  }

  /**
   * Click edit in menu
   */
  async clickEdit() {
    await this.openMenu();
    await this.editMenuItem.click();
  }

  /**
   * Click delete in menu
   */
  async clickDelete() {
    await this.openMenu();
    await this.deleteMenuItem.click();
  }

  /**
   * Check if card is visible
   */
  async isVisible(): Promise<boolean> {
    return await this.card.isVisible();
  }

  /**
   * Get card content (front and back text)
   */
  async getContent(): Promise<{ front: string; back: string }> {
    const frontText = await this.card.locator('p:has-text("Przód:")').locator("+ p").textContent();
    const backText = await this.card.locator('p:has-text("Tył:")').locator("+ p").textContent();
    return {
      front: frontText || "",
      back: backText || "",
    };
  }
}

/**
 * Flashcard Modal (Add/Edit)
 */
export class FlashcardModal {
  readonly page: Page;

  // Locators
  readonly modal: Locator;
  readonly frontInput: Locator;
  readonly backTextarea: Locator;
  readonly error: Locator;
  readonly cancelButton: Locator;
  readonly submitButton: Locator;

  constructor(page: Page) {
    this.page = page;

    // Modal elements
    this.modal = page.getByTestId("flashcard-modal");
    this.frontInput = page.getByTestId("flashcard-modal-front-input");
    this.backTextarea = page.getByTestId("flashcard-modal-back-textarea");
    this.error = page.getByTestId("flashcard-modal-error");
    this.cancelButton = page.getByTestId("flashcard-modal-cancel-button");
    this.submitButton = page.getByTestId("flashcard-modal-submit-button");
  }

  /**
   * Fill modal form
   */
  async fill(front: string, back: string) {
    await this.frontInput.fill(front);
    await this.backTextarea.fill(back);
  }

  /**
   * Submit modal
   */
  async submit() {
    await this.submitButton.click();
  }

  /**
   * Cancel modal
   */
  async cancel() {
    await this.cancelButton.click();
  }

  /**
   * Check if modal is visible
   */
  async isVisible(): Promise<boolean> {
    return await this.modal.isVisible();
  }

  /**
   * Check if error is visible
   */
  async hasError(): Promise<boolean> {
    return await this.error.isVisible();
  }

  /**
   * Wait for modal to close
   */
  async waitForClose() {
    await this.modal.waitFor({ state: "hidden" });
  }
}

/**
 * Delete Flashcard Dialog
 */
export class DeleteFlashcardDialog {
  readonly page: Page;

  // Locators
  readonly dialog: Locator;
  readonly cancelButton: Locator;
  readonly confirmButton: Locator;

  constructor(page: Page) {
    this.page = page;

    // Dialog elements
    this.dialog = page.getByTestId("delete-flashcard-dialog");
    this.cancelButton = page.getByTestId("delete-flashcard-cancel-button");
    this.confirmButton = page.getByTestId("delete-flashcard-confirm-button");
  }

  /**
   * Confirm deletion
   */
  async confirm() {
    await this.confirmButton.click();
  }

  /**
   * Cancel deletion
   */
  async cancel() {
    await this.cancelButton.click();
  }

  /**
   * Check if dialog is visible
   */
  async isVisible(): Promise<boolean> {
    return await this.dialog.isVisible();
  }

  /**
   * Wait for dialog to close
   */
  async waitForClose() {
    await this.dialog.waitFor({ state: "hidden" });
  }
}
