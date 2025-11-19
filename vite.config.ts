// vite.config.js

import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],

  // Mahaliy tarmoqdan kirish uchun asosiy qism shu yerda!
  server: {
    // 1. host: true ni qo'shing. Bu 0.0.0.0 ni ishlatishga majbur qiladi.
    host: true,

    // 2. Agar default port (5173 yoki 3000) band bo'lsa, o'zgartirishingiz mumkin:
    port: 5173, // Default port (yoki 3000, loyiha sozlamasiga qarab)

    // Ba'zida avtomatik ravishda brauzerni ochishni xohlamasligingiz mumkin.
    // open: true,
  },
});
