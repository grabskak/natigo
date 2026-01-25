/**
 * FlashcardsView - Główny kontener widoku zarządzania fiszkami
 * Orchestruje wszystkie child components i zarządza stanem przez useFlashcards hook
 */

import { useFlashcards } from '@/lib/hooks/useFlashcards';
import FlashcardsHeader from './FlashcardsHeader';
import FlashcardsFilterBar from './FlashcardsFilterBar';
import FlashcardsList from './FlashcardsList';
import Pagination from './Pagination';
import FlashcardModal from './FlashcardModal';
import DeleteFlashcardDialog from './DeleteFlashcardDialog';
import type { FlashcardsFilters } from '@/types';

interface FlashcardsViewProps {
  initialPage?: number;
  initialFilters?: FlashcardsFilters;
}

export default function FlashcardsView({
  initialPage = 1,
  initialFilters = {},
}: FlashcardsViewProps) {
  // ========================================================================
  // Hook - Main State Management
  // ========================================================================

  const {
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
  } = useFlashcards(initialPage, initialFilters);

  // ========================================================================
  // Computed Values
  // ========================================================================

  const isEmpty = !isLoading && flashcards.length === 0;

  // Determine empty state variant
  const isFiltered =
    filters.source !== 'all' ||
    filters.sort !== 'created_at' ||
    filters.order !== 'desc';

  const emptyVariant = isEmpty && isFiltered ? 'filtered-empty' : 'total-empty';

  // ========================================================================
  // Handlers
  // ========================================================================

  const handleGenerateClick = () => {
    window.location.href = '/generations';
  };

  const handleFilterChange = (newFilters: FlashcardsFilters) => {
    updateFilters(newFilters);
  };

  // ========================================================================
  // Render
  // ========================================================================

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <FlashcardsHeader 
        onAddClick={openAddModal} 
        onGenerateClick={handleGenerateClick}
      />

      {/* Filter Bar */}
      <FlashcardsFilterBar filters={filters} onFilterChange={handleFilterChange} />

      {/* Error State */}
      {error && !isLoading && (
        <div className="rounded-md bg-destructive/10 p-4 mb-6">
          <p className="text-sm text-destructive">{error.message}</p>
          <button
            onClick={() => window.location.reload()}
            className="text-sm text-destructive underline mt-2"
          >
            Spróbuj ponownie
          </button>
        </div>
      )}

      {/* Flashcards List */}
      <FlashcardsList
        flashcards={flashcards}
        isLoading={isLoading}
        isEmpty={isEmpty}
        emptyVariant={emptyVariant}
        onEdit={openEditModal}
        onDelete={openDeleteDialog}
        onGenerateClick={handleGenerateClick}
        onAddManualClick={openAddModal}
        onClearFilters={clearFilters}
      />

      {/* Pagination */}
      {!isLoading && !isEmpty && (
        <Pagination pagination={pagination} onPageChange={goToPage} />
      )}

      {/* Modal - Add/Edit Flashcard */}
      <FlashcardModal
        isOpen={modalState.isOpen}
        mode={modalState.mode}
        flashcard={modalState.flashcard}
        isSubmitting={modalState.isSubmitting}
        error={modalState.error}
        onClose={closeModal}
        onSubmit={submitModal}
      />

      {/* Dialog - Delete Confirmation */}
      <DeleteFlashcardDialog
        isOpen={deleteDialogState.isOpen}
        isDeleting={deleteDialogState.isDeleting}
        onClose={closeDeleteDialog}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
