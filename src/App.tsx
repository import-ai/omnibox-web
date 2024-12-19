import {ThemeProvider} from "@/components/theme-provider";
import {ModeToggle} from "@/components/mode-toggle";
import Layout from "@/app/layout"

function App() {

  return (
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      <Layout>
        <ModeToggle></ModeToggle>
      </Layout>
    </ThemeProvider>
  )
}

export default App
