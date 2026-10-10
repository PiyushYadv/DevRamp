import { createBrowserRouter } from "react-router";
import { Root } from "./Root";
import { HomePage } from "./pages/HomePage";
import { LoginPage } from "./pages/LoginPage";
import { SignupPage } from "./pages/SignupPage";
import { GithubCallbackPage } from "./pages/GithubCallbackPage";
import { WorkspacePage } from "./pages/dashboard/WorkspacePage";
import { DashboardPage } from "./pages/dashboard/DashboardPage";
import { NotFoundPage } from "./pages/NotFoundPage";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Root,
    children: [
      { index: true, Component: HomePage },
      { path: "login", Component: LoginPage },
      { path: "signup", Component: SignupPage },
      { path: "auth/github/callback", Component: GithubCallbackPage },
      {
        path: "dashboard",
        Component: DashboardPage,
        children: [{ index: true, Component: WorkspacePage }],
      },
      { path: "*", Component: NotFoundPage },
    ],
  },
]);
