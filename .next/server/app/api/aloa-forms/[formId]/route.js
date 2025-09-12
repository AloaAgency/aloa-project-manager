"use strict";(()=>{var e={};e.id=14,e.ids=[14],e.modules={20399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},30517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},32615:e=>{e.exports=require("http")},35240:e=>{e.exports=require("https")},68621:e=>{e.exports=require("punycode")},76162:e=>{e.exports=require("stream")},17360:e=>{e.exports=require("url")},71568:e=>{e.exports=require("zlib")},94838:(e,r,o)=>{o.r(r),o.d(r,{originalPathname:()=>x,patchFetch:()=>g,requestAsyncStorage:()=>m,routeModule:()=>f,serverHooks:()=>_,staticGenerationAsyncStorage:()=>c});var t={};o.r(t),o.d(t,{DELETE:()=>u,GET:()=>d,PUT:()=>p});var s=o(49303),a=o(88716),n=o(60670),i=o(87070),l=o(76995);async function u(e,{params:r}){try{let{formId:e}=r,{data:o,error:t}=await l.O.from("aloa_forms").select("id, title").eq("id",e).single();if(t||!o)return i.NextResponse.json({error:"Form not found"},{status:404});let{error:s}=await l.O.from("aloa_forms").delete().eq("id",e);if(s)return console.error("Error deleting form:",s),i.NextResponse.json({error:"Failed to delete form"},{status:500});return i.NextResponse.json({success:!0,message:`Form "${o.title}" deleted successfully`})}catch(e){return console.error("Error in DELETE /api/aloa-forms/[formId]:",e),i.NextResponse.json({error:"Internal server error"},{status:500})}}async function d(e,{params:r}){try{let{formId:e}=r,{data:o,error:t}=await l.O.from("aloa_forms").select(`
        *,
        aloa_form_fields (
          id,
          field_label,
          field_name,
          field_type,
          required,
          placeholder,
          options,
          validation,
          field_order,
          help_text,
          default_value
        ),
        aloa_form_responses (
          id,
          submitted_at
        )
      `).eq("id",e).single();if(t||!o)return i.NextResponse.json({error:"Form not found"},{status:404});return o.aloa_form_fields&&o.aloa_form_fields.sort((e,r)=>(e.field_order||0)-(r.field_order||0)),o.response_count=o.aloa_form_responses?.length||0,delete o.aloa_form_responses,i.NextResponse.json(o)}catch(e){return console.error("Error in GET /api/aloa-forms/[formId]:",e),i.NextResponse.json({error:"Internal server error"},{status:500})}}async function p(e,{params:r}){try{let{formId:o}=r,t=await e.json(),{data:s,error:a}=await l.O.from("aloa_forms").update(t).eq("id",o).select().single();if(a)return console.error("Error updating form:",a),i.NextResponse.json({error:"Failed to update form"},{status:500});return i.NextResponse.json(s)}catch(e){return console.error("Error in PUT /api/aloa-forms/[formId]:",e),i.NextResponse.json({error:"Internal server error"},{status:500})}}let f=new s.AppRouteRouteModule({definition:{kind:a.x.APP_ROUTE,page:"/api/aloa-forms/[formId]/route",pathname:"/api/aloa-forms/[formId]",filename:"route",bundlePath:"app/api/aloa-forms/[formId]/route"},resolvedPagePath:"/Users/rosspalmer/Ross GitHub Projects/aloa-web-design-project-manager/app/api/aloa-forms/[formId]/route.js",nextConfigOutput:"",userland:t}),{requestAsyncStorage:m,staticGenerationAsyncStorage:c,serverHooks:_}=f,x="/api/aloa-forms/[formId]/route";function g(){return(0,n.patchFetch)({serverHooks:_,staticGenerationAsyncStorage:c})}},76995:(e,r,o)=>{o.d(r,{O:()=>n});var t=o(69498);let s="https://eycgzjqwowrdmjlzqqyg.supabase.co",a="sb_publishable_eG0lH_ACpyOjqG44mN_5PA_1-oFLr5n",n=null;s&&a?n=(0,t.eI)(s,a):console.error("Warning: Supabase environment variables are missing")}};var r=require("../../../../webpack-runtime.js");r.C(e);var o=e=>r(r.s=e),t=r.X(0,[9276,5972,9498],()=>o(94838));module.exports=t})();