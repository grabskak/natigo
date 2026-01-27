import type { Database } from "./db/database.types";

// ============================================================================
// Base Database Types
// ============================================================================

/**
 * Flashcard entity from database
 */
export type FlashcardEntity = Database["public"]["Tables"]["flashcards"]["Row"];

/**
 * Flashcard insert type from database
 */
export type FlashcardInsert = Database["public"]["Tables"]["flashcards"]["Insert"];

/**
 * Flashcard update type from database
 */
export type FlashcardUpdate = Database["public"]["Tables"]["flashcards"]["Update"];

/**
 * Generation entity from database
 */
export type GenerationEntity = Database["public"]["Tables"]["generations"]["Row"];

/**
 * Generation insert type from database
 */
export type GenerationInsert = Database["public"]["Tables"]["generations"]["Insert"];

/**
 * Generation update type from database
 */
export type GenerationUpdate = Database["public"]["Tables"]["generations"]["Update"];

/**
 * Generation error log entity from database
 */
export type GenerationErrorLogEntity = Database["public"]["Tables"]["generation_error_logs"]["Row"];

/**
 * Generation error log insert type from database
 */
export type GenerationErrorLogInsert = Database["public"]["Tables"]["generation_error_logs"]["Insert"];

/**
 * Flashcard source enum from database
 */
export type FlashcardSource = Database["public"]["Enums"]["flashcard_source"];

// ============================================================================
// Common DTOs
// ============================================================================

/**
 * Pagination metadata for list responses
 */
export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
}

/**
 * Generic paginated response wrapper
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}

/**
 * API error response structure
 */
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown> | ValidationErrorDetail[];
}

/**
 * Validation error detail for array validation
 */
export interface ValidationErrorDetail {
  index: number;
  field: string;
  message: string;
}

/**
 * Error response wrapper
 */
export interface ErrorResponse {
  error: ApiError;
}

// ============================================================================
// Auth DTOs
// ============================================================================

export interface AuthUserDto {
  id: string;
  email: string | null;
}

export interface AuthSessionDto {
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
}

// ============================================================================
// Flashcard DTOs
// ============================================================================

/**
 * Flashcard DTO for API responses
 * Based on FlashcardEntity but formatted for API consumption
 */
export type FlashcardDto = Pick<
  FlashcardEntity,
  "id" | "generation_id" | "front" | "back" | "source" | "created_at" | "updated_at"
>;

/**
 * Command for creating a single flashcard
 * Client provides front, back, and optionally source (system-managed) and generation_id
 */
export interface CreateFlashcardCommand {
  front: string;
  back: string;
  source: FlashcardSource;
  generation_id?: string | null;
}

/**
 * Response for creating flashcard(s)
 * Can return single or multiple flashcards
 */
export interface CreateFlashcardsResponse {
  created_count: number;
  flashcards: FlashcardDto[];
}

/**
 * Command for updating an existing flashcard
 */
export interface UpdateFlashcardCommand {
  front: string;
  back: string;
}

/**
 * Query parameters for listing flashcards
 */
export interface ListFlashcardsQuery {
  page?: number;
  limit?: number;
  sort?: "created_at" | "updated_at";
  order?: "asc" | "desc";
  source?: FlashcardSource;
  generation_id?: string;
}

/**
 * Paginated response for flashcard list
 */
export type PaginatedFlashcardsResponse = PaginatedResponse<FlashcardDto>;

// ============================================================================
// Generation DTOs
// ============================================================================

/**
 * Generation DTO for API responses
 * Based on GenerationEntity
 */
export type GenerationDto = Pick<
  GenerationEntity,
  | "id"
  | "user_id"
  | "input_text_length"
  | "duration_ms"
  | "generated_count"
  | "accepted_edited_count"
  | "accepted_unedited_count"
  | "created_at"
  | "updated_at"
>;

/**
 * Generation with computed rejected count
 */
export interface GenerationWithStats extends GenerationDto {
  rejected_count: number;
}

/**
 * Detailed generation DTO including related flashcards
 */
export interface GenerationDetailDto extends GenerationDto {
  input_text_hash: string;
  flashcards: FlashcardDto[];
}

/**
 * Command for generating flashcards from text
 */
export interface GenerateFlashcardsCommand {
  input_text: string;
}

/**
 * AI-generated flashcard candidate (temporary, not yet saved)
 */
export interface FlashcardCandidateDto {
  front: string;
  back: string;
  source: "ai-full";
}

/**
 * Metadata about generation process
 */
export interface GenerationMetadata {
  input_text_length: number;
  duration_ms: number;
  generated_count: number;
}

/**
 * Response for flashcard generation
 */
export interface GenerateFlashcardsResponse {
  generation_id: string;
  candidates: FlashcardCandidateDto[];
  metadata: GenerationMetadata;
}

/**
 * Flashcard to save from generation (with edit tracking)
 */
export interface SaveFlashcardItem {
  candidate_id: string;
  front: string;
  back: string;
  was_edited: boolean;
}

/**
 * Command for saving generated flashcards
 */
export interface SaveGeneratedFlashcardsCommand {
  flashcards: SaveFlashcardItem[];
}

/**
 * Summary of generation after saving
 */
export interface GenerationSummary {
  generated_count: number;
  accepted_unedited_count: number;
  accepted_edited_count: number;
  rejected_count: number;
}

/**
 * Response for saving generated flashcards
 */
export interface SaveGeneratedFlashcardsResponse {
  saved_count: number;
  flashcards: FlashcardDto[];
  generation_summary: GenerationSummary;
}

/**
 * Query parameters for listing generations
 */
export interface ListGenerationsQuery {
  page?: number;
  limit?: number;
}

/**
 * Paginated response for generation list
 */
export type PaginatedGenerationsResponse = PaginatedResponse<GenerationWithStats>;

// ============================================================================
// Error Log DTOs
// ============================================================================

/**
 * Error log DTO for API responses
 * Based on GenerationErrorLogEntity
 */
export type ErrorLogDto = Pick<
  GenerationErrorLogEntity,
  "id" | "generation_id" | "error_code" | "error_message" | "created_at"
>;

/**
 * Query parameters for listing error logs
 */
export interface ListErrorLogsQuery {
  page?: number;
  limit?: number;
  generation_id?: string;
}

/**
 * Paginated response for error log list
 */
export type PaginatedErrorLogsResponse = PaginatedResponse<ErrorLogDto>;

// ============================================================================
// Generate View Types (ViewModel)
// ============================================================================

/**
 * State of the main Generate Screen container
 */
export type GenerateScreenState =
  | { status: "form" }
  | { status: "loading" }
  | { status: "error"; error: ApiError }
  | { status: "review"; data: GenerationResult };

/**
 * Result from generation API with all candidates
 */
export interface GenerationResult {
  generationId: string;
  candidates: FlashcardCandidateDto[];
  metadata: GenerationMetadata;
}

/**
 * Decision state for each candidate
 */
export type CandidateDecisionState = "pending" | "accepted" | "edited" | "rejected";

/**
 * User decision for a single candidate
 */
export interface CandidateDecision {
  candidateIndex: number;
  state: CandidateDecisionState;
  editedContent?: { front: string; back: string };
}

/**
 * Statistics about decisions made on candidates
 */
export interface DecisionStats {
  total: number;
  pending: number;
  accepted: number;
  edited: number;
  rejected: number;
}

/**
 * Validation state for form fields
 */
export interface ValidationState {
  isValid: boolean;
  message: string | null;
}

// ============================================================================
// Flashcards View Types (ViewModel)
// ============================================================================

/**
 * Typ stanu głównego widoku Flashcards
 */
export interface FlashcardsViewState {
  flashcards: FlashcardDto[];
  isLoading: boolean;
  error: ApiError | null;
  pagination: PaginationState;
  filters: FlashcardsFilters;
  modal: FlashcardModalState;
  deleteDialog: DeleteDialogState;
}

/**
 * Stan paginacji w widoku
 */
export interface PaginationState {
  currentPage: number;
  totalPages: number;
  total: number;
  limit: number;
}

/**
 * Filtry dla listy fiszek
 */
export interface FlashcardsFilters {
  source: "all" | FlashcardSource;
  sort: "created_at" | "updated_at";
  order: "asc" | "desc";
}

/**
 * Stan modala fiszki (add/edit)
 */
export interface FlashcardModalState {
  isOpen: boolean;
  mode: "add" | "edit";
  flashcard: FlashcardDto | null;
  formData: FlashcardFormData;
  validation: {
    front: ValidationState;
    back: ValidationState;
  };
  isSubmitting: boolean;
  error: ApiError | null;
}

/**
 * Dane formularza fiszki
 */
export interface FlashcardFormData {
  front: string;
  back: string;
}

/**
 * Stan dialogu usuwania fiszki
 */
export interface DeleteDialogState {
  isOpen: boolean;
  flashcardId: string | null;
  isDeleting: boolean;
  error: ApiError | null;
}

/**
 * Wariant pustego stanu
 */
export type EmptyStateVariant = "total-empty" | "filtered-empty";

/**
 * Rozszerzona PaginationMeta z total_pages
 */
export interface PaginationMetaExtended extends PaginationMeta {
  total_pages: number;
}

// ============================================================================
// Type Guards
// ============================================================================

// ============================================================================
// OpenRouter Service Types
// ============================================================================

/**
 * Re-export OpenRouter types for use throughout the application
 */
export type {
  OpenRouterConfig,
  CompletionOptions,
  CompletionResult,
  ChatMessage,
  ResponseFormat,
  ModelInfo,
  FlashcardGenerationOptions,
  AIFlashcard,
  TokenUsage,
  JsonSchema,
} from "./lib/types/openrouter.types";
