import { useState } from "react";
import { useNavigate, Link } from "react-router";
import { Github, ArrowRight } from "lucide-react";
import { githubAuth, login } from "../../lib/api/auth";
import { AuthError } from "../../features/auth/components/AuthError";
import { PasswordInput } from "../../features/auth/components/PasswordInput";
import { AuthLayout } from "../../features/auth/components/AuthLayout";

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { setError("Please fill in all fields."); return; }
    setError("");
    setLoading(true);
    try {
      await login({ email, password });
      navigate("/dashboard");
    } catch {
      setError("Unable to sign in. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGitHub = async () => {
    setLoading(true);
    try {
      await githubAuth();
      navigate("/dashboard");
    } catch {
      setError("Unable to continue with GitHub. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="relative w-full max-w-sm">
        <div className="rounded-2xl border border-white/[0.08] bg-[#0D1117]/80 backdrop-blur-sm p-8">
          <div className="mb-6">
            <h1 className="text-xl font-semibold text-white mb-1">Welcome back</h1>
            <p className="text-sm text-slate-500">Sign in to your DevRamp workspace.</p>
          </div>

          {/* GitHub SSO */}
          <button
            onClick={handleGitHub}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-lg border border-white/[0.1] bg-white/[0.04] hover:bg-white/[0.08] text-sm text-slate-200 font-medium transition-all disabled:opacity-50 mb-5"
          >
            <Github className="w-4 h-4" />
            Continue with GitHub
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-white/[0.06]" />
            <span className="text-[11px] text-slate-600">or</span>
            <div className="flex-1 h-px bg-white/[0.06]" />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <AuthError message={error} />

            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Email address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="w-full px-3 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/25 transition-all"
              />
            </div>

            <PasswordInput value={password} onChange={setPassword} placeholder="••••••••" />

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors disabled:opacity-60 mt-2"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>Sign in <ArrowRight className="w-3.5 h-3.5" /></>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-slate-600 mt-5">
          {"Don't have an account? "}
          <Link to="/signup" className="text-indigo-400 hover:text-indigo-300 transition-colors">
            Create one free
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
