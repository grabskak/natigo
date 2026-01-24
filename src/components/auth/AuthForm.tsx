import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthApiError, AuthApiService } from "@/lib/services/auth-api.service";
import { getSafeNext } from "@/lib/utils/safe-next";

type Mode = "login" | "register";

interface AuthFormProps {
  initialMode?: Mode;
  next?: string;
  prefillEmail?: string;
}

interface RegisterOkResponse {
  user: { id: string; email: string | null };
  requiresEmailConfirmation?: boolean;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LEN = 8;

function withNext(path: string, next?: string) {
  const safe = getSafeNext(next);
  if (!safe) return path;

  const url = new URL(path, window.location.origin);
  url.searchParams.set("next", safe);
  return `${url.pathname}?${url.searchParams.toString()}`;
}

export function AuthForm({ initialMode = "login", next, prefillEmail }: AuthFormProps) {
  const emailId = useId();
  const passwordId = useId();
  const confirmPasswordId = useId();

  const safeNext = useMemo(() => getSafeNext(next), [next]);

  const [mode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState(prefillEmail ?? "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [registerSubmitted, setRegisterSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmPasswordError, setConfirmPasswordError] = useState<string | null>(null);

  useEffect(() => {
    setEmail(prefillEmail ?? "");
  }, [prefillEmail]);

  const loginHref = useMemo(() => {
    const normalizedEmail = email.trim().toLowerCase();
    const base = normalizedEmail ? `/login?email=${encodeURIComponent(normalizedEmail)}` : "/login";
    return typeof window !== "undefined" ? withNext(base, safeNext) : base;
  }, [email, safeNext]);

  const validate = useCallback(() => {
    const normalizedEmail = email.trim();

    setFormError(null);
    setEmailError(null);
    setPasswordError(null);
    setConfirmPasswordError(null);

    if (!normalizedEmail) {
      setEmailError("Email jest wymagany.");
      return false;
    }

    if (!EMAIL_REGEX.test(normalizedEmail)) {
      setEmailError("Podaj poprawny adres email.");
      return false;
    }

    if (!password) {
      setPasswordError("Hasło jest wymagane.");
      return false;
    }

    if (mode === "register") {
      if (password.length < MIN_PASSWORD_LEN) {
        setPasswordError(`Hasło musi mieć co najmniej ${MIN_PASSWORD_LEN} znaków.`);
        return false;
      }

      if (!confirmPassword) {
        setConfirmPasswordError("Potwierdź hasło.");
        return false;
      }

      if (confirmPassword !== password) {
        setConfirmPasswordError("Hasła nie są takie same.");
        return false;
      }
    }

    return true;
  }, [confirmPassword, email, mode, password]);

  const redirectAfterSuccess = useCallback(() => {
    window.location.href = safeNext ?? "/generations";
  }, [safeNext]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (isSubmitting) return;
      if (!validate()) return;

      setIsSubmitting(true);
      setFormError(null);

      const normalizedEmail = email.trim().toLowerCase();

      try {
        if (mode === "login") {
          await AuthApiService.login({ email: normalizedEmail, password, next: safeNext });
          toast.success("Zalogowano.", { duration: 2500 });
          redirectAfterSuccess();
          return;
        }

        const result = (await AuthApiService.register({
          email: normalizedEmail,
          password,
          confirmPassword,
          next: safeNext,
        })) as RegisterOkResponse | undefined;

        if (result?.requiresEmailConfirmation) {
          setRegisterSubmitted(true);
          toast.success("Sprawdź skrzynkę email.", {
            description: "Wysłaliśmy link do potwierdzenia konta. Kliknij w link, a następnie zaloguj się.",
            duration: 6000,
          });
          return;
        }

        toast.success("Konto utworzone.", { duration: 2500 });
        redirectAfterSuccess();
      } catch (error) {
        if (error instanceof AuthApiError) {
          if (mode === "login" && error.code === "INVALID_CREDENTIALS") {
            setFormError("Nieprawidłowy email lub hasło.");
            return;
          }

          if (mode === "register" && error.code === "EMAIL_ALREADY_IN_USE") {
            setFormError("Ten adres email jest już zarejestrowany.");
            return;
          }

          if (error.code === "NOT_IMPLEMENTED") {
            setFormError(
              "Funkcjonalność logowania/rejestracji nie jest jeszcze dostępna (backend w trakcie implementacji)."
            );
            return;
          }

          setFormError(error.message);
          return;
        }

        setFormError("Coś poszło nie tak. Spróbuj ponownie później.");
      } finally {
        setIsSubmitting(false);
      }
    },
    [confirmPassword, email, isSubmitting, mode, password, redirectAfterSuccess, safeNext, validate]
  );

  const secondaryLink = useMemo(() => {
    if (mode === "login") {
      return {
        text: "Nie masz konta? Zarejestruj się",
        href: typeof window !== "undefined" ? withNext("/register", safeNext) : "/register",
      };
    }
    return {
      text: "Masz konto? Zaloguj się",
      href: typeof window !== "undefined" ? withNext("/login", safeNext) : "/login",
    };
  }, [mode, safeNext]);

  if (mode === "register" && registerSubmitted) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Wysłaliśmy link do potwierdzenia konta na adres <span className="font-medium">{email.trim()}</span>. Kliknij w
          link w wiadomości (sprawdź też spam), a następnie zaloguj się.
        </p>
        <div className="flex flex-col gap-2">
          <a href={loginHref} className="text-sm text-primary underline-offset-4 hover:underline">
            Przejdź do logowania
          </a>
          <button
            type="button"
            className="text-left text-sm text-muted-foreground underline-offset-4 hover:underline"
            onClick={() => setRegisterSubmitted(false)}
          >
            Zmień email
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor={emailId}>Email</Label>
        <Input
          id={emailId}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          aria-invalid={emailError ? "true" : "false"}
        />
        {emailError ? <p className="text-sm text-destructive">{emailError}</p> : null}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor={passwordId}>Hasło</Label>
          {mode === "login" ? (
            <a href="/reset-password" className="text-sm text-primary underline-offset-4 hover:underline">
              Nie pamiętasz hasła?
            </a>
          ) : null}
        </div>
        <Input
          id={passwordId}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          aria-invalid={passwordError ? "true" : "false"}
        />
        {passwordError ? <p className="text-sm text-destructive">{passwordError}</p> : null}
      </div>

      {mode === "register" ? (
        <div className="space-y-2">
          <Label htmlFor={confirmPasswordId}>Potwierdź hasło</Label>
          <Input
            id={confirmPasswordId}
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            aria-invalid={confirmPasswordError ? "true" : "false"}
          />
          {confirmPasswordError ? <p className="text-sm text-destructive">{confirmPasswordError}</p> : null}
        </div>
      ) : null}

      {formError ? <p className="text-sm text-destructive">{formError}</p> : null}

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {mode === "login" ? "Logowanie…" : "Tworzenie konta…"}
          </>
        ) : mode === "login" ? (
          "Zaloguj się"
        ) : (
          "Utwórz konto"
        )}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        <a href={secondaryLink.href} className="text-primary underline-offset-4 hover:underline">
          {secondaryLink.text}
        </a>
      </p>
    </form>
  );
}
