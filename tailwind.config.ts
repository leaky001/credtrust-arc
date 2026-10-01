import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    screens: {
      xs: "480px",   // Large mobile
      sm: "640px",   // Tablet+
      md: "768px",
      lg: "1024px",  // Desktop+
      xl: "1280px",
      "2xl": "1440px", // Wide (design system)
    },
    extend: {
      colors: {
        primary: {
          50: "#F0FDF8",
          100: "#DCFCE7",
          200: "#BBF7D0",
          300: "#7DE2B1",
          400: "#34D399",
          500: "hsl(var(--primary))",
          600: "#1FA774",
          700: "#123C3A",
          800: "#0E2F2D",
          900: "#0B1F26",
        },
        accent: {
          300: "#A7F3D0",
          400: "#7DE2B1",
          500: "hsl(var(--accent))",
          600: "#1FA774",
          700: "#123C3A",
        },
        brand: {
          deep: "#0B1F26",
          teal: "#123C3A",
          emerald: "#1FA774",
          mint: "#7DE2B1",
          warm: "#F7F8F5",
          text: "#102A2A",
          muted: "#6B7C78",
        },
        gray: {
          50: "hsl(210 40% 98%)",
          100: "hsl(210 40% 96.1%)",
          200: "hsl(var(--border))",
          300: "hsl(214.3 31.8% 91.4%)",
          400: "hsl(215.4 16.3% 46.9%)",
          500: "hsl(var(--text-muted))",
          600: "hsl(var(--text-muted))",
          700: "hsl(215 20.2% 65.1%)",
          800: "hsl(217.2 32.6% 17.5%)",
          900: "hsl(var(--text-main))",
        },
        success: "#10B981",
        warning: "#F59E0B",
        error: "#EF4444",
        info: "#3B82F6",
        background: "hsl(var(--background))",
        surface: "hsl(var(--surface))",
        "surface-secondary": "hsl(var(--surface-secondary))",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      fontSize: {
        display: ["48px", { lineHeight: "1.1", letterSpacing: "-0.02em" }],
        h1: ["36px", { lineHeight: "1.2", letterSpacing: "-0.02em" }],
        h2: ["30px", { lineHeight: "1.3", letterSpacing: "-0.01em" }],
        h3: ["24px", { lineHeight: "1.4" }],
        h4: ["20px", { lineHeight: "1.5" }],
        "body-lg": ["18px", { lineHeight: "1.6" }],
        body: ["16px", { lineHeight: "1.6" }],
        small: ["14px", { lineHeight: "1.6" }],
        caption: ["12px", { lineHeight: "1.6" }],
      },
      spacing: {
        4.5: "18px",
        18: "72px",
      },
      borderRadius: {
        sm: "8px",
        DEFAULT: "16px",
        lg: "24px",
        full: "999px",
      },
      boxShadow: {
        "elevation-1": "0 1px 3px 0 rgb(0 0 0 / 0.05)",
        "elevation-2": "0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.05)",
        "elevation-3": "0 10px 15px -3px rgb(0 0 0 / 0.05)",
        "elevation-4": "0 20px 25px -5px rgb(0 0 0 / 0.05)",
        "glow-primary": "0 4px 20px -2px rgba(31, 167, 116, 0.22)",
        "glow-accent": "0 4px 20px -2px rgba(125, 226, 177, 0.22)",
      },
      animation: {
        "float": "float 6s ease-in-out infinite",
        "pulse-glow": "pulse-glow 4s ease-in-out infinite",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-20px)" },
        },
        "pulse-glow": {
          "0%, 100%": { opacity: "0.5", transform: "scale(1)" },
          "50%": { opacity: "1", transform: "scale(1.05)" },
        }
      },
      maxWidth: {
        "container-sm": "640px",
        "container-md": "768px",
        "container-lg": "1024px",
        "container-xl": "1280px",
      },
      transitionDuration: {
        fast: "150ms",
        normal: "250ms",
        slow: "400ms",
      },
    },
  },
  plugins: [],
};

export default config;
