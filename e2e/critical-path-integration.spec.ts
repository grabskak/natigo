/**
 * E2E Tests - Critical Path Integration
 * Full end-to-end test of the main user journey:
 * Auth → List → Generate → Review → Save → List → CRUD
 */

import { test, expect } from "./fixtures";
import { generateText } from "./helpers";

test.describe("Critical Path - Complete Flow", () => {
  test("complete user journey: register → generate → review → save → manage", async ({
    page,
    authPage,
    generatePage,
    candidatesReviewPage,
    flashcardsPage,
  }) => {
    // ===== STEP 1: Registration =====
    await test.step("Register new user", async () => {
      const timestamp = Date.now();
      const email = `e2e-test-${timestamp}@example.com`;
      const password = "TestPassword123!";

      await authPage.gotoRegister();
      await authPage.fillRegisterForm(email, password, password);
      await authPage.submit();

      // For testing purposes, we skip email confirmation
      // In real scenario, user would confirm email
      // Here we'll login directly
    });

    // ===== STEP 2: Login =====
    await test.step("Login", async () => {
      // Use existing test user instead
      const testUser = { email: "test@example.com", password: "testpassword" };
      await authPage.login(testUser.email, testUser.password);

      // Should land on flashcards page
      await expect(page).toHaveURL("/flashcards");
    });

    // ===== STEP 3: Navigate to Generation =====
    await test.step("Navigate to generation", async () => {
      await flashcardsPage.waitForReady();
      await flashcardsPage.goToGenerate();

      await expect(page).toHaveURL("/generations");
      await expect(generatePage.form).toBeVisible();
    });

    // ===== STEP 4: Generate Flashcards =====
    let generatedFrontText: string;

    await test.step("Generate flashcards from text", async () => {
      const inputText = generateText(2000);
      await generatePage.fillText(inputText);
      await generatePage.submit();

      // Wait for generation
      await generatePage.waitForGenerationComplete();

      // Should navigate to review
      await expect(page).toHaveURL(/\/generations/);
      await expect(candidatesReviewPage.container).toBeVisible();
    });

    // ===== STEP 5: Review Candidates =====
    await test.step("Review generated candidates", async () => {
      await candidatesReviewPage.waitForReady();

      // Should have candidates
      const candidateCount = await candidatesReviewPage.getCandidateCount();
      expect(candidateCount).toBeGreaterThan(0);

      // Get first candidate text for later verification
      generatedFrontText = await candidatesReviewPage.getCandidateFrontValue(1);
    });

    // ===== STEP 6: Accept and Edit Candidates =====
    await test.step("Accept and edit some candidates", async () => {
      // Accept first candidate as-is
      await candidatesReviewPage.acceptCandidate(1);
      expect(await candidatesReviewPage.getCandidateStatus(1)).toBe("accepted");

      // Edit second candidate
      const candidateCount = await candidatesReviewPage.getCandidateCount();
      if (candidateCount >= 2) {
        await candidatesReviewPage.editCandidate(2);
        await candidatesReviewPage.fillCandidateFront(2, "Edited Front Text");
        await candidatesReviewPage.saveEdit(2);
        expect(await candidatesReviewPage.getCandidateStatus(2)).toBe("accepted");
      }

      // Reject third candidate
      if (candidateCount >= 3) {
        await candidatesReviewPage.rejectCandidate(3);
        expect(await candidatesReviewPage.getCandidateStatus(3)).toBe("rejected");
      }

      // Save bar should show correct count
      const acceptedCount = candidateCount >= 2 ? 2 : 1;
      const counterText = await candidatesReviewPage.saveCounter.textContent();
      expect(counterText).toContain(acceptedCount.toString());
    });

    // ===== STEP 7: Save to Collection =====
    await test.step("Save accepted flashcards", async () => {
      await candidatesReviewPage.saveAcceptedCandidates();

      // Should redirect to flashcards list
      await expect(page).toHaveURL("/flashcards");
    });

    // ===== STEP 8: Verify in List =====
    await test.step("Verify saved flashcards appear in list", async () => {
      await flashcardsPage.waitForReady();

      // Should see our generated flashcard
      const pageContent = await page.textContent("body");
      expect(pageContent).toContain(generatedFrontText.substring(0, 20));
    });

    // ===== STEP 9: Edit Flashcard =====
    await test.step("Edit a saved flashcard", async () => {
      // Get first flashcard
      const flashcards = await flashcardsPage.getAllFlashcardIds();
      expect(flashcards.length).toBeGreaterThan(0);

      const flashcardId = flashcards[0];

      // Edit it
      const newFront = `Edited via CRUD ${Date.now()}`;
      const newBack = `Updated back text ${Date.now()}`;
      await flashcardsPage.editFlashcard(flashcardId, newFront, newBack);

      await flashcardsPage.waitForReady();

      // Verify update
      const pageContent = await page.textContent("body");
      expect(pageContent).toContain(newFront);
    });

    // ===== STEP 10: Add Manual Flashcard =====
    await test.step("Add a manual flashcard", async () => {
      const manualFront = `Manual Flashcard ${Date.now()}`;
      const manualBack = `Manual Back ${Date.now()}`;

      const countBefore = await flashcardsPage.getFlashcardCount();

      await flashcardsPage.addFlashcard(manualFront, manualBack);
      await flashcardsPage.waitForReady();

      const countAfter = await flashcardsPage.getFlashcardCount();
      expect(countAfter).toBe(countBefore + 1);

      // Verify it's there
      const pageContent = await page.textContent("body");
      expect(pageContent).toContain(manualFront);
    });

    // ===== STEP 11: Filter Flashcards =====
    await test.step("Filter by source", async () => {
      // Filter to show only AI-generated
      await flashcardsPage.filterBySource("AI");
      await flashcardsPage.waitForReady();

      // Manual flashcard should not be visible
      // (assuming it was just added)
    });

    // ===== STEP 12: Delete Flashcard =====
    await test.step("Delete a flashcard", async () => {
      // Switch back to ALL to see manual flashcard
      await flashcardsPage.filterBySource("ALL");
      await flashcardsPage.waitForReady();

      const flashcards = await flashcardsPage.getAllFlashcardIds();
      const countBefore = await flashcardsPage.getFlashcardCount();

      // Delete the last one
      await flashcardsPage.deleteFlashcard(flashcards[flashcards.length - 1]);
      await flashcardsPage.waitForReady();

      const countAfter = await flashcardsPage.getFlashcardCount();
      expect(countAfter).toBe(countBefore - 1);
    });

    // ===== STEP 13: Logout (if implemented) =====
    // await test.step("Logout", async () => {
    //   // Click logout button
    //   await page.context().clearCookies();
    //   await page.goto("/login");
    //   await expect(page).toHaveURL(/\/login/);
    // });
  });

  test("quick flow: login → generate → accept all → save", async ({
    page,
    authPage,
    generatePage,
    candidatesReviewPage,
    flashcardsPage,
    testUser,
    longText,
  }) => {
    // Quick happy path
    await authPage.login(testUser.email, testUser.password);

    await flashcardsPage.goToGenerate();
    await generatePage.generate(longText);
    await generatePage.waitForGenerationComplete();

    await candidatesReviewPage.waitForReady();
    const candidateCount = await candidatesReviewPage.getCandidateCount();

    // Accept all candidates
    for (let i = 1; i <= candidateCount; i++) {
      await candidatesReviewPage.acceptCandidate(i);
    }

    await candidatesReviewPage.saveAcceptedCandidates();

    // Verify success
    await expect(page).toHaveURL("/flashcards");
    await flashcardsPage.waitForReady();
    const flashcardCount = await flashcardsPage.getFlashcardCount();
    expect(flashcardCount).toBeGreaterThanOrEqual(candidateCount);
  });

  test("flow with all rejections", async ({
    authPage,
    generatePage,
    candidatesReviewPage,
    flashcardsPage,
    testUser,
    longText,
  }) => {
    await authPage.login(testUser.email, testUser.password);

    const initialFlashcardCount = await flashcardsPage.getFlashcardCount();

    await flashcardsPage.goToGenerate();
    await generatePage.generate(longText);
    await generatePage.waitForGenerationComplete();

    await candidatesReviewPage.waitForReady();
    const candidateCount = await candidatesReviewPage.getCandidateCount();

    // Reject all candidates
    for (let i = 1; i <= candidateCount; i++) {
      await candidatesReviewPage.rejectCandidate(i);
    }

    // Save bar should not be visible
    await expect(candidatesReviewPage.saveActionsBar).not.toBeVisible();

    // Navigate back to flashcards manually
    await flashcardsPage.goto();
    await flashcardsPage.waitForReady();

    // Count should be unchanged
    const finalFlashcardCount = await flashcardsPage.getFlashcardCount();
    expect(finalFlashcardCount).toBe(initialFlashcardCount);
  });

  test("flow with cancel before save", async ({
    authPage,
    generatePage,
    candidatesReviewPage,
    flashcardsPage,
    testUser,
    longText,
  }) => {
    await authPage.login(testUser.email, testUser.password);

    await flashcardsPage.goto();
    const initialCount = await flashcardsPage.getFlashcardCount();

    await flashcardsPage.goToGenerate();
    await generatePage.generate(longText);
    await generatePage.waitForGenerationComplete();

    await candidatesReviewPage.waitForReady();
    await candidatesReviewPage.acceptCandidate(1);
    await candidatesReviewPage.acceptCandidate(2);

    // Cancel instead of save
    await candidatesReviewPage.cancelSave();

    // Should go back to flashcards
    await expect(flashcardsPage.page).toHaveURL("/flashcards");

    // Count unchanged
    await flashcardsPage.waitForReady();
    const finalCount = await flashcardsPage.getFlashcardCount();
    expect(finalCount).toBe(initialCount);
  });

  test("multiple generation cycles", async ({
    authPage,
    generatePage,
    candidatesReviewPage,
    flashcardsPage,
    testUser,
    longText,
  }) => {
    await authPage.login(testUser.email, testUser.password);

    const initialCount = await flashcardsPage.getFlashcardCount();

    // First generation
    await flashcardsPage.goToGenerate();
    await generatePage.generate(longText);
    await generatePage.waitForGenerationComplete();
    await candidatesReviewPage.waitForReady();
    await candidatesReviewPage.acceptCandidate(1);
    await candidatesReviewPage.saveAcceptedCandidates();

    await flashcardsPage.waitForReady();
    const countAfterFirst = await flashcardsPage.getFlashcardCount();
    expect(countAfterFirst).toBe(initialCount + 1);

    // Second generation
    await flashcardsPage.goToGenerate();
    await generatePage.generate(generateText(1500));
    await generatePage.waitForGenerationComplete();
    await candidatesReviewPage.waitForReady();
    await candidatesReviewPage.acceptCandidate(1);
    await candidatesReviewPage.saveAcceptedCandidates();

    await flashcardsPage.waitForReady();
    const countAfterSecond = await flashcardsPage.getFlashcardCount();
    expect(countAfterSecond).toBe(countAfterFirst + 1);
  });
});
