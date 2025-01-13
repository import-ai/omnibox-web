import * as React from 'react';
import {createContext, useContext} from 'react';
import Vditor from "vditor";
import {type Resource} from "@/types/resource";
import {ResourceTree} from "@/types/resource-tree";

export type ResourceConditionType = "parent" | "resource";

export type ResourcesCondition = {
  resource: Resource,
  type: ResourceConditionType
}

export type EditorStateType = {
  title?: string,
  vditor?: Vditor
}

type GlobalContextProviderState = {
  editorState: {
    editor: EditorStateType,
    setEditor: React.Dispatch<React.SetStateAction<EditorStateType>>
  },
  treeState: {
    treeMap: Record<string, ResourceTree>,
    setTreeMap: React.Dispatch<React.SetStateAction<Record<string, ResourceTree>>>
  }
  resourcesConditionState: {
    resourcesCondition: ResourcesCondition[],
    setResourcesCondition: React.Dispatch<React.SetStateAction<ResourcesCondition[]>>
  }
}


const initialValue: GlobalContextProviderState = {
  editorState: {
    editor: {},
    setEditor: () => null
  },
  treeState: {
    treeMap: {},
    setTreeMap: () => null
  },
  resourcesConditionState: {
    resourcesCondition: [],
    setResourcesCondition: () => null
  }
}

const globalContext = createContext<GlobalContextProviderState>(initialValue);


export const useGlobalContext = (): GlobalContextProviderState => {
  const context = useContext(globalContext);
  if (context === undefined) {
    throw new Error('useResource must be used within a ResourceProvider');
  }
  return context;
};

export const GlobalContextProvider = ({children, ...props}: { children: React.ReactNode }) => {
  const [editor, setEditor] = React.useState<EditorStateType>({});
  const [resourcesCondition, setResourcesCondition] = React.useState<ResourcesCondition[]>([]);
  const [treeMap, setTreeMap] = React.useState<Record<string, ResourceTree>>({});

  const value = {
    editorState: {editor, setEditor},
    treeState: {treeMap, setTreeMap},
    resourcesConditionState: {resourcesCondition, setResourcesCondition}
  }

  return (
    <globalContext.Provider {...props} value={value}>
      {children}
    </globalContext.Provider>
  );
};
