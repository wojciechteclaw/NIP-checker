import { defineConfig } from "vite";

export default defineConfig({
  base: "/nip-checker/",
  server: {
    proxy: {
      "/api/ceidg": {
        target: "https://www.biznes.gov.pl",
        changeOrigin: true,
        secure: true,
        rewrite: (path: string) => path.replace(/^\/api\/ceidg/, "/pl/wyszukiwarka-firm/api/data-warehouse"),
      },
    },
  },
});
