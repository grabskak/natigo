/**
 * useFlashcards - Custom hook for managing flashcards view state
 * Handles fetching, pagination, filtering, CRUD operations, and URL synchronization
 */

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { FlashcardsApiService } from "@/lib/services/flashcards-api.service";
import type {
  FlashcardDto,
  FlashcardsFilters,
  PaginationState,
  FlashcardModalState,
  DeleteDialogState,
  FlashcardFormData,
  ApiError,
  ListFlashcardsQuery,
} from "@/types";

// ============================================================================
// Hook Interface
// ============================================================================

export interface UseFlashcardsReturn {
  // Data state
  flashcards: FlashcardDto[];
  isLoading: boolean;
  error: ApiError | null;

  // Pagination
  pagination: PaginationState;
  goToPage: (page: number) => void;

  // Filters
  filters: FlashcardsFilters;
  updateFilters: (filters: Partial<FlashcardsFilters>) => void;
  clearFilters: () => void;

  // Modal operations
  modalState: FlashcardModalState;
  openAddModal: () => void;
  openEditModal: (flashcard: FlashcardDto) => void;
  closeModal: () => void;
  submitModal: (data: FlashcardFormData) => Promise<void>;

  // Delete operations
  deleteDialogState: DeleteDialogState;
  openDeleteDialog: (flashcardId: string) => void;
  closeDeleteDialog: () => void;
  confirmDelete: () => Promise<void>;

  // Refresh
  refetch: () => Promise<void>;
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useFlashcards(initialPage = 1, initialFilters: Partial<FlashcardsFilters> = {}): UseFlashcardsReturn {
  // ========================================================================
  // State Management
  // ========================================================================

  const [flashcards, setFlashcards] = useState<FlashcardDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);

  const [pagination, setPagination] = useState<PaginationState>({
    currentPage: initialPage,
    totalPages: 1,
    total: 0,
    limit: 20,
  });

  const [filters, setFilters] = useState<FlashcardsFilters>({
    source: initialFilters.source || "all",
    sort: initialFilters.sort || "created_at",
    order: initialFilters.order || "desc",
  });

  const [modalState, setModalState] = useState<FlashcardModalState>({
    isOpen: false,
    mode: "add",
    flashcard: null,
    formData: { front: "", back: "" },
    validation: {
      front: { isValid: true, message: null },
      back: { isValid: true, message: null },
    },
    isSubmitting: false,
    error: null,
  });

  const [deleteDialogState, setDeleteDialogState] = useState<DeleteDialogState>({
    isOpen: false,
    flashcardId: null,
    isDeleting: false,
    error: null,
  });

  // ========================================================================
  // Core Data Fetching
  // ========================================================================

  const fetchFlashcards = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const query: ListFlashcardsQuery = {
        page: pagination.currentPage,
        limit: pagination.limit,
        sort: filters.sort,
        order: filters.order,
      };

      // Add source filter only if not 'all'
      if (filters.source !== "all") {
        query.source = filters.source;
      }

      const response = await FlashcardsApiService.list(query);

      setFlashcards(response.data);
      setPagination((prev) => ({
        ...prev,
        total: response.pagination.total,
        totalPages: response.pagination.total_pages,
      }));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load flashcards";
      setError({
        code: "FETCH_ERROR",
        message: errorMessage,
      });
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [pagination.currentPage, pagination.limit, filters]);

  const refetch = useCallback(async () => {
    await fetchFlashcards();
  }, [fetchFlashcards]);

  // ========================================================================
  // Pagination Functions
  // ========================================================================

  const goToPage = useCallback((page: number) => {
    setPagination((prev) => ({
      ...prev,
      currentPage: page,
    }));

    // Scroll to top of page
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  // ========================================================================
  // Filter Functions
  // ========================================================================

  const updateFilters = useCallback((newFilters: Partial<FlashcardsFilters>) => {
    setFilters((prev) => ({
      ...prev,
      ...newFilters,
    }));

    // Reset to page 1 when filters change
    setPagination((prev) => ({
      ...prev,
      currentPage: 1,
    }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({
      source: "all",
      sort: "created_at",
      order: "desc",
    });

    // Reset to page 1
    setPagination((prev) => ({
      ...prev,
      currentPage: 1,
    }));
  }, []);

  // ========================================================================
  // Modal Functions (Add/Edit)
  // ========================================================================

  const openAddModal = useCallback(() => {
    setModalState({
      isOpen: true,
      mode: "add",
      flashcard: null,
      formData: { front: "", back: "" },
      validation: {
        front: { isValid: true, message: null },
        back: { isValid: true, message: null },
      },
      isSubmitting: false,
      error: null,
    });
  }, []);

  const openEditModal = useCallback((flashcard: FlashcardDto) => {
    setModalState({
      isOpen: true,
      mode: "edit",
      flashcard,
      formData: {
        front: flashcard.front,
        back: flashcard.back,
      },
      validation: {
        front: { isValid: true, message: null },
        back: { isValid: true, message: null },
      },
      isSubmitting: false,
      error: null,
    });
  }, []);

  const closeModal = useCallback(() => {
    setModalState((prev) => ({
      ...prev,
      isOpen: false,
    }));
  }, []);

  const submitModal = useCallback(
    async (data: FlashcardFormData) => {
      setModalState((prev) => ({ ...prev, isSubmitting: true, error: null }));

      try {
        if (modalState.mode === "add") {
          await FlashcardsApiService.create(data);
          toast.success("Flashcard created successfully");
        } else if (modalState.mode === "edit" && modalState.flashcard) {
          await FlashcardsApiService.update(modalState.flashcard.id, data);
          toast.success("Flashcard updated successfully");
        }

        closeModal();
        await refetch();
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to save flashcard";
        setModalState((prev) => ({
          ...prev,
          error: {
            code: "SUBMIT_ERROR",
            message: errorMessage,
          },
        }));
        // Don't show toast here - error will be displayed in modal
      } finally {
        setModalState((prev) => ({ ...prev, isSubmitting: false }));
      }
    },
    [modalState.mode, modalState.flashcard, closeModal, refetch]
  );

  // ========================================================================
  // Delete Dialog Functions
  // ========================================================================

  const openDeleteDialog = useCallback((flashcardId: string) => {
    setDeleteDialogState({
      isOpen: true,
      flashcardId,
      isDeleting: false,
      error: null,
    });
  }, []);

  const closeDeleteDialog = useCallback(() => {
    setDeleteDialogState({
      isOpen: false,
      flashcardId: null,
      isDeleting: false,
      error: null,
    });
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!deleteDialogState.flashcardId) return;

    setDeleteDialogState((prev) => ({ ...prev, isDeleting: true, error: null }));

    try {
      await FlashcardsApiService.delete(deleteDialogState.flashcardId);
      toast.success("Flashcard deleted");

      closeDeleteDialog();

      // If this was the last flashcard on the page and we're not on page 1
      // go back to the previous page
      if (flashcards.length === 1 && pagination.currentPage > 1) {
        goToPage(pagination.currentPage - 1);
      } else {
        await refetch();
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to delete flashcard";
      toast.error(errorMessage);
      setDeleteDialogState((prev) => ({
        ...prev,
        error: {
          code: "DELETE_ERROR",
          message: errorMessage,
        },
      }));
    } finally {
      setDeleteDialogState((prev) => ({ ...prev, isDeleting: false }));
    }
  }, [deleteDialogState.flashcardId, flashcards.length, pagination.currentPage, closeDeleteDialog, refetch, goToPage]);

  // ========================================================================
  // Effects
  // ========================================================================

  // Fetch flashcards when pagination or filters change
  useEffect(() => {
    fetchFlashcards();
  }, [fetchFlashcards]);

  // Synchronize URL with filters and pagination
  useEffect(() => {
    const params = new URLSearchParams();

    // Always set page
    params.set("page", pagination.currentPage.toString());

    // Only set non-default values
    if (filters.source !== "all") {
      params.set("source", filters.source);
    }

    if (filters.sort !== "created_at") {
      params.set("sort", filters.sort);
    }

    if (filters.order !== "desc") {
      params.set("order", filters.order);
    }

    // Update URL without reload
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState(null, "", newUrl);
  }, [pagination.currentPage, filters]);

  // Handle edge case: current page > total pages
  useEffect(() => {
    if (pagination.currentPage > pagination.totalPages && pagination.totalPages > 0) {
      goToPage(pagination.totalPages);
    }
  }, [pagination.currentPage, pagination.totalPages, goToPage]);

  // ========================================================================
  // Return Hook Interface
  // ========================================================================

  return {
    // Data state
    flashcards,
    isLoading,
    error,

    // Pagination
    pagination,
    goToPage,

    // Filters
    filters,
    updateFilters,
    clearFilters,

    // Modal operations
    modalState,
    openAddModal,
    openEditModal,
    closeModal,
    submitModal,

    // Delete operations
    deleteDialogState,
    openDeleteDialog,
    closeDeleteDialog,
    confirmDelete,

    // Refresh
    refetch,
  };
}
