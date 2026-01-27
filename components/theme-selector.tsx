"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export function ThemeSelector() {
  const { theme, setTheme } = useTheme()

  return (
    <div className="flex items-center gap-2">
      <Sun className="h-4 w-4" />
      <Select value={theme} onValueChange={setTheme}>
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Select theme" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="light">Light</SelectItem>
          <SelectItem value="dark">Dark</SelectItem>
          <SelectItem value="system">System</SelectItem>
        </SelectContent>
      </Select>
      <Moon className="h-4 w-4" />
    </div>
  )
}
