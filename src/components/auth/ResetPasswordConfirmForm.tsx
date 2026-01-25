import { useCallback, useId, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthApiError, AuthApiService } from "@/lib/services/auth-api.service";

const MIN_PASSWORD_LEN = 8;

export function ResetPasswordConfirmForm() {
  const passwordId = useId();
  const confirmPasswordId = useId();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmPasswordError, setConfirmPasswordError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [showRequestNewLinkCta, setShowRequestNewLinkCta] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = useCallback(() => {
    setPasswordError(null);
    setConfirmPasswordError(null);
    setFormError(null);
    setShowRequestNewLinkCta(false);

    if (!password) {
      setPasswordError("Hasło jest wymagane.");
      return false;
    }

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

    return true;
  }, [confirmPassword, password]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (isSubmitting) return;
      if (!validate()) return;

      setIsSubmitting(true);

      try {
        await AuthApiService.updatePassword({ password, confirmPassword });
        toast.success("Hasło zostało zmienione.", { duration: 2500 });
        window.location.href = "/login";
      } catch (error) {
        if (error instanceof AuthApiError) {
          if (error.code === "AUTH_REQUIRED") {
            setFormError("Link do resetu hasła jest nieprawidłowy lub wygasł. Poproś o nowy.");
            setShowRequestNewLinkCta(true);
            return;
          }
          if (error.code === "NOT_IMPLEMENTED") {
            setFormError("Funkcjonalność nie jest jeszcze dostępna (backend w trakcie implementacji).");
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
    [confirmPassword, isSubmitting, password, validate]
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor={passwordId}>Nowe hasło</Label>
        <Input
          id={passwordId}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          aria-invalid={passwordError ? "true" : "false"}
        />
        {passwordError ? <p className="text-sm text-destructive">{passwordError}</p> : null}
      </div>

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
        {confirmPasswordError ? (
          <p className="text-sm text-destructive">{confirmPasswordError}</p>
        ) : null}
      </div>

      {formError ? (
        <div className="space-y-2">
          <p className="text-sm text-destructive">{formError}</p>
          {showRequestNewLinkCta ? (
            <a
              href="/reset-password"
              className="inline-block text-sm text-primary underline-offset-4 hover:underline"
            >
              Poproś o nowy link
            </a>
          ) : null}
        </div>
      ) : null}

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Zapisywanie…
          </>
        ) : (
          "Ustaw nowe hasło"
        )}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        <a href="/login" className="text-primary underline-offset-4 hover:underline">
          Wróć do logowania
        </a>
      </p>
    </form>
  );
}

