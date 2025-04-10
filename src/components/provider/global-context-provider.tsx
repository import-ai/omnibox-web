import * as React from 'react';
import { createContext, useContext } from 'react';
import type Vditor from 'vditor';
import type { Resource } from '@/types/resource';

export type ResourceConditionType = 'parent' | 'resource';

export type ResourcesCondition = {
  resource: Resource;
  type: ResourceConditionType;
};

export type EditorStateType = {
  title?: string;
  vditor?: Vditor;
};

type GlobalContextProviderState = {
  editorState: {
    editor: EditorStateType;
    setEditor: React.Dispatch<React.SetStateAction<EditorStateType>>;
  };
  resourceTreeViewState: {
    child: Record<string, Resource[]>;
    setChild: React.Dispatch<React.SetStateAction<Record<string, Resource[]>>>;
  };
  resourcesConditionState: {
    resourcesCondition: ResourcesCondition[];
    setResourcesCondition: React.Dispatch<
      React.SetStateAction<ResourcesCondition[]>
    >;
  };
};

const initialValue: GlobalContextProviderState = {
  editorState: {
    editor: {},
    setEditor: () => null,
  },
  resourceTreeViewState: {
    child: {},
    setChild: () => null,
  },
  resourcesConditionState: {
    resourcesCondition: [],
    setResourcesCondition: () => null,
  },
};

const globalContext = createContext<GlobalContextProviderState>(initialValue);

export const useGlobalContext = (): GlobalContextProviderState => {
  const context = useContext(globalContext);
  if (context === undefined) {
    throw new Error('useResource must be used within a ResourceProvider');
  }
  return context;
};

export const GlobalContextProvider = ({
  children,
  ...props
}: {
  children: React.ReactNode;
}) => {
  const [editor, setEditor] = React.useState<EditorStateType>({});
  const [resourcesCondition, setResourcesCondition] = React.useState<
    ResourcesCondition[]
  >([]);
  const [child, setChild] = React.useState<Record<string, Resource[]>>({});

  const value = {
    editorState: { editor, setEditor },
    resourceTreeViewState: { child, setChild },
    resourcesConditionState: { resourcesCondition, setResourcesCondition },
  };

  return (
    <globalContext.Provider {...props} value={value}>
      {children}
    </globalContext.Provider>
  );
};
