import {MainSidebar} from "@/components/main-sidebar"
import {useParams} from "react-router";
import * as React from "react";
import {type Resource} from "@/types/resource";
import axios from "axios";
import Markdown from "react-markdown";
import {SidebarInset, SidebarProvider, SidebarTrigger,} from "@/components/ui/sidebar"
import {NavActions} from "@/components/nav-actions"
import {Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage,} from "@/components/ui/breadcrumb"
import {Separator} from "@/components/ui/separator"
import remarkGfm from "remark-gfm";
import Vditor from "vditor"
import "vditor/dist/index.css"
import "@/styles/vditor-patch.css"
import {useTheme} from "@/components/theme-provider";

const baseUrl = "/api/v1/resources"

function Editor({resourceId, vd, setVd}: {
  resourceId: string | undefined,
  vd: Vditor | undefined,
  setVd: React.Dispatch<React.SetStateAction<Vditor | undefined>>
}) {
  const domId: string = "md-editor"
  const {theme} = useTheme();

  const editorTheme = React.useMemo(() => {
    if (theme === "system") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "classic"
    }
    return theme == "dark" ? "dark": "classic";
  }, [theme])

  React.useEffect(() => {
    vd?.setTheme(editorTheme);
  }, [editorTheme])

  React.useEffect(() => {
    if (!resourceId) {
      throw new Error("Resource ID is required");
    }

    axios.get(`${baseUrl}/${resourceId}`).then(response => {
      const resource: Resource = response.data;
      const v = new Vditor(domId, {
        after: () => {
          v.setValue(resource.content ?? "");
          v.setTheme(editorTheme);
          setVd(v);
        },
      });
    }).catch(error => {
      throw error
    })

    return () => {
      vd?.destroy();
      setVd(undefined);
    }
  }, [resourceId])

  return (
    <div id={domId} className="vditor vditor-reset"></div>
  )
}

function Render({children}: { children: string }) {
  return (
    <div className="prose dark:prose-invert lg:prose-lg">
      <Markdown remarkPlugins={[remarkGfm]}>{children}</Markdown>
    </div>
  )
}

export default function Dashboard() {
  const {namespace, resourceId} = useParams();
  const [resource, setResource] = React.useState<Resource>();
  const [isEditMode, setIsEditMode] = React.useState<boolean>(false);
  const [vd, setVd] = React.useState<Vditor>();

  React.useEffect(() => {
    if (resourceId) {
      axios.get(`${baseUrl}/${resourceId}`).then(response => {
        setResource(response.data);
      }).catch(error => {
        console.error(error);
      })
    }
  }, [namespace, resourceId])


  const handelCancelEdit = () => {
    if (isEditMode) {
      setIsEditMode(false);
    } else {
      throw new Error("Invalid state");
    }
  }

  const handleEditOrSave = () => {
    if (isEditMode) {
      const content = vd?.getValue();
      axios.patch(`${baseUrl}/${resourceId}`, {content}).then(response => {
        const delta: Response = response.data;
        if (Object.values(delta).some(value => value !== undefined)) {
          setResource(prev => prev && {...prev, content});
        }
        setIsEditMode(false);
      })
    } else {
      setIsEditMode(true);
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
                    Project Management & Task Tracking
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <div className="ml-auto px-3">
            <NavActions payload={{isEditMode, handleEditOrSave, handelCancelEdit}}/>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4">
          {
            isEditMode ?
              <Editor resourceId={resourceId} vd={vd} setVd={setVd}/> :
              <Render>{resource?.content ?? ""}</Render>
          }
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
