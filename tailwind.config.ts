import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
      },
      colors: {
        "sidebar-bg": "#192819",
        "sidebar-hover": "#243824",
        "sidebar-active": "#2e4a2e",
        "sidebar-border": "#2a3f2a",
        green: "#22c55e",
        "green-dark": "#16a34a",
        "green-light": "#bbf7d0",
        "green-faint": "#f0fdf4",
        "content-bg": "#f0f4f0",
        "card-bg": "#ffffff",
        "card-border": "#e2e8e2",
        success: "#16a34a",
        warning: "#d97706",
        danger: "#dc2626",
        accent: "#2563eb",
        "text-primary": "#111827",
        "text-muted": "#6b7280",
        "text-light": "#9ca3af",
      },
    },
  },
  plugins: [],
};

export default config;
