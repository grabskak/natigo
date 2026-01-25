/**
 * Example E2E Test using Page Object Model
 * Demonstrates the complete critical path: Auth → Generate → Review → Save → CRUD
 *
 * NOTE: These tests use authenticated storage state from auth.setup.ts
 */

import { test, expect } from "./fixtures";
import { waitForToast, extractFlashcardId } from "./helpers";

test.describe("Complete E2E Critical Path", () => {
  test("Full flow: Generate → Review → Save → List → CRUD", async ({
    page,
    generatePage,
    candidatesReviewPage,
    flashcardsPage,
    longText,
  }) => {
    // ========================================================================
    // STEP 1: Navigate to Generate
    // ========================================================================
    await flashcardsPage.goToGenerate();
    await expect(page).toHaveURL("/generations");

    // ========================================================================
    // STEP 2: Generate Flashcards
    // ========================================================================
    await generatePage.generate(longText);
    await generatePage.waitForGenerationComplete();

    // ========================================================================
    // STEP 3: Review Candidates
    // ========================================================================
    await candidatesReviewPage.waitForReview();
    await expect(candidatesReviewPage.container).toBeVisible();

    // Accept first candidate
    await candidatesReviewPage.acceptCandidate(1);
    const card1 = candidatesReviewPage.getCandidateCard(1);
    await expect(await card1.getStatus()).toContain("Zaakceptowana");

    // Accept second candidate
    await candidatesReviewPage.acceptCandidate(2);

    // Edit third candidate
    await candidatesReviewPage.editCandidate(3, "Edited question", "Edited answer");
    const card3 = candidatesReviewPage.getCandidateCard(3);
    await expect(await card3.getStatus()).toContain("Edytowana");

    // Reject fourth candidate (if exists)
    const card4 = candidatesReviewPage.getCandidateCard(4);
    if (await card4.isVisible()) {
      await candidatesReviewPage.rejectCandidate(4);
    }

    // ========================================================================
    // STEP 4: Verify Save Counter and Save
    // ========================================================================
    const counterText = await candidatesReviewPage.getSaveCounterText();
    expect(counterText).toContain("3 fiszki"); // 2 accepted + 1 edited

    await candidatesReviewPage.save();
    await waitForToast(page);

    // ========================================================================
    // STEP 5: Verify Redirect and Filter
    // ========================================================================
    await expect(page).toHaveURL(/\/flashcards\?source=ai-full/);
    await flashcardsPage.waitForFlashcards();

    // Should have at least 3 flashcards
    const count = await flashcardsPage.getFlashcardCount();
    expect(count).toBeGreaterThanOrEqual(3);

    // ========================================================================
    // STEP 6: CRUD - Add Manual Flashcard
    // ========================================================================
    await flashcardsPage.addFlashcard("Manual question?", "Manual answer!");
    await flashcardsPage.modal.waitForClose();
    await waitForToast(page, "created");

    // ========================================================================
    // STEP 7: CRUD - Edit Flashcard
    // ========================================================================
    // Get first flashcard
    const firstCard = flashcardsPage.getFirstFlashcardCard();
    const cardId = await extractFlashcardId(firstCard);
    const card = flashcardsPage.getFlashcardCard(cardId);

    // Edit it
    await card.clickEdit();
    await expect(flashcardsPage.modal.modal).toBeVisible();
    await flashcardsPage.modal.fill("Updated question?", "Updated answer!");
    await flashcardsPage.modal.submit();
    await flashcardsPage.modal.waitForClose();
    await waitForToast(page, "updated");

    // ========================================================================
    // STEP 8: CRUD - Delete Flashcard
    // ========================================================================
    await card.clickDelete();
    await expect(flashcardsPage.deleteDialog.dialog).toBeVisible();
    await flashcardsPage.deleteDialog.confirm();
    await flashcardsPage.deleteDialog.waitForClose();
    await waitForToast(page, "deleted");

    // Verify deletion
    await expect(card.card).not.toBeVisible();

    // ========================================================================
    // STEP 9: Verify Final Count
    // ========================================================================
    const finalCount = await flashcardsPage.getFlashcardCount();
    expect(finalCount).toBe(count); // Same as before (added 1, deleted 1)
  });

  test("Filter and sort flashcards", async ({ flashcardsPage }) => {
    // ========================================================================
    // Test Filters
    // ========================================================================
    await flashcardsPage.goto();

    // Filter by manual source
    await flashcardsPage.filterBySource("manual");
    await flashcardsPage.waitForFlashcards();
    // TODO: Verify all cards are manual

    // Filter by AI
    await flashcardsPage.filterBySource("ai-full");
    await flashcardsPage.waitForFlashcards();
    // TODO: Verify all cards are AI-generated

    // Sort by updated_at
    await flashcardsPage.filterBySort("updated_at");
    await flashcardsPage.waitForFlashcards();

    // Order ascending
    await flashcardsPage.filterByOrder("asc");
    await flashcardsPage.waitForFlashcards();

    // Reset to all
    await flashcardsPage.filterBySource("all");
    await flashcardsPage.waitForFlashcards();
  });
});

test.describe("Generation Edge Cases", () => {
  test("Validate minimum characters (1000)", async ({ generatePage }) => {
    await generatePage.goto();

    // Try with too few characters
    const shortText = "a".repeat(500); // 500 chars
    await generatePage.fillText(shortText);

    // Submit button should be disabled
    await expect(generatePage.submitButton).toBeDisabled();

    // Validation error should be visible
    await expect(generatePage.validationError).toBeVisible();
    const errorText = await generatePage.getValidationErrorText();
    expect(errorText).toContain("1");
    expect(errorText).toContain("000");
  });

  test("Validate maximum characters (10000)", async ({ generatePage }) => {
    await generatePage.goto();

    // Try with too many characters
    const longText = "a".repeat(11000); // 11000 chars
    await generatePage.fillText(longText);

    // Submit button should be disabled
    await expect(generatePage.submitButton).toBeDisabled();

    // Validation error should be visible
    await expect(generatePage.validationError).toBeVisible();
    const errorText = await generatePage.getValidationErrorText();
    expect(errorText).toContain("10");
    expect(errorText).toContain("000");
  });
});

test.describe("Candidates Review Edge Cases", () => {
  test.beforeEach(async ({ generatePage, longText }) => {
    // Generate candidates first (already authenticated via storage state)
    await generatePage.goto();
    await generatePage.generate(longText);
    await generatePage.waitForGenerationComplete();
  });

  test("Cannot save without accepting any candidates", async ({ candidatesReviewPage }) => {
    await candidatesReviewPage.waitForReview();

    // Try to save without accepting anything
    await expect(candidatesReviewPage.saveButton).toBeDisabled();

    // Counter should show 0
    const counterText = await candidatesReviewPage.getSaveCounterText();
    expect(counterText).toContain("Nie wybrano");
  });

  test("Can accept, then reject candidate", async ({ candidatesReviewPage }) => {
    await candidatesReviewPage.waitForReview();

    // Accept first candidate
    await candidatesReviewPage.acceptCandidate(1);
    const card1 = candidatesReviewPage.getCandidateCard(1);
    await expect(await card1.getStatus()).toContain("Zaakceptowana");

    // Reject it
    await candidatesReviewPage.rejectCandidate(1);
    await expect(await card1.getStatus()).toContain("Odrzucona");

    // Save button should be disabled again
    await expect(candidatesReviewPage.saveButton).toBeDisabled();
  });

  test("Can edit candidate multiple times", async ({ candidatesReviewPage }) => {
    await candidatesReviewPage.waitForReview();

    const card = candidatesReviewPage.getCandidateCard(1);

    // First edit
    await card.startEdit();
    await card.fillEditForm("Edit 1", "Content 1");
    await card.saveEdit();
    await expect(await card.getStatus()).toContain("Edytowana");

    // Second edit
    await card.startEdit();
    await card.fillEditForm("Edit 2", "Content 2");
    await card.saveEdit();
    await expect(await card.getStatus()).toContain("Edytowana");

    // Still counts as 1 flashcard
    const counterText = await candidatesReviewPage.getSaveCounterText();
    expect(counterText).toContain("1 fiszka");
  });
});
