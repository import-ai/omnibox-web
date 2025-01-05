import * as React from 'react';
import {createContext, useContext} from 'react';
import Vditor from "vditor";
import {type Resource} from "@/types/resource";

export type ResourceConditionType = "parent" | "resource";

export type ResourcesCondition = {
  resource: Resource,
  type: ResourceConditionType
}

type GlobalContextProviderState = {
  vditorState: {
    vditor?: Vditor,
    setVditor: React.Dispatch<React.SetStateAction<Vditor | undefined>>
  },
  resourcesConditionState: {
    resourcesCondition: ResourcesCondition[],
    setResourcesCondition: React.Dispatch<React.SetStateAction<ResourcesCondition[]>>
  }
}


const initialValue: GlobalContextProviderState = {
  vditorState: {
    setVditor: () => null
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
  const [vditor, setVditor] = React.useState<Vditor>();
  const [resourcesCondition, setResourcesCondition] = React.useState<ResourcesCondition[]>([]);

  const value = {
    vditorState: {vditor, setVditor},
    resourcesConditionState: {resourcesCondition, setResourcesCondition}
  }

  return (
    <globalContext.Provider {...props} value={value}>
      {children}
    </globalContext.Provider>
  );
};
