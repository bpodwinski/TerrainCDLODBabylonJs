import { defineConfig } from "vite";

export default defineConfig(({ mode }) => {
  return {
    base: "/terraincdlodbabylonjs/",
    resolve: {
      alias: {
        babylonjs:
          mode === "development" ? "babylonjs/babylon.max" : "babylonjs",
      },
    },
    build: {
      target: "esnext",
    },
  };
});
