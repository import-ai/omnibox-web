import {MainSidebar} from "@/components/main-sidebar"
import {useParams} from "react-router";
import * as React from "react";
import {Resource} from "@/types/resource";
import axios from "axios";
import Markdown from "react-markdown";
import {SidebarInset, SidebarProvider, SidebarTrigger,} from "@/components/ui/sidebar"
import {NavActions} from "@/components/nav-actions"
import {Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage,} from "@/components/ui/breadcrumb"
import {Separator} from "@/components/ui/separator"
import remarkGfm from "remark-gfm";

const baseUrl = "/api/v1/resources"

export default function Dashboard() {
  const {namespace, resourceId} = useParams();
  const [resource, setResource] = React.useState<Resource>();

  React.useEffect(() => {
    if (resourceId) {
      axios.get(`${baseUrl}/${resourceId}`).then(response => {
        setResource(response.data);
      }).catch(error => {
        console.error(error);
      })
    }
  }, [namespace, resourceId])

  return (
    <SidebarProvider>
      <MainSidebar payload={{namespace: namespace ?? "", resource}}/>
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2">
          <div className="flex flex-1 items-center gap-2 px-3">
            <SidebarTrigger/>
            <Separator orientation="vertical" className="mr-2 h-4"/>
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbPage className="line-clamp-1">
                    Project Management & Task Tracking
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <div className="ml-auto px-3">
            <NavActions/>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4">
          <div className="prose dark:prose-invert lg:prose-lg">
            <Markdown remarkPlugins={[remarkGfm]}>
              {resource?.content}
            </Markdown>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
