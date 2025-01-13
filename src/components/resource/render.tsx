import {useResource} from "@/components/provider/resource-provider";
import {Markdown} from "@/components/markdown";
import * as React from "react";

export function Render() {
  const {resource} = useResource();

  const content = React.useMemo(() => {
    return "# " + (resource?.name || "Untitled") + "\n" + (resource?.content || "");
  }, [resource]);

  return (
    <Markdown content={content}/>
  )
}