import Vditor from "vditor";
import * as React from "react";
import axios from "axios";
import type {Resource} from "@/types/resource.tsx";
import {VditorTheme} from "@/types/vditor";
import {API_BASE_URL} from "@/constants";

export function Editor({resourceId, vd, setVd, theme}: {
  resourceId: string | undefined,
  vd: Vditor | undefined,
  setVd: React.Dispatch<React.SetStateAction<Vditor | undefined>>,
  theme: VditorTheme
}) {
  const domId: string = "md-editor"

  const setVditorTheme = (v: Vditor | undefined, theme: VditorTheme) => {
    v?.setTheme(theme.theme, theme.contentTheme, theme.codeTheme);
  };

  React.useEffect(() => setVditorTheme(vd, theme), [theme.theme, theme.contentTheme, theme.codeTheme]);

  React.useEffect(() => {
    if (!resourceId) {
      throw new Error("Resource ID is required");
    }

    axios.get(`${API_BASE_URL}/${resourceId}`).then(response => {
      const resource: Resource = response.data;
      const v = new Vditor(domId, {
        preview: {
          hljs: {
            defaultLang: "plain",
            lineNumber: true
          }
        },
        after: () => {
          v.setValue(resource.content ?? "");
          setVditorTheme(v, theme);
          setVd(v);
        },
      });
    }).catch(error => {
      throw error
    })

    return () => {
      vd?.destroy();
      setVd(undefined);
    }
  }, [resourceId])

  return (
    <div id={domId} className="vditor vditor-reset"></div>
  )
}