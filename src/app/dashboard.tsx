import {MainSidebar} from "@/components/main-sidebar"
import {useParams} from "react-router";
import * as React from "react";
import {type Resource} from "@/types/resource";
import axios from "axios";
import {SidebarInset, SidebarProvider, SidebarTrigger,} from "@/components/ui/sidebar"
import {NavActions} from "@/components/nav-actions"
import {Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage,} from "@/components/ui/breadcrumb"
import {Separator} from "@/components/ui/separator"
import Vditor from "vditor"
import "vditor/dist/index.css"
import "@/styles/vditor-patch.css"
import {useTheme} from "@/components/theme-provider";
import {VditorTheme} from "@/types/vditor";
import {Editor} from "@/components/resource/editor"
import {Render} from "@/components/resource/render"

const baseUrl = "/api/v1/resources"


type PageMode = "chat" | "view" | "edit"


export default function Dashboard() {
  const {namespace, resourceId} = useParams();
  const [resource, setResource] = React.useState<Resource>();
  const [pageMode, setPageMode] = React.useState<PageMode>("chat");
  const [vd, setVd] = React.useState<Vditor>();
  const {theme} = useTheme();

  const vditorTheme = React.useMemo<VditorTheme>((): VditorTheme => {
    const currentTheme = theme === "system" ?
      (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : (
        theme === "dark" ? "dark" : "light"
      )
    return {
      theme: currentTheme === "dark" ? "dark" : "classic",
      contentTheme: currentTheme,
      codeTheme: currentTheme === "dark" ? "github-dark" : "github"
    }
  }, [theme]);

  React.useEffect(() => {
    if (resourceId) {
      axios.get(`${baseUrl}/${resourceId}`).then(response => {
        setResource(response.data);
        setPageMode("view");
      }).catch(error => {
        console.error(error);
      })
    } else {
      setPageMode("chat");
    }

    return () => {
      setPageMode("chat");
      setResource(undefined);
      vd?.destroy();
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
      const content = vd?.getValue();
      axios.patch(`${baseUrl}/${resourceId}`, {content}).then(response => {
        const delta: Response = response.data;
        if (Object.values(delta).some(value => value !== undefined)) {
          setResource(prev => prev && {...prev, content});
        }
        setPageMode("view")
      })
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
                <Editor resourceId={resourceId} vd={vd} setVd={setVd} theme={vditorTheme}/> :
                (resource?.content ? <Render markdown={resource?.content} theme={vditorTheme}/> : <></>))
          }
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
