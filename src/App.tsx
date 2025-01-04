import {ThemeProvider} from "@/components/provider/theme-provider.tsx";
import Dashboard from "@/app/dashboard"
import {HashRouter, Route, Routes} from "react-router"
import LoginPage from "@/app/login-page";
import {ResourceProvider} from "@/components/provider/resource-provider"
import {GlobalContextProvider} from "@/components/provider/context-provider";
import {ResourcePage} from "@/app/resource-page";
import {Render} from "@/components/resource/render.tsx";
import {Editor} from "@/components/resource/editor.tsx";

function App() {

  return (
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      <GlobalContextProvider>
        <HashRouter>
          <Routes>
            <Route path="/:namespace" element={
              <ResourceProvider>
                <Dashboard/>
              </ResourceProvider>
            }>
              <Route index element={<div>Hello</div>}/>
              <Route path=":resourceId" element={<ResourcePage/>}>
                <Route index element={<Render/>}/>
                <Route path="edit" element={<Editor/>}/>
              </Route>
            </Route>
            <Route path="/login" element={<LoginPage/>}/>
          </Routes>
        </HashRouter>
      </GlobalContextProvider>
    </ThemeProvider>
  )
}

export default App
