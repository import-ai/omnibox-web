import {Moon, Sun, SunMoon} from "lucide-react"

import {Button} from "@/components/ui/button"
import {useTheme, type Theme} from "@/components/theme-provider"

export function ThemeToggle() {
  const {theme, setTheme} = useTheme()
  const themeOptions: Theme[] = ["system", "light", "dark"]

  const handleToggle = () => {
    const index = themeOptions.indexOf(theme);
    setTheme(themeOptions[(index + 1) % themeOptions.length])
  }

  const themeClass = (targetTheme: string) => {
    return (currentTheme: string) => {
      const opacity: string = currentTheme === targetTheme ? "100" : "0"
      return `h-[1.2rem] w-[1.2rem] transition-all transform opacity-${opacity} scale-${opacity}`
    }
  }

  return (
    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleToggle}>
      <SunMoon className={themeClass("system")(theme)}/>
      <Sun className={`absolute ${themeClass("light")(theme)}`}/>
      <Moon className={`absolute ${themeClass("dark")(theme)}`}/>
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}
