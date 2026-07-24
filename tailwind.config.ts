import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        court: {
          50: "#eefdf3",
          100: "#d6f9e2",
          200: "#b0f1ca",
          300: "#7ce4ac",
          400: "#43cf88",
          500: "#1fb46c",
          600: "#129256",
          700: "#117347",
          800: "#125b3b",
          900: "#104b32",
        },
        ball: {
          DEFAULT: "#d7f240",
          soft: "#e7f97d",
          deep: "#bcd521",
        },
        clay: "#d2683c",
        ink: "#0f172a",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 20px 45px -20px rgba(15, 23, 42, 0.35)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pop: {
          "0%": { transform: "scale(0.9)", opacity: "0" },
          "60%": { transform: "scale(1.03)" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.5s ease forwards",
        pop: "pop 0.35s ease forwards",
      },
    },
  },
  plugins: [],
};

export default config;
