"use strict";(()=>{var e={};e.id=8741,e.ids=[8741],e.modules={20399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},30517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},32615:e=>{e.exports=require("http")},35240:e=>{e.exports=require("https")},68621:e=>{e.exports=require("punycode")},76162:e=>{e.exports=require("stream")},17360:e=>{e.exports=require("url")},71568:e=>{e.exports=require("zlib")},26311:(e,t,s)=>{s.r(t),s.d(t,{originalPathname:()=>x,patchFetch:()=>b,requestAsyncStorage:()=>g,routeModule:()=>m,serverHooks:()=>y,staticGenerationAsyncStorage:()=>f});var r={};s.r(r),s.d(r,{POST:()=>h});var i=s(49303),n=s(88716),o=s(60670),a=s(87070),l=s(69498),d=s(2723);function c(e){let t={summary:"",insights:[],trends:[],recommendations:[],synthesis:"",consensusAreas:[],divergenceAreas:[],statistics:{}};if(!e)return t;if(console.log("Parsing analysis text for email:",e.substring(0,500)),e.split(/##\s+/).forEach(e=>{let s=e.trim().split("\n"),r=s[0].toLowerCase(),i=s.slice(1).join("\n").trim();if(r.includes("summary")||r.includes("overview"))t.summary=i.replace(/^[-•*]\s*/gm,"").trim();else if(r.includes("strongly agree")||r.includes("team agrees")||r.includes("where your team strongly agrees"))i.split(/###\s+/).filter(Boolean).forEach(e=>{let s=e.trim().split("\n");if(s.length>0){let e=s[0].trim(),r=s.slice(1).join(" ").replace(/\*[^*]+\*/g,"").trim();e&&r&&t.consensusAreas.push({topic:e,description:r})}});else if(r.includes("differ")||r.includes("diverge")||r.includes("where perspectives differ"))i.split(/###\s+/).filter(Boolean).forEach(e=>{let s=e.trim().split("\n");if(s.length>0){let e=s[0].trim(),r=[];s.forEach(e=>{let t=e.match(/\*\*(.+?)\s*\(([\d.]+)%[^)]*\):\*\*\s*(.+)/);t&&r.push({label:t[1].trim(),percentage:t[2],description:t[3].trim()})}),e&&r.length>0&&t.divergenceAreas.push({topic:e,viewpoints:r})}});else if(r.includes("insight")||r.includes("finding")){let e=i.split(/^[-•*]\s+/m).filter(Boolean);t.insights=e.map(e=>e.trim())}else if(r.includes("trend")||r.includes("pattern")){let e=i.split(/^[-•*]\s+/m).filter(Boolean);t.trends=e.map(e=>e.trim())}else if(r.includes("recommend")||r.includes("suggestion")){let e=i.split(/^[\d.]+\s+/m).filter(Boolean);t.recommendations=e.map(e=>e.trim())}else r.includes("synthesis")||r.includes("path forward")?t.synthesis=i.replace(/^[-•*]\s*/gm,"").trim():(r.includes("statistic")||r.includes("metric"))&&i.split("\n").forEach(e=>{if(e.includes("Total")&&e.includes("Response")){let s=e.match(/\d+/);s&&(t.statistics.totalResponses=parseInt(s[0]))}if(e.includes("Completion")&&e.includes("Rate")){let s=e.match(/(\d+(?:\.\d+)?)\s*%/);s&&(t.statistics.completionRate=parseFloat(s[1]))}if(e.includes("Average")&&e.includes("Time")){let s=e.match(/(\d+(?:\.\d+)?)\s*(minute|second|hour)/i);s&&(t.statistics.averageTime=`${s[1]} ${s[2]}s`)}if(e.includes("overall alignment")){let s=e.match(/(\d+(?:\.\d+)?)\s*%/);s&&(t.statistics.consensusScore=parseFloat(s[1]))}})}),!t.summary&&0===t.insights.length&&0===t.trends.length){let s=e.split(/\n\n+/);s.length>0&&(t.summary=s[0].replace(/^#\s+/,"").trim())}return t}let p=(0,l.eI)("https://eycgzjqwowrdmjlzqqyg.supabase.co","sb_publishable_eG0lH_ACpyOjqG44mN_5PA_1-oFLr5n"),u=process.env.RESEND_API_KEY?new d.R(process.env.RESEND_API_KEY):null;async function h(e,{params:t}){try{let s;let{formId:r}=t,{recipientEmail:i,recipientName:n,analysisText:o,formTitle:l,ccEmails:d=[],customSubject:h,isClientFacing:m=!0}=await e.json();if(!i||!o||!l)return a.NextResponse.json({error:"Recipient email, analysis text, and form title are required"},{status:400});if(!u)return console.warn("RESEND_API_KEY not configured, email sending disabled"),a.NextResponse.json({error:"Email service not configured. Please set up RESEND_API_KEY."},{status:503});try{s="string"==typeof o&&o.startsWith("{")?JSON.parse(o):o}catch(e){s=o}let g=function(e,t,s="",r=!0){let i;let n=s?`Dear ${s},`:"Hello,";if("object"==typeof t&&null!==t)i=t;else if("string"==typeof t)try{i=t.startsWith("{")?JSON.parse(t):c(t)}catch(e){i=c(t)}else i={summary:"",consensusAreas:[],divergenceAreas:[],recommendations:[],synthesis:"",statistics:{}};return`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AI Analysis Report - ${e}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background-color: #000000; padding: 40px 30px; text-align: center; border-radius: 8px 8px 0 0;">
              <!-- Aloa Logo -->
              <img src="https://images.ctfassets.net/qkznfzcikv51/xWpsUAypBrRgAjmbyLGYy/b969f4353174e4f209996ebf60af8f7c/aloa_-_white.svg" 
                   alt="Aloa" 
                   style="height: 40px; width: auto; margin: 0 auto 20px auto; display: block;"
              />
              <!-- Form Title -->
              <h1 style="margin: 0 0 10px 0; color: #FFF8E8; font-size: 28px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
                ${e}
              </h1>
              <!-- Subtitle -->
              <p style="margin: 0; color: #FFF8E8; font-size: 16px; opacity: 0.9;">
                Analysis based on ${i.statistics&&i.statistics.totalResponses?i.statistics.totalResponses:"all"} responses
              </p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              
              <!-- Greeting -->
              <p style="margin: 0 0 20px 0; color: #333333; font-size: 16px; line-height: 1.5;">
                ${n}
              </p>
              
              <!-- Introduction -->
              <p style="margin: 0 0 30px 0; color: #666666; font-size: 14px; line-height: 1.6;">
                ${r?`Thank you for participating in <strong>${e}</strong>. We've analyzed all responses and are pleased to share the collective insights from all participants. This summary highlights where there's consensus and where perspectives differ.`:`We're pleased to share the AI-powered analysis of the responses collected through <strong>${e}</strong>. This report provides valuable insights and recommendations based on the submitted data.`}
              </p>
              
              ${i.summary?`
              <!-- Executive Summary -->
              <div style="margin-bottom: 30px; padding: 20px; background-color: #FFF8E8; border-left: 4px solid #000000; border-radius: 4px;">
                <h2 style="margin: 0 0 15px 0; color: #000000; font-size: 18px; font-weight: 600;">Executive Summary</h2>
                <p style="margin: 0; color: #333333; font-size: 14px; line-height: 1.6;">
                  ${i.summary}
                </p>
              </div>
              `:""}
              
              ${r&&i.consensusAreas&&i.consensusAreas.length>0?`
              <!-- Where Your Team Agrees -->
              <div style="margin-bottom: 30px;">
                <h2 style="margin: 0 0 20px 0; color: #000000; font-size: 18px; font-weight: 600;">Where Your Team Strongly Agrees</h2>
                ${i.consensusAreas.map(e=>`
                  <div style="margin-bottom: 20px; padding: 15px; background-color: #e8f5e9; border-left: 4px solid #4caf50; border-radius: 4px;">
                    <h3 style="margin: 0 0 10px 0; color: #2e7d32; font-size: 16px; font-weight: 600;">${e.topic}</h3>
                    <p style="margin: 0; color: #333333; font-size: 14px; line-height: 1.6;">
                      ${e.description}
                    </p>
                  </div>
                `).join("")}
              </div>
              `:""}
              
              ${r&&i.divergenceAreas&&i.divergenceAreas.length>0?`
              <!-- Where Perspectives Differ -->
              <div style="margin-bottom: 30px;">
                <h2 style="margin: 0 0 10px 0; color: #000000; font-size: 18px; font-weight: 600;">Where Perspectives Differ</h2>
                <p style="margin: 0 0 20px 0; color: #666666; font-size: 14px; font-style: italic;">
                  These differences represent opportunities to create more comprehensive solutions:
                </p>
                ${i.divergenceAreas.map(e=>`
                  <div style="margin-bottom: 20px; padding: 15px; background-color: #fff3e0; border-left: 4px solid #ff9800; border-radius: 4px;">
                    <h3 style="margin: 0 0 12px 0; color: #e65100; font-size: 16px; font-weight: 600;">${e.topic}</h3>
                    ${e.viewpoints&&e.viewpoints.map(e=>`
                      <div style="margin-bottom: 10px; padding: 10px; background-color: white; border-radius: 4px;">
                        <strong style="color: #333333; font-size: 13px;">${e.label} (${e.percentage}% of team):</strong>
                        <p style="margin: 5px 0 0 0; color: #666666; font-size: 13px; line-height: 1.5;">
                          ${e.description}
                        </p>
                      </div>
                    `).join("")}
                  </div>
                `).join("")}
              </div>
              `:""}
              
              ${!r&&i.insights&&i.insights.length>0?`
              <!-- Key Insights (Internal) -->
              <div style="margin-bottom: 30px;">
                <h2 style="margin: 0 0 15px 0; color: #000000; font-size: 18px; font-weight: 600;">Key Insights</h2>
                <ul style="margin: 0; padding-left: 20px; color: #333333;">
                  ${i.insights.map(e=>`
                    <li style="margin-bottom: 10px; font-size: 14px; line-height: 1.6;">${e}</li>
                  `).join("")}
                </ul>
              </div>
              `:""}
              
              ${!r&&i.trends&&i.trends.length>0?`
              <!-- Trends & Patterns (Internal) -->
              <div style="margin-bottom: 30px;">
                <h2 style="margin: 0 0 15px 0; color: #000000; font-size: 18px; font-weight: 600;">Trends & Patterns</h2>
                <ul style="margin: 0; padding-left: 20px; color: #333333;">
                  ${i.trends.map(e=>`
                    <li style="margin-bottom: 10px; font-size: 14px; line-height: 1.6;">${e}</li>
                  `).join("")}
                </ul>
              </div>
              `:""}
              
              ${i.recommendations&&i.recommendations.length>0&&!r?`
              <!-- Recommendations (Internal Only) -->
              <div style="margin-bottom: 30px; padding: 20px; background-color: #f8f9fa; border-radius: 4px;">
                <h2 style="margin: 0 0 15px 0; color: #000000; font-size: 18px; font-weight: 600;">Recommendations</h2>
                <ol style="margin: 0; padding-left: 20px; color: #333333;">
                  ${i.recommendations.map(e=>`
                    <li style="margin-bottom: 10px; font-size: 14px; line-height: 1.6; font-weight: 500;">${e}</li>
                  `).join("")}
                </ol>
              </div>
              `:""}
              
              ${i.synthesis&&r?`
              <!-- Synthesis & Path Forward -->
              <div style="margin-bottom: 30px; padding: 20px; background-color: #e8f4fd; border-radius: 4px; border-left: 4px solid #0066cc;">
                <h2 style="margin: 0 0 20px 0; color: #000000; font-size: 18px; font-weight: 600;">Synthesis & Path Forward</h2>
                <div style="color: #333333; font-size: 14px; line-height: 1.7;">
                  ${function(e){if(!e)return"";let t="";return e.split("\n\n").forEach(e=>{if(e.trim()){if(e.includes("**")&&e.includes(":**")){let s=e.replace(/\*\*([^:]+):\*\*/g,'<strong style="color: #0066cc; display: block; margin-bottom: 8px;">$1:</strong>').replace(/\*\*([^*]+)\*\*/g,"<strong>$1</strong>");t+=`<div style="margin: 0 0 16px 0;">${s}</div>`}else if(e.match(/^\d+\./m)){let s=e.split("\n").filter(e=>e.trim());t+='<ol style="margin: 0 0 16px 0; padding-left: 24px;">',s.forEach(e=>{let s=e.replace(/^\d+\.\s*/,"").trim();s&&(t+=`<li style="margin-bottom: 8px; line-height: 1.6;">${s}</li>`)}),t+="</ol>"}else{let s=e.replace(/\*\*([^*]+)\*\*/g,"<strong>$1</strong>");t+=`<p style="margin: 0 0 16px 0; line-height: 1.6;">${s}</p>`}}}),t}(i.synthesis)}
                </div>
              </div>
              `:""}
              
              ${i.statistics&&Object.keys(i.statistics).length>0?`
              <!-- Statistics -->
              <div style="margin-bottom: 30px;">
                <h2 style="margin: 0 0 15px 0; color: #000000; font-size: 18px; font-weight: 600;">Response Statistics</h2>
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                  ${void 0!==i.statistics.totalResponses?`
                  <tr>
                    <td style="padding: 8px 0; color: #666666; font-size: 14px;">Total Responses:</td>
                    <td style="padding: 8px 0; color: #000000; font-size: 14px; font-weight: 600; text-align: right;">${i.statistics.totalResponses}</td>
                  </tr>
                  `:""}
                  ${void 0!==i.statistics.completionRate?`
                  <tr>
                    <td style="padding: 8px 0; color: #666666; font-size: 14px;">Completion Rate:</td>
                    <td style="padding: 8px 0; color: #000000; font-size: 14px; font-weight: 600; text-align: right;">${i.statistics.completionRate}%</td>
                  </tr>
                  `:""}
                  ${void 0!==i.statistics.averageTime?`
                  <tr>
                    <td style="padding: 8px 0; color: #666666; font-size: 14px;">Average Time:</td>
                    <td style="padding: 8px 0; color: #000000; font-size: 14px; font-weight: 600; text-align: right;">${i.statistics.averageTime}</td>
                  </tr>
                  `:""}
                </table>
              </div>
              `:""}
              
              <!-- Closing -->
              <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
                ${r?`
                  <p style="margin: 0 0 20px 0; color: #666666; font-size: 14px; line-height: 1.6;">
                    This analysis represents the collective input from all participants. We appreciate your contribution to this collaborative process.
                  </p>
                  <p style="margin: 0 0 20px 0; color: #666666; font-size: 14px; line-height: 1.6;">
                    If you have any questions about these findings or would like to discuss next steps, please don't hesitate to reach out to our team.
                  </p>
                `:`
                  <p style="margin: 0 0 20px 0; color: #666666; font-size: 14px; line-height: 1.6;">
                    For a more detailed analysis and to download the full report, please visit your dashboard.
                  </p>
                  <p style="margin: 0 0 20px 0; color: #666666; font-size: 14px; line-height: 1.6;">
                    Thank you for using Aloa\xae Custom Forms. If you have any questions about this analysis, please don't hesitate to reach out.
                  </p>
                `}
              </div>
              
              <p style="margin: 20px 0 0 0; color: #666666; font-size: 14px;">
                Best regards,<br>
                <strong>The Aloa\xae Team</strong>
              </p>
              
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px; background-color: #f8f9fa; text-align: center; border-radius: 0 0 8px 8px;">
              <p style="margin: 0 0 10px 0; color: #999999; font-size: 12px;">
                This report was generated on ${new Date().toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric",hour:"2-digit",minute:"2-digit"})}
              </p>
              <p style="margin: 0; color: #999999; font-size: 12px;">
                \xa9 ${new Date().getFullYear()} Aloa\xae. All rights reserved.
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `}(l,s,n,m),f={from:process.env.EMAIL_FROM||"Aloa\xae Forms <forms@updates.aloa.agency>",to:i,subject:h||(m?`Your Input Summary: ${l}`:`AI Analysis Report: ${l}`),html:g,text:`
AI Analysis Report - ${l}

${o}

---
Generated on ${new Date().toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric",hour:"2-digit",minute:"2-digit"})}

Powered by Aloa\xae Custom Forms
  `.trim()};d.length>0&&(f.cc=d);let{data:y,error:x}=await u.emails.send(f);if(x)return console.error("Error sending analysis email:",x),a.NextResponse.json({error:"Failed to send email",details:x.message},{status:500});if(console.log(`Analysis email sent successfully for form ${r} to ${i}`),p)try{await p.from("aloa_email_logs").insert({aloa_form_id:r,recipient:i,email_type:m?"client_analysis":"ai_analysis",sent_at:new Date().toISOString(),status:"sent"})}catch(e){console.error("Failed to log email send:",e)}return a.NextResponse.json({success:!0,message:"Analysis email sent successfully",emailId:y?.id})}catch(e){return console.error("Error in email analysis endpoint:",e),a.NextResponse.json({error:"Failed to send analysis email"},{status:500})}}let m=new i.AppRouteRouteModule({definition:{kind:n.x.APP_ROUTE,page:"/api/ai-analysis/[formId]/email/route",pathname:"/api/ai-analysis/[formId]/email",filename:"route",bundlePath:"app/api/ai-analysis/[formId]/email/route"},resolvedPagePath:"/Users/rosspalmer/Ross GitHub Projects/aloa-web-design-project-manager/app/api/ai-analysis/[formId]/email/route.js",nextConfigOutput:"",userland:r}),{requestAsyncStorage:g,staticGenerationAsyncStorage:f,serverHooks:y}=m,x="/api/ai-analysis/[formId]/email/route";function b(){return(0,o.patchFetch)({serverHooks:y,staticGenerationAsyncStorage:f})}},2723:(e,t,s)=>{s.d(t,{R:()=>A});var r=Object.defineProperty,i=Object.defineProperties,n=Object.getOwnPropertyDescriptors,o=Object.getOwnPropertySymbols,a=Object.prototype.hasOwnProperty,l=Object.prototype.propertyIsEnumerable,d=(e,t,s)=>t in e?r(e,t,{enumerable:!0,configurable:!0,writable:!0,value:s}):e[t]=s,c=(e,t)=>{for(var s in t||(t={}))a.call(t,s)&&d(e,s,t[s]);if(o)for(var s of o(t))l.call(t,s)&&d(e,s,t[s]);return e},p=(e,t)=>i(e,n(t)),u=(e,t,s)=>new Promise((r,i)=>{var n=e=>{try{a(s.next(e))}catch(e){i(e)}},o=e=>{try{a(s.throw(e))}catch(e){i(e)}},a=e=>e.done?r(e.value):Promise.resolve(e.value).then(n,o);a((s=s.apply(e,t)).next())}),h=class{constructor(e){this.resend=e}create(e){return u(this,arguments,function*(e,t={}){return yield this.resend.post("/api-keys",e,t)})}list(){return u(this,null,function*(){return yield this.resend.get("/api-keys")})}remove(e){return u(this,null,function*(){return yield this.resend.delete(`/api-keys/${e}`)})}},m=class{constructor(e){this.resend=e}create(e){return u(this,arguments,function*(e,t={}){return yield this.resend.post("/audiences",e,t)})}list(){return u(this,null,function*(){return yield this.resend.get("/audiences")})}get(e){return u(this,null,function*(){return yield this.resend.get(`/audiences/${e}`)})}remove(e){return u(this,null,function*(){return yield this.resend.delete(`/audiences/${e}`)})}};function g(e){var t;return{attachments:null==(t=e.attachments)?void 0:t.map(e=>({content:e.content,filename:e.filename,path:e.path,content_type:e.contentType,content_id:e.contentId})),bcc:e.bcc,cc:e.cc,from:e.from,headers:e.headers,html:e.html,reply_to:e.replyTo,scheduled_at:e.scheduledAt,subject:e.subject,tags:e.tags,text:e.text,to:e.to}}var f=class{constructor(e){this.resend=e}send(e){return u(this,arguments,function*(e,t={}){return this.create(e,t)})}create(e){return u(this,arguments,function*(e,t={}){let r=[];for(let t of e){if(t.react){if(!this.renderAsync)try{let{renderAsync:e}=yield s.e(5486).then(s.t.bind(s,75486,19));this.renderAsync=e}catch(e){throw Error("Failed to render React component. Make sure to install `@react-email/render`")}t.html=yield this.renderAsync(t.react),t.react=void 0}r.push(g(t))}return yield this.resend.post("/emails/batch",r,t)})}},y=class{constructor(e){this.resend=e}create(e){return u(this,arguments,function*(e,t={}){if(e.react){if(!this.renderAsync)try{let{renderAsync:e}=yield s.e(5486).then(s.t.bind(s,75486,19));this.renderAsync=e}catch(e){throw Error("Failed to render React component. Make sure to install `@react-email/render`")}e.html=yield this.renderAsync(e.react)}return yield this.resend.post("/broadcasts",{name:e.name,audience_id:e.audienceId,preview_text:e.previewText,from:e.from,html:e.html,reply_to:e.replyTo,subject:e.subject,text:e.text},t)})}send(e,t){return u(this,null,function*(){return yield this.resend.post(`/broadcasts/${e}/send`,{scheduled_at:null==t?void 0:t.scheduledAt})})}list(){return u(this,null,function*(){return yield this.resend.get("/broadcasts")})}get(e){return u(this,null,function*(){return yield this.resend.get(`/broadcasts/${e}`)})}remove(e){return u(this,null,function*(){return yield this.resend.delete(`/broadcasts/${e}`)})}update(e,t){return u(this,null,function*(){return yield this.resend.patch(`/broadcasts/${e}`,{name:t.name,audience_id:t.audienceId,from:t.from,html:t.html,text:t.text,subject:t.subject,reply_to:t.replyTo,preview_text:t.previewText})})}},x=class{constructor(e){this.resend=e}create(e){return u(this,arguments,function*(e,t={}){return yield this.resend.post(`/audiences/${e.audienceId}/contacts`,{unsubscribed:e.unsubscribed,email:e.email,first_name:e.firstName,last_name:e.lastName},t)})}list(e){return u(this,null,function*(){return yield this.resend.get(`/audiences/${e.audienceId}/contacts`)})}get(e){return u(this,null,function*(){return e.id||e.email?yield this.resend.get(`/audiences/${e.audienceId}/contacts/${(null==e?void 0:e.email)?null==e?void 0:e.email:null==e?void 0:e.id}`):{data:null,error:{message:"Missing `id` or `email` field.",name:"missing_required_field"}}})}update(e){return u(this,null,function*(){return e.id||e.email?yield this.resend.patch(`/audiences/${e.audienceId}/contacts/${(null==e?void 0:e.email)?null==e?void 0:e.email:null==e?void 0:e.id}`,{unsubscribed:e.unsubscribed,first_name:e.firstName,last_name:e.lastName}):{data:null,error:{message:"Missing `id` or `email` field.",name:"missing_required_field"}}})}remove(e){return u(this,null,function*(){return e.id||e.email?yield this.resend.delete(`/audiences/${e.audienceId}/contacts/${(null==e?void 0:e.email)?null==e?void 0:e.email:null==e?void 0:e.id}`):{data:null,error:{message:"Missing `id` or `email` field.",name:"missing_required_field"}}})}},b=class{constructor(e){this.resend=e}create(e){return u(this,arguments,function*(e,t={}){return yield this.resend.post("/domains",{name:e.name,region:e.region,custom_return_path:e.customReturnPath},t)})}list(){return u(this,null,function*(){return yield this.resend.get("/domains")})}get(e){return u(this,null,function*(){return yield this.resend.get(`/domains/${e}`)})}update(e){return u(this,null,function*(){return yield this.resend.patch(`/domains/${e.id}`,{click_tracking:e.clickTracking,open_tracking:e.openTracking,tls:e.tls})})}remove(e){return u(this,null,function*(){return yield this.resend.delete(`/domains/${e}`)})}verify(e){return u(this,null,function*(){return yield this.resend.post(`/domains/${e}/verify`)})}},v=class{constructor(e){this.resend=e}send(e){return u(this,arguments,function*(e,t={}){return this.create(e,t)})}create(e){return u(this,arguments,function*(e,t={}){if(e.react){if(!this.renderAsync)try{let{renderAsync:e}=yield s.e(5486).then(s.t.bind(s,75486,19));this.renderAsync=e}catch(e){throw Error("Failed to render React component. Make sure to install `@react-email/render`")}e.html=yield this.renderAsync(e.react)}return yield this.resend.post("/emails",g(e),t)})}get(e){return u(this,null,function*(){return yield this.resend.get(`/emails/${e}`)})}update(e){return u(this,null,function*(){return yield this.resend.patch(`/emails/${e.id}`,{scheduled_at:e.scheduledAt})})}cancel(e){return u(this,null,function*(){return yield this.resend.post(`/emails/${e}/cancel`)})}},$="undefined"!=typeof process&&process.env&&process.env.RESEND_BASE_URL||"https://api.resend.com",w="undefined"!=typeof process&&process.env&&process.env.RESEND_USER_AGENT||"resend-node:6.0.2",A=class{constructor(e){if(this.key=e,this.apiKeys=new h(this),this.audiences=new m(this),this.batch=new f(this),this.broadcasts=new y(this),this.contacts=new x(this),this.domains=new b(this),this.emails=new v(this),!e&&("undefined"!=typeof process&&process.env&&(this.key=process.env.RESEND_API_KEY),!this.key))throw Error('Missing API key. Pass it to the constructor `new Resend("re_123")`');this.headers=new Headers({Authorization:`Bearer ${this.key}`,"User-Agent":w,"Content-Type":"application/json"})}fetchRequest(e){return u(this,arguments,function*(e,t={}){try{let s=yield fetch(`${$}${e}`,t);if(!s.ok)try{let e=yield s.text();return{data:null,error:JSON.parse(e)}}catch(t){if(t instanceof SyntaxError)return{data:null,error:{name:"application_error",message:"Internal server error. We are unable to process your request right now, please try again later."}};let e={message:s.statusText,name:"application_error"};if(t instanceof Error)return{data:null,error:p(c({},e),{message:t.message})};return{data:null,error:e}}return{data:yield s.json(),error:null}}catch(e){return{data:null,error:{name:"application_error",message:"Unable to fetch data. The request could not be resolved."}}}})}post(e,t){return u(this,arguments,function*(e,t,s={}){let r=new Headers(this.headers);s.idempotencyKey&&r.set("Idempotency-Key",s.idempotencyKey);let i=c({method:"POST",headers:r,body:JSON.stringify(t)},s);return this.fetchRequest(e,i)})}get(e){return u(this,arguments,function*(e,t={}){let s=c({method:"GET",headers:this.headers},t);return this.fetchRequest(e,s)})}put(e,t){return u(this,arguments,function*(e,t,s={}){let r=c({method:"PUT",headers:this.headers,body:JSON.stringify(t)},s);return this.fetchRequest(e,r)})}patch(e,t){return u(this,arguments,function*(e,t,s={}){let r=c({method:"PATCH",headers:this.headers,body:JSON.stringify(t)},s);return this.fetchRequest(e,r)})}delete(e,t){return u(this,null,function*(){let s={method:"DELETE",headers:this.headers,body:JSON.stringify(t)};return this.fetchRequest(e,s)})}}}};var t=require("../../../../../webpack-runtime.js");t.C(e);var s=e=>t(t.s=e),r=t.X(0,[9276,5972,9498],()=>s(26311));module.exports=r})();