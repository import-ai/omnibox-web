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
import {MDXEditor, type MDXEditorMethods} from '@mdxeditor/editor'
import {SELECTED_PLUGINS} from "@/app/editor-plugins";
import '@mdxeditor/editor/style.css'

const baseUrl = "/api/v1/resources"

export default function Dashboard() {
  const {namespace, resourceId} = useParams();
  const [resource, setResource] = React.useState<Resource>();
  const [editMode, setEditMode] = React.useState<boolean>(false);
  const mdxRef = React.useRef<MDXEditorMethods>(null);

  const fetchResource = async (resourceId: string): Promise<Resource> => {
    return axios.get(`${baseUrl}/${resourceId}`).then(response => {
      setResource(response.data);
      return response.data;
    }).catch(error => {
      throw error;
    })
  }

  React.useEffect(() => {
    if (resourceId) {
      fetchResource(resourceId);
    }
  }, [namespace, resourceId])

  const handleEditOrSave = () => {
    if (!resourceId) {
      throw new Error("Resource id is required");
    }
    if (editMode) {
      const content = mdxRef.current?.getMarkdown();
      console.log(content);
      setEditMode(false);
    } else {
      setEditMode(true);
    }
  }

  const editorClassName = React.useMemo(() => {
    const classList = window.document.documentElement.classList
    console.log(classList);
    return ("light" in window.document.documentElement.classList ? "light-theme" : "dark-theme")
  }, [window.document.documentElement.classList])

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
            <NavActions payload={{editMode, handleEditOrSave}}/>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4">
          <div className="prose dark:prose-invert xl:prose-xl lg:prose-lg">

            {editMode ? <MDXEditor
              ref={mdxRef}
              className={editorClassName}
              markdown={resource?.content ?? ""}
              plugins={SELECTED_PLUGINS}
            /> : <Markdown>{resource?.content}</Markdown>}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
