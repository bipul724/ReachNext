import { Sidebar } from "../../components/layout/sidebar";
import { Header } from "../../components/layout/header";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="relative flex min-h-screen">
      {/* Sidebar Nav */}
      <Sidebar />

      {/* Main Layout Area */}
      <div className="flex-1 pl-60 flex flex-col min-h-screen bg-[#FAFAFB]">
        <Header />
        <main className="flex-1 p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
