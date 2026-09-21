import { useState } from "react";
import { useNavigate, Link } from "react-router";
import { Terminal, Github, Eye, EyeOff, ArrowRight, AlertCircle } from "lucide-react";

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { setError("Please fill in all fields."); return; }
    setError("");
    setLoading(true);
    setTimeout(() => { setLoading(false); navigate("/dashboard"); }, 1000);
  };

  const handleGitHub = () => {
    setLoading(true);
    setTimeout(() => { setLoading(false); navigate("/dashboard"); }, 800);
  };

  return (
    <div
      className="min-h-screen bg-[#0B0F17] flex flex-col items-center justify-center px-4"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      {/* Background grid */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage: "linear-gradient(rgba(99,102,241,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.03) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Logo */}
      <Link to="/" className="flex items-center gap-2 mb-8 group">
        <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
          <Terminal className="w-4 h-4 text-white" />
        </div>
        <span className="text-base font-semibold text-white">DevRamp</span>
      </Link>

      {/* Card */}
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
            {error && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/25 text-red-400 text-xs">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {error}
              </div>
            )}

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

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs text-slate-400">Password</label>
                <a href="#" className="text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors">
                  Forgot password?
                </a>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2.5 pr-10 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/25 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

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
    </div>
  );
}
