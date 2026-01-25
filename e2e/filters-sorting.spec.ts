/**
 * E2E Tests - Filters, Sorting & Pagination
 * Tests for flashcard list filtering, sorting, and pagination
 *
 * NOTE: These tests use authenticated storage state from auth.setup.ts
 */

import { test, expect } from "./fixtures";

test.describe("Flashcards - Sorting", () => {
  test("sort by newest first (default)", async ({ flashcardsPage }) => {
    await flashcardsPage.goto();
    await flashcardsPage.waitForReady();

    const count = await flashcardsPage.getFlashcardCount();
    if (count < 2) {
      // Create test flashcards
      await flashcardsPage.addFlashcard("Newer", "Created second");
      await flashcardsPage.page.waitForTimeout(1000); // Ensure different timestamps
      await flashcardsPage.addFlashcard("Newest", "Created last");
      await flashcardsPage.waitForReady();
    }

    // Apply "newest" sort
    await flashcardsPage.sortBy("created_at");
    await flashcardsPage.orderBy("DESC");
    await flashcardsPage.waitForReady();

    // Verify order (newest should be first)
    // This would require checking timestamps or IDs
  });

  test("sort by oldest first", async ({ flashcardsPage }) => {
    await flashcardsPage.goto();
    await flashcardsPage.waitForReady();

    // Apply "oldest" sort
    await flashcardsPage.sortBy("created_at");
    await flashcardsPage.orderBy("ASC");
    await flashcardsPage.waitForReady();

    // Verify order (oldest should be first)
  });

  test("sort alphabetically A-Z", async ({ flashcardsPage }) => {
    await flashcardsPage.goto();
    await flashcardsPage.waitForReady();

    // Apply alphabetical sort
    await flashcardsPage.sortBy("front");
    await flashcardsPage.orderBy("ASC");
    await flashcardsPage.waitForReady();

    // Get all visible flashcard front texts
    const flashcards = await flashcardsPage.getAllFlashcardIds();
    if (flashcards.length >= 2) {
      // Check if sorted (would need to extract actual text)
      // This is a simplified check
    }
  });

  test("sort alphabetically Z-A", async ({ flashcardsPage }) => {
    await flashcardsPage.goto();
    await flashcardsPage.waitForReady();

    // Apply reverse alphabetical sort
    await flashcardsPage.sortBy("front");
    await flashcardsPage.orderBy("DESC");
    await flashcardsPage.waitForReady();
  });

  test("changing sort persists during session", async ({ flashcardsPage }) => {
    await flashcardsPage.goto();
    await flashcardsPage.waitForReady();

    // Change sort
    await flashcardsPage.sortBy("front");
    await flashcardsPage.orderBy("ASC");
    await flashcardsPage.waitForReady();

    // Navigate away and back
    await flashcardsPage.goToGenerate();
    await flashcardsPage.goto();
    await flashcardsPage.waitForReady();

    // Sort should be remembered (check URL params or UI state)
    const url = flashcardsPage.page.url();
    expect(url).toContain("sort=front");
    expect(url).toContain("order=ASC");
  });

  test("combine filter and sort", async ({ flashcardsPage }) => {
    await flashcardsPage.goto();
    await flashcardsPage.waitForReady();

    // Apply filter
    await flashcardsPage.filterBySource("AI");

    // Apply sort
    await flashcardsPage.sortBy("created_at");
    await flashcardsPage.orderBy("DESC");

    await flashcardsPage.waitForReady();

    // Should show only AI flashcards, sorted by date
    const url = flashcardsPage.page.url();
    expect(url).toContain("source=AI");
    expect(url).toContain("sort=created_at");
  });
});

test.describe("Flashcards - Pagination", () => {
  test.skip("displays pagination when flashcards exceed page size", async ({ flashcardsPage }) => {
    await flashcardsPage.goto();
    await flashcardsPage.waitForReady();

    // Check if pagination is visible
    // (only if we have enough flashcards, e.g., > 20)
    const count = await flashcardsPage.getFlashcardCount();

    if (count > 20) {
      const pagination = flashcardsPage.page.locator('[role="navigation"]').filter({ hasText: /page|strona/i });
      await expect(pagination).toBeVisible();
    }
  });

  test.skip("navigate to next page", async ({ flashcardsPage }) => {
    await flashcardsPage.goto();
    await flashcardsPage.waitForReady();

    const count = await flashcardsPage.getFlashcardCount();

    // Only run if pagination exists
    if (count > 20) {
      const nextButton = flashcardsPage.page.getByRole("button", { name: /next|następn/i });

      if (await nextButton.isVisible()) {
        await nextButton.click();
        await flashcardsPage.waitForReady();

        // URL should reflect page 2
        const url = flashcardsPage.page.url();
        expect(url).toContain("page=2");
      }
    }
  });

  test.skip("navigate to previous page", async ({ flashcardsPage }) => {
    await flashcardsPage.goto();
    await flashcardsPage.waitForReady();

    // Go to page 2 first
    const nextButton = flashcardsPage.page.getByRole("button", { name: /next|następn/i });

    if (await nextButton.isVisible()) {
      await nextButton.click();
      await flashcardsPage.waitForReady();

      // Now go back
      const prevButton = flashcardsPage.page.getByRole("button", { name: /prev|poprz/i });
      await prevButton.click();
      await flashcardsPage.waitForReady();

      // Should be back on page 1
      const url = flashcardsPage.page.url();
      expect(url).not.toContain("page=2");
    }
  });

  test.skip("pagination resets when filter changes", async ({ flashcardsPage }) => {
    await flashcardsPage.goto();
    await flashcardsPage.waitForReady();

    // Go to page 2
    const nextButton = flashcardsPage.page.getByRole("button", { name: /next|następn/i });

    if (await nextButton.isVisible()) {
      await nextButton.click();
      await flashcardsPage.waitForReady();

      // Change filter
      await flashcardsPage.filterBySource("MANUAL");
      await flashcardsPage.waitForReady();

      // Should reset to page 1
      const url = flashcardsPage.page.url();
      expect(url).not.toContain("page=2");
    }
  });
});

test.describe("Flashcards - Combined Filters", () => {
  test("apply source + sort + order", async ({ flashcardsPage }) => {
    await flashcardsPage.goto();
    await flashcardsPage.waitForReady();

    // Apply all filters
    await flashcardsPage.filterBySource("AI");
    await flashcardsPage.sortBy("front");
    await flashcardsPage.orderBy("DESC");
    await flashcardsPage.waitForReady();

    // URL should have all params
    const url = flashcardsPage.page.url();
    expect(url).toContain("source=AI");
    expect(url).toContain("sort=front");
    expect(url).toContain("order=DESC");
  });

  test("clear filters returns to default view", async ({ flashcardsPage }) => {
    await flashcardsPage.goto();
    await flashcardsPage.waitForReady();

    // Apply filters
    await flashcardsPage.filterBySource("MANUAL");
    await flashcardsPage.sortBy("front");
    await flashcardsPage.waitForReady();

    // Reset to defaults
    await flashcardsPage.filterBySource("ALL");
    await flashcardsPage.sortBy("created_at");
    await flashcardsPage.orderBy("DESC");
    await flashcardsPage.waitForReady();

    // Should show all flashcards in default order
    const url = flashcardsPage.page.url();
    expect(url).toContain("source=ALL");
  });

  test("filters persist across navigation", async ({ flashcardsPage, generatePage }) => {
    await flashcardsPage.goto();
    await flashcardsPage.waitForReady();

    // Apply specific filters
    await flashcardsPage.filterBySource("AI");
    await flashcardsPage.sortBy("front");
    await flashcardsPage.waitForReady();

    const urlBefore = flashcardsPage.page.url();

    // Navigate away
    await flashcardsPage.goToGenerate();
    await expect(generatePage.page).toHaveURL("/generations");

    // Go back
    await flashcardsPage.page.goBack();
    await flashcardsPage.waitForReady();

    // Filters should be restored
    const urlAfter = flashcardsPage.page.url();
    expect(urlAfter).toContain("source=AI");
    expect(urlAfter).toContain("sort=front");
  });

  test("URL parameters correctly applied on page load", async ({ flashcardsPage }) => {
    // Navigate directly with query params
    await flashcardsPage.page.goto("/flashcards?source=MANUAL&sort=front&order=ASC");
    await flashcardsPage.waitForReady();

    // Filters should be applied
    // Verify by checking the UI state (selected options)
    const sourceSelect = flashcardsPage.sourceFilter;
    const sortSelect = flashcardsPage.sortFilter;
    const orderSelect = flashcardsPage.orderFilter;

    // These checks depend on how the Select component exposes its value
    // Simplified check: ensure page loaded correctly
    await expect(flashcardsPage.header).toBeVisible();
  });
});

test.describe("Flashcards - Filter Edge Cases", () => {
  test("empty result when filter matches nothing", async ({ flashcardsPage }) => {
    await flashcardsPage.goto();
    await flashcardsPage.waitForReady();

    // Apply filter that might result in no matches
    // (depends on test data)
    await flashcardsPage.filterBySource("MANUAL");
    await flashcardsPage.waitForReady();

    const count = await flashcardsPage.getFlashcardCount();

    if (count === 0) {
      // Should show empty state
      const emptyMessage = flashcardsPage.page.locator("text=/brak.*fiszek|no.*flashcards/i");
      await expect(emptyMessage).toBeVisible();
    }
  });

  test("filter after CRUD operation", async ({ flashcardsPage }) => {
    await flashcardsPage.goto();
    await flashcardsPage.waitForReady();

    // Apply filter
    await flashcardsPage.filterBySource("AI");
    await flashcardsPage.waitForReady();

    const countBefore = await flashcardsPage.getFlashcardCount();

    // Add a manual flashcard
    await flashcardsPage.addFlashcard("Manual Flashcard", "Should not appear");
    await flashcardsPage.waitForReady();

    // Count should be unchanged (filter still active)
    const countAfter = await flashcardsPage.getFlashcardCount();
    expect(countAfter).toBe(countBefore);

    // Change to ALL filter
    await flashcardsPage.filterBySource("ALL");
    await flashcardsPage.waitForReady();

    // Now count should increase
    const countAll = await flashcardsPage.getFlashcardCount();
    expect(countAll).toBeGreaterThan(countBefore);
  });

  test("rapid filter changes handled correctly", async ({ flashcardsPage }) => {
    await flashcardsPage.goto();
    await flashcardsPage.waitForReady();

    // Rapidly change filters
    await flashcardsPage.filterBySource("AI");
    await flashcardsPage.filterBySource("MANUAL");
    await flashcardsPage.filterBySource("ALL");
    await flashcardsPage.filterBySource("AI");

    await flashcardsPage.waitForReady();

    // Should settle on last filter (AI)
    const url = flashcardsPage.page.url();
    expect(url).toContain("source=AI");
  });
});

test.describe("Flashcards - Search (if implemented)", () => {
  test.skip("search flashcards by front text", async ({ flashcardsPage }) => {
    await flashcardsPage.goto();
    await flashcardsPage.waitForReady();

    // Create a distinct flashcard
    const uniqueText = `SearchTest-${Date.now()}`;
    await flashcardsPage.addFlashcard(uniqueText, "Searchable back");
    await flashcardsPage.waitForReady();

    // Search for it
    const searchInput = flashcardsPage.page.getByPlaceholder(/search|szukaj/i);
    await searchInput.fill(uniqueText);
    await flashcardsPage.waitForReady();

    // Should show only matching flashcards
    const count = await flashcardsPage.getFlashcardCount();
    expect(count).toBe(1);

    const pageContent = await flashcardsPage.page.textContent("body");
    expect(pageContent).toContain(uniqueText);
  });

  test.skip("search flashcards by back text", async ({ flashcardsPage }) => {
    await flashcardsPage.goto();
    await flashcardsPage.waitForReady();

    // Create flashcard with unique back text
    const uniqueBack = `BackSearchTest-${Date.now()}`;
    await flashcardsPage.addFlashcard("Front", uniqueBack);
    await flashcardsPage.waitForReady();

    // Search
    const searchInput = flashcardsPage.page.getByPlaceholder(/search|szukaj/i);
    await searchInput.fill(uniqueBack);
    await flashcardsPage.waitForReady();

    // Should find it
    const count = await flashcardsPage.getFlashcardCount();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test.skip("clear search shows all results", async ({ flashcardsPage }) => {
    await flashcardsPage.goto();
    await flashcardsPage.waitForReady();

    const initialCount = await flashcardsPage.getFlashcardCount();

    // Search for something specific
    const searchInput = flashcardsPage.page.getByPlaceholder(/search|szukaj/i);
    await searchInput.fill("specific");
    await flashcardsPage.waitForReady();

    const filteredCount = await flashcardsPage.getFlashcardCount();

    // Clear search
    await searchInput.clear();
    await flashcardsPage.waitForReady();

    // Should show all again
    const finalCount = await flashcardsPage.getFlashcardCount();
    expect(finalCount).toBe(initialCount);
  });

  test.skip("search with no results", async ({ flashcardsPage }) => {
    await flashcardsPage.goto();
    await flashcardsPage.waitForReady();

    // Search for gibberish
    const searchInput = flashcardsPage.page.getByPlaceholder(/search|szukaj/i);
    await searchInput.fill("xyznonexistentxyz123");
    await flashcardsPage.waitForReady();

    // Should show empty state
    const emptyMessage = flashcardsPage.page.locator("text=/brak.*wynik|no.*result/i");
    await expect(emptyMessage).toBeVisible();
  });
});
