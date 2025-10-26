"use client";

type ShellProps = {
  children: React.ReactNode;
  active?: "overview" | "browse" | "requests" | "favorites" | "billing";
};

export default function AppShell({ children, active = "overview" }: ShellProps) {
  return (
    <div className="mx-auto max-w-[1140px] px-4 py-6 md:py-8">
      {children}
    </div>
  );
}
