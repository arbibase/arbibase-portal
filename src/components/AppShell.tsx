"use client";

type ShellProps = {
  children: React.ReactNode;
  active?: "overview" | "browse" | "requests" | "favorites" | "billing";
};

export default function AppShell({ children }: ShellProps) {
  return <>{children}</>;
}
