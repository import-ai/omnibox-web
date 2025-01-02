import * as React from "react";
import Vditor from "vditor";
import {VditorTheme} from "@/types/vditor";

export function Render({markdown, theme}: { markdown: string, theme: VditorTheme }) {
  const element = React.useRef<HTMLDivElement>(null);
  const [isRendered, setIsRendered] = React.useState<boolean>(false);

  React.useEffect(() => {
    if (element.current) {
      Vditor.preview(element.current, markdown, {
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
  }, [markdown, theme.theme, theme.contentTheme, theme.codeTheme])
  return (
    <div ref={element} hidden={!isRendered}></div>
  )
}