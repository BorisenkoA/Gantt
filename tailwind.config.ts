import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ["var(--font-display)"],
        body: ["var(--font-body)"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      colors: {
        ink: "#10151C",
        panel: "#171F2A",
        grid: "#263242",
        chalk: "#EDF1F5",
        steel: "#8996A6",
        cyan: "#4FC1D1",
        amber: "#E3A73D",
        violet: "#9B7FE0",
        green: "#63B37C",
        danger: "#E2604F",
      },
      boxShadow: {
        card: "0 1px 0 rgba(237,241,245,0.04), 0 6px 16px rgba(0,0,0,0.35)",
      },
    },
  },
  plugins: [],
};
export default config;
