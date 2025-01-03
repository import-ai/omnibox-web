import * as React from 'react';
import {createContext, useContext} from 'react';
import Vditor from "vditor";

type GlobalContextProviderState = {
  vditorState: {
    vditor?: Vditor,
    setVditor: React.Dispatch<React.SetStateAction<Vditor | undefined>>
  }
}

const initialValue: GlobalContextProviderState = {
  vditorState: {
    setVditor: () => null
  }
}

const globalContext = createContext<GlobalContextProviderState>(initialValue);


export const useGlobalContext = () => {
  const context = useContext(globalContext);
  if (context === undefined) {
    throw new Error('useResource must be used within a ResourceProvider');
  }
  return context;
};

export const GlobalContextProvider = ({children, ...props}: { children: React.ReactNode }) => {
  const [vditor, setVditor] = React.useState<Vditor>();

  const value = {
    vditorState: {vditor, setVditor}
  }

  return (
    <globalContext.Provider {...props} value={value}>
      {children}
    </globalContext.Provider>
  );
};
