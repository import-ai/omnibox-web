import { ThemeProvider } from "@/components/provider/theme-provider";
import { HashRouter, Route, Routes } from "react-router";
import LoginPage from "@/app/login-page";
import { GlobalContextProvider } from "@/components/provider/global-context-provider";
import { ResourcePage } from "@/app/resource-page";
import { Render } from "@/components/resource/render";
import { Editor } from "@/components/resource/editor";
import { Chat } from "@/app/chat";
import { NamespaceBase } from "@/components/namespace-base";

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
      </GlobalContextProvider>
    </ThemeProvider>
  );
}

export default App;
