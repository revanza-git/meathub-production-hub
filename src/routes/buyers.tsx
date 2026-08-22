import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/buyers")({
  beforeLoad: () => {
    throw redirect({ to: "/network", hash: "buyers" });
  },
});
