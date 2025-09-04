"use strict";(()=>{var e={};e.id=526,e.ids=[526],e.modules={517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},3685:e=>{e.exports=require("http")},5687:e=>{e.exports=require("https")},5477:e=>{e.exports=require("punycode")},2781:e=>{e.exports=require("stream")},7310:e=>{e.exports=require("url")},9796:e=>{e.exports=require("zlib")},9069:(e,t,r)=>{r.r(t),r.d(t,{headerHooks:()=>z,originalPathname:()=>U,patchFetch:()=>D,requestAsyncStorage:()=>N,routeModule:()=>P,serverHooks:()=>F,staticGenerationAsyncStorage:()=>T,staticGenerationBailout:()=>M});var n={};r.r(n),r.d(n,{GET:()=>S,POST:()=>I});var s=r(5419),i=r(9108),o=r(9678),a=r(8070),l=r(4102),d=Object.defineProperty,c=Object.defineProperties,u=Object.getOwnPropertyDescriptors,h=Object.getOwnPropertySymbols,f=Object.prototype.hasOwnProperty,p=Object.prototype.propertyIsEnumerable,m=(e,t,r)=>t in e?d(e,t,{enumerable:!0,configurable:!0,writable:!0,value:r}):e[t]=r,y=(e,t)=>{for(var r in t||(t={}))f.call(t,r)&&m(e,r,t[r]);if(h)for(var r of h(t))p.call(t,r)&&m(e,r,t[r]);return e},g=(e,t)=>c(e,u(t)),b=(e,t,r)=>new Promise((n,s)=>{var i=e=>{try{a(r.next(e))}catch(e){s(e)}},o=e=>{try{a(r.throw(e))}catch(e){s(e)}},a=e=>e.done?n(e.value):Promise.resolve(e.value).then(i,o);a((r=r.apply(e,t)).next())}),_=class{constructor(e){this.resend=e}create(e){return b(this,arguments,function*(e,t={}){return yield this.resend.post("/api-keys",e,t)})}list(){return b(this,null,function*(){return yield this.resend.get("/api-keys")})}remove(e){return b(this,null,function*(){return yield this.resend.delete(`/api-keys/${e}`)})}},v=class{constructor(e){this.resend=e}create(e){return b(this,arguments,function*(e,t={}){return yield this.resend.post("/audiences",e,t)})}list(){return b(this,null,function*(){return yield this.resend.get("/audiences")})}get(e){return b(this,null,function*(){return yield this.resend.get(`/audiences/${e}`)})}remove(e){return b(this,null,function*(){return yield this.resend.delete(`/audiences/${e}`)})}};function w(e){var t;return{attachments:null==(t=e.attachments)?void 0:t.map(e=>({content:e.content,filename:e.filename,path:e.path,content_type:e.contentType,content_id:e.contentId})),bcc:e.bcc,cc:e.cc,from:e.from,headers:e.headers,html:e.html,reply_to:e.replyTo,scheduled_at:e.scheduledAt,subject:e.subject,tags:e.tags,text:e.text,to:e.to}}var x=class{constructor(e){this.resend=e}send(e){return b(this,arguments,function*(e,t={}){return this.create(e,t)})}create(e){return b(this,arguments,function*(e,t={}){let n=[];for(let t of e){if(t.react){if(!this.renderAsync)try{let{renderAsync:e}=yield r.e(486).then(r.t.bind(r,5486,19));this.renderAsync=e}catch(e){throw Error("Failed to render React component. Make sure to install `@react-email/render`")}t.html=yield this.renderAsync(t.react),t.react=void 0}n.push(w(t))}return yield this.resend.post("/emails/batch",n,t)})}},E=class{constructor(e){this.resend=e}create(e){return b(this,arguments,function*(e,t={}){if(e.react){if(!this.renderAsync)try{let{renderAsync:e}=yield r.e(486).then(r.t.bind(r,5486,19));this.renderAsync=e}catch(e){throw Error("Failed to render React component. Make sure to install `@react-email/render`")}e.html=yield this.renderAsync(e.react)}return yield this.resend.post("/broadcasts",{name:e.name,audience_id:e.audienceId,preview_text:e.previewText,from:e.from,html:e.html,reply_to:e.replyTo,subject:e.subject,text:e.text},t)})}send(e,t){return b(this,null,function*(){return yield this.resend.post(`/broadcasts/${e}/send`,{scheduled_at:null==t?void 0:t.scheduledAt})})}list(){return b(this,null,function*(){return yield this.resend.get("/broadcasts")})}get(e){return b(this,null,function*(){return yield this.resend.get(`/broadcasts/${e}`)})}remove(e){return b(this,null,function*(){return yield this.resend.delete(`/broadcasts/${e}`)})}update(e,t){return b(this,null,function*(){return yield this.resend.patch(`/broadcasts/${e}`,{name:t.name,audience_id:t.audienceId,from:t.from,html:t.html,text:t.text,subject:t.subject,reply_to:t.replyTo,preview_text:t.previewText})})}},$=class{constructor(e){this.resend=e}create(e){return b(this,arguments,function*(e,t={}){return yield this.resend.post(`/audiences/${e.audienceId}/contacts`,{unsubscribed:e.unsubscribed,email:e.email,first_name:e.firstName,last_name:e.lastName},t)})}list(e){return b(this,null,function*(){return yield this.resend.get(`/audiences/${e.audienceId}/contacts`)})}get(e){return b(this,null,function*(){return e.id||e.email?yield this.resend.get(`/audiences/${e.audienceId}/contacts/${(null==e?void 0:e.email)?null==e?void 0:e.email:null==e?void 0:e.id}`):{data:null,error:{message:"Missing `id` or `email` field.",name:"missing_required_field"}}})}update(e){return b(this,null,function*(){return e.id||e.email?yield this.resend.patch(`/audiences/${e.audienceId}/contacts/${(null==e?void 0:e.email)?null==e?void 0:e.email:null==e?void 0:e.id}`,{unsubscribed:e.unsubscribed,first_name:e.firstName,last_name:e.lastName}):{data:null,error:{message:"Missing `id` or `email` field.",name:"missing_required_field"}}})}remove(e){return b(this,null,function*(){return e.id||e.email?yield this.resend.delete(`/audiences/${e.audienceId}/contacts/${(null==e?void 0:e.email)?null==e?void 0:e.email:null==e?void 0:e.id}`):{data:null,error:{message:"Missing `id` or `email` field.",name:"missing_required_field"}}})}},A=class{constructor(e){this.resend=e}create(e){return b(this,arguments,function*(e,t={}){return yield this.resend.post("/domains",{name:e.name,region:e.region,custom_return_path:e.customReturnPath},t)})}list(){return b(this,null,function*(){return yield this.resend.get("/domains")})}get(e){return b(this,null,function*(){return yield this.resend.get(`/domains/${e}`)})}update(e){return b(this,null,function*(){return yield this.resend.patch(`/domains/${e.id}`,{click_tracking:e.clickTracking,open_tracking:e.openTracking,tls:e.tls})})}remove(e){return b(this,null,function*(){return yield this.resend.delete(`/domains/${e}`)})}verify(e){return b(this,null,function*(){return yield this.resend.post(`/domains/${e}/verify`)})}},j=class{constructor(e){this.resend=e}send(e){return b(this,arguments,function*(e,t={}){return this.create(e,t)})}create(e){return b(this,arguments,function*(e,t={}){if(e.react){if(!this.renderAsync)try{let{renderAsync:e}=yield r.e(486).then(r.t.bind(r,5486,19));this.renderAsync=e}catch(e){throw Error("Failed to render React component. Make sure to install `@react-email/render`")}e.html=yield this.renderAsync(e.react)}return yield this.resend.post("/emails",w(e),t)})}get(e){return b(this,null,function*(){return yield this.resend.get(`/emails/${e}`)})}update(e){return b(this,null,function*(){return yield this.resend.patch(`/emails/${e.id}`,{scheduled_at:e.scheduledAt})})}cancel(e){return b(this,null,function*(){return yield this.resend.post(`/emails/${e}/cancel`)})}},k="undefined"!=typeof process&&process.env&&process.env.RESEND_BASE_URL||"https://api.resend.com",O="undefined"!=typeof process&&process.env&&process.env.RESEND_USER_AGENT||"resend-node:6.0.2";let q=new class{constructor(e){if(this.key=e,this.apiKeys=new _(this),this.audiences=new v(this),this.batch=new x(this),this.broadcasts=new E(this),this.contacts=new $(this),this.domains=new A(this),this.emails=new j(this),!e&&("undefined"!=typeof process&&process.env&&(this.key=process.env.RESEND_API_KEY),!this.key))throw Error('Missing API key. Pass it to the constructor `new Resend("re_123")`');this.headers=new Headers({Authorization:`Bearer ${this.key}`,"User-Agent":O,"Content-Type":"application/json"})}fetchRequest(e){return b(this,arguments,function*(e,t={}){try{let r=yield fetch(`${k}${e}`,t);if(!r.ok)try{let e=yield r.text();return{data:null,error:JSON.parse(e)}}catch(t){if(t instanceof SyntaxError)return{data:null,error:{name:"application_error",message:"Internal server error. We are unable to process your request right now, please try again later."}};let e={message:r.statusText,name:"application_error"};if(t instanceof Error)return{data:null,error:g(y({},e),{message:t.message})};return{data:null,error:e}}return{data:yield r.json(),error:null}}catch(e){return{data:null,error:{name:"application_error",message:"Unable to fetch data. The request could not be resolved."}}}})}post(e,t){return b(this,arguments,function*(e,t,r={}){let n=new Headers(this.headers);r.idempotencyKey&&n.set("Idempotency-Key",r.idempotencyKey);let s=y({method:"POST",headers:n,body:JSON.stringify(t)},r);return this.fetchRequest(e,s)})}get(e){return b(this,arguments,function*(e,t={}){let r=y({method:"GET",headers:this.headers},t);return this.fetchRequest(e,r)})}put(e,t){return b(this,arguments,function*(e,t,r={}){let n=y({method:"PUT",headers:this.headers,body:JSON.stringify(t)},r);return this.fetchRequest(e,n)})}patch(e,t){return b(this,arguments,function*(e,t,r={}){let n=y({method:"PATCH",headers:this.headers,body:JSON.stringify(t)},r);return this.fetchRequest(e,n)})}delete(e,t){return b(this,null,function*(){let r={method:"DELETE",headers:this.headers,body:JSON.stringify(t)};return this.fetchRequest(e,r)})}}(process.env.RESEND_API_KEY);async function R({form:e,responses:t,recipientEmail:r}){try{let n=function(e,t){let r=new Date().toLocaleString("en-US",{weekday:"long",year:"numeric",month:"long",day:"numeric",hour:"2-digit",minute:"2-digit",timeZoneName:"short"});return`
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
          <p>${e.title}</p>
        </div>
        
        <div class="timestamp">
          <strong>Submitted:</strong> ${r}
        </div>
        
        <div class="content">
          ${function(e,t){let r={};e.forEach(e=>{let t=e.validation?.section||"General Information";r[t]||(r[t]=[]),r[t].push(e)});let n="";return Object.entries(r).forEach(([e,r])=>{n+=`
      <div class="response-section">
        <div class="section-title">${e}</div>
    `,r.forEach(e=>{var r;let s=(r=t[e.field_name]||t[e.name])?Array.isArray(r)?0===r.length?"":r.map(e=>`• ${e}`).join("<br>"):"rating"===e.field_type||"rating"===e.type?`${r} / 5 ⭐`:"string"==typeof r&&r.includes("\n")?r.replace(/\n/g,"<br>"):r:"";n+=`
        <div class="field">
          <div class="field-label">${e.field_label||e.label}</div>
          <div class="field-value ${s?"":"empty"}">
            ${s||"No response provided"}
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
  `}(e,t),s=await q.emails.send({from:"Aloa Forms <forms@aloa.agency>",to:r||"ross@aloa.agency",subject:`New Response: ${e.title}`,html:n});return{success:!0,data:s}}catch(e){return console.error("Error sending email:",e),{success:!1,error:e}}}async function S(e){try{let{searchParams:t}=new URL(e.url),r=t.get("formId");if(!r)return a.Z.json({error:"Form ID is required"},{status:400});let{data:n,error:s}=await l.O.from("form_responses").select(`
        *,
        form_response_answers (
          id,
          value,
          form_fields (
            field_name,
            field_label
          )
        )
      `).eq("form_id",r).order("submitted_at",{ascending:!1});if(s)throw s;let i=n.map(e=>{let t={};return e.form_response_answers?.forEach(e=>{if(e.form_fields?.field_name)try{let r=JSON.parse(e.value);t[e.form_fields.field_name]=r}catch{t[e.form_fields.field_name]=e.value}}),{...e,_id:e.id,formId:e.form_id,submittedAt:e.submitted_at,data:t}});return a.Z.json(i)}catch(e){return console.error("Error fetching responses:",e),a.Z.json({error:"Failed to fetch responses"},{status:500})}}async function I(e){try{let t=await e.json(),r={form_id:t.formId},{data:n,error:s}=await l.O.from("form_responses").insert([r]).select().single();if(s)throw s;let{data:i,error:o}=await l.O.from("form_fields").select("id, field_name").eq("form_id",t.formId);if(o)throw o;let d=new Map;i.forEach(e=>{d.set(e.field_name,e.id)});let c=t.data instanceof Map?t.data:new Map(Object.entries(t.data||{}));console.log("Form data received:",t.data),console.log("Field mapping:",Array.from(d.entries()));let u=[];if(c.forEach((e,t)=>{let r=d.get(t);if(r&&null!=e&&""!==e){let s="object"==typeof e?JSON.stringify(e):String(e);u.push({response_id:n.id,field_id:r,value:s}),console.log(`Storing answer for field ${t} (ID: ${r}):`,s)}else r||console.warn(`Field name '${t}' not found in field map`)}),u.length>0){console.log(`Inserting ${u.length} answers for response ${n.id}`);let{error:e}=await l.O.from("form_response_answers").insert(u);if(e)throw console.error("Error inserting answers:",e),await l.O.from("form_responses").delete().eq("id",n.id),e;console.log("Answers inserted successfully")}else console.warn("No answers to insert - form data may be empty");let{data:h,error:f}=await l.O.from("forms").select(`
        *,
        form_fields (
          id,
          field_name,
          field_label,
          field_type,
          field_order,
          validation
        )
      `).eq("id",t.formId).single();if(!f&&h)try{let e=await R({form:{id:h.id,title:h.title,fields:h.form_fields.sort((e,t)=>(e.field_order||0)-(t.field_order||0))},responses:t.data,recipientEmail:h.notification_email||"ross@aloa.agency"});e.success?console.log("Email notification sent successfully"):console.error("Failed to send email notification:",e.error)}catch(e){console.error("Error sending email notification:",e)}return a.Z.json({...n,_id:n.id,formId:n.form_id,submittedAt:n.submitted_at})}catch(e){return console.error("Error creating response:",e),a.Z.json({error:"Failed to save response"},{status:500})}}let P=new s.AppRouteRouteModule({definition:{kind:i.x.APP_ROUTE,page:"/api/responses/route",pathname:"/api/responses",filename:"route",bundlePath:"app/api/responses/route"},resolvedPagePath:"/Users/rosspalmer/Ross GitHub Projects/custom-forms/app/api/responses/route.js",nextConfigOutput:"",userland:n}),{requestAsyncStorage:N,staticGenerationAsyncStorage:T,serverHooks:F,headerHooks:z,staticGenerationBailout:M}=P,U="/api/responses/route";function D(){return(0,o.patchFetch)({serverHooks:F,staticGenerationAsyncStorage:T})}},4102:(e,t,r)=>{r.d(t,{O:()=>o});var n=r(2409);let s="https://eycgzjqwowrdmjlzqqyg.supabase.co",i="sb_publishable_eG0lH_ACpyOjqG44mN_5PA_1-oFLr5n",o=null;s&&i?o=(0,n.eI)(s,i):console.error("Warning: Supabase environment variables are missing")}};var t=require("../../../webpack-runtime.js");t.C(e);var r=e=>t(t.s=e),n=t.X(0,[638,409,206],()=>r(9069));module.exports=n})();