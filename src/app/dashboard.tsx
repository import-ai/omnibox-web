import {AppSidebar} from "@/components/app-sidebar.tsx"
import {SidebarProvider} from "@/components/ui/sidebar.tsx"

export default function Dashboard() {
  return (
    <SidebarProvider>
      <AppSidebar/>
    </SidebarProvider>
  )
}
