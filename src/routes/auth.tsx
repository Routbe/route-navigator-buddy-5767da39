import { createFileRoute, Outlet } from "@tanstack/react-router";

/** Static parent for every Neon Auth screen under /auth. */
export const Route = createFileRoute("/auth")({
  component: () => <Outlet />,
});
