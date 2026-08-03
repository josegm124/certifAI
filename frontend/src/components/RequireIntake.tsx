import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useStore } from "../store/useStore";

export default function RequireAuth({ children, assessment = false }: { children: ReactNode; assessment?: boolean }) {
  const { authStatus, assessmentId } = useStore();
  const location = useLocation();
  if (authStatus === "loading") return <main className="wrap"><div className="card">Loading your account…</div></main>;
  if (authStatus !== "authenticated") return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  if (assessment && !assessmentId) return <Navigate to="/start" replace />;
  return <>{children}</>;
}
