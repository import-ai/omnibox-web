import { ResourceProvider } from "@/components/provider/resource-provider.tsx";
import { SidebarProvider } from "@/components/ui/sidebar.tsx";
import { MainSidebar } from "@/components/sidebar/main-sidebar.tsx";
import { Outlet } from "react-router";

export function NamespaceBase() {
  return (
    <ResourceProvider>
      <SidebarProvider>
        <MainSidebar />
        <Outlet />
      </SidebarProvider>
    </ResourceProvider>
  );
}
