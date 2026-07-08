import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAdminAuth } from "@/lib/admin-auth";
import { useIdleTimer } from "@/hooks/use-idle-timer";

export function useAdminGuard(allowedRoles: ("mecanico" | "gerencia")[]) {
  const navigate = useNavigate();
  const { role, isValid, logout } = useAdminAuth();

  useEffect(() => {
    if (!isValid() || !role || !allowedRoles.includes(role)) {
      navigate({ to: "/" });
    }
  }, []);

  useIdleTimer(15 * 60 * 1000, () => {
    logout();
    navigate({ to: "/" });
  });
}
