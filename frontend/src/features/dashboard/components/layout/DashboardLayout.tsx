import { Outlet } from "react-router";
import { DashboardProvider } from "../../context/DashboardContext";
import { DashboardSidebar } from "./DashboardSidebar";
import { DashboardTopBar } from "./DashboardTopBar";

function LayoutInner() {
  return (
    <div
      className="h-screen flex flex-col bg-[#0B0F17] text-slate-200 overflow-hidden"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      <DashboardTopBar />

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-[260px] shrink-0 flex flex-col border-r border-white/[0.06] bg-[#0D1117]">
          <DashboardSidebar />
        </aside>
        <div className="flex-1 overflow-hidden flex flex-col">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

export function DashboardLayout() {
  return (
    <DashboardProvider>
      <LayoutInner />
    </DashboardProvider>
  );
}
