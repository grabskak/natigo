import { useCallback, useId, useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthApiService } from "@/lib/services/auth-api.service";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function ResetPasswordRequestForm() {
  const emailId = useId();

  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const neutralSuccessMessage = useMemo(
    () => "Jeśli konto istnieje dla tego adresu email, wysłaliśmy link do resetu hasła.",
    []
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (isSubmitting) return;

      setEmailError(null);

      const normalizedEmail = email.trim().toLowerCase();
      if (!normalizedEmail) {
        setEmailError("Email jest wymagany.");
        return;
      }

      if (!EMAIL_REGEX.test(normalizedEmail)) {
        setEmailError("Podaj poprawny adres email.");
        return;
      }

      // Non-disclosure: after validating format, we always show success (US-004).
      setIsSubmitting(true);
      setSubmitted(true);
      toast.success("Sprawdź skrzynkę email.", { description: neutralSuccessMessage, duration: 5000 });

      try {
        await AuthApiService.resetPassword({ email: normalizedEmail });
      } catch {
        // Intentionally ignored to avoid disclosing whether the account exists.
      } finally {
        setIsSubmitting(false);
      }
    },
    [email, isSubmitting, neutralSuccessMessage]
  );

  if (submitted) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">{neutralSuccessMessage}</p>
        <div className="flex flex-col gap-2">
          <a href="/login" className="text-sm text-primary underline-offset-4 hover:underline">
            Wróć do logowania
          </a>
          <button
            type="button"
            className="text-left text-sm text-muted-foreground underline-offset-4 hover:underline"
            onClick={() => setSubmitted(false)}
          >
            Wyślij ponownie
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

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Wysyłanie…
          </>
        ) : (
          "Wyślij link resetu"
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

