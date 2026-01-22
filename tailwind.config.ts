import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          dark: "#181b2c",
          DEFAULT: "#4f2d7f",
          light: "#6b3fa0",
        },
        card: {
          bg: "#d8d4d4",
          border: "#c5c1c1",
        },
        accent: {
          teal: "#2d8a8a",
          purple: "#4f2d7f",
        },
        results: {
          left: "#d3c8d6",
          right: "#ffffff",
        },
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "genie-gradient":
          "linear-gradient(135deg, #1a1d2e 0%, #2d2a4a 30%, #4a3a6a 60%, #6b4a8a 100%)",
      },
      animation: {
        "spin-star": "spin-star 1.1s linear infinite",
        "lamp-move": "lamp-move 1.2s infinite alternate cubic-bezier(.4,0,.2,1)",
        "fade-in": "fade-in 0.5s ease-out",
        "slide-up": "slide-up 0.5s ease-out",
      },
      keyframes: {
        "spin-star": {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        "lamp-move": {
          "0%": { transform: "translateY(0) rotate(-8deg)" },
          "50%": { transform: "translateY(-18px) rotate(8deg)" },
          "100%": { transform: "translateY(0) rotate(-8deg)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "slide-up": {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
