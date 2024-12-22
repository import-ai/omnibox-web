import {ThemeProvider} from "@/components/theme-provider";
import Page from "@/app/page.tsx"

function App() {

  return (
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      <Page></Page>
    </ThemeProvider>
  )
}

export default App
