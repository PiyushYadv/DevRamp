import { useDashboard } from "../../context/DashboardContext";
import { CodeView } from "../code/CodeView";
import { ModuleView } from "../modules/ModuleView";
import { ConnectRepository } from "../repository/ConnectRepository";
import { DefaultWorkspace } from "./DefaultWorkspace";
import { ChatPanel } from "../chat/ChatPanel";

export function WorkspaceScreen() {
  const { hasRepo, selectedFile, selectedModule } = useDashboard();

  if (!hasRepo) return <ConnectRepository />;
  if (selectedFile) {
    return (
      <div className="flex flex-1 overflow-hidden">
        <CodeView />
        <ChatPanel />
      </div>
    );
  }

  if (selectedModule) return <ModuleView />;

  return (
    <div className="flex flex-1 overflow-hidden">
      <DefaultWorkspace />
      <ChatPanel />
    </div>
  );
}
