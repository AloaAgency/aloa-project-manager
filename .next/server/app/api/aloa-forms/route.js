"use strict";(()=>{var e={};e.id=115,e.ids=[115],e.modules={20399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},30517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},32615:e=>{e.exports=require("http")},35240:e=>{e.exports=require("https")},68621:e=>{e.exports=require("punycode")},76162:e=>{e.exports=require("stream")},17360:e=>{e.exports=require("url")},71568:e=>{e.exports=require("zlib")},90674:(e,o,r)=>{r.r(o),r.d(o,{originalPathname:()=>m,patchFetch:()=>T,requestAsyncStorage:()=>u,routeModule:()=>_,serverHooks:()=>f,staticGenerationAsyncStorage:()=>E});var t={};r.r(t),r.d(t,{GET:()=>p,POST:()=>c});var a=r(49303),i=r(88716),s=r(60670),l=r(87070),n=r(76995),d=r(40259);async function p(e){try{let{searchParams:o}=new URL(e.url),r=o.get("project"),t=n.O.from("aloa_forms").select("*");r&&(t="uncategorized"===r?t.is("aloa_project_id",null):t.eq("aloa_project_id",r));let{data:a,error:i}=await t.order("created_at",{ascending:!1});if(i){if("42P01"===i.code)return console.log("aloa_forms table does not exist yet"),l.NextResponse.json([]);throw i}let s=await Promise.all((a||[]).map(async e=>{let{data:o}=await n.O.from("aloa_form_fields").select("*").eq("aloa_form_id",e.id).order("field_order",{ascending:!0}),{count:r}=await n.O.from("aloa_form_responses").select("*",{count:"exact",head:!0}).eq("aloa_form_id",e.id),t=null;if(e.aloa_project_id){let{data:o}=await n.O.from("aloa_projects").select("project_name").eq("id",e.aloa_project_id).single();t=o?.project_name}return{_id:e.id,id:e.id,title:e.title,description:e.description,urlId:e.url_id,is_active:!1!==e.is_active,createdAt:e.created_at,projectId:e.aloa_project_id,projectName:t,fields:o||[],responseCount:r||0,response_count:r||0,status:e.status}}));return l.NextResponse.json(s)}catch(e){return console.error("Error fetching aloa_forms:",e),l.NextResponse.json({error:"Failed to fetch forms"},{status:500})}}async function c(e){try{let o=await e.json(),r={title:o.title,description:o.description,url_id:o.urlId||(0,d.x0)(10),markdown_content:o.markdownContent||"",aloa_project_id:o.projectId||null,status:"active",created_at:new Date().toISOString()},{data:t,error:a}=await n.O.from("aloa_forms").insert([r]).select().single();if(a){if("42P01"===a.code)return console.log("aloa_forms table needs to be created:"),console.log(`
          CREATE TABLE aloa_forms (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            title TEXT NOT NULL,
            description TEXT,
            url_id TEXT UNIQUE NOT NULL,
            markdown_content TEXT,
            aloa_project_id UUID REFERENCES aloa_projects(id) ON DELETE CASCADE,
            status TEXT DEFAULT 'active',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );

          CREATE TABLE aloa_form_fields (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            aloa_form_id UUID REFERENCES aloa_forms(id) ON DELETE CASCADE,
            field_label TEXT NOT NULL,
            field_name TEXT NOT NULL,
            field_type TEXT NOT NULL,
            required BOOLEAN DEFAULT false,
            placeholder TEXT,
            options JSONB,
            validation JSONB,
            field_order INTEGER DEFAULT 0,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );

          CREATE TABLE aloa_form_responses (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            aloa_form_id UUID REFERENCES aloa_forms(id) ON DELETE CASCADE,
            aloa_project_id UUID REFERENCES aloa_projects(id) ON DELETE CASCADE,
            responses JSONB NOT NULL,
            submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
        `),l.NextResponse.json({error:"aloa_forms table does not exist. Please create it in Supabase."},{status:503});throw a}if(o.fields&&o.fields.length>0){let e=o.fields.map((e,o)=>({aloa_form_id:t.id,field_label:e.label||e.field_label,field_name:e.name||e.field_name||e.label?.toLowerCase().replace(/\s+/g,"_"),field_type:e.type||e.field_type||"text",required:e.required||!1,placeholder:e.placeholder||"",options:e.options||null,validation:{section:e.section||"General Information",...e.validation},field_order:void 0!==e.position?e.position:o})),{error:r}=await n.O.from("aloa_form_fields").insert(e);if(r)throw await n.O.from("aloa_forms").delete().eq("id",t.id),r}return l.NextResponse.json({id:t.id,urlId:t.url_id,title:t.title,description:t.description,projectId:t.aloa_project_id})}catch(e){return console.error("Error creating aloa_form:",e),l.NextResponse.json({error:"Failed to create form"},{status:500})}}let _=new a.AppRouteRouteModule({definition:{kind:i.x.APP_ROUTE,page:"/api/aloa-forms/route",pathname:"/api/aloa-forms",filename:"route",bundlePath:"app/api/aloa-forms/route"},resolvedPagePath:"/Users/rosspalmer/Ross GitHub Projects/aloa-web-design-project-manager/app/api/aloa-forms/route.js",nextConfigOutput:"",userland:t}),{requestAsyncStorage:u,staticGenerationAsyncStorage:E,serverHooks:f}=_,m="/api/aloa-forms/route";function T(){return(0,s.patchFetch)({serverHooks:f,staticGenerationAsyncStorage:E})}},76995:(e,o,r)=>{r.d(o,{O:()=>s});var t=r(69498);let a="https://eycgzjqwowrdmjlzqqyg.supabase.co",i="sb_publishable_eG0lH_ACpyOjqG44mN_5PA_1-oFLr5n",s=null;a&&i?s=(0,t.eI)(a,i):console.error("Warning: Supabase environment variables are missing")},40259:(e,o,r)=>{let t,a;r.d(o,{x0:()=>s});let i=require("node:crypto");function s(e=21){var o;o=e|=0,!t||t.length<o?(t=Buffer.allocUnsafe(128*o),i.webcrypto.getRandomValues(t),a=0):a+o>t.length&&(i.webcrypto.getRandomValues(t),a=0),a+=o;let r="";for(let o=a-e;o<a;o++)r+="useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict"[63&t[o]];return r}}};var o=require("../../../webpack-runtime.js");o.C(e);var r=e=>o(o.s=e),t=o.X(0,[9276,5972,9498],()=>r(90674));module.exports=t})();