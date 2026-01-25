/**
 * Page Object Model - Index
 * Centralizes all POM exports for easy imports
 */

export { AuthPage } from "./auth.page";
export { GeneratePage } from "./generate.page";
export { CandidatesReviewPage, CandidateCard } from "./candidates-review.page";
export {
  FlashcardsPage,
  FlashcardCard,
  FlashcardModal,
  DeleteFlashcardDialog,
} from "./flashcards.page";

// Legacy exports (if needed for backward compatibility)
export { LoginPage } from "./login.page";
export { HomePage } from "./home.page";
