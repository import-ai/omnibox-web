import {ThemeProvider} from "@/components/provider/theme-provider";
import {HashRouter, Outlet, Route, Routes} from "react-router"
import LoginPage from "@/app/login-page";
import {ResourceProvider} from "@/components/provider/resource-provider"
import {GlobalContextProvider} from "@/components/provider/global-context-provider";
import {ResourcePage} from "@/app/resource-page";
import {Render} from "@/components/resource/render";
import {Editor} from "@/components/resource/editor";
import {Chat} from "@/app/chat"
import {MainSidebar} from "@/components/sidebar/main-sidebar";
import {SidebarProvider} from "@/components/ui/sidebar";

function App() {

  return (
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      <GlobalContextProvider>
        <HashRouter>
          <Routes>
            <Route path=":namespace" element={
              <ResourceProvider>
                <SidebarProvider>
                  <MainSidebar/>
                  <Outlet/>
                </SidebarProvider>
              </ResourceProvider>
            }>
              <Route index element={<Chat/>}/>
              <Route path=":resourceId" element={<ResourcePage/>}>
                <Route index element={<Render/>}/>
                <Route path="edit" element={<Editor/>}/>
              </Route>
            </Route>
            <Route path="login" element={<LoginPage/>}/>
          </Routes>
        </HashRouter>
      </GlobalContextProvider>
    </ThemeProvider>
  )
}

export default App;
