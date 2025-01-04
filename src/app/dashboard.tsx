import {MainSidebar} from "@/components/main-sidebar"
import {Outlet} from "react-router";
import {SidebarProvider,} from "@/components/ui/sidebar"
import "vditor/dist/index.css"
import "@/styles/vditor-patch.css"


export default function Dashboard() {

  return (
    <SidebarProvider>
      <MainSidebar/>
      <Outlet/>
    </SidebarProvider>
  )
}
