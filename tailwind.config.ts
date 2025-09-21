// tailwind.config.ts (ESM, safe for "type": "module")
import type { Config } from "tailwindcss";
import animatePlugin from "tailwindcss-animate";

const config: Config = {
  darkMode: "class", // use string form for compatibility
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
    "./app/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    // You do not need the 'spacing' line here.
    // Tailwind's default spacing scale is automatically included.
    extend: {
      colors: {
        border: "hsl(214.3 31.8% 91.4%)",
        ring: "hsl(210 40% 96.1%)",
        background: "hsl(0 0% 100%)",
        foreground: "hsl(222.2 47.4% 11.2%)",
      },
      animation: {
        "star-movement-bottom": "star-movement-bottom linear infinite alternate",
        "star-movement-top": "star-movement-top linear infinite alternate",
      },
      keyframes: {
        "star-movement-bottom": {
          "0%": { transform: "translate(0%, 0%)", opacity: "1" },
          "100%": { transform: "translate(-100%, 0%)", opacity: "0" },
        },
        "star-movement-top": {
          "0%": { transform: "translate(0%, 0%)", opacity: "1" },
          "100%": { transform: "translate(100%, 0%)", opacity: "0" },
        },
      },
      // If you are using a custom `--spacing` variable, you can define it here.
      spacing: {
        '--spacing': '1rem', // Example value
      },
    },
  },
  plugins: [animatePlugin],
};

export default config;
