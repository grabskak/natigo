import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@/test/test-utils";
import userEvent from "@testing-library/user-event";
import FlashcardCard from "./FlashcardCard";
import type { FlashcardDto } from "@/types";

describe("FlashcardCard component", () => {
  // Test data factory
  const createMockFlashcard = (overrides?: Partial<FlashcardDto>): FlashcardDto => ({
    id: "test-id-123",
    generation_id: null,
    front: "What is TypeScript?",
    back: "TypeScript is a typed superset of JavaScript",
    source: "manual",
    created_at: "2024-01-15T10:00:00.000Z",
    updated_at: "2024-01-15T10:00:00.000Z",
    ...overrides,
  });

  describe("Rendering", () => {
    it("should render flashcard with front and back content", () => {
      // Arrange
      const flashcard = createMockFlashcard();
      const onEdit = vi.fn();
      const onDelete = vi.fn();

      // Act
      render(<FlashcardCard flashcard={flashcard} onEdit={onEdit} onDelete={onDelete} />);

      // Assert
      expect(screen.getByText("Przód:")).toBeInTheDocument();
      expect(screen.getByText("What is TypeScript?")).toBeInTheDocument();
      expect(screen.getByText("Tył:")).toBeInTheDocument();
      expect(screen.getByText("TypeScript is a typed superset of JavaScript")).toBeInTheDocument();
    });

    it("should render creation date", () => {
      // Arrange
      const flashcard = createMockFlashcard({
        created_at: "2024-01-15T10:00:00.000Z",
      });

      // Act
      render(<FlashcardCard flashcard={flashcard} onEdit={vi.fn()} onDelete={vi.fn()} />);

      // Assert
      expect(screen.getByText(/Utworzono:/)).toBeInTheDocument();
      expect(screen.getByText(/Jan 15, 2024/)).toBeInTheDocument();
    });

    it("should render update date when different from creation date", () => {
      // Arrange
      const flashcard = createMockFlashcard({
        created_at: "2024-01-15T10:00:00.000Z",
        updated_at: "2024-01-20T15:30:00.000Z",
      });

      // Act
      render(<FlashcardCard flashcard={flashcard} onEdit={vi.fn()} onDelete={vi.fn()} />);

      // Assert
      expect(screen.getByText(/Zaktualizowano:/)).toBeInTheDocument();
      expect(screen.getByText(/Jan 20, 2024/)).toBeInTheDocument();
    });

    it("should not render update date when same as creation date", () => {
      // Arrange
      const flashcard = createMockFlashcard({
        created_at: "2024-01-15T10:00:00.000Z",
        updated_at: "2024-01-15T10:00:00.000Z",
      });

      // Act
      render(<FlashcardCard flashcard={flashcard} onEdit={vi.fn()} onDelete={vi.fn()} />);

      // Assert
      expect(screen.queryByText(/Zaktualizowano:/)).not.toBeInTheDocument();
    });

    it("should break long words to prevent overflow", () => {
      // Arrange
      const flashcard = createMockFlashcard({
        front: "VeryLongWordWithoutSpacesToTestBreakWordFunctionality",
        back: "AnotherVeryLongWordWithoutSpacesToTestBreakWordFunctionality",
      });

      // Act
      const { container } = render(<FlashcardCard flashcard={flashcard} onEdit={vi.fn()} onDelete={vi.fn()} />);

      // Assert
      const frontParagraph = container.querySelector(".font-medium.break-words");
      const backParagraph = container.querySelectorAll(".break-words")[1];
      expect(frontParagraph).toHaveClass("break-words");
      expect(backParagraph).toHaveClass("break-words");
    });
  });

  describe("Badge variants based on source", () => {
    it('should render "Ręczne" badge for manual source', () => {
      // Arrange
      const flashcard = createMockFlashcard({ source: "manual" });

      // Act
      render(<FlashcardCard flashcard={flashcard} onEdit={vi.fn()} onDelete={vi.fn()} />);

      // Assert
      const badge = screen.getByText("Ręczne");
      expect(badge).toBeInTheDocument();
    });

    it('should render "Wygenerowane przez AI" badge for ai-full source', () => {
      // Arrange
      const flashcard = createMockFlashcard({ source: "ai-full" });

      // Act
      render(<FlashcardCard flashcard={flashcard} onEdit={vi.fn()} onDelete={vi.fn()} />);

      // Assert
      const badge = screen.getByText("Wygenerowane przez AI");
      expect(badge).toBeInTheDocument();
    });

    it('should render "Edytowane AI" badge with orange styling for ai-edited source', () => {
      // Arrange
      const flashcard = createMockFlashcard({ source: "ai-edited" });

      // Act
      render(<FlashcardCard flashcard={flashcard} onEdit={vi.fn()} onDelete={vi.fn()} />);

      // Assert
      const badge = screen.getByText("Edytowane AI");
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass("border-orange-500", "text-orange-700");
    });
  });

  describe("User interactions", () => {
    it("should call onEdit with flashcard when edit menu item is clicked", async () => {
      // Arrange
      const user = userEvent.setup();
      const flashcard = createMockFlashcard();
      const onEdit = vi.fn();
      const onDelete = vi.fn();

      render(<FlashcardCard flashcard={flashcard} onEdit={onEdit} onDelete={onDelete} />);

      // Act
      const menuButton = screen.getByTestId(`flashcard-menu-button-${flashcard.id}`);
      await user.click(menuButton);

      const editMenuItem = screen.getByTestId(`flashcard-edit-menu-item-${flashcard.id}`);
      await user.click(editMenuItem);

      // Assert
      expect(onEdit).toHaveBeenCalledTimes(1);
      expect(onEdit).toHaveBeenCalledWith(flashcard);
    });

    it("should call onDelete with flashcard id when delete menu item is clicked", async () => {
      // Arrange
      const user = userEvent.setup();
      const flashcard = createMockFlashcard();
      const onEdit = vi.fn();
      const onDelete = vi.fn();

      render(<FlashcardCard flashcard={flashcard} onEdit={onEdit} onDelete={onDelete} />);

      // Act
      const menuButton = screen.getByTestId(`flashcard-menu-button-${flashcard.id}`);
      await user.click(menuButton);

      const deleteMenuItem = screen.getByTestId(`flashcard-delete-menu-item-${flashcard.id}`);
      await user.click(deleteMenuItem);

      // Assert
      expect(onDelete).toHaveBeenCalledTimes(1);
      expect(onDelete).toHaveBeenCalledWith(flashcard.id);
    });

    it("should open and close dropdown menu on button click", async () => {
      // Arrange
      const user = userEvent.setup();
      const flashcard = createMockFlashcard();

      render(<FlashcardCard flashcard={flashcard} onEdit={vi.fn()} onDelete={vi.fn()} />);

      // Act - Open menu
      const menuButton = screen.getByTestId(`flashcard-menu-button-${flashcard.id}`);
      await user.click(menuButton);

      // Assert - Menu is visible
      expect(screen.getByText("Edytuj")).toBeVisible();
      expect(screen.getByText("Usuń")).toBeVisible();

      // Act - Close menu by pressing Escape
      await user.keyboard("{Escape}");

      // Assert - Menu is closed (items should not be in the document)
      expect(screen.queryByText("Edytuj")).not.toBeInTheDocument();
      expect(screen.queryByText("Usuń")).not.toBeInTheDocument();
    });
  });

  describe("Styling", () => {
    it("should apply hover shadow transition to card", () => {
      // Arrange
      const flashcard = createMockFlashcard();

      // Act
      const { container } = render(<FlashcardCard flashcard={flashcard} onEdit={vi.fn()} onDelete={vi.fn()} />);

      // Assert
      const card = container.firstChild;
      expect(card).toHaveClass("hover:shadow-md", "transition-shadow");
    });

    it("should apply destructive styling to delete menu item", async () => {
      // Arrange
      const user = userEvent.setup();
      const flashcard = createMockFlashcard();

      render(<FlashcardCard flashcard={flashcard} onEdit={vi.fn()} onDelete={vi.fn()} />);

      // Act
      const menuButton = screen.getByTestId(`flashcard-menu-button-${flashcard.id}`);
      await user.click(menuButton);

      // Assert
      const deleteMenuItem = screen.getByTestId(`flashcard-delete-menu-item-${flashcard.id}`);
      expect(deleteMenuItem).toHaveClass("text-destructive", "focus:text-destructive");
    });
  });

  describe("Accessibility", () => {
    it("should have sr-only label for menu button", () => {
      // Arrange
      const flashcard = createMockFlashcard();

      // Act
      render(<FlashcardCard flashcard={flashcard} onEdit={vi.fn()} onDelete={vi.fn()} />);

      // Assert
      const srOnlyLabel = screen.getByText("Open menu");
      expect(srOnlyLabel).toHaveClass("sr-only");
    });

    it("should have proper data-testid attributes for testing", () => {
      // Arrange
      const flashcard = createMockFlashcard({ id: "test-123" });

      // Act
      render(<FlashcardCard flashcard={flashcard} onEdit={vi.fn()} onDelete={vi.fn()} />);

      // Assert
      expect(screen.getByTestId("flashcard-card-test-123")).toBeInTheDocument();
      expect(screen.getByTestId("flashcard-menu-button-test-123")).toBeInTheDocument();
    });
  });

  describe("Date formatting", () => {
    it("should format date with correct locale format", () => {
      // Arrange
      const flashcard = createMockFlashcard({
        created_at: "2024-03-25T14:30:00.000Z",
      });

      // Act
      render(<FlashcardCard flashcard={flashcard} onEdit={vi.fn()} onDelete={vi.fn()} />);

      // Assert
      expect(screen.getByText(/Mar 25, 2024/)).toBeInTheDocument();
    });

    it("should handle different date formats correctly", () => {
      // Arrange
      const flashcard = createMockFlashcard({
        created_at: "2024-12-15T10:00:00.000Z",
        updated_at: "2025-01-20T15:00:00.000Z",
      });

      // Act
      render(<FlashcardCard flashcard={flashcard} onEdit={vi.fn()} onDelete={vi.fn()} />);

      // Assert - Both dates should be displayed
      expect(screen.getByText(/Utworzono:/)).toBeInTheDocument();
      expect(screen.getByText(/Zaktualizowano:/)).toBeInTheDocument();
      expect(screen.getByText(/2024/)).toBeInTheDocument();
      expect(screen.getByText(/2025/)).toBeInTheDocument();
    });
  });

  describe("Edge cases", () => {
    it("should handle empty strings in front and back", () => {
      // Arrange
      const flashcard = createMockFlashcard({
        front: "",
        back: "",
      });

      // Act
      render(<FlashcardCard flashcard={flashcard} onEdit={vi.fn()} onDelete={vi.fn()} />);

      // Assert
      expect(screen.getByText("Przód:")).toBeInTheDocument();
      expect(screen.getByText("Tył:")).toBeInTheDocument();
    });

    it("should handle very long text content", () => {
      // Arrange
      const longFrontText = "A".repeat(1000);
      const longBackText = "B".repeat(1000);
      const flashcard = createMockFlashcard({
        front: longFrontText,
        back: longBackText,
      });

      // Act
      render(<FlashcardCard flashcard={flashcard} onEdit={vi.fn()} onDelete={vi.fn()} />);

      // Assert - Component should render without errors
      expect(screen.getByText(longFrontText)).toBeInTheDocument();
      expect(screen.getByText(longBackText)).toBeInTheDocument();
    });

    it("should handle null generation_id", () => {
      // Arrange
      const flashcard = createMockFlashcard({
        generation_id: null,
      });

      // Act
      render(<FlashcardCard flashcard={flashcard} onEdit={vi.fn()} onDelete={vi.fn()} />);

      // Assert - Component should render without errors
      expect(screen.getByTestId(`flashcard-card-${flashcard.id}`)).toBeInTheDocument();
    });
  });

  describe("Type safety", () => {
    it("should accept valid FlashcardDto type", () => {
      // Arrange
      const flashcard: FlashcardDto = createMockFlashcard();
      const onEdit = vi.fn<(flashcard: FlashcardDto) => void>();
      const onDelete = vi.fn<(id: string) => void>();

      // Act & Assert - TypeScript compilation ensures type safety
      render(<FlashcardCard flashcard={flashcard} onEdit={onEdit} onDelete={onDelete} />);

      expect(screen.getByTestId(`flashcard-card-${flashcard.id}`)).toBeInTheDocument();
    });
  });
});
