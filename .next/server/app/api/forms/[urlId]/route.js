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
exports.id = "app/api/forms/[urlId]/route";
exports.ids = ["app/api/forms/[urlId]/route"];
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

/***/ "(rsc)/./node_modules/next/dist/build/webpack/loaders/next-app-loader.js?name=app%2Fapi%2Fforms%2F%5BurlId%5D%2Froute&page=%2Fapi%2Fforms%2F%5BurlId%5D%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fforms%2F%5BurlId%5D%2Froute.js&appDir=%2FUsers%2Frosspalmer%2FRoss%20GitHub%20Projects%2Fcustom-forms%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Frosspalmer%2FRoss%20GitHub%20Projects%2Fcustom-forms&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!":
/*!*******************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************!*\
  !*** ./node_modules/next/dist/build/webpack/loaders/next-app-loader.js?name=app%2Fapi%2Fforms%2F%5BurlId%5D%2Froute&page=%2Fapi%2Fforms%2F%5BurlId%5D%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fforms%2F%5BurlId%5D%2Froute.js&appDir=%2FUsers%2Frosspalmer%2FRoss%20GitHub%20Projects%2Fcustom-forms%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Frosspalmer%2FRoss%20GitHub%20Projects%2Fcustom-forms&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D! ***!
  \*******************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   headerHooks: () => (/* binding */ headerHooks),\n/* harmony export */   originalPathname: () => (/* binding */ originalPathname),\n/* harmony export */   patchFetch: () => (/* binding */ patchFetch),\n/* harmony export */   requestAsyncStorage: () => (/* binding */ requestAsyncStorage),\n/* harmony export */   routeModule: () => (/* binding */ routeModule),\n/* harmony export */   serverHooks: () => (/* binding */ serverHooks),\n/* harmony export */   staticGenerationAsyncStorage: () => (/* binding */ staticGenerationAsyncStorage),\n/* harmony export */   staticGenerationBailout: () => (/* binding */ staticGenerationBailout)\n/* harmony export */ });\n/* harmony import */ var next_dist_server_future_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! next/dist/server/future/route-modules/app-route/module.compiled */ \"(rsc)/./node_modules/next/dist/server/future/route-modules/app-route/module.compiled.js\");\n/* harmony import */ var next_dist_server_future_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_future_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var next_dist_server_future_route_kind__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! next/dist/server/future/route-kind */ \"(rsc)/./node_modules/next/dist/server/future/route-kind.js\");\n/* harmony import */ var next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! next/dist/server/lib/patch-fetch */ \"(rsc)/./node_modules/next/dist/server/lib/patch-fetch.js\");\n/* harmony import */ var next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__);\n/* harmony import */ var _Users_rosspalmer_Ross_GitHub_Projects_custom_forms_app_api_forms_urlId_route_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./app/api/forms/[urlId]/route.js */ \"(rsc)/./app/api/forms/[urlId]/route.js\");\n\n\n\n\n// We inject the nextConfigOutput here so that we can use them in the route\n// module.\nconst nextConfigOutput = \"\"\nconst routeModule = new next_dist_server_future_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__.AppRouteRouteModule({\n    definition: {\n        kind: next_dist_server_future_route_kind__WEBPACK_IMPORTED_MODULE_1__.RouteKind.APP_ROUTE,\n        page: \"/api/forms/[urlId]/route\",\n        pathname: \"/api/forms/[urlId]\",\n        filename: \"route\",\n        bundlePath: \"app/api/forms/[urlId]/route\"\n    },\n    resolvedPagePath: \"/Users/rosspalmer/Ross GitHub Projects/custom-forms/app/api/forms/[urlId]/route.js\",\n    nextConfigOutput,\n    userland: _Users_rosspalmer_Ross_GitHub_Projects_custom_forms_app_api_forms_urlId_route_js__WEBPACK_IMPORTED_MODULE_3__\n});\n// Pull out the exports that we need to expose from the module. This should\n// be eliminated when we've moved the other routes to the new format. These\n// are used to hook into the route.\nconst { requestAsyncStorage, staticGenerationAsyncStorage, serverHooks, headerHooks, staticGenerationBailout } = routeModule;\nconst originalPathname = \"/api/forms/[urlId]/route\";\nfunction patchFetch() {\n    return (0,next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__.patchFetch)({\n        serverHooks,\n        staticGenerationAsyncStorage\n    });\n}\n\n\n//# sourceMappingURL=app-route.js.map//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9ub2RlX21vZHVsZXMvbmV4dC9kaXN0L2J1aWxkL3dlYnBhY2svbG9hZGVycy9uZXh0LWFwcC1sb2FkZXIuanM/bmFtZT1hcHAlMkZhcGklMkZmb3JtcyUyRiU1QnVybElkJTVEJTJGcm91dGUmcGFnZT0lMkZhcGklMkZmb3JtcyUyRiU1QnVybElkJTVEJTJGcm91dGUmYXBwUGF0aHM9JnBhZ2VQYXRoPXByaXZhdGUtbmV4dC1hcHAtZGlyJTJGYXBpJTJGZm9ybXMlMkYlNUJ1cmxJZCU1RCUyRnJvdXRlLmpzJmFwcERpcj0lMkZVc2VycyUyRnJvc3NwYWxtZXIlMkZSb3NzJTIwR2l0SHViJTIwUHJvamVjdHMlMkZjdXN0b20tZm9ybXMlMkZhcHAmcGFnZUV4dGVuc2lvbnM9dHN4JnBhZ2VFeHRlbnNpb25zPXRzJnBhZ2VFeHRlbnNpb25zPWpzeCZwYWdlRXh0ZW5zaW9ucz1qcyZyb290RGlyPSUyRlVzZXJzJTJGcm9zc3BhbG1lciUyRlJvc3MlMjBHaXRIdWIlMjBQcm9qZWN0cyUyRmN1c3RvbS1mb3JtcyZpc0Rldj10cnVlJnRzY29uZmlnUGF0aD10c2NvbmZpZy5qc29uJmJhc2VQYXRoPSZhc3NldFByZWZpeD0mbmV4dENvbmZpZ091dHB1dD0mcHJlZmVycmVkUmVnaW9uPSZtaWRkbGV3YXJlQ29uZmlnPWUzMCUzRCEiLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBc0c7QUFDdkM7QUFDYztBQUNrQztBQUMvRztBQUNBO0FBQ0E7QUFDQSx3QkFBd0IsZ0hBQW1CO0FBQzNDO0FBQ0EsY0FBYyx5RUFBUztBQUN2QjtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUs7QUFDTDtBQUNBO0FBQ0EsWUFBWTtBQUNaLENBQUM7QUFDRDtBQUNBO0FBQ0E7QUFDQSxRQUFRLHVHQUF1RztBQUMvRztBQUNBO0FBQ0EsV0FBVyw0RUFBVztBQUN0QjtBQUNBO0FBQ0EsS0FBSztBQUNMO0FBQzZKOztBQUU3SiIsInNvdXJjZXMiOlsid2VicGFjazovL2N1c3RvbS1mb3Jtcy8/ZGNhZCJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBBcHBSb3V0ZVJvdXRlTW9kdWxlIH0gZnJvbSBcIm5leHQvZGlzdC9zZXJ2ZXIvZnV0dXJlL3JvdXRlLW1vZHVsZXMvYXBwLXJvdXRlL21vZHVsZS5jb21waWxlZFwiO1xuaW1wb3J0IHsgUm91dGVLaW5kIH0gZnJvbSBcIm5leHQvZGlzdC9zZXJ2ZXIvZnV0dXJlL3JvdXRlLWtpbmRcIjtcbmltcG9ydCB7IHBhdGNoRmV0Y2ggYXMgX3BhdGNoRmV0Y2ggfSBmcm9tIFwibmV4dC9kaXN0L3NlcnZlci9saWIvcGF0Y2gtZmV0Y2hcIjtcbmltcG9ydCAqIGFzIHVzZXJsYW5kIGZyb20gXCIvVXNlcnMvcm9zc3BhbG1lci9Sb3NzIEdpdEh1YiBQcm9qZWN0cy9jdXN0b20tZm9ybXMvYXBwL2FwaS9mb3Jtcy9bdXJsSWRdL3JvdXRlLmpzXCI7XG4vLyBXZSBpbmplY3QgdGhlIG5leHRDb25maWdPdXRwdXQgaGVyZSBzbyB0aGF0IHdlIGNhbiB1c2UgdGhlbSBpbiB0aGUgcm91dGVcbi8vIG1vZHVsZS5cbmNvbnN0IG5leHRDb25maWdPdXRwdXQgPSBcIlwiXG5jb25zdCByb3V0ZU1vZHVsZSA9IG5ldyBBcHBSb3V0ZVJvdXRlTW9kdWxlKHtcbiAgICBkZWZpbml0aW9uOiB7XG4gICAgICAgIGtpbmQ6IFJvdXRlS2luZC5BUFBfUk9VVEUsXG4gICAgICAgIHBhZ2U6IFwiL2FwaS9mb3Jtcy9bdXJsSWRdL3JvdXRlXCIsXG4gICAgICAgIHBhdGhuYW1lOiBcIi9hcGkvZm9ybXMvW3VybElkXVwiLFxuICAgICAgICBmaWxlbmFtZTogXCJyb3V0ZVwiLFxuICAgICAgICBidW5kbGVQYXRoOiBcImFwcC9hcGkvZm9ybXMvW3VybElkXS9yb3V0ZVwiXG4gICAgfSxcbiAgICByZXNvbHZlZFBhZ2VQYXRoOiBcIi9Vc2Vycy9yb3NzcGFsbWVyL1Jvc3MgR2l0SHViIFByb2plY3RzL2N1c3RvbS1mb3Jtcy9hcHAvYXBpL2Zvcm1zL1t1cmxJZF0vcm91dGUuanNcIixcbiAgICBuZXh0Q29uZmlnT3V0cHV0LFxuICAgIHVzZXJsYW5kXG59KTtcbi8vIFB1bGwgb3V0IHRoZSBleHBvcnRzIHRoYXQgd2UgbmVlZCB0byBleHBvc2UgZnJvbSB0aGUgbW9kdWxlLiBUaGlzIHNob3VsZFxuLy8gYmUgZWxpbWluYXRlZCB3aGVuIHdlJ3ZlIG1vdmVkIHRoZSBvdGhlciByb3V0ZXMgdG8gdGhlIG5ldyBmb3JtYXQuIFRoZXNlXG4vLyBhcmUgdXNlZCB0byBob29rIGludG8gdGhlIHJvdXRlLlxuY29uc3QgeyByZXF1ZXN0QXN5bmNTdG9yYWdlLCBzdGF0aWNHZW5lcmF0aW9uQXN5bmNTdG9yYWdlLCBzZXJ2ZXJIb29rcywgaGVhZGVySG9va3MsIHN0YXRpY0dlbmVyYXRpb25CYWlsb3V0IH0gPSByb3V0ZU1vZHVsZTtcbmNvbnN0IG9yaWdpbmFsUGF0aG5hbWUgPSBcIi9hcGkvZm9ybXMvW3VybElkXS9yb3V0ZVwiO1xuZnVuY3Rpb24gcGF0Y2hGZXRjaCgpIHtcbiAgICByZXR1cm4gX3BhdGNoRmV0Y2goe1xuICAgICAgICBzZXJ2ZXJIb29rcyxcbiAgICAgICAgc3RhdGljR2VuZXJhdGlvbkFzeW5jU3RvcmFnZVxuICAgIH0pO1xufVxuZXhwb3J0IHsgcm91dGVNb2R1bGUsIHJlcXVlc3RBc3luY1N0b3JhZ2UsIHN0YXRpY0dlbmVyYXRpb25Bc3luY1N0b3JhZ2UsIHNlcnZlckhvb2tzLCBoZWFkZXJIb29rcywgc3RhdGljR2VuZXJhdGlvbkJhaWxvdXQsIG9yaWdpbmFsUGF0aG5hbWUsIHBhdGNoRmV0Y2gsICB9O1xuXG4vLyMgc291cmNlTWFwcGluZ1VSTD1hcHAtcm91dGUuanMubWFwIl0sIm5hbWVzIjpbXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///(rsc)/./node_modules/next/dist/build/webpack/loaders/next-app-loader.js?name=app%2Fapi%2Fforms%2F%5BurlId%5D%2Froute&page=%2Fapi%2Fforms%2F%5BurlId%5D%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fforms%2F%5BurlId%5D%2Froute.js&appDir=%2FUsers%2Frosspalmer%2FRoss%20GitHub%20Projects%2Fcustom-forms%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Frosspalmer%2FRoss%20GitHub%20Projects%2Fcustom-forms&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!\n");

/***/ }),

/***/ "(rsc)/./app/api/forms/[urlId]/route.js":
/*!****************************************!*\
  !*** ./app/api/forms/[urlId]/route.js ***!
  \****************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   GET: () => (/* binding */ GET)\n/* harmony export */ });\n/* harmony import */ var next_dist_server_web_exports_next_response__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! next/dist/server/web/exports/next-response */ \"(rsc)/./node_modules/next/dist/server/web/exports/next-response.js\");\n/* harmony import */ var _lib_supabase__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @/lib/supabase */ \"(rsc)/./lib/supabase.js\");\n\n\nasync function GET(request, { params }) {\n    try {\n        // Fetch form with its fields\n        const { data: form, error } = await _lib_supabase__WEBPACK_IMPORTED_MODULE_1__.supabase.from(\"forms\").select(`\n        *,\n        form_fields (\n          id,\n          field_label,\n          field_name,\n          field_type,\n          required,\n          placeholder,\n          options,\n          validation,\n          field_order\n        )\n      `).eq(\"url_id\", params.urlId).single();\n        if (error || !form) {\n            return next_dist_server_web_exports_next_response__WEBPACK_IMPORTED_MODULE_0__[\"default\"].json({\n                error: \"Form not found\"\n            }, {\n                status: 404\n            });\n        }\n        // Sort fields by position and format response\n        const sortedFields = form.form_fields?.sort((a, b)=>(a.field_order || 0) - (b.field_order || 0)) || [];\n        // Format response for compatibility\n        return next_dist_server_web_exports_next_response__WEBPACK_IMPORTED_MODULE_0__[\"default\"].json({\n            ...form,\n            _id: form.id,\n            urlId: form.url_id,\n            fields: sortedFields.map((field)=>({\n                    _id: field.id,\n                    label: field.field_label,\n                    name: field.field_name,\n                    type: field.field_type,\n                    position: field.field_order,\n                    section: field.validation?.section || \"General Information\",\n                    required: field.required,\n                    placeholder: field.placeholder,\n                    options: field.options,\n                    validation: field.validation\n                })),\n            createdAt: form.created_at,\n            updatedAt: form.updated_at\n        });\n    } catch (error) {\n        console.error(\"Error fetching form:\", error);\n        return next_dist_server_web_exports_next_response__WEBPACK_IMPORTED_MODULE_0__[\"default\"].json({\n            error: \"Failed to fetch form\"\n        }, {\n            status: 500\n        });\n    }\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9hcHAvYXBpL2Zvcm1zL1t1cmxJZF0vcm91dGUuanMiLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQTJDO0FBQ0Q7QUFFbkMsZUFBZUUsSUFBSUMsT0FBTyxFQUFFLEVBQUVDLE1BQU0sRUFBRTtJQUMzQyxJQUFJO1FBQ0YsNkJBQTZCO1FBQzdCLE1BQU0sRUFBRUMsTUFBTUMsSUFBSSxFQUFFQyxLQUFLLEVBQUUsR0FBRyxNQUFNTixtREFBUUEsQ0FDekNPLElBQUksQ0FBQyxTQUNMQyxNQUFNLENBQUMsQ0FBQzs7Ozs7Ozs7Ozs7OztNQWFULENBQUMsRUFDQUMsRUFBRSxDQUFDLFVBQVVOLE9BQU9PLEtBQUssRUFDekJDLE1BQU07UUFFVCxJQUFJTCxTQUFTLENBQUNELE1BQU07WUFDbEIsT0FBT04sa0ZBQVlBLENBQUNhLElBQUksQ0FDdEI7Z0JBQUVOLE9BQU87WUFBaUIsR0FDMUI7Z0JBQUVPLFFBQVE7WUFBSTtRQUVsQjtRQUVBLDhDQUE4QztRQUM5QyxNQUFNQyxlQUFlVCxLQUFLVSxXQUFXLEVBQUVDLEtBQUssQ0FBQ0MsR0FBR0MsSUFBTSxDQUFDRCxFQUFFRSxXQUFXLElBQUksS0FBTUQsQ0FBQUEsRUFBRUMsV0FBVyxJQUFJLE9BQU8sRUFBRTtRQUV4RyxvQ0FBb0M7UUFDcEMsT0FBT3BCLGtGQUFZQSxDQUFDYSxJQUFJLENBQUM7WUFDdkIsR0FBR1AsSUFBSTtZQUNQZSxLQUFLZixLQUFLZ0IsRUFBRTtZQUNaWCxPQUFPTCxLQUFLaUIsTUFBTTtZQUNsQkMsUUFBUVQsYUFBYVUsR0FBRyxDQUFDQyxDQUFBQSxRQUFVO29CQUNqQ0wsS0FBS0ssTUFBTUosRUFBRTtvQkFDYkssT0FBT0QsTUFBTUUsV0FBVztvQkFDeEJDLE1BQU1ILE1BQU1JLFVBQVU7b0JBQ3RCQyxNQUFNTCxNQUFNTSxVQUFVO29CQUN0QkMsVUFBVVAsTUFBTU4sV0FBVztvQkFDM0JjLFNBQVNSLE1BQU1TLFVBQVUsRUFBRUQsV0FBVztvQkFDdENFLFVBQVVWLE1BQU1VLFFBQVE7b0JBQ3hCQyxhQUFhWCxNQUFNVyxXQUFXO29CQUM5QkMsU0FBU1osTUFBTVksT0FBTztvQkFDdEJILFlBQVlULE1BQU1TLFVBQVU7Z0JBQzlCO1lBQ0FJLFdBQVdqQyxLQUFLa0MsVUFBVTtZQUMxQkMsV0FBV25DLEtBQUtvQyxVQUFVO1FBQzVCO0lBQ0YsRUFBRSxPQUFPbkMsT0FBTztRQUNkb0MsUUFBUXBDLEtBQUssQ0FBQyx3QkFBd0JBO1FBQ3RDLE9BQU9QLGtGQUFZQSxDQUFDYSxJQUFJLENBQ3RCO1lBQUVOLE9BQU87UUFBdUIsR0FDaEM7WUFBRU8sUUFBUTtRQUFJO0lBRWxCO0FBQ0YiLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly9jdXN0b20tZm9ybXMvLi9hcHAvYXBpL2Zvcm1zL1t1cmxJZF0vcm91dGUuanM/NTM0MiJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBOZXh0UmVzcG9uc2UgfSBmcm9tICduZXh0L3NlcnZlcic7XG5pbXBvcnQgeyBzdXBhYmFzZSB9IGZyb20gJ0AvbGliL3N1cGFiYXNlJztcblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIEdFVChyZXF1ZXN0LCB7IHBhcmFtcyB9KSB7XG4gIHRyeSB7XG4gICAgLy8gRmV0Y2ggZm9ybSB3aXRoIGl0cyBmaWVsZHNcbiAgICBjb25zdCB7IGRhdGE6IGZvcm0sIGVycm9yIH0gPSBhd2FpdCBzdXBhYmFzZVxuICAgICAgLmZyb20oJ2Zvcm1zJylcbiAgICAgIC5zZWxlY3QoYFxuICAgICAgICAqLFxuICAgICAgICBmb3JtX2ZpZWxkcyAoXG4gICAgICAgICAgaWQsXG4gICAgICAgICAgZmllbGRfbGFiZWwsXG4gICAgICAgICAgZmllbGRfbmFtZSxcbiAgICAgICAgICBmaWVsZF90eXBlLFxuICAgICAgICAgIHJlcXVpcmVkLFxuICAgICAgICAgIHBsYWNlaG9sZGVyLFxuICAgICAgICAgIG9wdGlvbnMsXG4gICAgICAgICAgdmFsaWRhdGlvbixcbiAgICAgICAgICBmaWVsZF9vcmRlclxuICAgICAgICApXG4gICAgICBgKVxuICAgICAgLmVxKCd1cmxfaWQnLCBwYXJhbXMudXJsSWQpXG4gICAgICAuc2luZ2xlKCk7XG4gICAgXG4gICAgaWYgKGVycm9yIHx8ICFmb3JtKSB7XG4gICAgICByZXR1cm4gTmV4dFJlc3BvbnNlLmpzb24oXG4gICAgICAgIHsgZXJyb3I6ICdGb3JtIG5vdCBmb3VuZCcgfSxcbiAgICAgICAgeyBzdGF0dXM6IDQwNCB9XG4gICAgICApO1xuICAgIH1cbiAgICBcbiAgICAvLyBTb3J0IGZpZWxkcyBieSBwb3NpdGlvbiBhbmQgZm9ybWF0IHJlc3BvbnNlXG4gICAgY29uc3Qgc29ydGVkRmllbGRzID0gZm9ybS5mb3JtX2ZpZWxkcz8uc29ydCgoYSwgYikgPT4gKGEuZmllbGRfb3JkZXIgfHwgMCkgLSAoYi5maWVsZF9vcmRlciB8fCAwKSkgfHwgW107XG4gICAgXG4gICAgLy8gRm9ybWF0IHJlc3BvbnNlIGZvciBjb21wYXRpYmlsaXR5XG4gICAgcmV0dXJuIE5leHRSZXNwb25zZS5qc29uKHtcbiAgICAgIC4uLmZvcm0sXG4gICAgICBfaWQ6IGZvcm0uaWQsXG4gICAgICB1cmxJZDogZm9ybS51cmxfaWQsXG4gICAgICBmaWVsZHM6IHNvcnRlZEZpZWxkcy5tYXAoZmllbGQgPT4gKHtcbiAgICAgICAgX2lkOiBmaWVsZC5pZCxcbiAgICAgICAgbGFiZWw6IGZpZWxkLmZpZWxkX2xhYmVsLCAvLyBNYXAgZmllbGRfbGFiZWwgYmFjayB0byBsYWJlbCBmb3IgZnJvbnRlbmRcbiAgICAgICAgbmFtZTogZmllbGQuZmllbGRfbmFtZSwgLy8gTWFwIGZpZWxkX25hbWUgYmFjayB0byBuYW1lIGZvciBmcm9udGVuZFxuICAgICAgICB0eXBlOiBmaWVsZC5maWVsZF90eXBlLCAvLyBNYXAgZmllbGRfdHlwZSBiYWNrIHRvIHR5cGUgZm9yIGZyb250ZW5kXG4gICAgICAgIHBvc2l0aW9uOiBmaWVsZC5maWVsZF9vcmRlciwgLy8gTWFwIGZpZWxkX29yZGVyIGJhY2sgdG8gcG9zaXRpb24gZm9yIGZyb250ZW5kXG4gICAgICAgIHNlY3Rpb246IGZpZWxkLnZhbGlkYXRpb24/LnNlY3Rpb24gfHwgJ0dlbmVyYWwgSW5mb3JtYXRpb24nLCAvLyBFeHRyYWN0IHNlY3Rpb24gZnJvbSB2YWxpZGF0aW9uXG4gICAgICAgIHJlcXVpcmVkOiBmaWVsZC5yZXF1aXJlZCxcbiAgICAgICAgcGxhY2Vob2xkZXI6IGZpZWxkLnBsYWNlaG9sZGVyLFxuICAgICAgICBvcHRpb25zOiBmaWVsZC5vcHRpb25zLFxuICAgICAgICB2YWxpZGF0aW9uOiBmaWVsZC52YWxpZGF0aW9uXG4gICAgICB9KSksXG4gICAgICBjcmVhdGVkQXQ6IGZvcm0uY3JlYXRlZF9hdCxcbiAgICAgIHVwZGF0ZWRBdDogZm9ybS51cGRhdGVkX2F0XG4gICAgfSk7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcignRXJyb3IgZmV0Y2hpbmcgZm9ybTonLCBlcnJvcik7XG4gICAgcmV0dXJuIE5leHRSZXNwb25zZS5qc29uKFxuICAgICAgeyBlcnJvcjogJ0ZhaWxlZCB0byBmZXRjaCBmb3JtJyB9LFxuICAgICAgeyBzdGF0dXM6IDUwMCB9XG4gICAgKTtcbiAgfVxufSJdLCJuYW1lcyI6WyJOZXh0UmVzcG9uc2UiLCJzdXBhYmFzZSIsIkdFVCIsInJlcXVlc3QiLCJwYXJhbXMiLCJkYXRhIiwiZm9ybSIsImVycm9yIiwiZnJvbSIsInNlbGVjdCIsImVxIiwidXJsSWQiLCJzaW5nbGUiLCJqc29uIiwic3RhdHVzIiwic29ydGVkRmllbGRzIiwiZm9ybV9maWVsZHMiLCJzb3J0IiwiYSIsImIiLCJmaWVsZF9vcmRlciIsIl9pZCIsImlkIiwidXJsX2lkIiwiZmllbGRzIiwibWFwIiwiZmllbGQiLCJsYWJlbCIsImZpZWxkX2xhYmVsIiwibmFtZSIsImZpZWxkX25hbWUiLCJ0eXBlIiwiZmllbGRfdHlwZSIsInBvc2l0aW9uIiwic2VjdGlvbiIsInZhbGlkYXRpb24iLCJyZXF1aXJlZCIsInBsYWNlaG9sZGVyIiwib3B0aW9ucyIsImNyZWF0ZWRBdCIsImNyZWF0ZWRfYXQiLCJ1cGRhdGVkQXQiLCJ1cGRhdGVkX2F0IiwiY29uc29sZSJdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///(rsc)/./app/api/forms/[urlId]/route.js\n");

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
var __webpack_exports__ = __webpack_require__.X(0, ["vendor-chunks/next","vendor-chunks/@supabase"], () => (__webpack_exec__("(rsc)/./node_modules/next/dist/build/webpack/loaders/next-app-loader.js?name=app%2Fapi%2Fforms%2F%5BurlId%5D%2Froute&page=%2Fapi%2Fforms%2F%5BurlId%5D%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fforms%2F%5BurlId%5D%2Froute.js&appDir=%2FUsers%2Frosspalmer%2FRoss%20GitHub%20Projects%2Fcustom-forms%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Frosspalmer%2FRoss%20GitHub%20Projects%2Fcustom-forms&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!")));
module.exports = __webpack_exports__;

})();