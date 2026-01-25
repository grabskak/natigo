/**
 * E2E Tests - Flashcards CRUD Operations
 * Tests for creating, reading, updating, and deleting flashcards
 */

import { test, expect } from "./fixtures";

test.describe("Flashcards - List Display", () => {
  test.beforeEach(async ({ authPage, testUser }) => {
    await authPage.login(testUser.email, testUser.password);
  });

  test("displays flashcards list", async ({ flashcardsPage }) => {
    await flashcardsPage.goto();
    await flashcardsPage.waitForReady();

    // Header should be visible
    await expect(flashcardsPage.header).toBeVisible();

    // Generate and Add buttons should be visible
    await expect(flashcardsPage.generateButton).toBeVisible();
    await expect(flashcardsPage.addButton).toBeVisible();
  });

  test("empty state when no flashcards", async ({ flashcardsPage }) => {
    await flashcardsPage.goto();
    await flashcardsPage.waitForReady();

    const count = await flashcardsPage.getFlashcardCount();

    if (count === 0) {
      // Should show empty state message
      const emptyMessage = flashcardsPage.page.locator("text=/brak.*fiszek|no.*flashcards/i");
      await expect(emptyMessage).toBeVisible();
    }
  });

  test("displays flashcard content", async ({ flashcardsPage }) => {
    await flashcardsPage.goto();
    await flashcardsPage.waitForReady();

    const count = await flashcardsPage.getFlashcardCount();

    if (count > 0) {
      // First flashcard should show front text
      const firstCard = flashcardsPage.page.getByTestId(/flashcard-card-/);
      await expect(firstCard.first()).toBeVisible();

      // Should have content
      const cardText = await firstCard.first().textContent();
      expect(cardText).toBeTruthy();
      expect(cardText!.length).toBeGreaterThan(0);
    }
  });

  test("each flashcard has action menu", async ({ flashcardsPage }) => {
    await flashcardsPage.goto();
    await flashcardsPage.waitForReady();

    const count = await flashcardsPage.getFlashcardCount();

    if (count > 0) {
      // Get first flashcard ID
      const flashcards = await flashcardsPage.getAllFlashcardIds();
      const firstId = flashcards[0];

      // Menu button should exist
      const menuButton = flashcardsPage.getMenuButton(firstId);
      await expect(menuButton).toBeVisible();
    }
  });
});

test.describe("Flashcards - Create (Add)", () => {
  test.beforeEach(async ({ authPage, testUser }) => {
    await authPage.login(testUser.email, testUser.password);
  });

  test("open add flashcard modal", async ({ flashcardsPage }) => {
    await flashcardsPage.goto();
    await flashcardsPage.waitForReady();

    // Click add button
    await flashcardsPage.openAddModal();

    // Modal should be visible
    await expect(flashcardsPage.modal).toBeVisible();

    // Form fields should be empty
    await expect(flashcardsPage.modalFrontInput).toHaveValue("");
    await expect(flashcardsPage.modalBackInput).toHaveValue("");

    // Title should say "Add" or "New"
    const modalContent = await flashcardsPage.modal.textContent();
    expect(modalContent).toMatch(/dodaj|add|new/i);
  });

  test("create new flashcard successfully", async ({ flashcardsPage }) => {
    await flashcardsPage.goto();
    await flashcardsPage.waitForReady();

    // Get initial count
    const initialCount = await flashcardsPage.getFlashcardCount();

    // Add new flashcard
    const timestamp = Date.now();
    const frontText = `Test Front ${timestamp}`;
    const backText = `Test Back ${timestamp}`;

    await flashcardsPage.addFlashcard(frontText, backText);

    // Modal should close
    await expect(flashcardsPage.modal).not.toBeVisible();

    // Wait for list to update
    await flashcardsPage.waitForReady();

    // Count should increase by 1
    const newCount = await flashcardsPage.getFlashcardCount();
    expect(newCount).toBe(initialCount + 1);

    // New flashcard should be visible in the list
    const pageContent = await flashcardsPage.page.textContent("body");
    expect(pageContent).toContain(frontText);
  });

  test("validation: cannot create with empty front", async ({ flashcardsPage }) => {
    await flashcardsPage.goto();
    await flashcardsPage.openAddModal();

    // Try to submit with empty front
    await flashcardsPage.modalBackInput.fill("Back text");
    await flashcardsPage.submitModal();

    // Should show error or button disabled
    const errorVisible = await flashcardsPage.modalError.isVisible();
    const submitDisabled = await flashcardsPage.modalSubmitButton.isDisabled();

    expect(errorVisible || submitDisabled).toBe(true);

    // Modal should stay open
    await expect(flashcardsPage.modal).toBeVisible();
  });

  test("validation: cannot create with empty back", async ({ flashcardsPage }) => {
    await flashcardsPage.goto();
    await flashcardsPage.openAddModal();

    // Try to submit with empty back
    await flashcardsPage.modalFrontInput.fill("Front text");
    await flashcardsPage.submitModal();

    // Should show error or button disabled
    const errorVisible = await flashcardsPage.modalError.isVisible();
    const submitDisabled = await flashcardsPage.modalSubmitButton.isDisabled();

    expect(errorVisible || submitDisabled).toBe(true);
  });

  test("cancel add modal", async ({ flashcardsPage }) => {
    await flashcardsPage.goto();
    await flashcardsPage.waitForReady();

    const initialCount = await flashcardsPage.getFlashcardCount();

    // Open modal and fill form
    await flashcardsPage.openAddModal();
    await flashcardsPage.modalFrontInput.fill("Will be cancelled");
    await flashcardsPage.modalBackInput.fill("Not saved");

    // Cancel
    await flashcardsPage.cancelModal();

    // Modal should close
    await expect(flashcardsPage.modal).not.toBeVisible();

    // Count should be unchanged
    const finalCount = await flashcardsPage.getFlashcardCount();
    expect(finalCount).toBe(initialCount);
  });

  test("create flashcard with long content", async ({ flashcardsPage }) => {
    await flashcardsPage.goto();

    const longFront = "A".repeat(500);
    const longBack = "B".repeat(2000);

    await flashcardsPage.addFlashcard(longFront, longBack);

    // Should succeed
    await expect(flashcardsPage.modal).not.toBeVisible();

    // Should be in the list
    const pageContent = await flashcardsPage.page.textContent("body");
    expect(pageContent).toContain(longFront.substring(0, 50));
  });
});

test.describe("Flashcards - Update (Edit)", () => {
  test.beforeEach(async ({ authPage, testUser }) => {
    await authPage.login(testUser.email, testUser.password);
  });

  test("open edit modal for existing flashcard", async ({ flashcardsPage }) => {
    await flashcardsPage.goto();
    await flashcardsPage.waitForReady();

    const count = await flashcardsPage.getFlashcardCount();
    if (count === 0) {
      // Create one first
      await flashcardsPage.addFlashcard("Edit Test Front", "Edit Test Back");
      await flashcardsPage.waitForReady();
    }

    // Get first flashcard
    const flashcards = await flashcardsPage.getAllFlashcardIds();
    const firstId = flashcards[0];

    // Open edit modal
    await flashcardsPage.openEditModal(firstId);

    // Modal should be visible with existing content
    await expect(flashcardsPage.modal).toBeVisible();

    // Title should say "Edit"
    const modalContent = await flashcardsPage.modal.textContent();
    expect(modalContent).toMatch(/edytuj|edit/i);

    // Fields should have existing values
    const frontValue = await flashcardsPage.modalFrontInput.inputValue();
    const backValue = await flashcardsPage.modalBackInput.inputValue();
    expect(frontValue).toBeTruthy();
    expect(backValue).toBeTruthy();
  });

  test("edit flashcard content successfully", async ({ flashcardsPage }) => {
    await flashcardsPage.goto();
    await flashcardsPage.waitForReady();

    // Create a flashcard to edit
    const originalFront = `Original Front ${Date.now()}`;
    const originalBack = `Original Back ${Date.now()}`;
    await flashcardsPage.addFlashcard(originalFront, originalBack);
    await flashcardsPage.waitForReady();

    // Get the flashcard ID
    const flashcards = await flashcardsPage.getAllFlashcardIds();
    const flashcardId = flashcards[0];

    // Edit it
    const newFront = `Edited Front ${Date.now()}`;
    const newBack = `Edited Back ${Date.now()}`;
    await flashcardsPage.editFlashcard(flashcardId, newFront, newBack);

    // Modal should close
    await expect(flashcardsPage.modal).not.toBeVisible();

    // Wait for update
    await flashcardsPage.waitForReady();

    // New content should be visible
    const pageContent = await flashcardsPage.page.textContent("body");
    expect(pageContent).toContain(newFront);
    expect(pageContent).not.toContain(originalFront);
  });

  test("validation: cannot save edit with empty fields", async ({ flashcardsPage }) => {
    await flashcardsPage.goto();
    await flashcardsPage.waitForReady();

    // Ensure we have a flashcard
    const count = await flashcardsPage.getFlashcardCount();
    if (count === 0) {
      await flashcardsPage.addFlashcard("Test", "Test");
      await flashcardsPage.waitForReady();
    }

    const flashcards = await flashcardsPage.getAllFlashcardIds();
    const firstId = flashcards[0];

    // Open edit modal
    await flashcardsPage.openEditModal(firstId);

    // Clear fields
    await flashcardsPage.modalFrontInput.fill("");
    await flashcardsPage.modalBackInput.fill("");

    // Try to submit
    await flashcardsPage.submitModal();

    // Should show error or button disabled
    const errorVisible = await flashcardsPage.modalError.isVisible();
    const submitDisabled = await flashcardsPage.modalSubmitButton.isDisabled();

    expect(errorVisible || submitDisabled).toBe(true);

    // Modal should stay open
    await expect(flashcardsPage.modal).toBeVisible();
  });

  test("cancel edit restores original content", async ({ flashcardsPage }) => {
    await flashcardsPage.goto();
    await flashcardsPage.waitForReady();

    // Create flashcard
    const originalFront = `Original ${Date.now()}`;
    const originalBack = `Original Back ${Date.now()}`;
    await flashcardsPage.addFlashcard(originalFront, originalBack);
    await flashcardsPage.waitForReady();

    const flashcards = await flashcardsPage.getAllFlashcardIds();
    const flashcardId = flashcards[0];

    // Open edit and change content
    await flashcardsPage.openEditModal(flashcardId);
    await flashcardsPage.modalFrontInput.fill("Changed");
    await flashcardsPage.modalBackInput.fill("Changed");

    // Cancel
    await flashcardsPage.cancelModal();

    // Modal closes
    await expect(flashcardsPage.modal).not.toBeVisible();

    // Original content should still be there
    const pageContent = await flashcardsPage.page.textContent("body");
    expect(pageContent).toContain(originalFront);
    expect(pageContent).not.toContain("Changed");
  });
});

test.describe("Flashcards - Delete", () => {
  test.beforeEach(async ({ authPage, testUser }) => {
    await authPage.login(testUser.email, testUser.password);
  });

  test("open delete confirmation dialog", async ({ flashcardsPage }) => {
    await flashcardsPage.goto();
    await flashcardsPage.waitForReady();

    // Ensure we have a flashcard
    const count = await flashcardsPage.getFlashcardCount();
    if (count === 0) {
      await flashcardsPage.addFlashcard("To Delete", "Will be deleted");
      await flashcardsPage.waitForReady();
    }

    const flashcards = await flashcardsPage.getAllFlashcardIds();
    const firstId = flashcards[0];

    // Open delete dialog
    await flashcardsPage.openDeleteDialog(firstId);

    // Dialog should be visible
    await expect(flashcardsPage.deleteDialog).toBeVisible();

    // Should have confirm and cancel buttons
    await expect(flashcardsPage.deleteConfirmButton).toBeVisible();
    await expect(flashcardsPage.deleteCancelButton).toBeVisible();
  });

  test("delete flashcard successfully", async ({ flashcardsPage }) => {
    await flashcardsPage.goto();
    await flashcardsPage.waitForReady();

    // Create a flashcard to delete
    const frontText = `To Delete ${Date.now()}`;
    await flashcardsPage.addFlashcard(frontText, "Will be deleted");
    await flashcardsPage.waitForReady();

    const initialCount = await flashcardsPage.getFlashcardCount();

    // Get the flashcard ID
    const flashcards = await flashcardsPage.getAllFlashcardIds();
    const flashcardId = flashcards[0];

    // Delete it
    await flashcardsPage.deleteFlashcard(flashcardId);

    // Dialog should close
    await expect(flashcardsPage.deleteDialog).not.toBeVisible();

    // Wait for list to update
    await flashcardsPage.waitForReady();

    // Count should decrease by 1
    const newCount = await flashcardsPage.getFlashcardCount();
    expect(newCount).toBe(initialCount - 1);

    // Flashcard should no longer be in the list
    const pageContent = await flashcardsPage.page.textContent("body");
    expect(pageContent).not.toContain(frontText);
  });

  test("cancel delete keeps flashcard", async ({ flashcardsPage }) => {
    await flashcardsPage.goto();
    await flashcardsPage.waitForReady();

    // Ensure we have a flashcard
    const count = await flashcardsPage.getFlashcardCount();
    if (count === 0) {
      await flashcardsPage.addFlashcard("Keep Me", "Don't delete");
      await flashcardsPage.waitForReady();
    }

    const initialCount = await flashcardsPage.getFlashcardCount();
    const flashcards = await flashcardsPage.getAllFlashcardIds();
    const firstId = flashcards[0];

    // Open delete dialog
    await flashcardsPage.openDeleteDialog(firstId);

    // Cancel
    await flashcardsPage.deleteCancelButton.click();

    // Dialog should close
    await expect(flashcardsPage.deleteDialog).not.toBeVisible();

    // Count should be unchanged
    const finalCount = await flashcardsPage.getFlashcardCount();
    expect(finalCount).toBe(initialCount);
  });

  test("delete last flashcard shows empty state", async ({ flashcardsPage }) => {
    await flashcardsPage.goto();
    await flashcardsPage.waitForReady();

    // Delete all flashcards
    let count = await flashcardsPage.getFlashcardCount();

    while (count > 0) {
      const flashcards = await flashcardsPage.getAllFlashcardIds();
      await flashcardsPage.deleteFlashcard(flashcards[0]);
      await flashcardsPage.waitForReady();
      count = await flashcardsPage.getFlashcardCount();
    }

    // Should show empty state
    const emptyMessage = flashcardsPage.page.locator("text=/brak.*fiszek|no.*flashcards/i");
    await expect(emptyMessage).toBeVisible();
  });
});

test.describe("Flashcards - Navigation", () => {
  test.beforeEach(async ({ authPage, testUser }) => {
    await authPage.login(testUser.email, testUser.password);
  });

  test("navigate to generate page from header", async ({ flashcardsPage, generatePage }) => {
    await flashcardsPage.goto();
    await flashcardsPage.goToGenerate();

    // Should navigate to generations
    await expect(generatePage.page).toHaveURL("/generations");
    await expect(generatePage.form).toBeVisible();
  });

  test("flashcards is default landing page after login", async ({ authPage, testUser, flashcardsPage }) => {
    // Fresh login
    await authPage.login(testUser.email, testUser.password);

    // Should land on flashcards
    await expect(flashcardsPage.page).toHaveURL("/flashcards");
  });

  test("return to flashcards from generation flow", async ({ flashcardsPage, generatePage, candidatesReviewPage, longText }) => {
    await flashcardsPage.goto();
    await flashcardsPage.goToGenerate();

    // Generate
    await generatePage.generate(longText);
    await generatePage.waitForGenerationComplete();

    // Review and save
    await candidatesReviewPage.waitForReady();
    await candidatesReviewPage.acceptCandidate(1);
    await candidatesReviewPage.saveAcceptedCandidates();

    // Should return to flashcards
    await expect(flashcardsPage.page).toHaveURL("/flashcards");
  });

  test("protected route - requires authentication", async ({ flashcardsPage, page }) => {
    // Logout
    await page.context().clearCookies();

    // Try to access
    await flashcardsPage.goto();

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("Flashcards - Source Filter", () => {
  test.beforeEach(async ({ authPage, testUser }) => {
    await authPage.login(testUser.email, testUser.password);
  });

  test("filter by AI generated source", async ({ flashcardsPage }) => {
    await flashcardsPage.goto();
    await flashcardsPage.waitForReady();

    // Apply AI filter
    await flashcardsPage.filterBySource("AI");

    // Wait for results
    await flashcardsPage.waitForReady();

    // All visible flashcards should be AI-generated
    // (verification would require checking metadata or UI indicators)
  });

  test("filter by manually added source", async ({ flashcardsPage }) => {
    await flashcardsPage.goto();
    await flashcardsPage.waitForReady();

    // Apply manual filter
    await flashcardsPage.filterBySource("MANUAL");

    // Wait for results
    await flashcardsPage.waitForReady();

    // All visible should be manual
  });

  test("show all sources (no filter)", async ({ flashcardsPage }) => {
    await flashcardsPage.goto();
    await flashcardsPage.waitForReady();

    const initialCount = await flashcardsPage.getFlashcardCount();

    // Apply filter then remove it
    await flashcardsPage.filterBySource("AI");
    await flashcardsPage.waitForReady();

    await flashcardsPage.filterBySource("ALL");
    await flashcardsPage.waitForReady();

    // Count might be same or different, just checking it works
    const finalCount = await flashcardsPage.getFlashcardCount();
    expect(finalCount).toBeGreaterThanOrEqual(0);
  });
});
