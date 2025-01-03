import {ThemeProvider} from "@/components/provider/theme-provider.tsx";
import Dashboard from "@/app/dashboard"
import {HashRouter, Route, Routes} from "react-router"
import LoginPage from "@/app/login-page";
import {ResourceProvider} from "@/components/provider/resource-provider"
import {GlobalContextProvider} from "@/components/provider/context-provider.tsx";

function App() {

  return (
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      <HashRouter>
        <Routes>
          <Route path="/:namespace/:resourceId?" element={
            <ResourceProvider>
              <GlobalContextProvider>
                <Dashboard/>
              </GlobalContextProvider>
            </ResourceProvider>
          }/>
          <Route path="/login" element={<LoginPage/>}/>
        </Routes>
      </HashRouter>
    </ThemeProvider>
  )
}

export default App
