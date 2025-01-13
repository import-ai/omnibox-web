import * as React from "react"
import axios from "axios";
import {ChevronRight, Command, File, Folder, MoreHorizontal, Sparkles} from "lucide-react"
import {Link, useNavigate, useParams} from "react-router";

import {Collapsible, CollapsibleContent, CollapsibleTrigger,} from "@/components/ui/collapsible"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarRail,
} from "@/components/ui/sidebar"
import {Resource, ResourceType, SpaceType} from "@/types/resource"
import {DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger} from "@/components/ui/dropdown-menu";
import {useResource} from "@/components/provider/resource-provider";
import {NamespaceSwitcher} from "@/components/sidebar/namespace-switcher";
import {NavMain} from "@/components/sidebar/nav-main";
import {ResourceConditionType, useGlobalContext} from "@/components/provider/global-context-provider";
import {ResourceTree, ResourceTreeNode} from "@/types/resource-tree.tsx";


const baseUrl = "/api/v1/resources"
const spaceTypes: SpaceType[] = ["private", "teamspace"]

export function MainSidebar() {
  const {namespace} = useParams();
  const {resource} = useResource();
  const {treeMap, setTreeMap} = useGlobalContext().treeState;
  const navigate = useNavigate();

  if (!namespace) {
    throw new Error("namespace is required");
  }

  const createResource = async (namespace: string, spaceType: string, parentId: string, resourceType: ResourceType) => {
    axios.post(baseUrl, {namespace, spaceType, parentId, resourceType}).then(
      response => {
        const createdResource: Resource = response.data;
        const tree = treeMap[spaceType];
        tree.getOrFetch(parentId).then(() => {
          tree.put(createdResource);
          setTreeMap((prev) => ({...prev, [spaceType]: tree}));
          if (resourceType === "file") {
            navigate(`${createdResource.id}/edit`);
          }
        });
      }
    ).catch(error => {
      console.error({error});
      throw error;
    });
  };

  const deleteResource = (r: Resource, spaceType: SpaceType) => {
    const tree = treeMap[spaceType];
    tree.delete(r.id).then(() => {
      if (!tree.get(resource?.id ?? "")) {
        navigate(".");
      }
    }).catch(error => {
      console.error({error});
      throw error;
    });
  }

  React.useEffect(() => {
    if (resource) {
      const tree = treeMap[resource.spaceType];
      tree.expand(resource.id, true);
    }
  }, [resource])

  React.useEffect(() => {
    for (const spaceType of spaceTypes) {
      const tree = new ResourceTree(namespace, spaceType);
      tree.init().then(() =>
        setTreeMap((prev) => ({...prev, [spaceType]: tree}))
      );
    }

    return () => {
      for (const setter of [setTreeMap]) {
        setter({});
      }
    }
  }, [namespace]);


  function ResourceDropdownMenu({res, st}: { res: Resource, st: SpaceType }) {
    const globalContext = useGlobalContext();
    const {resourcesCondition, setResourcesCondition} = globalContext.resourcesConditionState;
    const navigate = useNavigate();
    const addToChatContext = (r: Resource, type: ResourceConditionType) => {
      if (!resourcesCondition.some((rc) => rc.resource.id === r.id && rc.type === type)) {
        setResourcesCondition((prev) => ([...prev, {resource: r, type}]));
      }
      navigate("./");
    }

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <SidebarMenuAction>
            <MoreHorizontal/>
          </SidebarMenuAction>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="right" align="start">
          <DropdownMenuItem onClick={() => createResource(namespace ?? "", res.spaceType, res.id, "file")}>
            Create File
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => createResource(namespace ?? "", res.spaceType, res.id, "folder")}>
            Create Folder
          </DropdownMenuItem>
          {res.childCount > 0 && <DropdownMenuItem onClick={() => addToChatContext(res, "parent")}>
            Add all to Context
          </DropdownMenuItem>}
          <DropdownMenuItem onClick={() => addToChatContext(res, "resource")}>
            Add it to Context
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => deleteResource(res, st)}>
            Delete
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate(`${res.id}/edit`)}>
            Edit
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  function TreeView({node}: { node: ResourceTreeNode }) {
    if (node.resource.childCount > 0) {
      return (
        <SidebarMenuItem>
          <Collapsible
            className="group/collapsible [&[data-state=open]>div>a>svg:first-child]:rotate-90"
            open={node.isExpanded}
          >
            <CollapsibleTrigger asChild>
              <div>
                <SidebarMenuButton asChild isActive={node.resource.id == resource?.id}>
                  <Link to={node.resource.id}>
                    <ChevronRight className="transition-transform" onClick={
                      (event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        treeMap[node.resource.spaceType].expandToggle(node.resource.id).then();
                      }
                    }/>
                    {node.resource.resourceType === "folder" ? <Folder/> : <File/>}
                    <span className="truncate">{node.resource.name ?? "Untitled"}</span>
                  </Link>
                </SidebarMenuButton>
                <ResourceDropdownMenu res={node.resource} st={node.resource.spaceType}/>
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarMenuSub>
                {node.children.map((n: ResourceTreeNode) => (
                  <TreeView key={n.resource.id} node={n}/>
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
        <SidebarMenuButton className="data-[active=true]:bg-transparent" isActive={node.resource.id == resource?.id} asChild>
          <Link to={node.resource.id}><File/><span className="truncate">{node.resource.name ?? "Untitled"}</span></Link>
        </SidebarMenuButton>
        <ResourceDropdownMenu res={node.resource} st={node.resource.spaceType}/>
      </SidebarMenuItem>
    )
  }

  function Space({spaceType, namespace}: { spaceType: SpaceType, namespace: string }) {
    const spaceTitle = `${spaceType.charAt(0).toUpperCase()}${spaceType.slice(1)}`
    return (
      <SidebarGroup>
        <div className="flex items-center justify-between">
          <SidebarGroupLabel>{spaceTitle}</SidebarGroupLabel>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuAction className="my-1.5">
                <MoreHorizontal/>
              </SidebarMenuAction>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" align="start">
              <DropdownMenuItem
                onClick={() => createResource(namespace, spaceType, treeMap[spaceType].rootNode.resource.id, "file")}>
                Create File
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => createResource(namespace, spaceType, treeMap[spaceType].rootNode.resource.id, "folder")}>
                Create Folder
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <SidebarGroupContent>
          <SidebarMenu>
            {treeMap[spaceType].rootNode?.children.map((n) => (
              <TreeView key={n.resource.id} node={n}/>
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
        <NavMain items={[{title: "Chat", url: "./", icon: Sparkles}]}/>
      </SidebarHeader>
      <SidebarContent>
        {
          Object.values(treeMap).map((tree, index) => {
            console.log({tree});
            return (
              <Space key={index} spaceType={tree.spaceType} namespace={namespace}/>
            )
          })
        }
      </SidebarContent>
      <SidebarRail/>
    </Sidebar>
  )
}


