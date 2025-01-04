import {useResource} from "@/components/provider/resource-provider";
import {Markdown} from "@/components/markdown.tsx";

export function Render() {
  const {resource} = useResource();
  return (
    <Markdown content={resource?.content || ""}/>
  )
}