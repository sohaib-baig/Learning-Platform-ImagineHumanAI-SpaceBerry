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
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: {
          DEFAULT: "#4e8cff",
          foreground: "#ffffff",
        },
        brand: {
          DEFAULT: "#55b7f5",
          50: "#e6f5fc",
          100: "#ccebf9",
          200: "#99d7f3",
          300: "#7cc7f7",
          400: "#66b8f5",
          500: "#55b7f5",
          600: "#2a9be0",
          700: "#1e7fc4",
          800: "#1563a8",
          900: "#0d478c",
        },
        blue: {
          50: "#e6f5fc",
          100: "#ccebf9",
          200: "#99d7f3",
          300: "#7cc7f7",
          400: "#66b8f5",
          500: "#55b7f5",
          600: "#2a9be0",
          700: "#1e7fc4",
          800: "#1563a8",
          900: "#0d478c",
        },
      },
      keyframes: {
        float1: {
          "0%": { transform: "translate(0, 0)" },
          "100%": { transform: "translate(50px, 50px)" },
        },
        float2: {
          "0%": { transform: "translate(0, 0)" },
          "100%": { transform: "translate(-50px, -30px)" },
        },
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        float1: "float1 10s infinite alternate",
        float2: "float2 12s infinite alternate",
        fadeIn: "fadeIn 0.5s ease-out",
      },
    },
  },
  plugins: [],
};
export default config;
