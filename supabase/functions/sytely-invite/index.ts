import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Methods":"POST, OPTIONS","Access-Control-Allow-Headers":"authorization, apikey, content-type"};
const respond=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}});
Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers:cors});
 if(req.method!=="POST")return respond({error:"Method not allowed"},405);
 try{
  const authHeader=req.headers.get("authorization");
  const url=Deno.env.get("SUPABASE_URL"),anon=Deno.env.get("SUPABASE_ANON_KEY"),service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if(!authHeader||!url||!anon||!service)return respond({error:"Authentication or server configuration is missing"},401);
  const userClient=createClient(url,anon,{global:{headers:{Authorization:authHeader}},auth:{persistSession:false,autoRefreshToken:false}});
  const {data:userData,error:userError}=await userClient.auth.getUser();
  if(userError||!userData.user)return respond({error:"Authentication required"},401);
  const length=Number(req.headers.get("content-length")||"0");if(length>5000)return respond({error:"Request too large"},413);
  const raw=await req.text();if(raw.length>5000)return respond({error:"Request too large"},413);
  let body:{project_id?:unknown;email?:unknown;role?:unknown};
  try{body=JSON.parse(raw);}catch{return respond({error:"Invalid JSON"},400);}
  const projectId=String(body.project_id||"");
  const email=String(body.email||"").trim().toLowerCase();
  const role=body.role==="viewer"?"viewer":"editor";
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(projectId))return respond({error:"Invalid project id"},400);
  if(email.length>320||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return respond({error:"Enter a valid email address"},400);
  if(email===String(userData.user.email||"").toLowerCase())return respond({error:"You already own this project"},400);
  const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:project,error:projectError}=await admin.from("sytely_projects").select("id,owner_id").eq("id",projectId).maybeSingle();
  if(projectError||!project||project.owner_id!==userData.user.id)return respond({error:"Only the project owner can invite collaborators"},403);
  const {data:users,error:listError}=await admin.auth.admin.listUsers({page:1,perPage:1000});
  if(listError)return respond({error:"Could not resolve invitation account"},500);
  let invitedUser=(users.users||[]).find(item=>String(item.email||"").toLowerCase()===email);
  if(!invitedUser){
    const {data:inviteData,error:inviteError}=await admin.auth.admin.inviteUserByEmail(email,{data:{sytely_project_id:projectId}});
    if(inviteError||!inviteData.user)return respond({error:inviteError?.message||"Invitation email could not be sent"},502);
    invitedUser=inviteData.user;
  }
  if(invitedUser.id===project.owner_id)return respond({error:"The owner is already a member"},400);
  const {error:memberError}=await admin.from("sytely_project_members").upsert({
    project_id:projectId,user_id:invitedUser.id,email,role,invited_at:new Date().toISOString()
  },{onConflict:"project_id,user_id"});
  if(memberError)return respond({error:"Invitation account resolved, but membership could not be saved"},500);
  return respond({ok:true,email,role,already_registered:!!invitedUser.email_confirmed_at});
 }catch(error){console.error("sytely-invite error",error);return respond({error:"Internal server error"},500);}
});
