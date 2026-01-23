# REST API Plan for natigo

## 1. Resources

### Core Resources
- **flashcards** - Maps to `flashcards` table. Represents individual flashcards with front/back content.
- **generations** - Maps to `generations` table. Represents AI generation sessions with metadata and metrics.
- **generation-error-logs** - Maps to `generation_error_logs` table. Stores error information from failed generation attempts.
- **auth** - Utilizes Supabase Auth for user management (no direct table mapping needed as Supabase handles this).

## 2. API Endpoints

### 2.2 Flashcard Endpoints


#### Create Flashcard(s)
- **Method:** `POST`
- **Path:** `/api/flashcards`
- **Description:** Creates one or multiple flashcards.Manually or from AI generated.
- **Headers:** `Authorization: Bearer {access_token}`

- **Request Body manually or AI generated:**
```json
[
  {
  "front": "Hello",
  "back": "Cześć",
  "source": "manual",
  "generation_id": null
},
  {
  "front": "Hello",
  "back": "Cześć",
  "source": "ai-full",
  "generation_id": "uuid"
}
]
```


- **Success Response  (201 Created):**
```json
{
  "created_count": 2,
  "flashcards": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "generation_id": null,
      "front": "Hello",
      "back": "Cześć",
      "source": "manual"
    },
    {
      "id": "uuid",
      "user_id": "uuid",
      "generation_id": "uuid",
      "front": "Goodbye",
      "back": "Do widzenia",
      "source": "ai-full"
    }
  ]
}
```
- **Validation Rules:**
  - Each flashcard's `front` field: 1-200 characters after trim, non-empty
  - Each flashcard's `back` field: 1-500 characters after trim, non-empty
  - If `source` is provided in request:
    - Must be one of: `manual`, `ai-full`, `ai-edited`
    - If `source` is `ai-full` or `ai-edited` generation_id must be provided and valid
    - If `source` is `manual`, generation_id must be null
 
 

- **Error Responses:**
  - `400 Bad Request` - Missing required fields, empty array, or invalid request structure
  - `401 Unauthorized` - Invalid or missing token
  - `422 Unprocessable Entity` - Validation failed on one or more flashcards. Response includes details:
    ```json
    {
      "error": {
        "code": "VALIDATION_FAILED",
        "message": "One or more flashcards failed validation",
        "details": [
          {
            "index": 0,
            "field": "front",
            "message": "Front text must be between 1 and 200 characters"
          },
          {
            "index": 1,
            "field": "back",
            "message": "Back text cannot be empty"
          }
        ]
      }
    }
    ```
  - `403 Forbidden` - Attempting to set invalid `source` or `generation_id` combination

#### List Flashcards
- **Method:** `GET`
- **Path:** `/api/flashcards`
- **Description:** Retrieves paginated list of user's flashcards
- **Headers:** `Authorization: Bearer {access_token}`
- **Query Parameters:**
  - `page` (optional, default: 1) - Page number
  - `limit` (optional, default: 20, max: 100) - Items per page
  - `sort` (optional, default: "created_at") - Sort field (created_at, updated_at)
  - `order` (optional, default: "desc") - Sort order (asc, desc)
  - `source` (optional) - Filter by source (manual, ai-full, ai-edited)
  - `generation_id` (optional) - Filter by generation session
- **Success Response (200 OK):**
```json
{
  "data": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "generation_id": "uuid or null",
      "front": "Hello",
      "back": "Cześć",
      "source": "manual",
      "created_at": "2026-01-05T10:00:00Z",
      "updated_at": "2026-01-05T10:00:00Z"
    }
  ],
  "pagination": {
    "total": 150,
    "page": 1,
    "limit": 20,
    "total_pages": 8
  }
}
```
- **Error Responses:**
  - `401 Unauthorized` - Invalid or missing token
  - `400 Bad Request` - Invalid query parameters

#### Get Single Flashcard
- **Method:** `GET`
- **Path:** `/api/flashcards/{id}`
- **Description:** Retrieves a single flashcard by ID
- **Headers:** `Authorization: Bearer {access_token}`
- **Success Response (200 OK):**
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "generation_id": "uuid or null",
  "front": "Hello",
  "back": "Cześć",
  "source": "manual" 
}
```
- **Error Responses:**
  - `401 Unauthorized` - Invalid or missing token
  - `404 Not Found` - Flashcard not found or doesn't belong to user

#### Update Flashcard
- **Method:** `PUT`
- **Path:** `/api/flashcards/{id}`
- **Description:** Updates an existing flashcard
- **Headers:** `Authorization: Bearer {access_token}`
- **Request Body:**
```json
{
  "front": "Hello (updated)",
  "back": "Cześć (zaktualizowane)"
}
```
- **Success Response (200 OK):**
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "generation_id": "uuid or null",
  "front": "Hello (updated)",
  "back": "Cześć (zaktualizowane)",
  "source": "manual"
}
```
- **Validation Rules:**
  - Each flashcard's `front` field: 1-200 characters after trim, non-empty
  - Each flashcard's `back` field: 1-500 characters after trim, non-empty
  - source Must be one of: `manual`, `ai-full`, `ai-edited`
    
    
- **Error Responses:**
  - `400 Bad Request` - No fields to update
  - `401 Unauthorized` - Invalid or missing token
  - `404 Not Found` - Flashcard not found or doesn't belong to user
  - `422 Unprocessable Entity` - Validation failed

#### Delete Flashcard
- **Method:** `DELETE`
- **Path:** `/api/flashcards/{id}`
- **Description:** Permanently deletes a flashcard
- **Headers:** `Authorization: Bearer {access_token}`
- **Success Response (204 No Content):** Empty response
- **Error Responses:**
  - `401 Unauthorized` - Invalid or missing token
  - `404 Not Found` - Flashcard not found or doesn't belong to user

---

### 2.3 AI Generation Endpoints

#### Generate Flashcards from Text
- **Method:** `POST`
- **Path:** `/api/generations`
- **Description:** Generates flashcard candidates from input text using AI
- **Headers:** `Authorization: Bearer {access_token}`
- **Request Body:**
```json
{
  "input_text": "Long text content between 1000-10000 characters..."
}
```
- **Success Response (201 Created):**
```json
{
  "generation_id": "uuid",
  "candidates": [
    {
      "candidate_id": "temp_uuid",
      "front": "Generated front text",
      "back": "Generated back text",
      "source": "ai-full"
    }
  ],
  "metadata": {
    "input_text_length": 5432,
    "duration_ms": 3500,
    "generated_count": 12
  }
}
```
 **Validation Rules:**
 -input_text length is beetwen 1000 and 10000 characters
- **Error Responses:**
  - `400 Bad Request` - Input text length outside 1000-10000 range
  - `401 Unauthorized` - Invalid or missing token
  - `422 Unprocessable Entity` - Invalid input format
  - `429 Too Many Requests` - Rate limit exceeded
  - `500 Internal Server Error` - AI service error
  - `504 Gateway Timeout` - AI service timeout

#### Bulk Save Flashcards
- **Method:** `POST`
- **Path:** `/api/generations/{generation_id}/save`
- **Description:** Saves accepted flashcard candidates to user's collection. This endpoint is specifically for saving AI-generated candidates after user review. It handles the complete workflow including setting appropriate `source` values and updating generation metrics.
- **Headers:** `Authorization: Bearer {access_token}`
- **Request Body:**
```json
{
  "flashcards": [
    {
      "candidate_id": "temp_uuid",
      "front": "Front text (possibly edited)",
      "back": "Back text (possibly edited)",
      "was_edited": false
    },
    {
      "candidate_id": "temp_uuid_2",
      "front": "Edited front text",
      "back": "Edited back text",
      "was_edited": true
    }
  ]
}
```
- **Success Response (201 Created):**
```json
{
  "saved_count": 2,
  "flashcards": [
    {
      "id": "uuid",
      "front": "Front text",
      "back": "Back text",
      "source": "ai-full",
      "generation_id": "uuid",
      "created_at": "2026-01-05T10:00:00Z"
    },
    {
      "id": "uuid",
      "front": "Edited front text",
      "back": "Edited back text",
      "source": "ai-edited",
      "generation_id": "uuid",
      "created_at": "2026-01-05T10:00:00Z"
    }
  ],
  "generation_summary": {
    "generated_count": 12,
    "accepted_unedited_count": 1,
    "accepted_edited_count": 1,
    "rejected_count": 10
  }
}
```
- **Error Responses:**
  - `400 Bad Request` - Invalid request structure or duplicate save attempt
  - `401 Unauthorized` - Invalid or missing token
  - `404 Not Found` - Generation session not found or doesn't belong to user
  - `422 Unprocessable Entity` - Validation failed on one or more flashcards
  - `500 Internal Server Error` - Database transaction failed

#### Get Generation History
- **Method:** `GET`
- **Path:** `/api/generations`
- **Description:** Retrieves user's generation session history
- **Headers:** `Authorization: Bearer {access_token}`
- **Query Parameters:**
  - `page` (optional, default: 1) - Page number
  - `limit` (optional, default: 20, max: 50) - Items per page
- **Success Response (200 OK):**
```json
{
  "data": [
    {
      "id": "uuid",
      "input_text_length": 5432,
      "duration_ms": 3500,
      "generated_count": 12,
      "accepted_edited_count": 3,
      "accepted_unedited_count": 5,
      "rejected_count": 4,
      "created_at": "2026-01-05T10:00:00Z"
    }
  ],
  "pagination": {
    "total": 25,
    "page": 1,
    "limit": 20,
    "total_pages": 2
  }
}
```
- **Error Responses:**
  - `401 Unauthorized` - Invalid or missing token

#### Get Single Generation Session
- **Method:** `GET`
- **Path:** `/api/generations/{id}`
- **Description:** Retrieves details of a specific generation session
- **Headers:** `Authorization: Bearer {access_token}`
- **Success Response (200 OK):**
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "input_text_hash": "sha256_hash",
  "input_text_length": 5432,
  "duration_ms": 3500,
  "generated_count": 12,
  "accepted_edited_count": 3,
  "accepted_unedited_count": 5,
  "created_at": "2026-01-05T10:00:00Z",
  "updated_at": "2026-01-05T10:05:00Z",
  "flashcards": [
    {
      "id": "uuid",
      "front": "Front text",
      "back": "Back text",
      "source": "ai-full"
    }
  ]
}
```
- **Error Responses:**
  - `401 Unauthorized` - Invalid or missing token
  - `404 Not Found` - Generation not found or doesn't belong to user

---


### 2.5 Error Logging Endpoints

#### Get Error Logs
- **Method:** `GET`
- **Path:** `/api/error-logs`
- **Description:** Retrieves user's generation error logs for diagnostics
- **Headers:** `Authorization: Bearer {access_token}`
- **Query Parameters:**
  - `page` (optional, default: 1) - Page number
  - `limit` (optional, default: 20, max: 50) - Items per page
  - `generation_id` (optional) - Filter by specific generation session
- **Success Response (200 OK):**
```json
{
  "data": [
    {
      "id": "uuid",
      "generation_id": "uuid or null",
      "error_code": "AI_TIMEOUT",
      "error_message": "AI service did not respond within 30 seconds",
      "created_at": "2026-01-05T10:00:00Z"
    }
  ],
  "pagination": {
    "total": 5,
    "page": 1,
    "limit": 20,
    "total_pages": 1
  }
}
```
- **Error Responses:**
  - `401 Unauthorized` - Invalid or missing token

---


## 3. Authentication and Authorization

### Mechanism
- **Provider:** Supabase Auth
- **Method:** JWT (JSON Web Tokens)
- **Token Type:** Bearer tokens in Authorization header

### Implementation Details

#### Token Management
1. **Access Token:** Short-lived JWT (default 1 hour) included in `Authorization: Bearer {token}` header
2. **Refresh Token:** Long-lived token used to obtain new access tokens
3. **Token Refresh:** Client should implement automatic token refresh before expiration

#### Authorization Flow
1. Client obtains tokens via `/api/auth/login` or `/api/auth/register`
2. Client includes access token in Authorization header for all protected endpoints
3. Server validates token using Supabase Auth SDK
4. Server extracts `user_id` from validated token
5. All database queries are automatically filtered by RLS policies





#### Security Headers
All responses include:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains`

---

## 4. Validation and Business Logic

### 4.1 Flashcard Validation

#### Field Constraints
- **front:** 
  - Required, non-empty after trim
  - Length: 1-200 characters (after trim)
  - Type: string
- **back:**
  - Required, non-empty after trim
  - Length: 1-500 characters (after trim)
  - Type: string
- **source:**
  - Required on create (auto-set by system)
  - Enum: `manual`, `ai-full`, `ai-edited`
  - Cannot be modified by end user (only set by backend/AI logic)
  - Default: `manual` when not provided
- **generation_id:**
  - Required when `source` is `ai-full` or `ai-edited`
  - Must be null when `source` is `manual`
  - Must reference a valid generation belonging to the authenticated user

#### Validation Rules
1. Trim whitespace from both fields before validation
2. Reject empty strings after trimming
3. Reject strings exceeding max length
4. Sanitize HTML/scripts to prevent XSS (display as plain text)
5. For array requests: validate all flashcards before creating any (transactional behavior)
6. Enforce `source` and `generation_id` consistency:
   - If client provides `source`, validate it matches expected values
   - Verify `generation_id` belongs to authenticated user (if provided)
   - Backend should set `source` based on context (manual creation vs AI generation)

### 4.2 Generation Validation

#### Input Text Constraints
- **Minimum length:** 1,000 characters
- **Maximum length:** 10,000 characters
- **Validation timing:** Before sending to AI service

#### Business Rules
1. **Duplicate Detection:** Hash input text (SHA-256) and store to detect similar requests
2. **Rate Limiting:** Enforce 10 generations per hour per user
3. **Timeout Handling:** AI requests timeout after 30 seconds
4. **Error Logging:** All generation errors logged to `generation_error_logs` table

#### Generation Response Processing
1. Validate AI response structure
2. Filter out candidates with empty front/back fields
3. Ensure all candidates meet flashcard validation rules
4. Return only valid candidates to client

### 4.3 Bulk Save Business Logic

#### Endpoint Usage Context
- **POST `/api/flashcards`**: Used for direct flashcard creation (manual or programmatic). Can accept single or multiple flashcards. The `source` field should be system-managed.
- **POST `/api/generations/{generation_id}/save`**: Specialized endpoint for saving AI-generated candidates after user review. Automatically handles generation metrics updates and sets correct `source` values based on `was_edited` flag.

#### Idempotency
- Prevent duplicate saves of same generation session
- Track if generation has been "finalized" (saved)
- Return error with clear message if attempting to save again

#### Transaction Handling
1. Begin database transaction
2. Insert all accepted flashcards with correct `source` field:
   - `ai-full` if `was_edited = false`
   - `ai-edited` if `was_edited = true`
3. Update `generations` record with acceptance counts:
   - `accepted_unedited_count`
   - `accepted_edited_count`
4. Commit transaction or rollback on any error
5. Return success only if all operations complete

#### Validation During Save
- Re-validate all flashcards (front/back length, non-empty)
- Verify generation_id belongs to authenticated user
- Verify generation hasn't been saved already



### 4.5 Error Handling Standards

#### Error Response Format
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      "field": "Specific validation error"
    }
  }
}
```

#### Common Error Codes
- `AUTH_REQUIRED` - Missing or invalid authentication
- `FORBIDDEN` - User lacks permission for resource
- `NOT_FOUND` - Resource not found or not accessible
- `VALIDATION_FAILED` - Input validation errors
- `RATE_LIMIT_EXCEEDED` - Too many requests
- `AI_SERVICE_ERROR` - AI generation failed
- `AI_TIMEOUT` - AI service timeout
- `DUPLICATE_SAVE` - Attempting to save generation twice
- `TRANSACTION_FAILED` - Database transaction error

### 4.6 Data Privacy

#### Input Text Handling
- Store only SHA-256 hash of input text (not full text)
- Hash stored in `generations.input_text_hash`
- Used for duplicate detection without storing sensitive content
- Full text never persisted in database



### 4.7 Performance Considerations

#### Pagination Defaults
- Default page size: 20 items
- Maximum page size: 100 items (to prevent resource exhaustion)


#### Database Indexes
Leverage indexes defined in schema:
- `flashcards_user_id_idx` on (user_id, created_at)
- `flashcards_generation_id_idx` on (generation_id)
- `generations_user_id_idx` on (user_id, created_at)
- `generation_error_logs_user_id_idx` on (user_id, created_at)



## 5. Additional Considerations

### 5.0 Implementation Notes for Flashcard Creation

#### Two Approaches for Creating Flashcards

**1. Direct Creation: `POST /api/flashcards`**
- **Use Case:** Manual flashcard creation by user, bulk imports, or direct backend operations
- **Flexibility:** Accepts array
- **Source Management:** 
  - Client should NOT send `source` field for manual creation
  - Backend sets `source = "manual"` by default
  - Only backend/system code should explicitly set `source` to `ai-full` or `ai-edited`
- **Transaction:** Array requests are fully transactional (all or nothing)
- **Response:** Returns array based on input

**2. AI Workflow: `POST /api/generations/{generation_id}/save`**
- **Use Case:** Saving reviewed AI-generated candidates
- **Workflow Integration:** 
  - Links flashcards to generation session
  - Updates generation metrics automatically
  - Sets `source` based on `was_edited` flag

- **Response:** Includes generation summary with metrics



### 5.1 CORS Configuration
- Allow requests from production domain(s)
- For development: Allow localhost with appropriate ports


### 5.2 API Versioning
- Current version: v1 (implicit in `/api/` prefix)
- Future versions: `/api/v2/` if breaking changes needed
- Maintain backward compatibility within major version







