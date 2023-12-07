"use client"
import { ThemeProvider as NextThemeProvider } from "next-themes"

const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
	return (
		<NextThemeProvider enableSystem={true} attribute="class">
			{children}
		</NextThemeProvider>
	)
}

export default ThemeProvider