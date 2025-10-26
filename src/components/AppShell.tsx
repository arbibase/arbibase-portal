"use client";

type ShellProps = {
  children: React.ReactNode;
  active?: string;
};

export default function AppShell({ children }: ShellProps) {
  return (
    <div className="mx-auto max-w-[1140px] px-4 py-6 md:py-8">
      {children}
    </div>
  );
}
