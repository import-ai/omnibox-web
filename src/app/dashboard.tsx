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

const baseUrl = "/api/v1/resources"
type VditorTheme = {
  theme: "dark" | "classic",
  contentTheme: "light" | "dark",
  codeTheme: "github" | "github-dark"
}

function Editor({resourceId, vd, setVd, theme}: {
  resourceId: string | undefined,
  vd: Vditor | undefined,
  setVd: React.Dispatch<React.SetStateAction<Vditor | undefined>>,
  theme: VditorTheme
}) {
  const domId: string = "md-editor"

  const setVditorTheme = (v: Vditor | undefined, theme: VditorTheme) => {
    v?.setTheme(theme.theme, theme.contentTheme, theme.codeTheme);
  };

  React.useEffect(() => setVditorTheme(vd, theme), [theme.theme, theme.contentTheme, theme.codeTheme]);

  React.useEffect(() => {
    if (!resourceId) {
      throw new Error("Resource ID is required");
    }

    axios.get(`${baseUrl}/${resourceId}`).then(response => {
      const resource: Resource = response.data;
      const v = new Vditor(domId, {
        preview: {
          hljs: {
            defaultLang: "plain",
            lineNumber: true
          }
        },
        after: () => {
          v.setValue(resource.content ?? "");
          setVditorTheme(v, theme);
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

function Render({markdown, theme}: { markdown: string, theme: VditorTheme }) {
  const element = React.useRef<HTMLDivElement>(null);
  const [isRendered, setIsRendered] = React.useState<boolean>(false);

  React.useEffect(() => {
    if (element.current) {
      Vditor.preview(element.current, markdown, {
        theme: {
          current: theme.theme
        },
        mode: theme.contentTheme,
        hljs: {
          defaultLang: "plain",
          style: theme.codeTheme,
          lineNumber: true
        }
      }).then(() => setIsRendered(true));
    }
    return () => {
      setIsRendered(false);
    }
  }, [markdown, theme.theme, theme.contentTheme, theme.codeTheme])
  return (
    <div ref={element} hidden={!isRendered}></div>
  )
}

export default function Dashboard() {
  const {namespace, resourceId} = useParams();
  const [resource, setResource] = React.useState<Resource>();
  const [isEditMode, setIsEditMode] = React.useState<boolean>(false);
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
      }).catch(error => {
        console.error(error);
      })
    }

    return () => {
      setIsEditMode(false);
      setResource(undefined);
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
              <Editor resourceId={resourceId} vd={vd} setVd={setVd} theme={vditorTheme}/> :
              (resource?.content ? <Render markdown={resource?.content} theme={vditorTheme}/> : <></>)
          }
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
