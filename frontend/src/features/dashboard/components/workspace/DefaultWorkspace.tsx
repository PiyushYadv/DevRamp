import { useState } from "react";
import type { WsTab } from "../../types";
import { WORKSPACE_TABS } from "../../constants/workspace";
import { ArchitectureView } from "./ArchitectureView";
import { DependencyView } from "./DependencyView";
import { SetupTab } from "./SetupTab";
import { OnboardingOverview } from "./OnboardingOverview";

export function DefaultWorkspace() {
  const [activeTab, setActiveTab] = useState<WsTab>("overview");
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex border-b border-white/[0.06] bg-[#0D1117] shrink-0">
        {WORKSPACE_TABS.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-5 py-3 text-xs font-medium border-b-2 transition-all ${activeTab === tab.id ? "border-indigo-500 text-indigo-300 bg-indigo-500/[0.05]" : "border-transparent text-slate-500 hover:text-slate-300 hover:bg-white/[0.03]"}`}>
            {tab.label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto p-5">
        {activeTab === "overview" && <OnboardingOverview />}
        {activeTab === "architecture" && <ArchitectureView />}
        {activeTab === "dependency" && <DependencyView />}
        {activeTab === "setup" && <SetupTab />}
      </div>
    </div>
  );
}
