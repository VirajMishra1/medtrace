/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        "bg-primary": "#0a0a0f",
        "bg-card": "#12121a",
        "bg-elevated": "#1a1a26",
        "border-subtle": "#1e1e2e",
        "border-default": "#2a2a3e",
        "accent-indigo": "#6366f1",
        "accent-violet": "#8b5cf6",
        "severity-critical": "#ef4444",
        "severity-warning": "#f59e0b",
        "severity-safe": "#10b981",
        "severity-info": "#3b82f6",
        "text-primary": "#e2e8f0",
        "text-muted": "#64748b",
        "conf-high": "#10b981",
        "conf-medium": "#f59e0b",
        "conf-low": "#ef4444",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["'JetBrains Mono'", "'Fira Code'", "monospace"],
      },
    },
  },
  plugins: [],
};

