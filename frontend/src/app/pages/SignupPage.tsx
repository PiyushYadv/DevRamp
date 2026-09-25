import { useState } from "react";
import { useNavigate, Link } from "react-router";
import { Github, ArrowRight, Check } from "lucide-react";
import { githubAuth, signup } from "../../lib/api/auth";
import { AuthError } from "../../features/auth/components/AuthError";
import { PasswordInput } from "../../features/auth/components/PasswordInput";
import { AuthLayout } from "../../features/auth/components/AuthLayout";

export function SignupPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const passwordStrength = password.length === 0 ? null : password.length < 8 ? "weak" : password.length < 12 ? "fair" : "strong";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) { setError("Please fill in all fields."); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (!agreed) { setError("Please accept the terms to continue."); return; }
    setError("");
    setLoading(true);
    try {
      await signup({ name, email, password });
      navigate("/dashboard");
    } catch {
      setError("Unable to create your account. Please try again.");
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
            <h1 className="text-xl font-semibold text-white mb-1">Create your account</h1>
            <p className="text-sm text-slate-500">Start onboarding engineers faster, today.</p>
          </div>

          {/* GitHub SSO */}
          <button
            onClick={handleGitHub}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-lg border border-white/[0.1] bg-white/[0.04] hover:bg-white/[0.08] text-sm text-slate-200 font-medium transition-all disabled:opacity-50 mb-5"
          >
            <Github className="w-4 h-4" />
            Sign up with GitHub
          </button>

          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-white/[0.06]" />
            <span className="text-[11px] text-slate-600">or</span>
            <div className="flex-1 h-px bg-white/[0.06]" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <AuthError message={error} />

            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Full name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Alex Chen"
                className="w-full px-3 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/25 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Work email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="w-full px-3 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/25 transition-all"
              />
            </div>

            <div>
              <PasswordInput value={password} onChange={setPassword} placeholder="Min. 8 characters" />
              {passwordStrength && (
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex gap-1 flex-1">
                    {["weak", "fair", "strong"].map((level, i) => (
                      <div
                        key={level}
                        className={`h-1 flex-1 rounded-full transition-colors ${
                          passwordStrength === "weak" && i === 0 ? "bg-red-500" :
                          passwordStrength === "fair" && i <= 1 ? "bg-yellow-500" :
                          passwordStrength === "strong" ? "bg-emerald-500" :
                          "bg-white/[0.08]"
                        }`}
                      />
                    ))}
                  </div>
                  <span className={`text-[10px] font-mono ${
                    passwordStrength === "weak" ? "text-red-400" :
                    passwordStrength === "fair" ? "text-yellow-400" : "text-emerald-400"
                  }`}>{passwordStrength}</span>
                </div>
              )}
            </div>

            <label className="flex items-start gap-2.5 cursor-pointer group">
              <button
                type="button"
                onClick={() => setAgreed((v) => !v)}
                className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                  agreed ? "bg-indigo-600 border-indigo-600" : "border-white/[0.2] bg-transparent hover:border-indigo-500/50"
                }`}
              >
                {agreed && <Check className="w-2.5 h-2.5 text-white" />}
              </button>
              <span className="text-xs text-slate-500 leading-relaxed">
                I agree to the{" "}
                <a href="#" className="text-indigo-400 hover:text-indigo-300">Terms of Service</a>
                {" "}and{" "}
                <a href="#" className="text-indigo-400 hover:text-indigo-300">Privacy Policy</a>
              </span>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors disabled:opacity-60 mt-1"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>Create account <ArrowRight className="w-3.5 h-3.5" /></>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-slate-600 mt-5">
          Already have an account?{" "}
          <Link to="/login" className="text-indigo-400 hover:text-indigo-300 transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
