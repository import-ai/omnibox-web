import {SidebarInset, SidebarTrigger} from "@/components/ui/sidebar";
import {Separator} from "@/components/ui/separator";
import {Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage} from "@/components/ui/breadcrumb";
import {NavResourceActions} from "@/components/nav-resource-actions.tsx";
import {Outlet} from "react-router";
import {useResource} from "@/components/provider/resource-provider";
import "vditor/dist/index.css"
import "@/styles/vditor-patch.css"

export function ResourcePage() {
  const {resource} = useResource();
  if (!resource) {
    return <></>
  }
  return (
    <>
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2">
          <div className="flex flex-1 items-center gap-2 px-3">
            <SidebarTrigger/>
            <Separator orientation="vertical" className="mr-2 h-4"/>
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbPage className="line-clamp-1">
                    {resource.name}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <div className="ml-auto px-3">
            <NavResourceActions/>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4">
          <Outlet/>
        </div>
      </SidebarInset>
    </>
  )
}