import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0a0a0a",
        card: "#141414",
        edge: "#262626",
        lime: { DEFAULT: "#c6ff00", dim: "#9bc700" },
      },
    },
  },
  plugins: [],
};
export default config;
