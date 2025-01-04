import * as React from "react";
import {useVditorTheme} from "@/hooks/use-vditor-theme.tsx";
import Vditor from "vditor";

export function Markdown({content}: { content: string }) {
  const element = React.useRef<HTMLDivElement>(null);
  const [isRendered, setIsRendered] = React.useState<boolean>(false);
  const theme = useVditorTheme();

  React.useEffect(() => {
    if (element.current && content) {
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
      }).then(() => setIsRendered(true));
    }
    return () => {
      setIsRendered(false);
    }
  }, [content, theme])
  return (
    <div ref={element} style={{display: isRendered ? "block" : "none"}}/>
  )
}