/**
 * FlashcardsApiService - API client for flashcards operations
 * Handles all HTTP communication with /api/flashcards endpoints
 */

import type {
  ListFlashcardsQuery,
  PaginatedFlashcardsResponse,
  FlashcardFormData,
  CreateFlashcardsResponse,
  FlashcardDto,
  CreateFlashcardCommand,
  UpdateFlashcardCommand,
  ErrorResponse,
  PaginationMetaExtended,
} from '@/types';

export class FlashcardsApiService {
  /**
   * GET /api/flashcards - Lista fiszek z paginacją i filtrami
   * @throws Error jeśli request się nie powiedzie
   */
  static async list(query: ListFlashcardsQuery): Promise<PaginatedFlashcardsResponse> {
    // Build query parameters
    const params = new URLSearchParams();
    
    if (query.page) {
      params.set('page', query.page.toString());
    }
    
    if (query.limit) {
      params.set('limit', query.limit.toString());
    }
    
    if (query.sort) {
      params.set('sort', query.sort);
    }
    
    if (query.order) {
      params.set('order', query.order);
    }
    
    if (query.source) {
      params.set('source', query.source);
    }
    
    if (query.generation_id) {
      params.set('generation_id', query.generation_id);
    }

    const url = `/api/flashcards${params.toString() ? `?${params.toString()}` : ''}`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      // Handle 401 Unauthorized - redirect to login
      if (response.status === 401) {
        window.location.href = '/login';
        throw new Error('Unauthorized - redirecting to login');
      }

      // Handle other error responses
      if (!response.ok) {
        const errorData: ErrorResponse = await response.json();
        throw new Error(errorData.error.message || 'Failed to fetch flashcards');
      }

      // Success - parse and return response with extended pagination
      const data = await response.json() as { 
        data: FlashcardDto[]; 
        pagination: PaginationMetaExtended 
      };
      
      return data;
    } catch (error) {
      // Network errors or parsing errors
      if (error instanceof TypeError) {
        throw new Error('Network error. Please check your connection and try again.');
      }
      
      // Re-throw other errors (including API errors)
      throw error;
    }
  }

  /**
   * POST /api/flashcards - Tworzenie nowej fiszki manualnie
   * @throws Error jeśli request się nie powiedzie
   */
  static async create(data: FlashcardFormData): Promise<CreateFlashcardsResponse> {
    // Prepare command with trimmed data
    const command: CreateFlashcardCommand = {
      front: data.front.trim(),
      back: data.back.trim(),
      source: 'manual',
      generation_id: null,
    };

    try {
      const response = await fetch('/api/flashcards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify([command]), // API expects array
      });

      // Handle 401 Unauthorized - redirect to login
      if (response.status === 401) {
        window.location.href = '/login';
        throw new Error('Unauthorized - redirecting to login');
      }

      // Handle validation errors (422)
      if (response.status === 422) {
        const errorData: ErrorResponse = await response.json();
        throw new Error(errorData.error.message || 'Validation failed');
      }

      // Handle bad request (400)
      if (response.status === 400) {
        const errorData: ErrorResponse = await response.json();
        throw new Error(errorData.error.message || 'Invalid request');
      }

      // Handle other error responses
      if (!response.ok) {
        const errorData: ErrorResponse = await response.json();
        throw new Error(errorData.error.message || 'Failed to create flashcard');
      }

      // Success - parse and return response
      return await response.json();
    } catch (error) {
      // Network errors
      if (error instanceof TypeError) {
        throw new Error('Network error. Please check your connection and try again.');
      }
      
      // Re-throw other errors
      throw error;
    }
  }

  /**
   * PUT /api/flashcards/{id} - Aktualizacja istniejącej fiszki
   * @throws Error jeśli request się nie powiedzie
   */
  static async update(id: string, data: FlashcardFormData): Promise<FlashcardDto> {
    // Prepare command with trimmed data
    const command: UpdateFlashcardCommand = {
      front: data.front.trim(),
      back: data.back.trim(),
    };

    try {
      const response = await fetch(`/api/flashcards/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(command),
      });

      // Handle 401 Unauthorized - redirect to login
      if (response.status === 401) {
        window.location.href = '/login';
        throw new Error('Unauthorized - redirecting to login');
      }

      // Handle 404 Not Found
      if (response.status === 404) {
        throw new Error('Flashcard not found. It may have been deleted.');
      }

      // Handle validation errors (422)
      if (response.status === 422) {
        const errorData: ErrorResponse = await response.json();
        throw new Error(errorData.error.message || 'Validation failed');
      }

      // Handle bad request (400)
      if (response.status === 400) {
        const errorData: ErrorResponse = await response.json();
        throw new Error(errorData.error.message || 'No fields to update');
      }

      // Handle other error responses
      if (!response.ok) {
        const errorData: ErrorResponse = await response.json();
        throw new Error(errorData.error.message || 'Failed to update flashcard');
      }

      // Success - parse and return response
      return await response.json();
    } catch (error) {
      // Network errors
      if (error instanceof TypeError) {
        throw new Error('Network error. Please check your connection and try again.');
      }
      
      // Re-throw other errors
      throw error;
    }
  }

  /**
   * DELETE /api/flashcards/{id} - Trwałe usunięcie fiszki
   * @throws Error jeśli request się nie powiedzie
   */
  static async delete(id: string): Promise<void> {
    try {
      const response = await fetch(`/api/flashcards/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      // Handle 401 Unauthorized - redirect to login
      if (response.status === 401) {
        window.location.href = '/login';
        throw new Error('Unauthorized - redirecting to login');
      }

      // Handle 404 Not Found
      if (response.status === 404) {
        throw new Error('Flashcard not found. It may have been deleted.');
      }

      // Handle other error responses
      if (!response.ok && response.status !== 204) {
        const errorData: ErrorResponse = await response.json();
        throw new Error(errorData.error.message || 'Failed to delete flashcard');
      }

      // Success - 204 No Content (no body to parse)
      return;
    } catch (error) {
      // Network errors
      if (error instanceof TypeError) {
        throw new Error('Network error. Please check your connection and try again.');
      }
      
      // Re-throw other errors
      throw error;
    }
  }
}
