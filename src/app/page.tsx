import {AppSidebar} from "@/components/app-sidebar.tsx"
import {SidebarProvider} from "@/components/ui/sidebar.tsx"

export default function Page() {
  return (
    <SidebarProvider>
        <AppSidebar/>
    </SidebarProvider>
  )
}
