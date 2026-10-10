import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { completeGithubOAuth } from "../../lib/api/auth";
import { AuthError } from "../../features/auth/components/AuthError";
import { AuthLayout } from "../../features/auth/components/AuthLayout";

/** GitHub OAuth redirect target: exchanges the one-time code with the backend, then opens the dashboard. */
export function GithubCallbackPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [error, setError] = useState("");

  useEffect(() => {
    const code = params.get("code");
    const state = params.get("state");

    if (params.get("error") || !code || !state) {
      setError("GitHub authorization was cancelled or failed. Please try again.");
      return;
    }

    completeGithubOAuth(code, state)
      .then(() => navigate("/dashboard", { replace: true }))
      .catch(() => setError("Unable to continue with GitHub. Please try again."));
  }, [params, navigate]);

  return (
    <AuthLayout>
      <div className="relative w-full max-w-sm">
        <div className="rounded-2xl border border-white/[0.08] bg-[#0D1117]/80 backdrop-blur-sm p-8">
          {error ? (
            <div className="space-y-4">
              <AuthError message={error} />
              <p className="text-center text-sm text-slate-500">
                <Link to="/login" className="text-indigo-400 hover:text-indigo-300 transition-colors">
                  Back to sign in
                </Link>
              </p>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2.5 text-sm text-slate-400">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Connecting to GitHub...
            </div>
          )}
        </div>
      </div>
    </AuthLayout>
  );
}
