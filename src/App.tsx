import { Chat } from "@/app/chat";
import LoginPage from "@/app/login-page";
import { ResourcePage } from "@/app/resource-page";
import { NamespaceBase } from "@/components/namespace-base";
import { GlobalContextProvider } from "@/components/provider/global-context-provider";
import { ThemeProvider } from "@/components/provider/theme-provider";
import { Editor } from "@/components/resource/editor";
import { Render } from "@/components/resource/render";
import { DevTools } from "jotai-devtools";
import { HashRouter, Route, Routes } from "react-router";
import "jotai-devtools/styles.css";

function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      <GlobalContextProvider>
        <HashRouter>
          <Routes>
            <Route path=":namespace" element={<NamespaceBase />}>
              <Route index element={<Chat />} />
              <Route path=":resourceId" element={<ResourcePage />}>
                <Route index element={<Render />} />
                <Route path="edit" element={<Editor />} />
              </Route>
            </Route>
            <Route path="login" element={<LoginPage />} />
          </Routes>
        </HashRouter>
        <DevTools />
      </GlobalContextProvider>
    </ThemeProvider>
  );
}

export default App;
