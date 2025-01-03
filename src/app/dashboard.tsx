import {MainSidebar} from "@/components/main-sidebar"
import {useParams} from "react-router";
import * as React from "react";
import axios from "axios";
import {SidebarInset, SidebarProvider, SidebarTrigger,} from "@/components/ui/sidebar"
import {NavActions} from "@/components/nav-actions"
import {Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage,} from "@/components/ui/breadcrumb"
import {Separator} from "@/components/ui/separator"
import "vditor/dist/index.css"
import "@/styles/vditor-patch.css"
import {Editor} from "@/components/resource/editor"
import {Render} from "@/components/resource/render"
import {useResource} from "@/components/provider/resource-provider";
import {useGlobalContext} from "@/components/provider/context-provider.tsx";

const baseUrl = "/api/v1/resources"


type PageMode = "chat" | "view" | "edit"


export default function Dashboard() {
  const {namespace, resourceId} = useParams();
  const {resource, setResource} = useResource();
  const [pageMode, setPageMode] = React.useState<PageMode>("chat");
  const globalContext = useGlobalContext();
  const {vditor} = globalContext.vditorState;


  React.useEffect(() => {
    if (resourceId) {
      setPageMode("view");
    } else {
      setPageMode("chat");
    }

    return () => {
      setPageMode("chat");
    }
  }, [namespace, resourceId])


  const handelCancelEdit = () => {
    if (pageMode === "edit") {
      setPageMode("view");
    } else {
      throw new Error("Invalid state");
    }
  }

  const handleEditOrSave = () => {
    if (pageMode === "edit") {
      const content = vditor?.getValue();
      if (content) {
        console.log({name: "edit", content});
        axios.patch(`${baseUrl}/${resourceId}`, {content}).then(response => {
          const delta: Response = response.data;
          console.log({name: "edit_patch", delta});
          if (Object.values(delta).some(value => value !== undefined)) {
            setResource(prev => prev && {...prev, content});
          }
          setPageMode("view");
        })
      } else {
        setPageMode("view");
      }
    } else {
      setPageMode("edit");
    }
  }

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
                    {resource?.name}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <div className="ml-auto px-3">
            <NavActions payload={{isEditMode: pageMode === "edit", handleEditOrSave, handelCancelEdit}}/>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4">
          {
            pageMode === "chat" ? <div></div> :
              (pageMode === "edit" ?
                <Editor resourceId={resourceId}/> :
                (resource?.content ? <Render/> : <></>))
          }
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
