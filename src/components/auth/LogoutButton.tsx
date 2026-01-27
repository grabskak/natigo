import { useCallback, useState } from "react";
import { toast } from "sonner";
import { Loader2, LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { AuthApiError, AuthApiService } from "@/lib/services/auth-api.service";

interface LogoutButtonProps {
  redirectTo?: string;
}

export function LogoutButton({ redirectTo = "/login" }: LogoutButtonProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogout = useCallback(async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      await AuthApiService.logout();
      toast.success("Wylogowano.", { duration: 2500 });
      window.location.href = redirectTo;
    } catch (error) {
      if (error instanceof AuthApiError) {
        toast.error("Wylogowanie nie powiodło się.", { description: error.message, duration: 3500 });
      } else {
        toast.error("Wylogowanie nie powiodło się.", { duration: 3500 });
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting, redirectTo]);

  return (
    <Button type="button" variant="outline" size="sm" disabled={isSubmitting} onClick={handleLogout}>
      {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
      Wyloguj
    </Button>
  );
}
