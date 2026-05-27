import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ironman: { red: "#e2231a", dark: "#1a1a1a" },
      },
    },
  },
  plugins: [],
} satisfies Config;
