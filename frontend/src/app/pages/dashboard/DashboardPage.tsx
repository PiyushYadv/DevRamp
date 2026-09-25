import { useEffect } from "react";
import { useNavigate } from "react-router";
import { DashboardLayout } from "../../../features/dashboard/components/layout/DashboardLayout";
import { isAuthenticated } from "../../../lib/api/auth";

export function DashboardPage() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated()) navigate("/login", { replace: true });
  }, [navigate]);

  if (!isAuthenticated()) return null;
  return <DashboardLayout />;
}
