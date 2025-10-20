import Topbar from "@/components/ui/Topbar";
import Sidebar from "@/components/ui/Sidebar";

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{display:"grid",gridTemplateRows:"auto 1fr",minHeight:"100dvh"}}>
      <Topbar />
      <div style={{display:"grid",gridTemplateColumns:"260px 1fr",gap:16, padding:"16px 20px"}}>
        <Sidebar />
        <div>{children}</div>
      </div>
    </div>
  );
}
