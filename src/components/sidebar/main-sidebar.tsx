import * as React from "react"
import axios from "axios";
import {ChevronRight, Command, File, Folder, MoreHorizontal, Search} from "lucide-react"
import {Link, useNavigate, useParams} from "react-router";

import {Collapsible, CollapsibleContent, CollapsibleTrigger,} from "@/components/ui/collapsible"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel, SidebarHeader,
  SidebarMenu, SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarRail,
} from "@/components/ui/sidebar"
import {Resource} from "@/types/resource"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {useResource} from "@/components/provider/resource-provider";
import {NamespaceSwitcher} from "@/components/sidebar/namespace-switcher";
import {NavMain} from "@/components/sidebar/nav-main";


const baseUrl = "/api/v1/resources"
const spaceTypes = ["private", "teamspace"]

function ResourceDropdownMenu({res}: { res: Resource }) {
  const navigate = useNavigate();
  const chatWithParent = (r: Resource) => {
    navigate("./", {state: {parents: [r]}});
  }

  const chat = (r: Resource) => {
    navigate("./", {state: {resources: [r]}});
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <SidebarMenuAction>
          <MoreHorizontal/>
        </SidebarMenuAction>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="right" align="start">
        <DropdownMenuItem>
          Create
        </DropdownMenuItem>
        {res.childCount > 0 && <DropdownMenuItem onClick={() => chatWithParent(res)}>
          Chat with Dir
        </DropdownMenuItem>}
        <DropdownMenuItem onClick={() => chat(res)}>
          Chat
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function MainSidebar() {
  const [rootResourceId, setRootResourceId] = React.useState<Record<string, string>>({});
  const [isExpanded, setIsExpanded] = React.useState<Record<string, boolean>>({});  // key: resourceId
  const [child, setChild] = React.useState<Record<string, Resource[]>>({});  // resourceId -> Resource[]
  const {namespace} = useParams();
  const {resource} = useResource();

  if (!namespace) {
    throw new Error("namespace is required");
  }

  const updateChild = (resourceId: string, resources: Resource[]) => {
    setChild((prev) => ({...prev, [resourceId]: resources}));
    if (!(resourceId in isExpanded)) {
      setIsExpanded((prev) => ({...prev, [resourceId]: false}));
    }
  };

  const expandToRoot = (resource: Resource) => {
    if (resource.parentId != rootResourceId[resource.spaceType] && !isExpanded[resource.parentId]) {
      fetchChild(namespace, resource.spaceType, resource.parentId).then(() => {
        setIsExpanded((prev) => ({...prev, [resource.parentId]: true}));
        axios.get(`${baseUrl}/${resource.parentId}`).then((response) => {
          expandToRoot(response.data);
        })
      })
    }
  }

  React.useEffect(() => {
    if (resource) {
      expandToRoot(resource);
    }
  }, [resource])

  React.useEffect(() => {
    for (const spaceType of spaceTypes) {
      axios.get(baseUrl, {params: {namespace, spaceType}}).then(response => {
        const resources: Resource[] = response.data;
        if (resources.length > 0) {
          const parentId = resources[0].parentId;
          updateChild(parentId, resources);
          setRootResourceId((prev) => ({...prev, [spaceType]: parentId}));
        }
      })
    }

    return () => {
      for (const setter of [setRootResourceId, setIsExpanded, setChild]) {
        setter({});
      }
    }
  }, [namespace]);

  const expandToggle = (resourceId: string) => {
    setIsExpanded((prev) => ({...prev, [resourceId]: !prev[resourceId]}));
  }

  const fetchChild = async (namespace: string, spaceType: string, parentId: string) => {
    if (!(parentId in child)) {
      axios.get(baseUrl, {params: {namespace, spaceType, parentId}}).then(response => {
        const childData: Resource[] = response.data;
        setChild((prev) => ({
          ...prev,
          [parentId]: childData,
        }));
      })
    }
  }

  function Tree({namespace, spaceType, res}: { namespace: string, spaceType: string, res: Resource }) {
    if (res.childCount > 0) {
      return (
        <SidebarMenuItem>
          <Collapsible
            className="group/collapsible [&[data-state=open]>div>a>svg:first-child]:rotate-90"
            open={isExpanded[res.id]}
          >
            <CollapsibleTrigger asChild>
              <div>
                <SidebarMenuButton asChild isActive={res.id == resource?.id}>
                  <Link to={`/${namespace}/${res.id}`}>
                    <ChevronRight className="transition-transform" onClick={
                      (event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        fetchChild(namespace, spaceType, res.id).then(() => expandToggle(res.id));
                      }
                    }/>
                    {res.resourceType === "folder" ? <Folder/> : <File/>}
                    {res.name}
                  </Link>
                </SidebarMenuButton>
                <ResourceDropdownMenu res={res}/>
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarMenuSub>
                {(child[res.id] ?? []).length > 0 &&
                  child[res.id].map((r: Resource) => (
                    <Tree key={r.id} res={r} namespace={namespace} spaceType={spaceType}/>
                  ))
                }
              </SidebarMenuSub>
            </CollapsibleContent>
          </Collapsible>
        </SidebarMenuItem>
      )
    }
    return (
      <SidebarMenuItem>
        <SidebarMenuButton className="data-[active=true]:bg-transparent" isActive={res.id == resource?.id} asChild>
          <Link to={`/${namespace}/${res.id}`}><File/>{res.name}</Link>
        </SidebarMenuButton>
        <ResourceDropdownMenu res={res}/>
      </SidebarMenuItem>
    )
  }

  function Space({spaceType, namespace}: { spaceType: string, namespace: string }) {
    const spaceTitle = `${spaceType.charAt(0).toUpperCase()}${spaceType.slice(1)}`
    return (
      <SidebarGroup>
        <SidebarGroupLabel>{spaceTitle}</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {(child[rootResourceId[spaceType]] ?? []).map((r) => (
              <Tree key={r.id} res={r} namespace={namespace} spaceType={spaceType}/>
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    )
  }

  return (
    <Sidebar>
      <SidebarHeader>
        <NamespaceSwitcher namespaces={[{name: "test", logo: Command}]}/>
        <NavMain items={[{title: "Search", url: "./", icon: Search}]}/>
      </SidebarHeader>
      <SidebarContent>
        {spaceTypes.map((spaceType: string, index: number) => (
          <Space key={index} spaceType={spaceType} namespace={namespace}/>
        ))}
      </SidebarContent>
      <SidebarRail/>
    </Sidebar>
  )
}


