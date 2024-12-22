import {SidebarProvider, SidebarTrigger, SidebarInset} from "@/components/ui/sidebar"
import {AppSidebar} from "@/components/app-sidebar"
import ResourceContent from "@/components/ResourceContent";
import React, { useState } from "react";

export default function Layout({children}: { children: React.ReactNode }) {
  const [selectedResource, setSelectedResource] = useState<string | null>(null);

  return (
    <SidebarProvider>
      <AppSidebar setSelectedResource={setSelectedResource} />
      <SidebarInset>
        <SidebarTrigger/>
        {children}
        <ResourceContent resourceId={selectedResource} />
      </SidebarInset>
    </SidebarProvider>
  )
}
