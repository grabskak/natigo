export type AuthApiErrorCode =
  | "VALIDATION_FAILED"
  | "INVALID_CREDENTIALS"
  | "EMAIL_ALREADY_IN_USE"
  | "AUTH_REQUIRED"
  | "NOT_IMPLEMENTED"
  | "NETWORK_ERROR"
  | "UNKNOWN_ERROR";

export class AuthApiError extends Error {
  code: AuthApiErrorCode;
  status?: number;

  constructor(code: AuthApiErrorCode, message: string, status?: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

type JsonRecord = Record<string, unknown>;

async function readErrorResponse(response: Response): Promise<{
  code?: string;
  message?: string;
  details?: unknown;
}> {
  try {
    const data = (await response.json()) as unknown;
    if (!data || typeof data !== "object") return {};

    // Preferred API format: { error: { code, message, details? } }
    if ("error" in data && (data as JsonRecord).error && typeof (data as JsonRecord).error === "object") {
      const err = (data as { error: { code?: unknown; message?: unknown; details?: unknown } }).error;
      return {
        code: typeof err.code === "string" ? err.code : undefined,
        message: typeof err.message === "string" ? err.message : undefined,
        details: err.details,
      };
    }

    // Fallback: { message }
    if ("message" in data) {
      const msg = (data as { message?: unknown }).message;
      return { message: typeof msg === "string" ? msg : undefined };
    }

    return {};
  } catch {
    return {};
  }
}

function contentTypeJsonHeaders(headers?: HeadersInit): HeadersInit {
  return {
    "Content-Type": "application/json",
    ...(headers ?? {}),
  };
}

async function postJson<TResponse>(
  url: string,
  body: unknown,
  init?: Omit<RequestInit, "method" | "body">
): Promise<{ response: Response; data?: TResponse }> {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: contentTypeJsonHeaders(init?.headers),
      credentials: "include",
      ...init,
      body: JSON.stringify(body),
    });

    if (response.status === 204) return { response };

    // Some endpoints may not return JSON.
    try {
      const data = (await response.json()) as TResponse;
      return { response, data };
    } catch {
      return { response };
    }
  } catch (error) {
    if (error instanceof TypeError) {
      throw new AuthApiError("NETWORK_ERROR", "Network error. Please check your connection and try again.");
    }
    throw error;
  }
}

const AuthApiService = {
  async login(input: { email: string; password: string; next?: string }) {
    const { response, data } = await postJson<unknown>("/api/auth/login", input);

    if (response.ok) return data;

    if (response.status === 404) {
      throw new AuthApiError("NOT_IMPLEMENTED", "Authentication endpoint is not available yet.", 404);
    }

    if (response.status === 401) {
      // Always neutral for login.
      throw new AuthApiError("INVALID_CREDENTIALS", "Invalid email or password.", 401);
    }

    const err = await readErrorResponse(response);
    throw new AuthApiError(
      response.status === 400 ? "VALIDATION_FAILED" : "UNKNOWN_ERROR",
      err.message || "Login failed. Please try again later.",
      response.status
    );
  },

  async register(input: { email: string; password: string; confirmPassword: string; next?: string }) {
    const { response, data } = await postJson<unknown>("/api/auth/register", input);

    if (response.ok) return data;

    if (response.status === 404) {
      throw new AuthApiError("NOT_IMPLEMENTED", "Authentication endpoint is not available yet.", 404);
    }

    const err = await readErrorResponse(response);

    if (response.status === 409) {
      throw new AuthApiError("EMAIL_ALREADY_IN_USE", err.message || "This email is already registered.", 409);
    }

    throw new AuthApiError(
      response.status === 400 ? "VALIDATION_FAILED" : "UNKNOWN_ERROR",
      err.message || "Registration failed. Please try again later.",
      response.status
    );
  },

  async resetPassword(input: { email: string }) {
    const { response, data } = await postJson<unknown>("/api/auth/reset-password", input);

    if (response.ok) return data;

    if (response.status === 404) {
      throw new AuthApiError("NOT_IMPLEMENTED", "Authentication endpoint is not available yet.", 404);
    }

    const err = await readErrorResponse(response);
    throw new AuthApiError(
      response.status === 400 ? "VALIDATION_FAILED" : "UNKNOWN_ERROR",
      err.message || "Request failed. Please try again later.",
      response.status
    );
  },

  async updatePassword(input: { password: string; confirmPassword: string }) {
    const { response, data } = await postJson<unknown>("/api/auth/update-password", input);

    if (response.ok) return data;

    if (response.status === 404) {
      throw new AuthApiError("NOT_IMPLEMENTED", "Authentication endpoint is not available yet.", 404);
    }

    const err = await readErrorResponse(response);

    if (response.status === 401) {
      throw new AuthApiError(
        "AUTH_REQUIRED",
        err.message || "Reset link is invalid or expired. Request a new one.",
        401
      );
    }

    throw new AuthApiError(
      response.status === 400 ? "VALIDATION_FAILED" : "UNKNOWN_ERROR",
      err.message || "Update failed. Please try again later.",
      response.status
    );
  },

  async logout() {
    try {
      const response = await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
      if (response.ok) return;

      const err = await readErrorResponse(response);
      throw new AuthApiError("UNKNOWN_ERROR", err.message || "Logout failed. Please try again later.", response.status);
    } catch (error) {
      if (error instanceof AuthApiError) throw error;
      if (error instanceof TypeError) {
        throw new AuthApiError("NETWORK_ERROR", "Network error. Please check your connection and try again.");
      }
      throw error;
    }
  },
};

export { AuthApiService };
