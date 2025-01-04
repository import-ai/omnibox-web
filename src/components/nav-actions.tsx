"use client"

import * as React from "react"
import {
  ArrowDown,
  ArrowUp,
  Bell,
  Copy,
  CornerUpLeft,
  CornerUpRight,
  FileText,
  GalleryVerticalEnd,
  LineChart,
  Link,
  MoreHorizontal,
  Pencil,
  PencilOff,
  Save,
  Settings2,
  Trash,
  Trash2
} from "lucide-react"

import {Button} from "@/components/ui/button"
import {Popover, PopoverContent, PopoverTrigger,} from "@/components/ui/popover"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import {ThemeToggle} from "@/components/theme-toggle";
import axios from "axios";
import {useGlobalContext} from "@/components/provider/context-provider";
import {API_BASE_URL} from "@/constants";
import {useParams, useNavigate} from "react-router";
import {useResource} from "@/components/provider/resource-provider.tsx";

const data = [
  [
    {
      label: "Customize Page",
      icon: Settings2,
    },
    {
      label: "Turn into wiki",
      icon: FileText,
    },
  ],
  [
    {
      label: "Copy Link",
      icon: Link,
    },
    {
      label: "Duplicate",
      icon: Copy,
    },
    {
      label: "Move to",
      icon: CornerUpRight,
    },
    {
      label: "Move to Trash",
      icon: Trash2,
    },
  ],
  [
    {
      label: "Undo",
      icon: CornerUpLeft,
    },
    {
      label: "View analytics",
      icon: LineChart,
    },
    {
      label: "Version History",
      icon: GalleryVerticalEnd,
    },
    {
      label: "Show delete pages",
      icon: Trash,
    },
    {
      label: "Notifications",
      icon: Bell,
    },
  ],
  [
    {
      label: "Import",
      icon: ArrowUp,
    },
    {
      label: "Export",
      icon: ArrowDown,
    },
  ],
]

export function NavActions() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = React.useState(false)
  const {resourceId} = useParams();
  const {setResource} = useResource();
  const globalContext = useGlobalContext();
  const vditor = globalContext.vditorState.vditor;

  const handleSave = () => {
      const content = vditor?.getValue();
      if (content) {
        axios.patch(`${API_BASE_URL}/resources/${resourceId}`, {content}).then(response => {
          const delta: Response = response.data;
          if (Object.values(delta).some(value => value !== undefined)) {
            setResource(prev => prev && {...prev, content});
          }
          navigate(".");
        })
      }
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      <div className="hidden font-medium text-muted-foreground md:inline-block">
        Edit Oct 08
      </div>
      <ThemeToggle/>
      {
        vditor ? <>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleSave}>
            <Save/>
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigate(".")}>
            <PencilOff/>
          </Button>
        </> : <>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigate("edit")}>
            <Pencil/>
          </Button>
        </>
      }
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 data-[state=open]:bg-accent"
          >
            <MoreHorizontal/>
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-56 overflow-hidden rounded-lg p-0"
          align="end"
        >
          <Sidebar collapsible="none" className="bg-transparent">
            <SidebarContent>
              {data.map((group, index) => (
                <SidebarGroup key={index} className="border-b last:border-none">
                  <SidebarGroupContent className="gap-0">
                    <SidebarMenu>
                      {group.map((item, index) => (
                        <SidebarMenuItem key={index}>
                          <SidebarMenuButton>
                            <item.icon/>
                            <span>{item.label}</span>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              ))}
            </SidebarContent>
          </Sidebar>
        </PopoverContent>
      </Popover>
    </div>
  )
}
