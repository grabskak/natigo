import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";

interface AuthCallbackViewProps {
  next?: string;
}

function getSafeNext(next?: string): string | undefined {
  if (!next) return undefined;
  if (!next.startsWith("/")) return undefined;
  if (next.startsWith("//")) return undefined;
  if (next.includes("://")) return undefined;
  if (next.includes("\\")) return undefined;
  return next;
}

export function AuthCallbackView({ next }: AuthCallbackViewProps) {
  const safeNext = useMemo(() => getSafeNext(next), [next]);
  const destination = safeNext ?? "/flashcards";

  const [secondsLeft, setSecondsLeft] = useState(2);

  useEffect(() => {
    const tick = window.setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1));
    }, 1000);

    const timer = window.setTimeout(() => {
      window.location.replace(destination);
    }, 2000);

    return () => {
      window.clearInterval(tick);
      window.clearTimeout(timer);
    };
  }, [destination]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Przekierowanie za {secondsLeft}s…</span>
      </div>

      <Button type="button" className="w-full" onClick={() => window.location.replace(destination)}>
        Kontynuuj
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Jeśli przekierowanie nie działa,{" "}
        <a href={destination} className="text-primary underline-offset-4 hover:underline">
          kliknij tutaj
        </a>
        .
      </p>
    </div>
  );
}
