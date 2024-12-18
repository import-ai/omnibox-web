import {useState} from 'react'
import './App.css'
import {Button} from "@/components/ui/button";
import {ThemeProvider} from "@/components/theme-provider";
import {ModeToggle} from "@/components/mode-toggle.tsx";
import Layout from "@/app/layout"

function App() {
  const [count, setCount] = useState(0)

  return (
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      <Layout>
        <ModeToggle></ModeToggle>
        <div>
          <Button onClick={() => setCount((count) => count + 1)}>
            count is {count}
          </Button>
        </div>
      </Layout>
    </ThemeProvider>
  )
}

export default App
