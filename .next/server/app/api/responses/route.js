"use strict";(()=>{var e={};e.id=7526,e.ids=[7526],e.modules={98860:e=>{e.exports=require("jsdom")},20399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},30517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},84770:e=>{e.exports=require("crypto")},32615:e=>{e.exports=require("http")},35240:e=>{e.exports=require("https")},68621:e=>{e.exports=require("punycode")},76162:e=>{e.exports=require("stream")},17360:e=>{e.exports=require("url")},71568:e=>{e.exports=require("zlib")},24889:(e,t,r)=>{r.r(t),r.d(t,{originalPathname:()=>b,patchFetch:()=>v,requestAsyncStorage:()=>g,routeModule:()=>h,serverHooks:()=>_,staticGenerationAsyncStorage:()=>y});var n={};r.r(n),r.d(n,{GET:()=>p,POST:()=>m});var i=r(49303),s=r(88716),o=r(60670),a=r(87070),l=r(76995),d=r(2723),c=r(77537);let u=process.env.RESEND_API_KEY?new d.R(process.env.RESEND_API_KEY):null;async function f({form:e,responses:t,recipientEmail:r}){try{let n;if(!u)return console.log("Email notifications disabled: RESEND_API_KEY not configured"),{success:!0,skipped:!0,message:"Email notifications not configured"};try{n=r?(0,c.H3)(r):"ross@aloa.agency"}catch(e){console.error("Invalid recipient email:",e),n="ross@aloa.agency"}let i=(0,c.oO)(e.title||"Untitled Form").replace(/[\n\r]/g,"").substring(0,100),s=function(e,t){let r=new Date().toLocaleString("en-US",{weekday:"long",year:"numeric",month:"long",day:"numeric",hour:"2-digit",minute:"2-digit",timeZoneName:"short"});return`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Form Response</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f5f5f5;
        }
        .email-container {
          background: white;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          overflow: hidden;
        }
        .header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 30px;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 24px;
          font-weight: 600;
        }
        .header p {
          margin: 10px 0 0 0;
          opacity: 0.9;
          font-size: 14px;
        }
        .content {
          padding: 30px;
        }
        .response-section {
          margin-bottom: 25px;
          padding-bottom: 25px;
          border-bottom: 1px solid #e5e5e5;
        }
        .response-section:last-child {
          border-bottom: none;
          padding-bottom: 0;
        }
        .section-title {
          color: #667eea;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 15px;
        }
        .field {
          margin-bottom: 20px;
        }
        .field-label {
          font-weight: 600;
          color: #555;
          margin-bottom: 5px;
          font-size: 14px;
        }
        .field-value {
          color: #333;
          font-size: 15px;
          padding: 10px;
          background: #f8f9fa;
          border-radius: 6px;
          border-left: 3px solid #667eea;
        }
        .field-value.empty {
          color: #999;
          font-style: italic;
          border-left-color: #ddd;
        }
        .footer {
          background: #f8f9fa;
          padding: 20px 30px;
          text-align: center;
          font-size: 12px;
          color: #666;
        }
        .footer a {
          color: #667eea;
          text-decoration: none;
        }
        .timestamp {
          background: #f0f0f0;
          padding: 10px 30px;
          font-size: 13px;
          color: #666;
          border-top: 1px solid #e5e5e5;
        }
        .logo {
          width: 120px;
          height: auto;
          margin-bottom: 15px;
        }
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="header">
          <img src="https://images.ctfassets.net/qkznfzcikv51/xWpsUAypBrRgAjmbyLGYy/b969f4353174e4f209996ebf60af8f7c/aloa_-_white.svg" alt="Aloa" class="logo">
          <h1>New Form Response</h1>
          <p>${(0,c.jW)(e.title||"Untitled Form")}</p>
        </div>
        
        <div class="timestamp">
          <strong>Submitted:</strong> ${r}
        </div>
        
        <div class="content">
          ${function(e,t){let r={};e.forEach(e=>{let t=e.validation?.section||"General Information";r[t]||(r[t]=[]),r[t].push(e)});let n="";return Object.entries(r).forEach(([e,r])=>{n+=`
      <div class="response-section">
        <div class="section-title">${(0,c.jW)(e)}</div>
    `,r.forEach(e=>{let r=function(e,t){if(!e)return"";if(Array.isArray(e))return 0===e.length?"":e.map(e=>`• ${(0,c.jW)(String(e))}`).join("<br>");if("rating"===t.field_type||"rating"===t.type){let t=parseInt(e,10);return isNaN(t)||t<0||t>5?"Invalid rating":`${t} / 5 ⭐`}if("string"==typeof e){let t=(0,c.jW)(e);return e.includes("\n")?t.replace(/\n/g,"<br>"):t}return(0,c.jW)(String(e))}(t[e.field_name]||t[e.name],e),i=(0,c.jW)(e.field_label||e.label||"Unnamed Field");n+=`
        <div class="field">
          <div class="field-label">${i}</div>
          <div class="field-value ${r?"":"empty"}">
            ${r||"No response provided"}
          </div>
        </div>
      `}),n+="</div>"}),n}(e.fields,t)}
        </div>
        
        <div class="footer">
          <p>
            This response was submitted via your custom form.<br>
            <a href="${process.env.NEXT_PUBLIC_BASE_URL||"https://custom-forms-xi.vercel.app"}/responses/${e.id}">
              View all responses →
            </a>
          </p>
          <p style="margin-top: 15px; color: #999;">
            Powered by <strong>Aloa\xae Agency</strong>
          </p>
        </div>
      </div>
    </body>
    </html>
  `}(e,t),o=await u.emails.send({from:"Aloa Forms <forms@updates.aloa.agency>",to:n,subject:`New Response: ${i}`,html:s});return{success:!0,data:o}}catch(e){return console.error("Error sending email:",e),{success:!1,error:e}}}async function p(e){try{let{searchParams:t}=new URL(e.url),r=t.get("formId");if(!r)return a.NextResponse.json({error:"Form ID is required"},{status:400});if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(r))return a.NextResponse.json({error:"Invalid form ID format"},{status:400});let{data:n,error:i}=await l.O.from("aloa_form_responses").select(`
        *,
        aloa_form_response_answers (
          id,
          value,
          aloa_form_fields (
            field_name,
            field_label
          )
        )
      `).eq("form_id",r).order("submitted_at",{ascending:!1});if(i)throw i;let s=n.map(e=>{let t={};return e.aloa_form_response_answers?.forEach(e=>{if(e.aloa_form_fields?.field_name)try{let r=JSON.parse(e.value);t[e.aloa_form_fields.field_name]=r}catch{t[e.aloa_form_fields.field_name]=e.value}}),{...e,_id:e.id,formId:e.form_id,submittedAt:e.submitted_at,data:t}});return a.NextResponse.json(s)}catch(e){return console.error("Error fetching responses:",e),a.NextResponse.json({error:"Failed to fetch responses"},{status:500})}}async function m(e){try{let t=await e.json();if(!t.formId)return a.NextResponse.json({error:"Form ID is required"},{status:400});if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(t.formId))return a.NextResponse.json({error:"Invalid form ID format"},{status:400});let r=e.headers.get("X-CSRF-Token"),n=e.cookies.get("csrf-token")?.value;if(!r||!n||r!==n)return a.NextResponse.json({error:"Invalid CSRF token"},{status:403});let i={form_id:t.formId},{data:s,error:o}=await l.O.from("aloa_form_responses").insert([i]).select().single();if(o)throw o;let{data:d,error:u}=await l.O.from("aloa_form_fields").select("id, field_name").eq("form_id",t.formId);if(u)throw u;let p=new Map;d.forEach(e=>{p.set(e.field_name,e.id)});let{data:m,error:h}=await l.O.from("aloa_form_fields").select("id, field_name, field_type, required, validation").eq("form_id",t.formId);if(h)throw h;let g=new Map;m.forEach(e=>{g.set(e.field_name,e)});let y=t.data instanceof Map?t.data:new Map(Object.entries(t.data||{}));console.log("Form data received:",t.data),console.log("Field mapping:",Array.from(p.entries()));let _=[],b=[];if(y.forEach((e,t)=>{let r=p.get(t),n=g.get(t);if(r&&null!=e&&""!==e){let i;try{switch(n?.field_type){case"email":i=(0,c.H3)(e);break;case"url":i=(0,c.lz)(e);break;case"number":case"rating":let o=(0,c.KP)(e,n?.validation?.min||0,n?.validation?.max||Number.MAX_SAFE_INTEGER);i=String(o);break;case"checkbox":case"multiselect":let a=Array.isArray(e)?e:[e],l=(0,c.I8)(a,n?.validation?.options);i=JSON.stringify(l);break;default:i=(0,c.oO)(String(e));let d=n?.validation?.maxLength||1e4;i.length>d&&(i=i.substring(0,d))}_.push({response_id:s.id,field_id:r,value:i}),console.log(`Storing sanitized answer for field ${t} (ID: ${r})`)}catch(e){b.push(`Invalid value for field ${t}: ${e.message}`)}}else r?n?.required&&!e&&b.push(`Required field ${t} is missing`):console.warn(`Field name '${t}' not found in field map`)}),b.length>0)return await l.O.from("aloa_form_responses").delete().eq("id",s.id),a.NextResponse.json({error:"Validation failed",details:b},{status:400});if(_.length>0){console.log(`Inserting ${_.length} answers for response ${s.id}`);let{error:e}=await l.O.from("aloa_form_response_answers").insert(_);if(e)throw console.error("Error inserting answers:",e),await l.O.from("aloa_form_responses").delete().eq("id",s.id),e;console.log("Answers inserted successfully")}else console.warn("No answers to insert - form data may be empty");let{data:v,error:w}=await l.O.from("aloa_forms").select(`
        *,
        aloa_form_fields (
          id,
          field_name,
          field_label,
          field_type,
          field_order,
          validation
        )
      `).eq("id",t.formId).single();if(!w&&v)try{let e=await f({form:{id:v.id,title:v.title,fields:v.aloa_form_fields.sort((e,t)=>(e.field_order||0)-(t.field_order||0))},responses:t.data,recipientEmail:v.notification_email||"ross@aloa.agency"});e.success?console.log("Email notification sent successfully"):console.error("Failed to send email notification:",e.error)}catch(e){console.error("Error sending email notification:",e)}return a.NextResponse.json({...s,_id:s.id,formId:s.form_id,submittedAt:s.submitted_at})}catch(e){return console.error("Error creating response:",e),a.NextResponse.json({error:"Failed to save response"},{status:500})}}let h=new i.AppRouteRouteModule({definition:{kind:s.x.APP_ROUTE,page:"/api/responses/route",pathname:"/api/responses",filename:"route",bundlePath:"app/api/responses/route"},resolvedPagePath:"/Users/rosspalmer/Ross GitHub Projects/aloa-web-design-project-manager/app/api/responses/route.js",nextConfigOutput:"",userland:n}),{requestAsyncStorage:g,staticGenerationAsyncStorage:y,serverHooks:_}=h,b="/api/responses/route";function v(){return(0,o.patchFetch)({serverHooks:_,staticGenerationAsyncStorage:y})}},77537:(e,t,r)=>{r.d(t,{H3:()=>a,I8:()=>c,KP:()=>d,L$:()=>u,jW:()=>s,lz:()=>l,oO:()=>o});var n=r(96468),i=r.n(n);function s(e){return e?i().sanitize(e,{ALLOWED_TAGS:["b","i","em","strong","a","p","br"],ALLOWED_ATTR:["href"],ALLOW_DATA_ATTR:!1,ALLOW_UNKNOWN_PROTOCOLS:!1,SAFE_FOR_TEMPLATES:!0,WHOLE_DOCUMENT:!1,RETURN_DOM:!1,RETURN_DOM_FRAGMENT:!1,RETURN_TRUSTED_TYPE:!1,FORCE_BODY:!1,SANITIZE_DOM:!0,IN_PLACE:!1,USE_PROFILES:!1,ALLOW_ARIA_ATTR:!1,ALLOW_DATA_ATTR:!1,DISALLOWED_TAGS:["script","style","iframe","object","embed","link"]}):""}function o(e){return e?("string"!=typeof e&&(e=String(e)),e.replace(/<[^>]*>/g,"").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&quot;/g,'"').replace(/&#x27;/g,"'").replace(/&amp;/g,"&").trim().replace(/javascript:/gi,"").replace(/on\w+\s*=/gi,"").replace(/<script[^>]*>.*?<\/script>/gi,"").replace(/eval\(/gi,"").replace(/expression\(/gi,"")):""}function a(e){if(!e||"string"!=typeof e)return"";let t=e.toLowerCase().trim();if(!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(t))throw Error("Invalid email format");if(t.includes("\n")||t.includes("\r")||t.includes("%0a")||t.includes("%0d"))throw Error("Invalid email format - possible injection attempt");return t}function l(e){if(!e||"string"!=typeof e)return"";try{let t=new URL(e);if(!["http:","https:","mailto:"].includes(t.protocol))throw Error("Invalid URL protocol");if(e.toLowerCase().includes("javascript:")||e.toLowerCase().includes("data:"))throw Error("Potentially malicious URL");return t.href}catch(e){throw Error("Invalid URL format")}}function d(e,t=null,r=null){let n=Number(e);if(isNaN(n))throw Error("Invalid number format");if(null!==t&&n<t)throw Error(`Number must be at least ${t}`);if(null!==r&&n>r)throw Error(`Number must be at most ${r}`);return n}function c(e,t=null){if(!Array.isArray(e))return[];let r=e.filter(e=>null!=e).map(e=>o(String(e)));return t&&Array.isArray(t)?r.filter(e=>t.includes(e)):r}function u(e,t={}){let{maxSize:r=10485760,allowedTypes:n=["text/plain","text/markdown","text/x-markdown","application/x-markdown"],allowedExtensions:i=[".txt",".md",".markdown"]}=t;if(!e)throw Error("No file provided");if(e.size>r)throw Error(`File size exceeds maximum allowed size of ${r/1024/1024}MB`);if(n.length>0&&!n.includes(e.type))throw Error("File type not allowed");let s=e.name||"";if(!i.some(e=>s.toLowerCase().endsWith(e)))throw Error("File extension not allowed");if(s.split(".").length>2){let e=s.split(".");if(["exe","js","php","asp","jsp"].includes(e[e.length-2].toLowerCase()))throw Error("Suspicious file name detected")}return!0}},76995:(e,t,r)=>{r.d(t,{O:()=>o});var n=r(69498);let i="https://eycgzjqwowrdmjlzqqyg.supabase.co",s="sb_publishable_eG0lH_ACpyOjqG44mN_5PA_1-oFLr5n",o=null;i&&s?o=(0,n.eI)(i,s):console.error("Warning: Supabase environment variables are missing")},2723:(e,t,r)=>{r.d(t,{R:()=>E});var n=Object.defineProperty,i=Object.defineProperties,s=Object.getOwnPropertyDescriptors,o=Object.getOwnPropertySymbols,a=Object.prototype.hasOwnProperty,l=Object.prototype.propertyIsEnumerable,d=(e,t,r)=>t in e?n(e,t,{enumerable:!0,configurable:!0,writable:!0,value:r}):e[t]=r,c=(e,t)=>{for(var r in t||(t={}))a.call(t,r)&&d(e,r,t[r]);if(o)for(var r of o(t))l.call(t,r)&&d(e,r,t[r]);return e},u=(e,t)=>i(e,s(t)),f=(e,t,r)=>new Promise((n,i)=>{var s=e=>{try{a(r.next(e))}catch(e){i(e)}},o=e=>{try{a(r.throw(e))}catch(e){i(e)}},a=e=>e.done?n(e.value):Promise.resolve(e.value).then(s,o);a((r=r.apply(e,t)).next())}),p=class{constructor(e){this.resend=e}create(e){return f(this,arguments,function*(e,t={}){return yield this.resend.post("/api-keys",e,t)})}list(){return f(this,null,function*(){return yield this.resend.get("/api-keys")})}remove(e){return f(this,null,function*(){return yield this.resend.delete(`/api-keys/${e}`)})}},m=class{constructor(e){this.resend=e}create(e){return f(this,arguments,function*(e,t={}){return yield this.resend.post("/audiences",e,t)})}list(){return f(this,null,function*(){return yield this.resend.get("/audiences")})}get(e){return f(this,null,function*(){return yield this.resend.get(`/audiences/${e}`)})}remove(e){return f(this,null,function*(){return yield this.resend.delete(`/audiences/${e}`)})}};function h(e){var t;return{attachments:null==(t=e.attachments)?void 0:t.map(e=>({content:e.content,filename:e.filename,path:e.path,content_type:e.contentType,content_id:e.contentId})),bcc:e.bcc,cc:e.cc,from:e.from,headers:e.headers,html:e.html,reply_to:e.replyTo,scheduled_at:e.scheduledAt,subject:e.subject,tags:e.tags,text:e.text,to:e.to}}var g=class{constructor(e){this.resend=e}send(e){return f(this,arguments,function*(e,t={}){return this.create(e,t)})}create(e){return f(this,arguments,function*(e,t={}){let n=[];for(let t of e){if(t.react){if(!this.renderAsync)try{let{renderAsync:e}=yield r.e(5486).then(r.t.bind(r,75486,19));this.renderAsync=e}catch(e){throw Error("Failed to render React component. Make sure to install `@react-email/render`")}t.html=yield this.renderAsync(t.react),t.react=void 0}n.push(h(t))}return yield this.resend.post("/emails/batch",n,t)})}},y=class{constructor(e){this.resend=e}create(e){return f(this,arguments,function*(e,t={}){if(e.react){if(!this.renderAsync)try{let{renderAsync:e}=yield r.e(5486).then(r.t.bind(r,75486,19));this.renderAsync=e}catch(e){throw Error("Failed to render React component. Make sure to install `@react-email/render`")}e.html=yield this.renderAsync(e.react)}return yield this.resend.post("/broadcasts",{name:e.name,audience_id:e.audienceId,preview_text:e.previewText,from:e.from,html:e.html,reply_to:e.replyTo,subject:e.subject,text:e.text},t)})}send(e,t){return f(this,null,function*(){return yield this.resend.post(`/broadcasts/${e}/send`,{scheduled_at:null==t?void 0:t.scheduledAt})})}list(){return f(this,null,function*(){return yield this.resend.get("/broadcasts")})}get(e){return f(this,null,function*(){return yield this.resend.get(`/broadcasts/${e}`)})}remove(e){return f(this,null,function*(){return yield this.resend.delete(`/broadcasts/${e}`)})}update(e,t){return f(this,null,function*(){return yield this.resend.patch(`/broadcasts/${e}`,{name:t.name,audience_id:t.audienceId,from:t.from,html:t.html,text:t.text,subject:t.subject,reply_to:t.replyTo,preview_text:t.previewText})})}},_=class{constructor(e){this.resend=e}create(e){return f(this,arguments,function*(e,t={}){return yield this.resend.post(`/audiences/${e.audienceId}/contacts`,{unsubscribed:e.unsubscribed,email:e.email,first_name:e.firstName,last_name:e.lastName},t)})}list(e){return f(this,null,function*(){return yield this.resend.get(`/audiences/${e.audienceId}/contacts`)})}get(e){return f(this,null,function*(){return e.id||e.email?yield this.resend.get(`/audiences/${e.audienceId}/contacts/${(null==e?void 0:e.email)?null==e?void 0:e.email:null==e?void 0:e.id}`):{data:null,error:{message:"Missing `id` or `email` field.",name:"missing_required_field"}}})}update(e){return f(this,null,function*(){return e.id||e.email?yield this.resend.patch(`/audiences/${e.audienceId}/contacts/${(null==e?void 0:e.email)?null==e?void 0:e.email:null==e?void 0:e.id}`,{unsubscribed:e.unsubscribed,first_name:e.firstName,last_name:e.lastName}):{data:null,error:{message:"Missing `id` or `email` field.",name:"missing_required_field"}}})}remove(e){return f(this,null,function*(){return e.id||e.email?yield this.resend.delete(`/audiences/${e.audienceId}/contacts/${(null==e?void 0:e.email)?null==e?void 0:e.email:null==e?void 0:e.id}`):{data:null,error:{message:"Missing `id` or `email` field.",name:"missing_required_field"}}})}},b=class{constructor(e){this.resend=e}create(e){return f(this,arguments,function*(e,t={}){return yield this.resend.post("/domains",{name:e.name,region:e.region,custom_return_path:e.customReturnPath},t)})}list(){return f(this,null,function*(){return yield this.resend.get("/domains")})}get(e){return f(this,null,function*(){return yield this.resend.get(`/domains/${e}`)})}update(e){return f(this,null,function*(){return yield this.resend.patch(`/domains/${e.id}`,{click_tracking:e.clickTracking,open_tracking:e.openTracking,tls:e.tls})})}remove(e){return f(this,null,function*(){return yield this.resend.delete(`/domains/${e}`)})}verify(e){return f(this,null,function*(){return yield this.resend.post(`/domains/${e}/verify`)})}},v=class{constructor(e){this.resend=e}send(e){return f(this,arguments,function*(e,t={}){return this.create(e,t)})}create(e){return f(this,arguments,function*(e,t={}){if(e.react){if(!this.renderAsync)try{let{renderAsync:e}=yield r.e(5486).then(r.t.bind(r,75486,19));this.renderAsync=e}catch(e){throw Error("Failed to render React component. Make sure to install `@react-email/render`")}e.html=yield this.renderAsync(e.react)}return yield this.resend.post("/emails",h(e),t)})}get(e){return f(this,null,function*(){return yield this.resend.get(`/emails/${e}`)})}update(e){return f(this,null,function*(){return yield this.resend.patch(`/emails/${e.id}`,{scheduled_at:e.scheduledAt})})}cancel(e){return f(this,null,function*(){return yield this.resend.post(`/emails/${e}/cancel`)})}},w="undefined"!=typeof process&&process.env&&process.env.RESEND_BASE_URL||"https://api.resend.com",x="undefined"!=typeof process&&process.env&&process.env.RESEND_USER_AGENT||"resend-node:6.0.2",E=class{constructor(e){if(this.key=e,this.apiKeys=new p(this),this.audiences=new m(this),this.batch=new g(this),this.broadcasts=new y(this),this.contacts=new _(this),this.domains=new b(this),this.emails=new v(this),!e&&("undefined"!=typeof process&&process.env&&(this.key=process.env.RESEND_API_KEY),!this.key))throw Error('Missing API key. Pass it to the constructor `new Resend("re_123")`');this.headers=new Headers({Authorization:`Bearer ${this.key}`,"User-Agent":x,"Content-Type":"application/json"})}fetchRequest(e){return f(this,arguments,function*(e,t={}){try{let r=yield fetch(`${w}${e}`,t);if(!r.ok)try{let e=yield r.text();return{data:null,error:JSON.parse(e)}}catch(t){if(t instanceof SyntaxError)return{data:null,error:{name:"application_error",message:"Internal server error. We are unable to process your request right now, please try again later."}};let e={message:r.statusText,name:"application_error"};if(t instanceof Error)return{data:null,error:u(c({},e),{message:t.message})};return{data:null,error:e}}return{data:yield r.json(),error:null}}catch(e){return{data:null,error:{name:"application_error",message:"Unable to fetch data. The request could not be resolved."}}}})}post(e,t){return f(this,arguments,function*(e,t,r={}){let n=new Headers(this.headers);r.idempotencyKey&&n.set("Idempotency-Key",r.idempotencyKey);let i=c({method:"POST",headers:n,body:JSON.stringify(t)},r);return this.fetchRequest(e,i)})}get(e){return f(this,arguments,function*(e,t={}){let r=c({method:"GET",headers:this.headers},t);return this.fetchRequest(e,r)})}put(e,t){return f(this,arguments,function*(e,t,r={}){let n=c({method:"PUT",headers:this.headers,body:JSON.stringify(t)},r);return this.fetchRequest(e,n)})}patch(e,t){return f(this,arguments,function*(e,t,r={}){let n=c({method:"PATCH",headers:this.headers,body:JSON.stringify(t)},r);return this.fetchRequest(e,n)})}delete(e,t){return f(this,null,function*(){let r={method:"DELETE",headers:this.headers,body:JSON.stringify(t)};return this.fetchRequest(e,r)})}}}};var t=require("../../../webpack-runtime.js");t.C(e);var r=e=>t(t.s=e),n=t.X(0,[9276,5972,9498,6468],()=>r(24889));module.exports=n})();