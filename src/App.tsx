import {ThemeProvider} from "@/components/theme-provider";
import Page from "@/app/page"
import {Route, Routes, HashRouter} from "react-router"
function App() {

  return (
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      <HashRouter>
        <Routes>
          <Route path="/:namespace/:resourceId?" element={<Page/>}/>
        </Routes>
      </HashRouter>
    </ThemeProvider>
  )
}

export default App
