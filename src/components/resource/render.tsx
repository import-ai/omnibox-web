import * as React from "react";
import Vditor from "vditor";
import {useResource} from "@/components/provider/resource-provider";
import {useVditorTheme} from "@/hooks/use-vditor-theme"

export function Render() {
  const element = React.useRef<HTMLDivElement>(null);
  const [isRendered, setIsRendered] = React.useState<boolean>(false);
  const {resource} = useResource();
  const theme = useVditorTheme();

  React.useEffect(() => {
    if (element.current && resource?.content) {
      Vditor.preview(element.current, resource.content, {
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
  }, [resource?.content, theme])
  return (
    <div ref={element} hidden={!isRendered}></div>
  )
}