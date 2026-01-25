/**
 * E2E Tests - Candidates Review Flow
 * Tests for reviewing, accepting, editing, and rejecting flashcard candidates
 *
 * NOTE: These tests use authenticated storage state from auth.setup.ts
 */

import { test, expect } from "./fixtures";
import { generateText } from "./helpers";

test.describe("Review - Display & Navigation", () => {
  test.beforeEach(async ({ generatePage, longText }) => {
    await generatePage.generate(longText);
    await generatePage.waitForGenerationComplete();
  });

  test("displays all candidate cards", async ({ candidatesReviewPage }) => {
    await candidatesReviewPage.waitForReady();

    // Should show review container
    await expect(candidatesReviewPage.container).toBeVisible();

    // Should have multiple candidates
    const candidateCount = await candidatesReviewPage.getCandidateCount();
    expect(candidateCount).toBeGreaterThanOrEqual(1);
    expect(candidateCount).toBeLessThanOrEqual(10);
  });

  test("each candidate has correct initial status", async ({ candidatesReviewPage }) => {
    await candidatesReviewPage.waitForReady();

    // Get all candidates
    const candidateCount = await candidatesReviewPage.getCandidateCount();

    // Check each has status "pending"
    for (let i = 1; i <= candidateCount; i++) {
      const status = await candidatesReviewPage.getCandidateStatus(i);
      expect(status).toBe("pending");
    }
  });

  test("displays candidate content (front and back)", async ({ candidatesReviewPage }) => {
    await candidatesReviewPage.waitForReady();

    // Check first candidate has content
    const frontValue = await candidatesReviewPage.getCandidateFrontValue(1);
    const backValue = await candidatesReviewPage.getCandidateBackValue(1);

    expect(frontValue).toBeTruthy();
    expect(frontValue.length).toBeGreaterThan(0);
    expect(backValue).toBeTruthy();
    expect(backValue.length).toBeGreaterThan(0);
  });

  test("save actions bar initially hidden", async ({ candidatesReviewPage }) => {
    await candidatesReviewPage.waitForReady();

    // Save bar should not be visible when no accepted candidates
    const isVisible = await candidatesReviewPage.saveActionsBar.isVisible();
    expect(isVisible).toBe(false);
  });
});

test.describe("Review - Accept Candidates", () => {
  test.beforeEach(async ({ generatePage, longText }) => {
    await generatePage.generate(longText);
    await generatePage.waitForGenerationComplete();
  });

  test("accept single candidate", async ({ candidatesReviewPage }) => {
    await candidatesReviewPage.waitForReady();

    // Accept first candidate
    await candidatesReviewPage.acceptCandidate(1);

    // Status should change to accepted
    const status = await candidatesReviewPage.getCandidateStatus(1);
    expect(status).toBe("accepted");

    // Save bar should appear
    await expect(candidatesReviewPage.saveActionsBar).toBeVisible();

    // Counter should show 1
    const counterText = await candidatesReviewPage.saveCounter.textContent();
    expect(counterText).toContain("1");
  });

  test("accept multiple candidates", async ({ candidatesReviewPage }) => {
    await candidatesReviewPage.waitForReady();

    // Accept first 3 candidates
    await candidatesReviewPage.acceptCandidate(1);
    await candidatesReviewPage.acceptCandidate(2);
    await candidatesReviewPage.acceptCandidate(3);

    // All should be accepted
    expect(await candidatesReviewPage.getCandidateStatus(1)).toBe("accepted");
    expect(await candidatesReviewPage.getCandidateStatus(2)).toBe("accepted");
    expect(await candidatesReviewPage.getCandidateStatus(3)).toBe("accepted");

    // Counter should show 3
    const counterText = await candidatesReviewPage.saveCounter.textContent();
    expect(counterText).toContain("3");
  });

  test("accept then un-accept (reject)", async ({ candidatesReviewPage }) => {
    await candidatesReviewPage.waitForReady();

    // Accept candidate
    await candidatesReviewPage.acceptCandidate(1);
    expect(await candidatesReviewPage.getCandidateStatus(1)).toBe("accepted");

    // Reject it
    await candidatesReviewPage.rejectCandidate(1);
    expect(await candidatesReviewPage.getCandidateStatus(1)).toBe("rejected");

    // Counter should be 0, save bar should hide
    await expect(candidatesReviewPage.saveActionsBar).not.toBeVisible();
  });

  test("accept all candidates", async ({ candidatesReviewPage }) => {
    await candidatesReviewPage.waitForReady();

    const candidateCount = await candidatesReviewPage.getCandidateCount();

    // Accept all
    for (let i = 1; i <= candidateCount; i++) {
      await candidatesReviewPage.acceptCandidate(i);
    }

    // Counter should match count
    const counterText = await candidatesReviewPage.saveCounter.textContent();
    expect(counterText).toContain(candidateCount.toString());
  });
});

test.describe("Review - Edit Candidates", () => {
  test.beforeEach(async ({ generatePage, longText }) => {
    await generatePage.generate(longText);
    await generatePage.waitForGenerationComplete();
  });

  test("enter edit mode", async ({ candidatesReviewPage }) => {
    await candidatesReviewPage.waitForReady();

    // Click edit button
    await candidatesReviewPage.editCandidate(1);

    // Should enter edit mode
    const isInEditMode = await candidatesReviewPage.isInEditMode(1);
    expect(isInEditMode).toBe(true);

    // Save and cancel buttons should be visible
    await expect(candidatesReviewPage.getSaveEditButton(1)).toBeVisible();
    await expect(candidatesReviewPage.getCancelEditButton(1)).toBeVisible();

    // Accept button should not be visible
    await expect(candidatesReviewPage.getAcceptButton(1)).not.toBeVisible();
  });

  test("edit candidate content", async ({ candidatesReviewPage }) => {
    await candidatesReviewPage.waitForReady();

    // Get original values
    const originalFront = await candidatesReviewPage.getCandidateFrontValue(1);
    const originalBack = await candidatesReviewPage.getCandidateBackValue(1);

    // Enter edit mode
    await candidatesReviewPage.editCandidate(1);

    // Change values
    const newFront = "Edited Front Text";
    const newBack = "Edited Back Text";
    await candidatesReviewPage.fillCandidateFront(1, newFront);
    await candidatesReviewPage.fillCandidateBack(1, newBack);

    // Save edit
    await candidatesReviewPage.saveEdit(1);

    // Should exit edit mode
    const isInEditMode = await candidatesReviewPage.isInEditMode(1);
    expect(isInEditMode).toBe(false);

    // Values should be updated
    const newFrontValue = await candidatesReviewPage.getCandidateFrontValue(1);
    const newBackValue = await candidatesReviewPage.getCandidateBackValue(1);
    expect(newFrontValue).toBe(newFront);
    expect(newBackValue).toBe(newBack);

    // Status should be accepted (editing auto-accepts)
    const status = await candidatesReviewPage.getCandidateStatus(1);
    expect(status).toBe("accepted");
  });

  test("cancel edit restores original values", async ({ candidatesReviewPage }) => {
    await candidatesReviewPage.waitForReady();

    // Get original values
    const originalFront = await candidatesReviewPage.getCandidateFrontValue(1);
    const originalBack = await candidatesReviewPage.getCandidateBackValue(1);
    const originalStatus = await candidatesReviewPage.getCandidateStatus(1);

    // Enter edit mode and change values
    await candidatesReviewPage.editCandidate(1);
    await candidatesReviewPage.fillCandidateFront(1, "Changed");
    await candidatesReviewPage.fillCandidateBack(1, "Changed");

    // Cancel
    await candidatesReviewPage.cancelEdit(1);

    // Should exit edit mode
    const isInEditMode = await candidatesReviewPage.isInEditMode(1);
    expect(isInEditMode).toBe(false);

    // Values should be restored
    const restoredFront = await candidatesReviewPage.getCandidateFrontValue(1);
    const restoredBack = await candidatesReviewPage.getCandidateBackValue(1);
    expect(restoredFront).toBe(originalFront);
    expect(restoredBack).toBe(originalBack);

    // Status should be unchanged
    const status = await candidatesReviewPage.getCandidateStatus(1);
    expect(status).toBe(originalStatus);
  });

  test("edit and save auto-accepts candidate", async ({ candidatesReviewPage }) => {
    await candidatesReviewPage.waitForReady();

    // Candidate starts as pending
    expect(await candidatesReviewPage.getCandidateStatus(1)).toBe("pending");

    // Edit and save
    await candidatesReviewPage.editCandidate(1);
    await candidatesReviewPage.fillCandidateFront(1, "New Front");
    await candidatesReviewPage.saveEdit(1);

    // Should be accepted
    expect(await candidatesReviewPage.getCandidateStatus(1)).toBe("accepted");

    // Save bar should appear
    await expect(candidatesReviewPage.saveActionsBar).toBeVisible();
  });

  test("can edit already accepted candidate", async ({ candidatesReviewPage }) => {
    await candidatesReviewPage.waitForReady();

    // First accept
    await candidatesReviewPage.acceptCandidate(1);
    expect(await candidatesReviewPage.getCandidateStatus(1)).toBe("accepted");

    // Then edit
    await candidatesReviewPage.editCandidate(1);
    await candidatesReviewPage.fillCandidateFront(1, "Modified");
    await candidatesReviewPage.saveEdit(1);

    // Should still be accepted with new content
    expect(await candidatesReviewPage.getCandidateStatus(1)).toBe("accepted");
    expect(await candidatesReviewPage.getCandidateFrontValue(1)).toBe("Modified");
  });
});

test.describe("Review - Reject Candidates", () => {
  test.beforeEach(async ({ generatePage, longText }) => {
    await generatePage.generate(longText);
    await generatePage.waitForGenerationComplete();
  });

  test("reject single candidate", async ({ candidatesReviewPage }) => {
    await candidatesReviewPage.waitForReady();

    // Reject first candidate
    await candidatesReviewPage.rejectCandidate(1);

    // Status should be rejected
    const status = await candidatesReviewPage.getCandidateStatus(1);
    expect(status).toBe("rejected");

    // Save bar should not appear
    await expect(candidatesReviewPage.saveActionsBar).not.toBeVisible();
  });

  test("reject already accepted candidate", async ({ candidatesReviewPage }) => {
    await candidatesReviewPage.waitForReady();

    // Accept then reject
    await candidatesReviewPage.acceptCandidate(1);
    await candidatesReviewPage.acceptCandidate(2);
    expect(await candidatesReviewPage.getCandidateStatus(1)).toBe("accepted");

    // Counter shows 2
    let counterText = await candidatesReviewPage.saveCounter.textContent();
    expect(counterText).toContain("2");

    // Reject first one
    await candidatesReviewPage.rejectCandidate(1);
    expect(await candidatesReviewPage.getCandidateStatus(1)).toBe("rejected");

    // Counter should decrease to 1
    counterText = await candidatesReviewPage.saveCounter.textContent();
    expect(counterText).toContain("1");
  });

  test("reject all candidates hides save bar", async ({ candidatesReviewPage }) => {
    await candidatesReviewPage.waitForReady();

    // Accept some candidates
    await candidatesReviewPage.acceptCandidate(1);
    await candidatesReviewPage.acceptCandidate(2);
    await expect(candidatesReviewPage.saveActionsBar).toBeVisible();

    // Reject all accepted ones
    await candidatesReviewPage.rejectCandidate(1);
    await candidatesReviewPage.rejectCandidate(2);

    // Save bar should hide
    await expect(candidatesReviewPage.saveActionsBar).not.toBeVisible();
  });
});

test.describe("Review - Save Accepted Flashcards", () => {
  test.beforeEach(async ({ generatePage, longText }) => {
    await generatePage.generate(longText);
    await generatePage.waitForGenerationComplete();
  });

  test("save accepted flashcards to collection", async ({ candidatesReviewPage }) => {
    await candidatesReviewPage.waitForReady();

    // Accept 3 candidates
    await candidatesReviewPage.acceptCandidate(1);
    await candidatesReviewPage.acceptCandidate(2);
    await candidatesReviewPage.acceptCandidate(3);

    // Click save
    await candidatesReviewPage.saveAcceptedCandidates();

    // Should redirect to flashcards list
    await expect(candidatesReviewPage.page).toHaveURL("/flashcards");

    // Should show success message (toast or alert)
    // const successMessage = candidatesReviewPage.page.getByRole("alert");
    // await expect(successMessage).toBeVisible();
  });

  test("saved flashcards appear in list", async ({ candidatesReviewPage, flashcardsPage }) => {
    await candidatesReviewPage.waitForReady();

    // Get content of first candidate
    const frontText = await candidatesReviewPage.getCandidateFrontValue(1);
    const backText = await candidatesReviewPage.getCandidateBackValue(1);

    // Accept and save
    await candidatesReviewPage.acceptCandidate(1);
    await candidatesReviewPage.saveAcceptedCandidates();

    // Check in flashcards list
    await flashcardsPage.waitForReady();
    const flashcardCount = await flashcardsPage.getFlashcardCount();
    expect(flashcardCount).toBeGreaterThan(0);

    // Find the saved flashcard
    const pageContent = await flashcardsPage.page.textContent("body");
    expect(pageContent).toContain(frontText.substring(0, 20)); // Check partial match
  });

  test("cancel button discards all changes", async ({ candidatesReviewPage, flashcardsPage }) => {
    await candidatesReviewPage.waitForReady();

    // Accept some candidates
    await candidatesReviewPage.acceptCandidate(1);
    await candidatesReviewPage.acceptCandidate(2);

    // Get initial flashcard count
    await flashcardsPage.goto();
    const initialCount = await flashcardsPage.getFlashcardCount();

    // Go back to review
    await candidatesReviewPage.page.goBack();
    await candidatesReviewPage.waitForReady();

    // Cancel
    await candidatesReviewPage.cancelSave();

    // Should redirect to flashcards
    await expect(candidatesReviewPage.page).toHaveURL("/flashcards");

    // Count should be unchanged
    const finalCount = await flashcardsPage.getFlashcardCount();
    expect(finalCount).toBe(initialCount);
  });

  test("cannot save without accepted candidates", async ({ candidatesReviewPage }) => {
    await candidatesReviewPage.waitForReady();

    // Don't accept anything, save bar should be hidden
    await expect(candidatesReviewPage.saveActionsBar).not.toBeVisible();

    // If we somehow show it, save button should be disabled
    // (this is more of a defensive test)
  });
});

test.describe("Review - Error Handling", () => {
  test.beforeEach(async ({ generatePage, longText }) => {
    await generatePage.generate(longText);
    await generatePage.waitForGenerationComplete();
  });

  test.skip("handles save failure gracefully", async ({ candidatesReviewPage, page }) => {
    await candidatesReviewPage.waitForReady();

    // Mock save API to fail
    await page.route("**/api/flashcards/batch", (route) => {
      route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: { code: "SAVE_ERROR", message: "Failed to save" } }),
      });
    });

    // Accept and try to save
    await candidatesReviewPage.acceptCandidate(1);
    await candidatesReviewPage.saveAcceptedCandidates();

    // Should show error
    await expect(candidatesReviewPage.errorDisplay).toBeVisible();
    const errorText = await candidatesReviewPage.getErrorText();
    expect(errorText).toContain("Failed");

    // Should stay on review page
    await expect(page).toHaveURL(/\/generations/);
  });

  test.skip("handles network error during save", async ({ candidatesReviewPage, page }) => {
    await candidatesReviewPage.waitForReady();

    // Mock network failure
    await page.route("**/api/flashcards/batch", (route) => route.abort());

    // Accept and save
    await candidatesReviewPage.acceptCandidate(1);
    await candidatesReviewPage.saveAcceptedCandidates();

    // Should show network error
    await expect(candidatesReviewPage.errorDisplay).toBeVisible();
  });
});

test.describe("Review - Edge Cases", () => {
  test.beforeEach(async ({ generatePage, longText }) => {
    await generatePage.generate(longText);
    await generatePage.waitForGenerationComplete();
  });

  test("handles very long flashcard content", async ({ candidatesReviewPage }) => {
    await candidatesReviewPage.waitForReady();

    // Edit with very long text
    await candidatesReviewPage.editCandidate(1);
    const longFront = "A".repeat(500);
    const longBack = "B".repeat(2000);
    await candidatesReviewPage.fillCandidateFront(1, longFront);
    await candidatesReviewPage.fillCandidateBack(1, longBack);
    await candidatesReviewPage.saveEdit(1);

    // Should save successfully
    expect(await candidatesReviewPage.getCandidateFrontValue(1)).toBe(longFront);
    expect(await candidatesReviewPage.getCandidateBackValue(1)).toBe(longBack);
  });

  test("handles empty edited content", async ({ candidatesReviewPage }) => {
    await candidatesReviewPage.waitForReady();

    // Try to save empty content
    await candidatesReviewPage.editCandidate(1);
    await candidatesReviewPage.fillCandidateFront(1, "");
    await candidatesReviewPage.fillCandidateBack(1, "");

    // Save button should be disabled or show validation error
    const saveButton = candidatesReviewPage.getSaveEditButton(1);
    const isDisabled = await saveButton.isDisabled();
    expect(isDisabled).toBe(true);
  });

  test("rapid status changes handled correctly", async ({ candidatesReviewPage }) => {
    await candidatesReviewPage.waitForReady();

    // Rapidly change status
    await candidatesReviewPage.acceptCandidate(1);
    await candidatesReviewPage.rejectCandidate(1);
    await candidatesReviewPage.acceptCandidate(1);
    await candidatesReviewPage.rejectCandidate(1);
    await candidatesReviewPage.acceptCandidate(1);

    // Final status should be accepted
    expect(await candidatesReviewPage.getCandidateStatus(1)).toBe("accepted");

    // Counter should be 1
    const counterText = await candidatesReviewPage.saveCounter.textContent();
    expect(counterText).toContain("1");
  });
});
