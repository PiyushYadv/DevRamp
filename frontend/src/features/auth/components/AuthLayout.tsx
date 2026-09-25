import type { ReactNode } from "react";
import { Link } from "react-router";
import { Terminal } from "lucide-react";

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className="min-h-screen bg-[#0B0F17] flex flex-col items-center justify-center px-4 py-12"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(99,102,241,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.03) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />
      <Link to="/" className="relative flex items-center gap-2 mb-8">
        <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
          <Terminal className="w-4 h-4 text-white" />
        </div>
        <span className="text-base font-semibold text-white">DevRamp</span>
      </Link>
      {children}
    </div>
  );
}
