import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";
const cors = {"Access-Control-Allow-Origin":"*","Access-Control-Allow-Methods":"GET, POST, OPTIONS","Access-Control-Allow-Headers":"authorization, apikey, content-type","X-Content-Type-Options":"nosniff","Referrer-Policy":"strict-origin-when-cross-origin"};
const respond=(body:string,status=200,type="text/plain; charset=utf-8")=>new Response(body,{status,headers:{...cors,"Content-Type":type}});
const client=()=>{const url=Deno.env.get("SUPABASE_URL"),key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");if(!url||!key)throw new Error("Server configuration is incomplete");return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});};
async function digest(value:string){const bytes=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value));return [...new Uint8Array(bytes)].map(n=>n.toString(16).padStart(2,"0")).join("");}
const escapeHtml=(value:unknown)=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]!));
const escapeRegExp=(value:string)=>value.split("").map(ch=>"\\^$.*+?()[]{}|".includes(ch)?"\\"+ch:ch).join("");
function renderCmsItems(items:Array<{title:string;body:string;slug:string;fields:Record<string,unknown>}>){return items.map(item=>'<article class="cms-generated-item" data-cms-slug="'+escapeHtml(item.slug)+'"><h2>'+escapeHtml(item.title)+'</h2>'+(item.body?'<p>'+escapeHtml(item.body).replace(/\n/g,"<br>")+'</p>':'')+Object.entries(item.fields||{}).map(([key,value])=>'<div class="cms-field" data-field="'+escapeHtml(key)+'">'+escapeHtml(value)+'</div>').join("")+'</article>').join("");}
function renderCollectionBindings(html:string,items:Array<{collection:string;title:string;body:string;slug:string;fields:Record<string,unknown>}>){
 for(const collection of [...new Set(items.map(item=>item.collection))]){
  const pattern=new RegExp('(<([a-z][\\w:-]*)\\b[^>]*data-cms-list="'+escapeRegExp(collection)+'"[^>]*>)[\\s\\S]*?(</\\2>)',"gi");
  const rendered=renderCmsItems(items.filter(item=>item.collection===collection));
  html=html.replace(pattern,(_match,opening,_tag,closing)=>opening+rendered+closing);
 }
 return html;
}
Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers:cors});
 if(req.method!=="GET"&&req.method!=="POST")return respond("Method not allowed",405);
 try{
  const url=new URL(req.url),slug=(url.searchParams.get("slug")||"").toLowerCase(),page=(url.searchParams.get("page")||"").toLowerCase();
  if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)||slug.length>60)return respond("Invalid site slug",400);
  if(page&&(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(page)||page.length>80))return respond("Invalid page route",400);
  const db=client();
  const {data:site,error}=await db.from("sytely_projects").select("id,slug,published_document,is_published").eq("slug",slug).eq("is_published",true).maybeSingle();
  if(error)return respond("Could not load published site",500);
  if(!site||!site.published_document)return respond("Published site not found",404);
  if(req.method==="GET"){
   const pages=site.published_document.pages&&typeof site.published_document.pages==="object"?site.published_document.pages as Record<string,unknown>:{};
   let html=page?pages[page]:site.published_document.html;
   if(typeof html!=="string"||!html.startsWith("<!doctype html>"))return respond(page?"Published page not found":"Published HTML is unavailable. Republish this site.",page?404:409);
   const {data:items,error:cmsError}=await db.from("sytely_cms_items").select("collection,title,body,slug,fields").eq("project_id",site.id).eq("is_published",true).order("updated_at",{ascending:false}).limit(500);
   if(!cmsError&&items)html=renderCollectionBindings(html,items as Array<{collection:string;title:string;body:string;slug:string;fields:Record<string,unknown>}>);
   return new Response(html,{status:200,headers:{...cors,"Content-Type":"text/html; charset=utf-8","Cache-Control":"public, max-age=30, s-maxage=60","Content-Security-Policy":"default-src 'self' https: data: blob:; img-src 'self' https: data: blob:; style-src 'self' 'unsafe-inline' https:; script-src 'self' 'unsafe-inline' https:; form-action 'self' https:; base-uri 'self'; frame-ancestors *","X-Content-Type-Options":"nosniff"}});
  }
  const length=Number(req.headers.get("content-length")||"0");if(length>12000)return respond("Submission too large",413);
  const raw=await req.text();if(raw.length>12000)return respond("Submission too large",413);
  let body:{payload?:unknown};try{body=JSON.parse(raw);}catch{return respond("Invalid JSON",400);}
  const payload=body?.payload;if(!payload||typeof payload!=="object"||Array.isArray(payload))return respond("Payload must be an object",400);
  const entries=Object.entries(payload as Record<string,unknown>);if(!entries.length||entries.length>40)return respond("Invalid field count",400);
  const clean:Record<string,string|number|boolean|null>={};
  for(const [key,value] of entries){if(!/^[a-zA-Z0-9_. -]{1,80}$/.test(key))return respond("Invalid field name",400);if(value!==null&&typeof value!=="string"&&typeof value!=="number"&&typeof value!=="boolean")return respond("Invalid field value",400);clean[key]=typeof value==="string"?value.slice(0,2000):value;}
  if(typeof clean.website==="string"&&clean.website.trim())return respond(JSON.stringify({ok:true}),200,"application/json; charset=utf-8");
  delete clean.website;
  const clientIp=req.headers.get("cf-connecting-ip")||req.headers.get("x-real-ip")||req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()||"unknown";
  const ipHash=await digest(slug+":"+clientIp+":"+(Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||""));
  const {data:accepted,error:submitError}=await db.rpc("sytely_submit_form",{p_project_id:site.id,p_payload:clean,p_ip_hash:ipHash});
  if(submitError)return respond("Could not save submission",500);
  if(accepted!==true)return respond("Too many submissions. Try again later.",429);
  return respond(JSON.stringify({ok:true}),200,"application/json; charset=utf-8");
 }catch(error){console.error("sytely-site error",error);return respond("Internal server error",500);}
});
