"use strict";(()=>{var e={};e.id=5342,e.ids=[5342],e.modules={20399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},30517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},32615:e=>{e.exports=require("http")},35240:e=>{e.exports=require("https")},68621:e=>{e.exports=require("punycode")},76162:e=>{e.exports=require("stream")},17360:e=>{e.exports=require("url")},71568:e=>{e.exports=require("zlib")},15519:(e,s,t)=>{t.r(s),t.d(s,{originalPathname:()=>h,patchFetch:()=>y,requestAsyncStorage:()=>m,routeModule:()=>u,serverHooks:()=>g,staticGenerationAsyncStorage:()=>f});var r={};t.r(r),t.d(r,{GET:()=>p,POST:()=>d});var a=t(49303),n=t(88716),o=t(60670),i=t(87070),l=t(76995);let c=new(t(67534)).ZP({apiKey:process.env.ANTHROPIC_API_KEY});async function p(e,{params:s}){try{let{formId:e}=s,{data:t,error:r}=await l.O.from("aloa_ai_analyses").select("*").eq("aloa_form_id",e).order("created_at",{ascending:!1}).limit(1).single();if(t&&!r)return i.NextResponse.json({analysis:t.analysis});return i.NextResponse.json({analysis:null})}catch(e){return console.error("Error fetching cached analysis:",e),i.NextResponse.json({analysis:null})}}async function d(e,{params:s}){try{let e;let{formId:t}=s,{data:r,error:a}=await l.O.from("aloa_forms").select(`
        *,
        aloa_form_fields (*)
      `).eq("id",t).single();if(a||!r)return i.NextResponse.json({error:"Form not found"},{status:404});let{data:n,error:o}=await l.O.from("aloa_form_responses").select("*").eq("aloa_form_id",t);if(o||!n||0===n.length)return i.NextResponse.json({error:"No responses found"},{status:404});let p={title:r.title,description:r.description,fields:r.aloa_form_fields.map(e=>({label:e.field_label,type:e.field_type,name:e.field_name,options:e.options}))},d=n.map(e=>e.responses),u=`You are an expert analyst tasked with analyzing survey/form responses to identify patterns, consensus, conflicts, and actionable insights.

Form Title: ${p.title}
Form Description: ${p.description||"N/A"}
Total Responses: ${n.length}

Form Structure:
${JSON.stringify(p.fields,null,2)}

Response Data:
${JSON.stringify(d,null,2)}

Please analyze these responses and provide a comprehensive analysis in the following JSON format:

{
  "executiveSummary": "A 2-3 sentence executive summary of the key findings",
  "totalResponses": ${n.length},
  "consensusScore": <0-100 percentage representing overall agreement level>,
  "confidence": <0-100 percentage representing your confidence in the analysis>,
  "consensusAreas": [
    {
      "topic": "Brief topic name",
      "description": "What respondents agree on",
      "agreementPercentage": <percentage who agree>
    }
  ],
  "conflictAreas": [
    {
      "topic": "Brief topic name",
      "viewpoints": [
        {
          "percentage": <percentage with this view>,
          "description": "Description of this viewpoint"
        }
      ]
    }
  ],
  "recommendations": [
    {
      "title": "Brief recommendation title",
      "description": "Detailed actionable recommendation",
      "priority": "high|medium|low"
    }
  ],
  "stakeholderMessage": "A professional message to stakeholders summarizing the consensus and recommended next steps (2-3 sentences)"
}

Important guidelines:
1. Be specific and reference actual response data
2. Identify both explicit agreements and implicit patterns
3. For conflicts, clearly show the different viewpoints and their prevalence
4. Recommendations should be actionable and based on the data
5. The stakeholder message should be diplomatic and action-oriented
6. Consider both quantitative data (ratings, selections) and qualitative data (text responses)
7. Look for themes across different questions that might be related`,m=await c.messages.create({model:"claude-3-haiku-20240307",max_tokens:4e3,temperature:.3,messages:[{role:"user",content:u}]});try{let s=m.content[0].text.match(/\{[\s\S]*\}/);if(s)e=JSON.parse(s[0]);else throw Error("Could not extract JSON from response")}catch(s){console.error("Error parsing AI response:",s),e={executiveSummary:"Analysis is being processed. Please try again.",totalResponses:n.length,consensusScore:0,confidence:0,consensusAreas:[],conflictAreas:[],recommendations:[],stakeholderMessage:"Analysis in progress."}}let{error:f}=await l.O.from("aloa_ai_analyses").insert({aloa_form_id:t,analysis:e,created_at:new Date().toISOString()});return f&&console.error("Error caching analysis:",f),i.NextResponse.json(e)}catch(e){return console.error("Error generating AI analysis:",e),i.NextResponse.json({error:"Failed to generate analysis"},{status:500})}}let u=new a.AppRouteRouteModule({definition:{kind:n.x.APP_ROUTE,page:"/api/ai-analysis/[formId]/route",pathname:"/api/ai-analysis/[formId]",filename:"route",bundlePath:"app/api/ai-analysis/[formId]/route"},resolvedPagePath:"/Users/rosspalmer/Ross GitHub Projects/aloa-web-design-project-manager/app/api/ai-analysis/[formId]/route.js",nextConfigOutput:"",userland:r}),{requestAsyncStorage:m,staticGenerationAsyncStorage:f,serverHooks:g}=u,h="/api/ai-analysis/[formId]/route";function y(){return(0,o.patchFetch)({serverHooks:g,staticGenerationAsyncStorage:f})}},76995:(e,s,t)=>{t.d(s,{O:()=>o});var r=t(69498);let a="https://eycgzjqwowrdmjlzqqyg.supabase.co",n="sb_publishable_eG0lH_ACpyOjqG44mN_5PA_1-oFLr5n",o=null;a&&n?o=(0,r.eI)(a,n):console.error("Warning: Supabase environment variables are missing")}};var s=require("../../../../webpack-runtime.js");s.C(e);var t=e=>s(s.s=e),r=s.X(0,[9276,5972,9498,7534],()=>t(15519));module.exports=r})();