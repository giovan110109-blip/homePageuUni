// vite.config.ts
import { fileURLToPath, URL } from "node:url";
import Uni from "file:///Users/giovan/Desktop/homePageUni/node_modules/.pnpm/@uni-helper+plugin-uni@0.1.0_@dcloudio+vite-plugin-uni@3.0.0-4080720251210001_@vueuse+c_0d26702c9719eeb89427a0dbce1f0f71/node_modules/@uni-helper/plugin-uni/src/index.js";
import Components from "file:///Users/giovan/Desktop/homePageUni/node_modules/.pnpm/@uni-helper+vite-plugin-uni-components@0.2.10_rollup@4.57.1/node_modules/@uni-helper/vite-plugin-uni-components/dist/index.mjs";
import { AnoResolver } from "file:///Users/giovan/Desktop/homePageUni/node_modules/.pnpm/@uni-helper+vite-plugin-uni-components@0.2.10_rollup@4.57.1/node_modules/@uni-helper/vite-plugin-uni-components/dist/resolvers.mjs";
import UnoCSS from "file:///Users/giovan/Desktop/homePageUni/node_modules/.pnpm/unocss@66.0.0_postcss@8.5.6_vite@5.2.8_@types+node@25.2.3_sass@1.64.2_terser@5.46.0__vue@3.4.21_typescript@5.9.3_/node_modules/unocss/dist/vite.mjs";
import { defineConfig } from "file:///Users/giovan/Desktop/homePageUni/node_modules/.pnpm/vite@5.2.8_@types+node@25.2.3_sass@1.64.2_terser@5.46.0/node_modules/vite/dist/node/index.js";
var __vite_injected_original_import_meta_url = "file:///Users/giovan/Desktop/homePageUni/vite.config.ts";
var vite_config_default = defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", __vite_injected_original_import_meta_url))
    }
  },
  plugins: [
    // https://uni-helper.js.org/vite-plugin-uni-components
    Components({
      dts: true,
      resolvers: [AnoResolver()]
    }),
    // https://uni-helper.js.org/plugin-uni
    Uni(),
    UnoCSS()
  ],
  build: {
    target: "es6",
    cssTarget: "chrome61"
  },
  optimizeDeps: {
    exclude: [
      "vue-demi"
    ]
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvVXNlcnMvZ2lvdmFuL0Rlc2t0b3AvaG9tZVBhZ2VVbmlcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIi9Vc2Vycy9naW92YW4vRGVza3RvcC9ob21lUGFnZVVuaS92aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vVXNlcnMvZ2lvdmFuL0Rlc2t0b3AvaG9tZVBhZ2VVbmkvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBmaWxlVVJMVG9QYXRoLCBVUkwgfSBmcm9tICdub2RlOnVybCdcblxuaW1wb3J0IFVuaSBmcm9tICdAdW5pLWhlbHBlci9wbHVnaW4tdW5pJ1xuaW1wb3J0IENvbXBvbmVudHMgZnJvbSAnQHVuaS1oZWxwZXIvdml0ZS1wbHVnaW4tdW5pLWNvbXBvbmVudHMnXG5pbXBvcnQgeyBBbm9SZXNvbHZlciB9IGZyb20gJ0B1bmktaGVscGVyL3ZpdGUtcGx1Z2luLXVuaS1jb21wb25lbnRzL3Jlc29sdmVycydcbmltcG9ydCBVbm9DU1MgZnJvbSAndW5vY3NzL3ZpdGUnXG5pbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJ1xuXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xuICByZXNvbHZlOiB7XG4gICAgYWxpYXM6IHtcbiAgICAgICdAJzogZmlsZVVSTFRvUGF0aChuZXcgVVJMKCcuL3NyYycsIGltcG9ydC5tZXRhLnVybCkpLFxuICAgIH0sXG4gIH0sXG4gIHBsdWdpbnM6IFtcbiAgICAvLyBodHRwczovL3VuaS1oZWxwZXIuanMub3JnL3ZpdGUtcGx1Z2luLXVuaS1jb21wb25lbnRzXG4gICAgQ29tcG9uZW50cyh7XG4gICAgICBkdHM6IHRydWUsXG4gICAgICByZXNvbHZlcnM6IFtBbm9SZXNvbHZlcigpXSxcbiAgICB9KSxcbiAgICAvLyBodHRwczovL3VuaS1oZWxwZXIuanMub3JnL3BsdWdpbi11bmlcbiAgICBVbmkoKSxcbiAgICBVbm9DU1MoKSxcbiAgXSxcbiAgYnVpbGQ6IHtcbiAgICB0YXJnZXQ6ICdlczYnLFxuICAgIGNzc1RhcmdldDogJ2Nocm9tZTYxJyxcbiAgfSxcbiAgb3B0aW1pemVEZXBzOiB7XG4gICAgZXhjbHVkZTogW1xuICAgICAgJ3Z1ZS1kZW1pJyxcbiAgICBdLFxuICB9LFxufSlcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBcVIsU0FBUyxlQUFlLFdBQVc7QUFFeFQsT0FBTyxTQUFTO0FBQ2hCLE9BQU8sZ0JBQWdCO0FBQ3ZCLFNBQVMsbUJBQW1CO0FBQzVCLE9BQU8sWUFBWTtBQUNuQixTQUFTLG9CQUFvQjtBQU42SSxJQUFNLDJDQUEyQztBQVEzTixJQUFPLHNCQUFRLGFBQWE7QUFBQSxFQUMxQixTQUFTO0FBQUEsSUFDUCxPQUFPO0FBQUEsTUFDTCxLQUFLLGNBQWMsSUFBSSxJQUFJLFNBQVMsd0NBQWUsQ0FBQztBQUFBLElBQ3REO0FBQUEsRUFDRjtBQUFBLEVBQ0EsU0FBUztBQUFBO0FBQUEsSUFFUCxXQUFXO0FBQUEsTUFDVCxLQUFLO0FBQUEsTUFDTCxXQUFXLENBQUMsWUFBWSxDQUFDO0FBQUEsSUFDM0IsQ0FBQztBQUFBO0FBQUEsSUFFRCxJQUFJO0FBQUEsSUFDSixPQUFPO0FBQUEsRUFDVDtBQUFBLEVBQ0EsT0FBTztBQUFBLElBQ0wsUUFBUTtBQUFBLElBQ1IsV0FBVztBQUFBLEVBQ2I7QUFBQSxFQUNBLGNBQWM7QUFBQSxJQUNaLFNBQVM7QUFBQSxNQUNQO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
