import { globalLoadingAtom } from "@/atoms";
import { useGlobalContext } from "@/components/provider/global-context-provider";
import { useResource } from "@/components/provider/resource-provider";
import { Input } from "@/components/ui/input.tsx";
import { API_BASE_URL } from "@/constants";
import { useVditorTheme } from "@/hooks/use-vditor-theme";
import type { Resource } from "@/types/resource";
import axios from "axios";
import { useSetAtom } from "jotai";
import * as React from "react";
import { useParams } from "react-router";
import Vditor from "vditor";

export function Editor() {
  const domId: string = "md-editor";
  const { setResource } = useResource();
  const globalContext = useGlobalContext();
  const { editor, setEditor } = globalContext.editorState;
  const theme = useVditorTheme();
  const { resourceId } = useParams();

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditor((prev) => ({ ...prev, title: e.target.value }));
  };
  const setIsLoading = useSetAtom(globalLoadingAtom);

  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  React.useEffect(() => {
    if (!resourceId) {
      throw new Error("Resource ID is required");
    }
    setIsLoading(true);
    axios
      .get(`${API_BASE_URL}/resources/${resourceId}`)
      .then((response) => {
        const resource: Resource = response.data;
        setResource(resource);
        const v = new Vditor(domId, {
          preview: {
            hljs: {
              defaultLang: "plain",
              lineNumber: true,
            },
          },
          after: () => {
            v.setValue(resource.content ?? "");
            v.setTheme(theme.theme, theme.contentTheme, theme.codeTheme);
            setEditor({ vditor: v, title: resource.name });
          },
        });
      })
      .catch((error) => {
        throw error;
      })
      .finally(() => {
        setIsLoading(false);
      });

    return () => {
      editor?.vditor?.destroy();
      setEditor({});
    };
  }, [resourceId]);

  return (
    <div>
      <Input
        type="text"
        value={globalContext.editorState.editor.title}
        onChange={handleTitleChange}
        placeholder="Enter title"
        className="mb-4 p-2 border rounded"
      />
      <div id={domId} className="vditor vditor-reset" />
    </div>
  );
}
