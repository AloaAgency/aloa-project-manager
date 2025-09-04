"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
(() => {
var exports = {};
exports.id = "app/api/forms/debug/route";
exports.ids = ["app/api/forms/debug/route"];
exports.modules = {

/***/ "next/dist/compiled/next-server/app-route.runtime.dev.js":
/*!**************************************************************************!*\
  !*** external "next/dist/compiled/next-server/app-route.runtime.dev.js" ***!
  \**************************************************************************/
/***/ ((module) => {

module.exports = require("next/dist/compiled/next-server/app-route.runtime.dev.js");

/***/ }),

/***/ "http":
/*!***********************!*\
  !*** external "http" ***!
  \***********************/
/***/ ((module) => {

module.exports = require("http");

/***/ }),

/***/ "https":
/*!************************!*\
  !*** external "https" ***!
  \************************/
/***/ ((module) => {

module.exports = require("https");

/***/ }),

/***/ "punycode":
/*!***************************!*\
  !*** external "punycode" ***!
  \***************************/
/***/ ((module) => {

module.exports = require("punycode");

/***/ }),

/***/ "stream":
/*!*************************!*\
  !*** external "stream" ***!
  \*************************/
/***/ ((module) => {

module.exports = require("stream");

/***/ }),

/***/ "url":
/*!**********************!*\
  !*** external "url" ***!
  \**********************/
/***/ ((module) => {

module.exports = require("url");

/***/ }),

/***/ "zlib":
/*!***********************!*\
  !*** external "zlib" ***!
  \***********************/
/***/ ((module) => {

module.exports = require("zlib");

/***/ }),

/***/ "(rsc)/./node_modules/next/dist/build/webpack/loaders/next-app-loader.js?name=app%2Fapi%2Fforms%2Fdebug%2Froute&page=%2Fapi%2Fforms%2Fdebug%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fforms%2Fdebug%2Froute.js&appDir=%2FUsers%2Frosspalmer%2FRoss%20GitHub%20Projects%2Fcustom-forms%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Frosspalmer%2FRoss%20GitHub%20Projects%2Fcustom-forms&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!":
/*!*************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************!*\
  !*** ./node_modules/next/dist/build/webpack/loaders/next-app-loader.js?name=app%2Fapi%2Fforms%2Fdebug%2Froute&page=%2Fapi%2Fforms%2Fdebug%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fforms%2Fdebug%2Froute.js&appDir=%2FUsers%2Frosspalmer%2FRoss%20GitHub%20Projects%2Fcustom-forms%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Frosspalmer%2FRoss%20GitHub%20Projects%2Fcustom-forms&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D! ***!
  \*************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   headerHooks: () => (/* binding */ headerHooks),\n/* harmony export */   originalPathname: () => (/* binding */ originalPathname),\n/* harmony export */   patchFetch: () => (/* binding */ patchFetch),\n/* harmony export */   requestAsyncStorage: () => (/* binding */ requestAsyncStorage),\n/* harmony export */   routeModule: () => (/* binding */ routeModule),\n/* harmony export */   serverHooks: () => (/* binding */ serverHooks),\n/* harmony export */   staticGenerationAsyncStorage: () => (/* binding */ staticGenerationAsyncStorage),\n/* harmony export */   staticGenerationBailout: () => (/* binding */ staticGenerationBailout)\n/* harmony export */ });\n/* harmony import */ var next_dist_server_future_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! next/dist/server/future/route-modules/app-route/module.compiled */ \"(rsc)/./node_modules/next/dist/server/future/route-modules/app-route/module.compiled.js\");\n/* harmony import */ var next_dist_server_future_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_future_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var next_dist_server_future_route_kind__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! next/dist/server/future/route-kind */ \"(rsc)/./node_modules/next/dist/server/future/route-kind.js\");\n/* harmony import */ var next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! next/dist/server/lib/patch-fetch */ \"(rsc)/./node_modules/next/dist/server/lib/patch-fetch.js\");\n/* harmony import */ var next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__);\n/* harmony import */ var _Users_rosspalmer_Ross_GitHub_Projects_custom_forms_app_api_forms_debug_route_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./app/api/forms/debug/route.js */ \"(rsc)/./app/api/forms/debug/route.js\");\n\n\n\n\n// We inject the nextConfigOutput here so that we can use them in the route\n// module.\nconst nextConfigOutput = \"\"\nconst routeModule = new next_dist_server_future_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__.AppRouteRouteModule({\n    definition: {\n        kind: next_dist_server_future_route_kind__WEBPACK_IMPORTED_MODULE_1__.RouteKind.APP_ROUTE,\n        page: \"/api/forms/debug/route\",\n        pathname: \"/api/forms/debug\",\n        filename: \"route\",\n        bundlePath: \"app/api/forms/debug/route\"\n    },\n    resolvedPagePath: \"/Users/rosspalmer/Ross GitHub Projects/custom-forms/app/api/forms/debug/route.js\",\n    nextConfigOutput,\n    userland: _Users_rosspalmer_Ross_GitHub_Projects_custom_forms_app_api_forms_debug_route_js__WEBPACK_IMPORTED_MODULE_3__\n});\n// Pull out the exports that we need to expose from the module. This should\n// be eliminated when we've moved the other routes to the new format. These\n// are used to hook into the route.\nconst { requestAsyncStorage, staticGenerationAsyncStorage, serverHooks, headerHooks, staticGenerationBailout } = routeModule;\nconst originalPathname = \"/api/forms/debug/route\";\nfunction patchFetch() {\n    return (0,next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__.patchFetch)({\n        serverHooks,\n        staticGenerationAsyncStorage\n    });\n}\n\n\n//# sourceMappingURL=app-route.js.map//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9ub2RlX21vZHVsZXMvbmV4dC9kaXN0L2J1aWxkL3dlYnBhY2svbG9hZGVycy9uZXh0LWFwcC1sb2FkZXIuanM/bmFtZT1hcHAlMkZhcGklMkZmb3JtcyUyRmRlYnVnJTJGcm91dGUmcGFnZT0lMkZhcGklMkZmb3JtcyUyRmRlYnVnJTJGcm91dGUmYXBwUGF0aHM9JnBhZ2VQYXRoPXByaXZhdGUtbmV4dC1hcHAtZGlyJTJGYXBpJTJGZm9ybXMlMkZkZWJ1ZyUyRnJvdXRlLmpzJmFwcERpcj0lMkZVc2VycyUyRnJvc3NwYWxtZXIlMkZSb3NzJTIwR2l0SHViJTIwUHJvamVjdHMlMkZjdXN0b20tZm9ybXMlMkZhcHAmcGFnZUV4dGVuc2lvbnM9dHN4JnBhZ2VFeHRlbnNpb25zPXRzJnBhZ2VFeHRlbnNpb25zPWpzeCZwYWdlRXh0ZW5zaW9ucz1qcyZyb290RGlyPSUyRlVzZXJzJTJGcm9zc3BhbG1lciUyRlJvc3MlMjBHaXRIdWIlMjBQcm9qZWN0cyUyRmN1c3RvbS1mb3JtcyZpc0Rldj10cnVlJnRzY29uZmlnUGF0aD10c2NvbmZpZy5qc29uJmJhc2VQYXRoPSZhc3NldFByZWZpeD0mbmV4dENvbmZpZ091dHB1dD0mcHJlZmVycmVkUmVnaW9uPSZtaWRkbGV3YXJlQ29uZmlnPWUzMCUzRCEiLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBc0c7QUFDdkM7QUFDYztBQUNnQztBQUM3RztBQUNBO0FBQ0E7QUFDQSx3QkFBd0IsZ0hBQW1CO0FBQzNDO0FBQ0EsY0FBYyx5RUFBUztBQUN2QjtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUs7QUFDTDtBQUNBO0FBQ0EsWUFBWTtBQUNaLENBQUM7QUFDRDtBQUNBO0FBQ0E7QUFDQSxRQUFRLHVHQUF1RztBQUMvRztBQUNBO0FBQ0EsV0FBVyw0RUFBVztBQUN0QjtBQUNBO0FBQ0EsS0FBSztBQUNMO0FBQzZKOztBQUU3SiIsInNvdXJjZXMiOlsid2VicGFjazovL2N1c3RvbS1mb3Jtcy8/MDAzMiJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBBcHBSb3V0ZVJvdXRlTW9kdWxlIH0gZnJvbSBcIm5leHQvZGlzdC9zZXJ2ZXIvZnV0dXJlL3JvdXRlLW1vZHVsZXMvYXBwLXJvdXRlL21vZHVsZS5jb21waWxlZFwiO1xuaW1wb3J0IHsgUm91dGVLaW5kIH0gZnJvbSBcIm5leHQvZGlzdC9zZXJ2ZXIvZnV0dXJlL3JvdXRlLWtpbmRcIjtcbmltcG9ydCB7IHBhdGNoRmV0Y2ggYXMgX3BhdGNoRmV0Y2ggfSBmcm9tIFwibmV4dC9kaXN0L3NlcnZlci9saWIvcGF0Y2gtZmV0Y2hcIjtcbmltcG9ydCAqIGFzIHVzZXJsYW5kIGZyb20gXCIvVXNlcnMvcm9zc3BhbG1lci9Sb3NzIEdpdEh1YiBQcm9qZWN0cy9jdXN0b20tZm9ybXMvYXBwL2FwaS9mb3Jtcy9kZWJ1Zy9yb3V0ZS5qc1wiO1xuLy8gV2UgaW5qZWN0IHRoZSBuZXh0Q29uZmlnT3V0cHV0IGhlcmUgc28gdGhhdCB3ZSBjYW4gdXNlIHRoZW0gaW4gdGhlIHJvdXRlXG4vLyBtb2R1bGUuXG5jb25zdCBuZXh0Q29uZmlnT3V0cHV0ID0gXCJcIlxuY29uc3Qgcm91dGVNb2R1bGUgPSBuZXcgQXBwUm91dGVSb3V0ZU1vZHVsZSh7XG4gICAgZGVmaW5pdGlvbjoge1xuICAgICAgICBraW5kOiBSb3V0ZUtpbmQuQVBQX1JPVVRFLFxuICAgICAgICBwYWdlOiBcIi9hcGkvZm9ybXMvZGVidWcvcm91dGVcIixcbiAgICAgICAgcGF0aG5hbWU6IFwiL2FwaS9mb3Jtcy9kZWJ1Z1wiLFxuICAgICAgICBmaWxlbmFtZTogXCJyb3V0ZVwiLFxuICAgICAgICBidW5kbGVQYXRoOiBcImFwcC9hcGkvZm9ybXMvZGVidWcvcm91dGVcIlxuICAgIH0sXG4gICAgcmVzb2x2ZWRQYWdlUGF0aDogXCIvVXNlcnMvcm9zc3BhbG1lci9Sb3NzIEdpdEh1YiBQcm9qZWN0cy9jdXN0b20tZm9ybXMvYXBwL2FwaS9mb3Jtcy9kZWJ1Zy9yb3V0ZS5qc1wiLFxuICAgIG5leHRDb25maWdPdXRwdXQsXG4gICAgdXNlcmxhbmRcbn0pO1xuLy8gUHVsbCBvdXQgdGhlIGV4cG9ydHMgdGhhdCB3ZSBuZWVkIHRvIGV4cG9zZSBmcm9tIHRoZSBtb2R1bGUuIFRoaXMgc2hvdWxkXG4vLyBiZSBlbGltaW5hdGVkIHdoZW4gd2UndmUgbW92ZWQgdGhlIG90aGVyIHJvdXRlcyB0byB0aGUgbmV3IGZvcm1hdC4gVGhlc2Vcbi8vIGFyZSB1c2VkIHRvIGhvb2sgaW50byB0aGUgcm91dGUuXG5jb25zdCB7IHJlcXVlc3RBc3luY1N0b3JhZ2UsIHN0YXRpY0dlbmVyYXRpb25Bc3luY1N0b3JhZ2UsIHNlcnZlckhvb2tzLCBoZWFkZXJIb29rcywgc3RhdGljR2VuZXJhdGlvbkJhaWxvdXQgfSA9IHJvdXRlTW9kdWxlO1xuY29uc3Qgb3JpZ2luYWxQYXRobmFtZSA9IFwiL2FwaS9mb3Jtcy9kZWJ1Zy9yb3V0ZVwiO1xuZnVuY3Rpb24gcGF0Y2hGZXRjaCgpIHtcbiAgICByZXR1cm4gX3BhdGNoRmV0Y2goe1xuICAgICAgICBzZXJ2ZXJIb29rcyxcbiAgICAgICAgc3RhdGljR2VuZXJhdGlvbkFzeW5jU3RvcmFnZVxuICAgIH0pO1xufVxuZXhwb3J0IHsgcm91dGVNb2R1bGUsIHJlcXVlc3RBc3luY1N0b3JhZ2UsIHN0YXRpY0dlbmVyYXRpb25Bc3luY1N0b3JhZ2UsIHNlcnZlckhvb2tzLCBoZWFkZXJIb29rcywgc3RhdGljR2VuZXJhdGlvbkJhaWxvdXQsIG9yaWdpbmFsUGF0aG5hbWUsIHBhdGNoRmV0Y2gsICB9O1xuXG4vLyMgc291cmNlTWFwcGluZ1VSTD1hcHAtcm91dGUuanMubWFwIl0sIm5hbWVzIjpbXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///(rsc)/./node_modules/next/dist/build/webpack/loaders/next-app-loader.js?name=app%2Fapi%2Fforms%2Fdebug%2Froute&page=%2Fapi%2Fforms%2Fdebug%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fforms%2Fdebug%2Froute.js&appDir=%2FUsers%2Frosspalmer%2FRoss%20GitHub%20Projects%2Fcustom-forms%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Frosspalmer%2FRoss%20GitHub%20Projects%2Fcustom-forms&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!\n");

/***/ }),

/***/ "(rsc)/./app/api/forms/debug/route.js":
/*!**************************************!*\
  !*** ./app/api/forms/debug/route.js ***!
  \**************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   GET: () => (/* binding */ GET)\n/* harmony export */ });\n/* harmony import */ var next_dist_server_web_exports_next_response__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! next/dist/server/web/exports/next-response */ \"(rsc)/./node_modules/next/dist/server/web/exports/next-response.js\");\n/* harmony import */ var _lib_supabase__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @/lib/supabase */ \"(rsc)/./lib/supabase.js\");\n\n\nasync function GET() {\n    try {\n        // Fetch all forms to see their current URLs\n        const { data: forms, error } = await _lib_supabase__WEBPACK_IMPORTED_MODULE_1__.supabase.from(\"forms\").select(\"id, title, url_id, created_at, updated_at\").order(\"created_at\", {\n            ascending: false\n        });\n        if (error) throw error;\n        return next_dist_server_web_exports_next_response__WEBPACK_IMPORTED_MODULE_0__[\"default\"].json({\n            forms: forms.map((form)=>({\n                    id: form.id,\n                    title: form.title,\n                    url_id: form.url_id,\n                    form_url: `/forms/${form.url_id}`,\n                    created: form.created_at,\n                    updated: form.updated_at\n                }))\n        });\n    } catch (error) {\n        console.error(\"Error fetching forms:\", error);\n        return next_dist_server_web_exports_next_response__WEBPACK_IMPORTED_MODULE_0__[\"default\"].json({\n            error: \"Failed to fetch forms\"\n        }, {\n            status: 500\n        });\n    }\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9hcHAvYXBpL2Zvcm1zL2RlYnVnL3JvdXRlLmpzIiwibWFwcGluZ3MiOiI7Ozs7OztBQUEyQztBQUNEO0FBRW5DLGVBQWVFO0lBQ3BCLElBQUk7UUFDRiw0Q0FBNEM7UUFDNUMsTUFBTSxFQUFFQyxNQUFNQyxLQUFLLEVBQUVDLEtBQUssRUFBRSxHQUFHLE1BQU1KLG1EQUFRQSxDQUMxQ0ssSUFBSSxDQUFDLFNBQ0xDLE1BQU0sQ0FBQyw2Q0FDUEMsS0FBSyxDQUFDLGNBQWM7WUFBRUMsV0FBVztRQUFNO1FBRTFDLElBQUlKLE9BQU8sTUFBTUE7UUFFakIsT0FBT0wsa0ZBQVlBLENBQUNVLElBQUksQ0FBQztZQUN2Qk4sT0FBT0EsTUFBTU8sR0FBRyxDQUFDQyxDQUFBQSxPQUFTO29CQUN4QkMsSUFBSUQsS0FBS0MsRUFBRTtvQkFDWEMsT0FBT0YsS0FBS0UsS0FBSztvQkFDakJDLFFBQVFILEtBQUtHLE1BQU07b0JBQ25CQyxVQUFVLENBQUMsT0FBTyxFQUFFSixLQUFLRyxNQUFNLENBQUMsQ0FBQztvQkFDakNFLFNBQVNMLEtBQUtNLFVBQVU7b0JBQ3hCQyxTQUFTUCxLQUFLUSxVQUFVO2dCQUMxQjtRQUNGO0lBQ0YsRUFBRSxPQUFPZixPQUFPO1FBQ2RnQixRQUFRaEIsS0FBSyxDQUFDLHlCQUF5QkE7UUFDdkMsT0FBT0wsa0ZBQVlBLENBQUNVLElBQUksQ0FDdEI7WUFBRUwsT0FBTztRQUF3QixHQUNqQztZQUFFaUIsUUFBUTtRQUFJO0lBRWxCO0FBQ0YiLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly9jdXN0b20tZm9ybXMvLi9hcHAvYXBpL2Zvcm1zL2RlYnVnL3JvdXRlLmpzP2Y3NDUiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgTmV4dFJlc3BvbnNlIH0gZnJvbSAnbmV4dC9zZXJ2ZXInO1xuaW1wb3J0IHsgc3VwYWJhc2UgfSBmcm9tICdAL2xpYi9zdXBhYmFzZSc7XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBHRVQoKSB7XG4gIHRyeSB7XG4gICAgLy8gRmV0Y2ggYWxsIGZvcm1zIHRvIHNlZSB0aGVpciBjdXJyZW50IFVSTHNcbiAgICBjb25zdCB7IGRhdGE6IGZvcm1zLCBlcnJvciB9ID0gYXdhaXQgc3VwYWJhc2VcbiAgICAgIC5mcm9tKCdmb3JtcycpXG4gICAgICAuc2VsZWN0KCdpZCwgdGl0bGUsIHVybF9pZCwgY3JlYXRlZF9hdCwgdXBkYXRlZF9hdCcpXG4gICAgICAub3JkZXIoJ2NyZWF0ZWRfYXQnLCB7IGFzY2VuZGluZzogZmFsc2UgfSk7XG4gICAgXG4gICAgaWYgKGVycm9yKSB0aHJvdyBlcnJvcjtcbiAgICBcbiAgICByZXR1cm4gTmV4dFJlc3BvbnNlLmpzb24oe1xuICAgICAgZm9ybXM6IGZvcm1zLm1hcChmb3JtID0+ICh7XG4gICAgICAgIGlkOiBmb3JtLmlkLFxuICAgICAgICB0aXRsZTogZm9ybS50aXRsZSxcbiAgICAgICAgdXJsX2lkOiBmb3JtLnVybF9pZCxcbiAgICAgICAgZm9ybV91cmw6IGAvZm9ybXMvJHtmb3JtLnVybF9pZH1gLFxuICAgICAgICBjcmVhdGVkOiBmb3JtLmNyZWF0ZWRfYXQsXG4gICAgICAgIHVwZGF0ZWQ6IGZvcm0udXBkYXRlZF9hdFxuICAgICAgfSkpXG4gICAgfSk7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcignRXJyb3IgZmV0Y2hpbmcgZm9ybXM6JywgZXJyb3IpO1xuICAgIHJldHVybiBOZXh0UmVzcG9uc2UuanNvbihcbiAgICAgIHsgZXJyb3I6ICdGYWlsZWQgdG8gZmV0Y2ggZm9ybXMnIH0sXG4gICAgICB7IHN0YXR1czogNTAwIH1cbiAgICApO1xuICB9XG59Il0sIm5hbWVzIjpbIk5leHRSZXNwb25zZSIsInN1cGFiYXNlIiwiR0VUIiwiZGF0YSIsImZvcm1zIiwiZXJyb3IiLCJmcm9tIiwic2VsZWN0Iiwib3JkZXIiLCJhc2NlbmRpbmciLCJqc29uIiwibWFwIiwiZm9ybSIsImlkIiwidGl0bGUiLCJ1cmxfaWQiLCJmb3JtX3VybCIsImNyZWF0ZWQiLCJjcmVhdGVkX2F0IiwidXBkYXRlZCIsInVwZGF0ZWRfYXQiLCJjb25zb2xlIiwic3RhdHVzIl0sInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///(rsc)/./app/api/forms/debug/route.js\n");

/***/ }),

/***/ "(rsc)/./lib/supabase.js":
/*!*************************!*\
  !*** ./lib/supabase.js ***!
  \*************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   supabase: () => (/* binding */ supabase)\n/* harmony export */ });\n/* harmony import */ var _supabase_supabase_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @supabase/supabase-js */ \"(rsc)/./node_modules/@supabase/supabase-js/dist/module/index.js\");\n\nconst supabaseUrl = \"https://eycgzjqwowrdmjlzqqyg.supabase.co\" || 0;\nconst supabasePublishableKey = \"sb_publishable_eG0lH_ACpyOjqG44mN_5PA_1-oFLr5n\" || 0;\n// Only check for environment variables in production or when actually using the client\nlet supabase = null;\nif (supabaseUrl && supabasePublishableKey) {\n    supabase = (0,_supabase_supabase_js__WEBPACK_IMPORTED_MODULE_0__.createClient)(supabaseUrl, supabasePublishableKey);\n} else if (false) {}\n\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9saWIvc3VwYWJhc2UuanMiLCJtYXBwaW5ncyI6Ijs7Ozs7QUFBcUQ7QUFFckQsTUFBTUMsY0FBY0MsMENBQW9DLElBQUk7QUFDNUQsTUFBTUcseUJBQXlCSCxnREFBZ0QsSUFBSTtBQUVuRix1RkFBdUY7QUFDdkYsSUFBSUssV0FBVztBQUVmLElBQUlOLGVBQWVJLHdCQUF3QjtJQUN6Q0UsV0FBV1AsbUVBQVlBLENBQUNDLGFBQWFJO0FBQ3ZDLE9BQU8sSUFBSUgsS0FBeUIsRUFBYyxFQUVqRDtBQUVtQiIsInNvdXJjZXMiOlsid2VicGFjazovL2N1c3RvbS1mb3Jtcy8uL2xpYi9zdXBhYmFzZS5qcz8xNTk4Il0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IGNyZWF0ZUNsaWVudCB9IGZyb20gJ0BzdXBhYmFzZS9zdXBhYmFzZS1qcyc7XG5cbmNvbnN0IHN1cGFiYXNlVXJsID0gcHJvY2Vzcy5lbnYuTkVYVF9QVUJMSUNfU1VQQUJBU0VfVVJMIHx8ICcnO1xuY29uc3Qgc3VwYWJhc2VQdWJsaXNoYWJsZUtleSA9IHByb2Nlc3MuZW52Lk5FWFRfUFVCTElDX1NVUEFCQVNFX1BVQkxJU0hBQkxFX0tFWSB8fCAnJztcblxuLy8gT25seSBjaGVjayBmb3IgZW52aXJvbm1lbnQgdmFyaWFibGVzIGluIHByb2R1Y3Rpb24gb3Igd2hlbiBhY3R1YWxseSB1c2luZyB0aGUgY2xpZW50XG5sZXQgc3VwYWJhc2UgPSBudWxsO1xuXG5pZiAoc3VwYWJhc2VVcmwgJiYgc3VwYWJhc2VQdWJsaXNoYWJsZUtleSkge1xuICBzdXBhYmFzZSA9IGNyZWF0ZUNsaWVudChzdXBhYmFzZVVybCwgc3VwYWJhc2VQdWJsaXNoYWJsZUtleSk7XG59IGVsc2UgaWYgKHByb2Nlc3MuZW52Lk5PREVfRU5WID09PSAncHJvZHVjdGlvbicpIHtcbiAgY29uc29sZS5lcnJvcignV2FybmluZzogU3VwYWJhc2UgZW52aXJvbm1lbnQgdmFyaWFibGVzIGFyZSBtaXNzaW5nJyk7XG59XG5cbmV4cG9ydCB7IHN1cGFiYXNlIH07Il0sIm5hbWVzIjpbImNyZWF0ZUNsaWVudCIsInN1cGFiYXNlVXJsIiwicHJvY2VzcyIsImVudiIsIk5FWFRfUFVCTElDX1NVUEFCQVNFX1VSTCIsInN1cGFiYXNlUHVibGlzaGFibGVLZXkiLCJORVhUX1BVQkxJQ19TVVBBQkFTRV9QVUJMSVNIQUJMRV9LRVkiLCJzdXBhYmFzZSIsImNvbnNvbGUiLCJlcnJvciJdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///(rsc)/./lib/supabase.js\n");

/***/ })

};
;

// load runtime
var __webpack_require__ = require("../../../../webpack-runtime.js");
__webpack_require__.C(exports);
var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
var __webpack_exports__ = __webpack_require__.X(0, ["vendor-chunks/next","vendor-chunks/@supabase"], () => (__webpack_exec__("(rsc)/./node_modules/next/dist/build/webpack/loaders/next-app-loader.js?name=app%2Fapi%2Fforms%2Fdebug%2Froute&page=%2Fapi%2Fforms%2Fdebug%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fforms%2Fdebug%2Froute.js&appDir=%2FUsers%2Frosspalmer%2FRoss%20GitHub%20Projects%2Fcustom-forms%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Frosspalmer%2FRoss%20GitHub%20Projects%2Fcustom-forms&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!")));
module.exports = __webpack_exports__;

})();