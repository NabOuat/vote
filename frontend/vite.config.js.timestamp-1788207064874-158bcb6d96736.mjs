// vite.config.js
import { defineConfig } from "file:///C:/1%20-%20DEV.CI/vote/frontend/node_modules/vite/dist/node/index.js";
import react from "file:///C:/1%20-%20DEV.CI/vote/frontend/node_modules/@vitejs/plugin-react/dist/index.js";
var vite_config_default = defineConfig(({ mode }) => {
  return {
    plugins: [react()],
    server: {
      port: 5174,
      // distinct du frontend Congés (5173) pour pouvoir tourner en parallèle
      proxy: {
        // Le backend (vote-deg/server) monte ses routes sous /api/* (même
        // convention qu'en prod sur Vercel) — proxy direct, sans réécriture.
        "/api": {
          target: process.env.VITE_VOTE_API_TARGET ?? "http://localhost:4300",
          changeOrigin: true
        }
      }
    }
  };
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFwxIC0gREVWLkNJXFxcXHZvdGVcXFxcZnJvbnRlbmRcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkM6XFxcXDEgLSBERVYuQ0lcXFxcdm90ZVxcXFxmcm9udGVuZFxcXFx2aXRlLmNvbmZpZy5qc1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vQzovMSUyMC0lMjBERVYuQ0kvdm90ZS9mcm9udGVuZC92aXRlLmNvbmZpZy5qc1wiO2ltcG9ydCB7IGRlZmluZUNvbmZpZyB9IGZyb20gJ3ZpdGUnXHJcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCdcclxuXHJcbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZygoeyBtb2RlIH0pID0+IHtcclxuICByZXR1cm4ge1xyXG4gICAgcGx1Z2luczogW3JlYWN0KCldLFxyXG4gICAgc2VydmVyOiB7XHJcbiAgICAgIHBvcnQ6IDUxNzQsIC8vIGRpc3RpbmN0IGR1IGZyb250ZW5kIENvbmdcdTAwRTlzICg1MTczKSBwb3VyIHBvdXZvaXIgdG91cm5lciBlbiBwYXJhbGxcdTAwRThsZVxyXG4gICAgICBwcm94eToge1xyXG4gICAgICAgIC8vIExlIGJhY2tlbmQgKHZvdGUtZGVnL3NlcnZlcikgbW9udGUgc2VzIHJvdXRlcyBzb3VzIC9hcGkvKiAobVx1MDBFQW1lXHJcbiAgICAgICAgLy8gY29udmVudGlvbiBxdSdlbiBwcm9kIHN1ciBWZXJjZWwpIFx1MjAxNCBwcm94eSBkaXJlY3QsIHNhbnMgclx1MDBFOVx1MDBFOWNyaXR1cmUuXHJcbiAgICAgICAgJy9hcGknOiB7XHJcbiAgICAgICAgICB0YXJnZXQ6IHByb2Nlc3MuZW52LlZJVEVfVk9URV9BUElfVEFSR0VUID8/ICdodHRwOi8vbG9jYWxob3N0OjQzMDAnLFxyXG4gICAgICAgICAgY2hhbmdlT3JpZ2luOiB0cnVlLFxyXG4gICAgICAgIH0sXHJcbiAgICAgIH0sXHJcbiAgICB9LFxyXG4gIH1cclxufSlcclxuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUErUSxTQUFTLG9CQUFvQjtBQUM1UyxPQUFPLFdBQVc7QUFFbEIsSUFBTyxzQkFBUSxhQUFhLENBQUMsRUFBRSxLQUFLLE1BQU07QUFDeEMsU0FBTztBQUFBLElBQ0wsU0FBUyxDQUFDLE1BQU0sQ0FBQztBQUFBLElBQ2pCLFFBQVE7QUFBQSxNQUNOLE1BQU07QUFBQTtBQUFBLE1BQ04sT0FBTztBQUFBO0FBQUE7QUFBQSxRQUdMLFFBQVE7QUFBQSxVQUNOLFFBQVEsUUFBUSxJQUFJLHdCQUF3QjtBQUFBLFVBQzVDLGNBQWM7QUFBQSxRQUNoQjtBQUFBLE1BQ0Y7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
