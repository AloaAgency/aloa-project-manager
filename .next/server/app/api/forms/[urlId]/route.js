"use strict";(()=>{var e={};e.id=405,e.ids=[405],e.modules={517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},3685:e=>{e.exports=require("http")},5687:e=>{e.exports=require("https")},5477:e=>{e.exports=require("punycode")},2781:e=>{e.exports=require("stream")},7310:e=>{e.exports=require("url")},9796:e=>{e.exports=require("zlib")},5502:(e,r,t)=>{t.r(r),t.d(r,{headerHooks:()=>m,originalPathname:()=>h,patchFetch:()=>q,requestAsyncStorage:()=>p,routeModule:()=>u,serverHooks:()=>c,staticGenerationAsyncStorage:()=>f,staticGenerationBailout:()=>_});var o={};t.r(o),t.d(o,{GET:()=>n});var i=t(5419),a=t(9108),s=t(9678),d=t(8070),l=t(4102);async function n(e,{params:r}){try{let{data:e,error:t}=await l.O.from("forms").select(`
        *,
        form_fields (
          id,
          field_label,
          field_name,
          field_type,
          required,
          placeholder,
          options,
          validation,
          field_order
        )
      `).eq("url_id",r.urlId).single();if(t||!e)return d.Z.json({error:"Form not found"},{status:404});let o=e.form_fields?.sort((e,r)=>(e.field_order||0)-(r.field_order||0))||[];return d.Z.json({...e,_id:e.id,urlId:e.url_id,fields:o.map(e=>({_id:e.id,label:e.field_label,name:e.field_name,type:e.field_type,position:e.field_order,section:e.validation?.section||"General Information",required:e.required,placeholder:e.placeholder,options:e.options,validation:e.validation})),createdAt:e.created_at,updatedAt:e.updated_at})}catch(e){return console.error("Error fetching form:",e),d.Z.json({error:"Failed to fetch form"},{status:500})}}let u=new i.AppRouteRouteModule({definition:{kind:a.x.APP_ROUTE,page:"/api/forms/[urlId]/route",pathname:"/api/forms/[urlId]",filename:"route",bundlePath:"app/api/forms/[urlId]/route"},resolvedPagePath:"/Users/rosspalmer/Ross GitHub Projects/custom-forms/app/api/forms/[urlId]/route.js",nextConfigOutput:"",userland:o}),{requestAsyncStorage:p,staticGenerationAsyncStorage:f,serverHooks:c,headerHooks:m,staticGenerationBailout:_}=u,h="/api/forms/[urlId]/route";function q(){return(0,s.patchFetch)({serverHooks:c,staticGenerationAsyncStorage:f})}},4102:(e,r,t)=>{t.d(r,{O:()=>s});var o=t(2409);let i="https://eycgzjqwowrdmjlzqqyg.supabase.co",a="sb_publishable_eG0lH_ACpyOjqG44mN_5PA_1-oFLr5n",s=null;i&&a?s=(0,o.eI)(i,a):console.error("Warning: Supabase environment variables are missing")}};var r=require("../../../../webpack-runtime.js");r.C(e);var t=e=>r(r.s=e),o=r.X(0,[638,409,206],()=>t(5502));module.exports=o})();