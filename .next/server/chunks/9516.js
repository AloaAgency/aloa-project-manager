"use strict";exports.id=9516,exports.ids=[9516],exports.modules={89516:(e,t,i)=>{function s(e){let t={summary:"",insights:[],trends:[],recommendations:[],synthesis:"",consensusAreas:[],divergenceAreas:[],statistics:{}};if(!e)return t;if(console.log("Parsing analysis text for email:",e.substring(0,500)),e.split(/##\s+/).forEach(e=>{let i=e.trim().split("\n"),s=i[0].toLowerCase(),o=i.slice(1).join("\n").trim();if(s.includes("summary")||s.includes("overview"))t.summary=o.replace(/^[-•*]\s*/gm,"").trim();else if(s.includes("strongly agree")||s.includes("team agrees")||s.includes("where your team strongly agrees"))o.split(/###\s+/).filter(Boolean).forEach(e=>{let i=e.trim().split("\n");if(i.length>0){let e=i[0].trim(),s=i.slice(1).join(" ").replace(/\*[^*]+\*/g,"").trim();e&&s&&t.consensusAreas.push({topic:e,description:s})}});else if(s.includes("differ")||s.includes("diverge")||s.includes("where perspectives differ"))o.split(/###\s+/).filter(Boolean).forEach(e=>{let i=e.trim().split("\n");if(i.length>0){let e=i[0].trim(),s=[];i.forEach(e=>{let t=e.match(/\*\*(.+?)\s*\(([\d.]+)%[^)]*\):\*\*\s*(.+)/);t&&s.push({label:t[1].trim(),percentage:t[2],description:t[3].trim()})}),e&&s.length>0&&t.divergenceAreas.push({topic:e,viewpoints:s})}});else if(s.includes("insight")||s.includes("finding")){let e=o.split(/^[-•*]\s+/m).filter(Boolean);t.insights=e.map(e=>e.trim())}else if(s.includes("trend")||s.includes("pattern")){let e=o.split(/^[-•*]\s+/m).filter(Boolean);t.trends=e.map(e=>e.trim())}else if(s.includes("recommend")||s.includes("suggestion")){let e=o.split(/^[\d.]+\s+/m).filter(Boolean);t.recommendations=e.map(e=>e.trim())}else s.includes("synthesis")||s.includes("path forward")?t.synthesis=o.replace(/^[-•*]\s*/gm,"").trim():(s.includes("statistic")||s.includes("metric"))&&o.split("\n").forEach(e=>{if(e.includes("Total")&&e.includes("Response")){let i=e.match(/\d+/);i&&(t.statistics.totalResponses=parseInt(i[0]))}if(e.includes("Completion")&&e.includes("Rate")){let i=e.match(/(\d+(?:\.\d+)?)\s*%/);i&&(t.statistics.completionRate=parseFloat(i[1]))}if(e.includes("Average")&&e.includes("Time")){let i=e.match(/(\d+(?:\.\d+)?)\s*(minute|second|hour)/i);i&&(t.statistics.averageTime=`${i[1]} ${i[2]}s`)}if(e.includes("overall alignment")){let i=e.match(/(\d+(?:\.\d+)?)\s*%/);i&&(t.statistics.consensusScore=parseFloat(i[1]))}})}),!t.summary&&0===t.insights.length&&0===t.trends.length){let i=e.split(/\n\n+/);i.length>0&&(t.summary=i[0].replace(/^#\s+/,"").trim())}return t}function o(e,t,i="",o=!0){let n=function(e,t,i="",o=!0){let n;let r=i?`Dear ${i},`:"Hello,";if("object"==typeof t&&null!==t)n=t;else if("string"==typeof t)try{n=t.startsWith("{")?JSON.parse(t):s(t)}catch(e){n=s(t)}else n={summary:"",consensusAreas:[],divergenceAreas:[],recommendations:[],synthesis:"",statistics:{}};return`
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
                Analysis based on ${n.statistics&&n.statistics.totalResponses?n.statistics.totalResponses:"all"} responses
              </p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              
              <!-- Greeting -->
              <p style="margin: 0 0 20px 0; color: #333333; font-size: 16px; line-height: 1.5;">
                ${r}
              </p>
              
              <!-- Introduction -->
              <p style="margin: 0 0 30px 0; color: #666666; font-size: 14px; line-height: 1.6;">
                ${o?`Thank you for participating in <strong>${e}</strong>. We've analyzed all responses and are pleased to share the collective insights from all participants. This summary highlights where there's consensus and where perspectives differ.`:`We're pleased to share the AI-powered analysis of the responses collected through <strong>${e}</strong>. This report provides valuable insights and recommendations based on the submitted data.`}
              </p>
              
              ${n.summary?`
              <!-- Executive Summary -->
              <div style="margin-bottom: 30px; padding: 20px; background-color: #FFF8E8; border-left: 4px solid #000000; border-radius: 4px;">
                <h2 style="margin: 0 0 15px 0; color: #000000; font-size: 18px; font-weight: 600;">Executive Summary</h2>
                <p style="margin: 0; color: #333333; font-size: 14px; line-height: 1.6;">
                  ${n.summary}
                </p>
              </div>
              `:""}
              
              ${o&&n.consensusAreas&&n.consensusAreas.length>0?`
              <!-- Where Your Team Agrees -->
              <div style="margin-bottom: 30px;">
                <h2 style="margin: 0 0 20px 0; color: #000000; font-size: 18px; font-weight: 600;">Where Your Team Strongly Agrees</h2>
                ${n.consensusAreas.map(e=>`
                  <div style="margin-bottom: 20px; padding: 15px; background-color: #e8f5e9; border-left: 4px solid #4caf50; border-radius: 4px;">
                    <h3 style="margin: 0 0 10px 0; color: #2e7d32; font-size: 16px; font-weight: 600;">${e.topic}</h3>
                    <p style="margin: 0; color: #333333; font-size: 14px; line-height: 1.6;">
                      ${e.description}
                    </p>
                  </div>
                `).join("")}
              </div>
              `:""}
              
              ${o&&n.divergenceAreas&&n.divergenceAreas.length>0?`
              <!-- Where Perspectives Differ -->
              <div style="margin-bottom: 30px;">
                <h2 style="margin: 0 0 10px 0; color: #000000; font-size: 18px; font-weight: 600;">Where Perspectives Differ</h2>
                <p style="margin: 0 0 20px 0; color: #666666; font-size: 14px; font-style: italic;">
                  These differences represent opportunities to create more comprehensive solutions:
                </p>
                ${n.divergenceAreas.map(e=>`
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
              
              ${!o&&n.insights&&n.insights.length>0?`
              <!-- Key Insights (Internal) -->
              <div style="margin-bottom: 30px;">
                <h2 style="margin: 0 0 15px 0; color: #000000; font-size: 18px; font-weight: 600;">Key Insights</h2>
                <ul style="margin: 0; padding-left: 20px; color: #333333;">
                  ${n.insights.map(e=>`
                    <li style="margin-bottom: 10px; font-size: 14px; line-height: 1.6;">${e}</li>
                  `).join("")}
                </ul>
              </div>
              `:""}
              
              ${!o&&n.trends&&n.trends.length>0?`
              <!-- Trends & Patterns (Internal) -->
              <div style="margin-bottom: 30px;">
                <h2 style="margin: 0 0 15px 0; color: #000000; font-size: 18px; font-weight: 600;">Trends & Patterns</h2>
                <ul style="margin: 0; padding-left: 20px; color: #333333;">
                  ${n.trends.map(e=>`
                    <li style="margin-bottom: 10px; font-size: 14px; line-height: 1.6;">${e}</li>
                  `).join("")}
                </ul>
              </div>
              `:""}
              
              ${n.recommendations&&n.recommendations.length>0&&!o?`
              <!-- Recommendations (Internal Only) -->
              <div style="margin-bottom: 30px; padding: 20px; background-color: #f8f9fa; border-radius: 4px;">
                <h2 style="margin: 0 0 15px 0; color: #000000; font-size: 18px; font-weight: 600;">Recommendations</h2>
                <ol style="margin: 0; padding-left: 20px; color: #333333;">
                  ${n.recommendations.map(e=>`
                    <li style="margin-bottom: 10px; font-size: 14px; line-height: 1.6; font-weight: 500;">${e}</li>
                  `).join("")}
                </ol>
              </div>
              `:""}
              
              ${n.synthesis&&o?`
              <!-- Synthesis & Path Forward -->
              <div style="margin-bottom: 30px; padding: 20px; background-color: #e8f4fd; border-radius: 4px; border-left: 4px solid #0066cc;">
                <h2 style="margin: 0 0 20px 0; color: #000000; font-size: 18px; font-weight: 600;">Synthesis & Path Forward</h2>
                <div style="color: #333333; font-size: 14px; line-height: 1.7;">
                  ${function(e){if(!e)return"";let t="";return e.split("\n\n").forEach(e=>{if(e.trim()){if(e.includes("**")&&e.includes(":**")){let i=e.replace(/\*\*([^:]+):\*\*/g,'<strong style="color: #0066cc; display: block; margin-bottom: 8px;">$1:</strong>').replace(/\*\*([^*]+)\*\*/g,"<strong>$1</strong>");t+=`<div style="margin: 0 0 16px 0;">${i}</div>`}else if(e.match(/^\d+\./m)){let i=e.split("\n").filter(e=>e.trim());t+='<ol style="margin: 0 0 16px 0; padding-left: 24px;">',i.forEach(e=>{let i=e.replace(/^\d+\.\s*/,"").trim();i&&(t+=`<li style="margin-bottom: 8px; line-height: 1.6;">${i}</li>`)}),t+="</ol>"}else{let i=e.replace(/\*\*([^*]+)\*\*/g,"<strong>$1</strong>");t+=`<p style="margin: 0 0 16px 0; line-height: 1.6;">${i}</p>`}}}),t}(n.synthesis)}
                </div>
              </div>
              `:""}
              
              ${n.statistics&&Object.keys(n.statistics).length>0?`
              <!-- Statistics -->
              <div style="margin-bottom: 30px;">
                <h2 style="margin: 0 0 15px 0; color: #000000; font-size: 18px; font-weight: 600;">Response Statistics</h2>
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                  ${void 0!==n.statistics.totalResponses?`
                  <tr>
                    <td style="padding: 8px 0; color: #666666; font-size: 14px;">Total Responses:</td>
                    <td style="padding: 8px 0; color: #000000; font-size: 14px; font-weight: 600; text-align: right;">${n.statistics.totalResponses}</td>
                  </tr>
                  `:""}
                  ${void 0!==n.statistics.completionRate?`
                  <tr>
                    <td style="padding: 8px 0; color: #666666; font-size: 14px;">Completion Rate:</td>
                    <td style="padding: 8px 0; color: #000000; font-size: 14px; font-weight: 600; text-align: right;">${n.statistics.completionRate}%</td>
                  </tr>
                  `:""}
                  ${void 0!==n.statistics.averageTime?`
                  <tr>
                    <td style="padding: 8px 0; color: #666666; font-size: 14px;">Average Time:</td>
                    <td style="padding: 8px 0; color: #000000; font-size: 14px; font-weight: 600; text-align: right;">${n.statistics.averageTime}</td>
                  </tr>
                  `:""}
                </table>
              </div>
              `:""}
              
              <!-- Closing -->
              <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
                ${o?`
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
  `}(e,t,i,o);return{html:n,preview:{subject:`${o?"Your Input Summary":"AI Analysis Report"}: ${e}`,greeting:i?`Dear ${i},`:"Hello,",isClientFacing:o,sections:function(e){let t=[];return e.includes("Executive Summary")&&t.push("Executive Summary"),e.includes("Key Insights")&&t.push("Key Insights"),e.includes("Areas of Divergence")&&t.push("Areas of Divergence"),e.includes("Synthesis & Path Forward")&&t.push("Synthesis & Path Forward"),e.includes("Recommendations")&&t.push("Recommendations"),e.includes("Response Statistics")&&t.push("Response Statistics"),t}(n)}}}i.d(t,{generateEmailPreview:()=>o})}};