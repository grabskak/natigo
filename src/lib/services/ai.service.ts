import { AIServiceError, AITimeoutError } from "../errors/generation.errors";

/**
 * Structure of a flashcard returned by AI service
 */
export interface AIFlashcard {
  front: string;
  back: string;
}

/**
 * OpenRouter API response structure
 */
interface OpenRouterResponse {
  choices: {
    message: {
      content: string;
    };
  }[];
}

/**
 * Expected structure of parsed AI response
 */
interface AIResponseData {
  flashcards: AIFlashcard[];
}

/**
 * Generates flashcards from input text using OpenRouter.ai API
 *
 * @param inputText - Text content to generate flashcards from (1000-10000 chars)
 * @param timeoutMs - Timeout in milliseconds (default: 60000ms = 60s)
 * @returns Array of flashcard objects with front/back pairs
 * @throws {AITimeoutError} When AI service doesn't respond within timeout
 * @throws {AIServiceError} When AI service returns error or invalid response
 *
 * @example
 * const flashcards = await generateFlashcardsWithAI(inputText);
 * console.log(flashcards); // [{ front: "Q1", back: "A1" }, ...]
 */
export async function generateFlashcardsWithAI(inputText: string, timeoutMs = 60000): Promise<AIFlashcard[]> {
  const MOCK_MODE = import.meta.env.OPENROUTER_API_KEY === "mock" || !import.meta.env.OPENROUTER_API_KEY;

  if (MOCK_MODE) {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Return mock flashcards
    return [
      { front: "What is TypeScript?", back: "A typed superset of JavaScript" },
      { front: "What is Astro?", back: "A modern web framework for content-focused websites" },
      { front: "What is Supabase?", back: "An open-source Firebase alternative" },
      { front: "What is REST API?", back: "Representational State Transfer - architectural style for APIs" },
      { front: "What is JWT?", back: "JSON Web Token - compact way to transmit information securely" },
      { front: "What is rate limiting?", back: "Controlling the number of requests a user can make" },
      { front: "What is SHA-256?", back: "Cryptographic hash function producing 256-bit output" },
      { front: "What is Zod?", back: "TypeScript-first schema validation library" },
    ];
  }

  // Get API configuration from environment variables
  const apiKey = import.meta.env.OPENROUTER_API_KEY;
  const apiUrl = import.meta.env.OPENROUTER_API_URL || "https://openrouter.ai/api/v1/chat/completions";
  const model = import.meta.env.OPENROUTER_MODEL || "anthropic/claude-3-haiku";

  if (!apiKey) {
    throw new AIServiceError("OpenRouter API key not configured");
  }

  // Create abort controller for timeout handling
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    // Format system prompt for flashcard generation
    const systemPrompt = `You are a flashcard generator. Your task is to analyze the provided text and create high-quality flashcards for learning.

Rules:
- Generate 8-15 flashcards from the text
- Each flashcard should have a clear question (front) and answer (back)
- Questions should be concise (1-200 characters)
- Answers should be complete but concise (1-500 characters)
- Focus on key concepts, definitions, facts, and relationships
- Avoid overly simple or trivial questions
- Return ONLY valid JSON in this exact format: {"flashcards": [{"front": "question", "back": "answer"}, ...]}`;

    // Make API request to OpenRouter
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://natigo.app",
        "X-Title": "Natigo Flashcard Generator",
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: inputText,
          },
        ],
        response_format: { type: "json_object" },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Handle non-200 responses
    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      throw new AIServiceError(`OpenRouter API returned status ${response.status}`, errorText);
    }

    // Parse response JSON
    const data: OpenRouterResponse = await response.json();

    // Validate response structure
    if (!data.choices || data.choices.length === 0) {
      throw new AIServiceError("Invalid API response: no choices returned");
    }

    const content = data.choices[0].message.content;
    if (!content) {
      throw new AIServiceError("Invalid API response: empty content");
    }

    // Parse the AI's JSON response
    let parsedContent: AIResponseData;
    try {
      parsedContent = JSON.parse(content);
    } catch (parseError) {
      throw new AIServiceError("Failed to parse AI response as JSON", parseError);
    }

    // Validate flashcards array exists
    if (!parsedContent.flashcards || !Array.isArray(parsedContent.flashcards)) {
      throw new AIServiceError("Invalid AI response: flashcards array missing or invalid");
    }

    // Validate each flashcard has required fields
    const validFlashcards = parsedContent.flashcards.filter((card) => {
      return (
        card &&
        typeof card.front === "string" &&
        typeof card.back === "string" &&
        card.front.trim().length > 0 &&
        card.back.trim().length > 0
      );
    });

    if (validFlashcards.length === 0) {
      throw new AIServiceError("No valid flashcards generated by AI");
    }

    return validFlashcards;
  } catch (error) {
    clearTimeout(timeoutId);

    // Handle timeout specifically
    if (error instanceof Error && error.name === "AbortError") {
      throw new AITimeoutError(`AI service did not respond within ${timeoutMs / 1000} seconds`);
    }

    // Re-throw our custom errors
    if (error instanceof AIServiceError || error instanceof AITimeoutError) {
      throw error;
    }

    // Wrap unknown errors
    throw new AIServiceError("Unexpected error calling AI service", error);
  }
}
