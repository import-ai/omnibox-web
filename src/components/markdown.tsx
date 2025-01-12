import * as React from "react";
import {useVditorTheme} from "@/hooks/use-vditor-theme";
import Vditor from "vditor";

export function Markdown({content}: { content: string }) {
  const element = React.useRef<HTMLDivElement>(null);
  const theme = useVditorTheme();

  React.useEffect(() => {
    if (element.current) {
      Vditor.preview(element.current, content, {
        theme: {
          current: theme.theme
        },
        mode: theme.contentTheme,
        hljs: {
          defaultLang: "plain",
          style: theme.codeTheme,
          lineNumber: true
        }
      }).then();
    }
  }, [content, theme])
  return (
    <div ref={element}/>
  )
}