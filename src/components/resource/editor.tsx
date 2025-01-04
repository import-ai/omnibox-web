import Vditor from "vditor";
import * as React from "react";
import axios from "axios";
import type {Resource} from "@/types/resource";
import {API_BASE_URL} from "@/constants";
import {useResource} from "@/components/provider/resource-provider";
import {useVditorTheme} from "@/hooks/use-vditor-theme"
import {useGlobalContext} from "@/components/provider/context-provider";
import {useParams} from "react-router";

export function Editor() {
  const domId: string = "md-editor"
  const {setResource} = useResource();
  const globalContext = useGlobalContext();
  const {vditor, setVditor} = globalContext.vditorState;
  const theme = useVditorTheme();
  const {resourceId} = useParams();

  React.useEffect(() => {
    if (!resourceId) {
      throw new Error("Resource ID is required");
    }

    axios.get(`${API_BASE_URL}/resources/${resourceId}`).then(response => {
      const resource: Resource = response.data;
      setResource(resource);
      const v = new Vditor(domId, {
        preview: {
          hljs: {
            defaultLang: "plain",
            lineNumber: true
          }
        },
        after: () => {
          v.setValue(resource.content ?? "");
          v.setTheme(theme.theme, theme.contentTheme, theme.codeTheme);
          setVditor(v);
        }
      });
    }).catch(error => {
      throw error
    })

    return () => {
      vditor?.destroy();
      setVditor(undefined);
    }
  }, [resourceId])

  return (
    <div id={domId} className="vditor vditor-reset"></div>
  )
}