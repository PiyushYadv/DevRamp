import { createBrowserRouter } from "react-router";
import { Root } from "./Root";
import { HomePage } from "./pages/HomePage";
import { LoginPage } from "./pages/LoginPage";
import { SignupPage } from "./pages/SignupPage";
import { DashboardLayout } from "./pages/dashboard/DashboardLayout";
import { WorkspacePage } from "./pages/dashboard/WorkspacePage";
import { NotFoundPage } from "./pages/NotFoundPage";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Root,
    children: [
      { index: true, Component: HomePage },
      { path: "login", Component: LoginPage },
      { path: "signup", Component: SignupPage },
      {
        path: "dashboard",
        Component: DashboardLayout,
        children: [{ index: true, Component: WorkspacePage }],
      },
      { path: "*", Component: NotFoundPage },
    ],
  },
]);
