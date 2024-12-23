import {ThemeProvider} from "@/components/theme-provider";
import Dashboard from "@/app/dashboard"
import {Route, Routes, HashRouter} from "react-router"
import LoginPage from "@/app/login-page";

function App() {

  return (
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      <HashRouter>
        <Routes>
          <Route path="/:namespace/:resourceId?" element={<Dashboard/>}/>
          <Route path="/login" element={<LoginPage/>}/>
        </Routes>
      </HashRouter>
    </ThemeProvider>
  )
}

export default App
