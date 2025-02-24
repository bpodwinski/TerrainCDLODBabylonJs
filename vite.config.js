import { defineConfig } from "vite";

export default defineConfig(({ mode }) => {
  return {
    base: "/TerrainCDLODBabylonJs/",
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
