# API Endpoint Implementation Plan: POST /api/generations

## 1. Endpoint Overview

This endpoint generates flashcard candidates from user-provided text using AI. It accepts text input between 1000-10000 characters, sends it to an AI service (OpenRouter.ai), and returns a list of suggested flashcard front/back pairs. The endpoint creates a generation session record in the database to track the generation process and metrics for future reference.

**Key Responsibilities:**
- Validate input text length (1000-10000 characters)
- Authenticate user and enforce rate limiting (10 generations/hour)
- Hash input text (SHA-256) for duplicate detection without storing sensitive content
- Call AI service with proper timeout handling (30 seconds)
- Parse and validate AI response
- Store generation metadata in database
- Log errors to `generation_error_logs` table
- Return generation session ID and flashcard candidates

## 2. Request Details

### HTTP Method
`POST`

### URL Structure
`/api/generations`

### Headers
- **Required:**
  - `Authorization: Bearer {access_token}` - JWT token from Supabase Auth
  - `Content-Type: application/json`

### Request Body
```json
{
  "input_text": "Long text content between 1000-10000 characters..."
}
```

### Parameters

**Required:**
- `input_text` (string): Text content to generate flashcards from
  - Minimum length: 1000 characters
  - Maximum length: 10000 characters
  - Must be non-empty after trim

**Optional:**
- None

## 3. Utilized Types

### DTOs and Command Models (from `src/types.ts`)

**Command:**
```typescript
GenerateFlashcardsCommand {
  input_text: string;
}
```

**Response:**
```typescript
GenerateFlashcardsResponse {
  generation_id: string;
  candidates: FlashcardCandidateDto[];
  metadata: GenerationMetadata;
}

FlashcardCandidateDto {
  front: string;
  back: string;
  source: "ai-full";
}

GenerationMetadata {
  input_text_length: number;
  duration_ms: number;
  generated_count: number;
}
```

**Error Response:**
```typescript
ErrorResponse {
  error: ApiError;
}

ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}
```

### Database Types (from `src/types.ts`)

**For Creating Generation:**
```typescript
GenerationInsert {
  user_id: string;
  input_text_hash: string;
  input_text_length: number;
  duration_ms: number;
  generated_count: number;
  accepted_edited_count?: null;  // Set later when saving
  accepted_unedited_count?: null;  // Set later when saving
}
```

**For Error Logging:**
```typescript
GenerationErrorLogInsert {
  generation_id?: string | null;
  user_id: string;
  error_code: string;
  error_message: string;
}
```

## 4. Response Details

### Success Response (201 Created)
```json
{
  "generation_id": "uuid-v4",
  "candidates": [
    {
      "candidate_id": "temp-uuid-1",
      "front": "What is the capital of France?",
      "back": "Paris",
      "source": "ai-full"
    },
    {
      "candidate_id": "temp-uuid-2",
      "front": "Who wrote '1984'?",
      "back": "George Orwell",
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

### Error Responses

**400 Bad Request - Invalid Input Length**
```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Input text must be between 1000 and 10000 characters",
    "details": {
      "field": "input_text",
      "length": 500,
      "min": 1000,
      "max": 10000
    }
  }
}
```

**401 Unauthorized - Missing or Invalid Token**
```json
{
  "error": {
    "code": "AUTH_REQUIRED",
    "message": "Valid authentication token is required"
  }
}
```

**422 Unprocessable Entity - Invalid Request Format**
```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Invalid request body",
    "details": {
      "field": "input_text",
      "issue": "Field is required"
    }
  }
}
```

**429 Too Many Requests - Rate Limit Exceeded**
```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Maximum 10 generations per hour allowed",
    "details": {
      "retry_after_seconds": 1800
    }
  }
}
```

**500 Internal Server Error - AI Service Failure**
```json
{
  "error": {
    "code": "AI_SERVICE_ERROR",
    "message": "Failed to generate flashcards due to AI service error"
  }
}
```

**504 Gateway Timeout - AI Service Timeout**
```json
{
  "error": {
    "code": "AI_TIMEOUT",
    "message": "AI service did not respond within 30 seconds"
  }
}
```

## 5. Data Flow

### Overview
```
Client Request 
  → Authentication & Rate Limit Check
  → Input Validation
  → Hash Input Text
  → Call AI Service (with timeout)
  → Parse AI Response
  → Save Generation Record
  → Return Candidates
```

### Detailed Flow

1. **Request Reception** (`src/pages/api/generations/index.ts`)
   - Receive POST request with JSON body
   - Extract Authorization header

2. **Authentication** (Astro Middleware)
   - Validate JWT token using Supabase Auth
   - Extract `user_id` from token
   - Return 401 if token invalid/missing

3. **Rate Limiting** (`src/lib/generation.service.ts`)
   - Query `generations` table for user's generations in last hour
   - Count results
   - Return 429 if count >= 10
   - Continue if under limit

4. **Input Validation** (Endpoint + Zod Schema)
   - Validate request body structure using Zod
   - Check `input_text` field exists and is string
   - Trim and validate length (1000-10000 chars)
   - Return 400 with details if validation fails

5. **Hash Generation** (`src/lib/hash.service.ts`)
   - Generate SHA-256 hash of input text
   - Store for duplicate detection (privacy-preserving)

6. **AI Generation** (`src/lib/ai.service.ts`)
   - Start timer for duration tracking
   - Format prompt with input text
   - Call OpenRouter.ai API with:
     - 30-second timeout
     - Structured output request (JSON)
     - Error handling for network issues
   - Parse response JSON
   - Validate response structure
   - Stop timer
   - Return candidates or throw error

7. **Response Processing** (`src/lib/generation.service.ts`)
   - Validate each candidate:
     - front: 1-200 characters (trimmed)
     - back: 1-500 characters (trimmed)
     - Both non-empty
   - Filter out invalid candidates
   - Assign temporary `candidate_id` to each (for tracking during save)
   - Add `source: "ai-full"` to each candidate

8. **Database Storage** (`src/lib/generation.service.ts`)
   - Insert generation record:
     ```sql
     INSERT INTO generations (
       user_id,
       input_text_hash,
       input_text_length,
       duration_ms,
       generated_count
     ) VALUES (...)
     ```
   - Return generated `generation_id`

9. **Response Construction** (Endpoint)
   - Build `GenerateFlashcardsResponse` object
   - Include generation_id, candidates, metadata
   - Return with 201 status code

10. **Error Handling** (All Layers)
    - Catch errors at each step
    - Log to `generation_error_logs` table with:
      - `user_id`
      - `generation_id` (if available)
      - `error_code` (standardized)
      - `error_message` (sanitized, max 1000 chars)
    - Return appropriate HTTP status with ErrorResponse

### Database Interactions

**Tables Used:**
- `generations` - Store generation session metadata
- `generation_error_logs` - Log any errors during generation

**Queries:**

1. **Rate Limit Check:**
```sql
SELECT COUNT(*) 
FROM generations 
WHERE user_id = $1 
  AND created_at > NOW() - INTERVAL '1 hour'
```

2. **Insert Generation:**
```sql
INSERT INTO generations (
  user_id,
  input_text_hash,
  input_text_length,
  duration_ms,
  generated_count
) VALUES ($1, $2, $3, $4, $5)
RETURNING id
```

3. **Log Error:**
```sql
INSERT INTO generation_error_logs (
  generation_id,
  user_id,
  error_code,
  error_message
) VALUES ($1, $2, $3, $4)
```


## 6. Security Considerations

### Authentication & Authorization
- **JWT Validation:** Use Supabase Auth to validate bearer token
- **User Context:** Extract `user_id` from validated JWT, use for all database operations
- **RLS Policies:** Supabase Row Level Security ensures users only access their data
- **Token Expiration:** Handle expired tokens gracefully with 401 response

### Input Validation & Sanitization
- **Length Validation:** Enforce 1000-10000 character limit before AI call
- **Type Validation:** Use Zod schema to ensure correct data types
- **XSS Prevention:** Treat input as plain text, no HTML parsing/rendering
- **SQL Injection Prevention:** Use parameterized queries via Supabase SDK
- **Trim Whitespace:** Remove leading/trailing whitespace before validation

### Rate Limiting
- **Per-User Limit:** Maximum 10 generations per hour
- **Sliding Window:** Check last 60 minutes, not fixed hour boundaries
- **Error Response:** Include `retry_after_seconds` in 429 response
- **Database Query:** Efficient query using indexed `user_id` and `created_at`

### Data Privacy
- **No Full Text Storage:** Never store complete `input_text` in database
- **Hash Only:** Store SHA-256 hash in `input_text_hash` field
- **Duplicate Detection:** Use hash for detecting similar requests without exposing content
- **Temporary Data:** AI service receives text but doesn't persist it
- **User Isolation:** All queries filtered by authenticated `user_id`

### API Key Security
- **Environment Variables:** Store OpenRouter API key in `.env` file
- **Server-Side Only:** Never expose API key to client
- **Key Rotation:** Support for updating keys without code changes
- **Access Control:** Limit key permissions on OpenRouter dashboard

### Error Message Safety
- **No Sensitive Data:** Sanitize error messages before logging/returning
- **Generic External Errors:** Don't expose internal implementation details
- **Length Limit:** Cap error messages at 1000 characters in database
- **Structured Logging:** Use consistent error codes for monitoring

## 7. Error Handling

### Error Categories and Responses

#### 1. Authentication Errors (401)
**Scenario:** Missing or invalid authentication token
```typescript
{
  code: "AUTH_REQUIRED",
  message: "Valid authentication token is required"
}
```
**Handling:**
- Check Authorization header exists
- Validate token with Supabase Auth
- Return early if validation fails
- Log to application logs (not error_logs table)

#### 2. Validation Errors (400)
**Scenarios:**
- Input text too short (<1000 chars)
- Input text too long (>10000 chars)
- Missing `input_text` field

**Response Example:**
```typescript
{
  code: "VALIDATION_FAILED",
  message: "Input text must be between 1000 and 10000 characters",
  details: {
    field: "input_text",
    length: 750,
    min: 1000,
    max: 10000
  }
}
```
**Handling:**
- Use Zod schema for validation
- Return detailed validation errors
- No database logging needed (client error)

#### 3. Malformed Request (422)
**Scenario:** Invalid JSON or wrong data types
```typescript
{
  code: "VALIDATION_FAILED",
  message: "Invalid request body",
  details: {
    field: "input_text",
    issue: "Expected string, received number"
  }
}
```
**Handling:**
- Catch JSON parsing errors
- Use Zod for type validation
- Return structured error details

#### 4. Rate Limit Exceeded (429)
**Scenario:** User exceeded 10 generations in last hour
```typescript
{
  code: "RATE_LIMIT_EXCEEDED",
  message: "Maximum 10 generations per hour allowed",
  details: {
    current_count: 10,
    limit: 10,
    retry_after_seconds: 1800
  }
}
```
**Handling:**
- Check generation count before AI call
- Calculate seconds until oldest generation expires
- Return retry timing information
- Log to `generation_error_logs` table

#### 5. AI Service Errors (500)
**Scenarios:**
- OpenRouter API returns error response
- Invalid API key
- Model unavailable
- Network errors

**Response:**
```typescript
{
  code: "AI_SERVICE_ERROR",
  message: "Failed to generate flashcards due to AI service error"
}
```
**Handling:**
- Catch AI service exceptions
- Log detailed error to `generation_error_logs`
- Return generic error to client (security)
- Include `generation_id: null` in error log if generation not created yet

#### 6. AI Timeout (504)
**Scenario:** AI service doesn't respond within 60 seconds
```typescript
{
  code: "AI_TIMEOUT",
  message: "AI service did not respond within 30 seconds"
}
```
**Handling:**
- Set 60-second timeout on HTTP request
- Cancel request on timeout
- Log to `generation_error_logs`
- Suggest client retry

#### 7. Invalid AI Response (500)
**Scenario:** AI returns malformed JSON or missing required fields
```typescript
{
  code: "AI_SERVICE_ERROR",
  message: "Failed to generate flashcards due to invalid AI response"
}
```
**Handling:**
- Validate AI response structure
- Check for required fields (flashcards array)
- Log detailed parsing error
- Return generic error to client

#### 8. Database Errors (500)
**Scenarios:**
- Connection failure
- Constraint violation
- Transaction rollback

**Response:**
```typescript
{
  code: "TRANSACTION_FAILED",
  message: "Failed to save generation data"
}
```
**Handling:**
- Catch database exceptions
- Log to `generation_error_logs` if possible
- Return generic error (don't expose schema details)
- Consider retry logic for transient failures

### Error Logging Strategy

**When to Log:**
- ✅ Rate limit exceeded (429)
- ✅ AI service errors (500)
- ✅ AI timeout (504)
- ✅ Database errors (500)
- ❌ Authentication errors (401)
- ❌ Validation errors (400, 422)

**Log Structure:**
```typescript
{
  generation_id: string | null,  // null if error before generation created
  user_id: string,
  error_code: string,  // e.g., "AI_TIMEOUT", "RATE_LIMIT_EXCEEDED"
  error_message: string  // max 1000 chars, sanitized
}
```

**Error Logging Function:**
```typescript
async function logGenerationError(
  supabase: SupabaseClient,
  userId: string,
  errorCode: string,
  errorMessage: string,
  generationId?: string | null
): Promise<void>
```

## 8. Performance Considerations

### Potential Bottlenecks

1. **AI Service Latency**
   - **Issue:** AI generation can take 3-10 seconds
   - **Impact:** Endpoint response time directly affected
   - **Mitigation:** 
     - Set clear timeout (60 seconds)
     - Consider caching for duplicate inputs (using hash)
     - Choose faster AI models (e.g., Claude Haiku vs Opus)

2. **Rate Limit Queries**
   - **Issue:** Counting generations requires table scan
   - **Impact:** Adds latency to every request
   - **Mitigation:**
     - Ensure index on `(user_id, created_at)` exists
     - Cache rate limit status in Redis (future optimization)
     - Use optimized COUNT query with time window

3. **Hash Generation**
   - **Issue:** SHA-256 hashing large text (10,000 chars) takes time
   - **Impact:** Minor delay (typically <10ms)
   - **Mitigation:**
     - Use built-in crypto module (fast)
     - Hash asynchronously if needed
     - Consider pre-validation before expensive operations

4. **Database Write Latency**
   - **Issue:** Inserting generation record adds round-trip time
   - **Impact:** Additional 50-200ms depending on connection
   - **Mitigation:**
     - Use connection pooling (Supabase handles this)
     - Consider async write with optimistic response (advanced)
     - Ensure database in same region as application

### Optimization Strategies

#### 1. Database Indexing
```sql
-- Ensure these indexes exist (should be in schema)
CREATE INDEX IF NOT EXISTS generations_user_id_idx 
  ON generations(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS generation_error_logs_user_id_idx 
  ON generation_error_logs(user_id, created_at DESC);
```

#### 2. AI Request Optimization
```typescript
// Use streaming for real-time updates (future enhancement)
// Choose cost-effective, fast models
// Implement response caching for duplicate hashes
```

#### 3. Rate Limit Caching
```typescript
// Future: Cache rate limit count in Redis with TTL
// Reduces database queries significantly
const cacheKey = `rate_limit:generation:${userId}`;
const count = await redis.get(cacheKey);
if (!count) {
  count = await queryDatabase();
  await redis.setex(cacheKey, 3600, count);
}
```

#### 4. Parallel Operations
```typescript
// Execute independent operations concurrently
const [hash, rateCheck] = await Promise.all([
  generateHash(input_text),
  checkRateLimit(userId)
]);
```

#### 5. Response Compression
- Enable gzip compression for JSON responses
- Particularly beneficial for large candidate arrays
- Configured at Astro/server level

#### 6. Monitoring and Metrics
- Track endpoint response times
- Monitor AI service latency separately
- Set up alerts for timeout spikes
- Log slow queries for optimization

### Expected Performance Metrics

- **Fast Path:** 3-5 seconds (AI generation time)
- **Slow Path:** 8-15 seconds (slower AI models)
- **Timeout Threshold:** 30 seconds (hard limit)
- **Database Operations:** <200ms total
- **Validation/Hashing:** <50ms
- **Target 95th Percentile:** <10 seconds

## 9. Implementation Steps

### Phase 1: Project Structure Setup

**1.1 Create Service Files**
```bash
src/lib/services/
  ├── generation.service.ts    # Generation business logic
  ├── ai.service.ts             # OpenRouter.ai integration
  ├── hash.service.ts           # SHA-256 hashing utility
  └── validation.service.ts     # Shared validation logic
```

**1.2 Create Validation Schemas**
```typescript
// src/lib/schemas/generation.schema.ts
import { z } from "zod";

export const GenerateFlashcardsSchema = z.object({
  input_text: z
    .string()
    .min(1000, "Input text must be at least 1000 characters")
    .max(10000, "Input text must not exceed 10000 characters")
    .trim()
});
```

### Phase 2: Core Service Implementation

**2.1 Hash Service** (`src/lib/services/hash.service.ts`)
```typescript
import { createHash } from "crypto";

export function generateSHA256Hash(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}
```

**2.2 AI Service** (`src/lib/services/ai.service.ts`)
```typescript
interface AIFlashcard {
  front: string;
  back: string;
}

export async function generateFlashcardsWithAI(
  inputText: string,
  timeoutMs: number = 30000
): Promise<AIFlashcard[]> {
  // Implementation:
  // 1. Create AbortController for timeout
  // 2. Format prompt for flashcard generation
  // 3. Call OpenRouter API with timeout
  // 4. Parse and validate response
  // 5. Return flashcard array or throw error
}
```

**2.3 Generation Service** (`src/lib/services/generation.service.ts`)
```typescript
import type { SupabaseClient } from "../db/supabase.client";
import type { GenerateFlashcardsResponse } from "../types";

export async function checkRateLimit(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  // Query generations in last hour
  // Return true if under limit (10), false otherwise
}

export async function createGeneration(
  supabase: SupabaseClient,
  userId: string,
  inputTextHash: string,
  inputTextLength: number,
  durationMs: number,
  generatedCount: number
): Promise<string> {
  // Insert generation record
  // Return generation_id
}

export async function logGenerationError(
  supabase: SupabaseClient,
  userId: string,
  errorCode: string,
  errorMessage: string,
  generationId?: string | null
): Promise<void> {
  // Insert error log
}

export async function processGeneration(
  supabase: SupabaseClient,
  userId: string,
  inputText: string
): Promise<GenerateFlashcardsResponse> {
  // Orchestrate the full generation process:
  // 1. Check rate limit
  // 2. Generate hash
  // 3. Call AI service
  // 4. Validate candidates
  // 5. Save generation record
  // 6. Return response
}
```

### Phase 3: API Endpoint Implementation

**3.1 Create API Route** (`src/pages/api/generations/index.ts`)
```typescript
import type { APIRoute } from "astro";
import { GenerateFlashcardsSchema } from "../../../lib/schemas/generation.schema";
import { processGeneration } from "../../../lib/services/generation.service";
import type { ErrorResponse } from "../../../types";

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // 1. Get Supabase client from locals
    const supabase = locals.supabase;
    
    // 2. Authenticate user
    const authHeader = request.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({
          error: {
            code: "AUTH_REQUIRED",
            message: "Valid authentication token is required"
          }
        } satisfies ErrorResponse),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }
    
    // 3. Validate token and get user
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({
          error: {
            code: "AUTH_REQUIRED",
            message: "Valid authentication token is required"
          }
        } satisfies ErrorResponse),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }
    
    // 4. Parse and validate request body
    const body = await request.json();
    const validation = GenerateFlashcardsSchema.safeParse(body);
    
    if (!validation.success) {
      const firstError = validation.error.errors[0];
      return new Response(
        JSON.stringify({
          error: {
            code: "VALIDATION_FAILED",
            message: firstError.message,
            details: {
              field: firstError.path.join("."),
              issue: firstError.message
            }
          }
        } satisfies ErrorResponse),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    
    // 5. Process generation
    const result = await processGeneration(
      supabase,
      user.id,
      validation.data.input_text
    );
    
    // 6. Return success response
    return new Response(
      JSON.stringify(result),
      { 
        status: 201, 
        headers: { "Content-Type": "application/json" } 
      }
    );
    
  } catch (error) {
    // Handle specific errors
    if (error instanceof RateLimitError) {
      return new Response(
        JSON.stringify({
          error: {
            code: "RATE_LIMIT_EXCEEDED",
            message: error.message,
            details: { retry_after_seconds: error.retryAfter }
          }
        } satisfies ErrorResponse),
        { status: 429, headers: { "Content-Type": "application/json" } }
      );
    }
    
    if (error instanceof AITimeoutError) {
      return new Response(
        JSON.stringify({
          error: {
            code: "AI_TIMEOUT",
            message: "AI service did not respond within 30 seconds"
          }
        } satisfies ErrorResponse),
        { status: 504, headers: { "Content-Type": "application/json" } }
      );
    }
    
    if (error instanceof AIServiceError) {
      return new Response(
        JSON.stringify({
          error: {
            code: "AI_SERVICE_ERROR",
            message: "Failed to generate flashcards due to AI service error"
          }
        } satisfies ErrorResponse),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
    
    // Generic server error
    console.error("Unexpected error in POST /api/generations:", error);
    return new Response(
      JSON.stringify({
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "An unexpected error occurred"
        }
      } satisfies ErrorResponse),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
```

### Phase 4: Environment Configuration

**4.1 Add Environment Variables**
```bash
# .env
OPENROUTER_API_KEY=sk-or-v1-...
OPENROUTER_API_URL=https://openrouter.ai/api/v1/chat/completions
OPENROUTER_MODEL=anthropic/claude-3-haiku
```

**4.2 Update Environment Type Definitions** (if using TypeScript for env)
```typescript
// src/env.d.ts
interface ImportMetaEnv {
  readonly OPENROUTER_API_KEY: string;
  readonly OPENROUTER_API_URL: string;
  readonly OPENROUTER_MODEL: string;
}
```

### Phase 5: Error Classes and Utilities

**5.1 Create Custom Error Classes** (`src/lib/errors/generation.errors.ts`)
```typescript
export class RateLimitError extends Error {
  constructor(
    message: string,
    public retryAfter: number
  ) {
    super(message);
    this.name = "RateLimitError";
  }
}

export class AITimeoutError extends Error {
  constructor(message: string = "AI service timeout") {
    super(message);
    this.name = "AITimeoutError";
  }
}

export class AIServiceError extends Error {
  constructor(message: string, public originalError?: unknown) {
    super(message);
    this.name = "AIServiceError";
  }
}
```



### Phase 7: Documentation and Deployment

**7.1 API Documentation**
- Add endpoint to API documentation
- Include request/response examples
- Document error codes and meanings
- Add rate limiting information


---

## Summary

This implementation plan provides a comprehensive guide for building the `POST /api/generations` endpoint. The endpoint follows best practices including:

- **Security-first approach** with JWT authentication, input validation, and data privacy
- **Robust error handling** with detailed logging and user-friendly messages
- **Performance optimization** through efficient queries, caching strategies, and timeout management
- **Clean architecture** with separated concerns (services, validation, routing)
- **Type safety** using TypeScript and Zod validation
- **Scalability** with rate limiting and resource management

The implementation is designed to integrate seamlessly with the existing Astro + Supabase stack while maintaining code quality and following the project's coding practices.
