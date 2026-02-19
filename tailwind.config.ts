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
        mono: ["JetBrains Mono", "SF Mono", "Fira Code", "monospace"],
      },
      colors: {
        navy: "#0F1B2D",
        "deep-blue": "#1B2A4A",
        "mid-blue": "#2D4A7A",
        accent: "#3B82F6",
        "accent-light": "#60A5FA",
        success: "#10B981",
        warning: "#F59E0B",
        danger: "#EF4444",
        muted: "#64748B",
        surface: "#F8FAFC",
        "surface-dark": "#0F172A",
        "card-bg": "#1E293B",
        "card-border": "#334155",
        "text-primary": "#F1F5F9",
        "text-muted": "#94A3B8",
      },
    },
  },
  plugins: [],
};

export default config;
