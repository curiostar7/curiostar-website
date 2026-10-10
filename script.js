/*
  CurioStar client + admin system
  1) Create a free Supabase project.
  2) Put your Project URL and anon/publishable key below.
  3) Run supabase.sql in Supabase SQL Editor.
  4) Change ADMIN_EMAIL to your own login email.
*/
const SUPABASE_URL ="https://yixzubpftqxiifiznyoj.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_0m04iYn3Jsx2Nq5NI0T-GQ_QwCKz1Sl";
const ADMIN_EMAIL = "YOUR_ADMIN_EMAIL";

let sb = null;
if (window.supabase && !SUPABASE_URL.startsWith("PASTE_") && !SUPABASE_ANON_KEY.startsWith("PASTE_")) {
  sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

const $ = (id) => document.getElementById(id);
const escapeHtml = (s="") => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));

function show(id, yes=true){ const el=$(id); if(el) el.classList.toggle("hidden", !yes); }
function msg(id, text){ if($(id)) $(id).textContent=text; }

async function loadProfile(user){
  if(!sb || !user) return null;
  const {data,error}=await sb.from("profiles").select("role,display_name").eq("id",user.id).maybeSingle();
  if(error){ console.error(error); return null; }
  return data;
}

async function refreshAuth(){
  if(!sb){
    msg("authMessage","Website is ready, but the Supabase connection has not been configured yet. See README.");
    return;
  }
  const {data:{session}}=await sb.auth.getSession();
  const user=session?.user;
  if(!user){
    show("clientPanel",false); show("clientReplies",false); show("adminPanel",false);
    show("signUpBtn",true); show("signInBtn",true); show("signOutBtn",false);
    return;
  }
  show("signUpBtn",false); show("signInBtn",false); show("signOutBtn",true);
  msg("authMessage",`Signed in as ${user.email}`);
  show("clientPanel",true); show("clientReplies",true);
  const profile=await loadProfile(user);
  const isAdmin = user.email?.toLowerCase()===ADMIN_EMAIL.toLowerCase() || profile?.role==="admin";
  show("adminPanel",isAdmin);
  await loadClientRequests(user.id);
  if(isAdmin) await loadAdminRequests();
}

$("signUpBtn")?.addEventListener("click", async ()=>{
  if(!sb) return msg("authMessage","Configure Supabase first (see README).");
  const email=$("authEmail").value.trim(), password=$("authPassword").value;
  if(!email || password.length<6) return msg("authMessage","Enter an email and a password of at least 6 characters.");
  const {data,error}=await sb.auth.signUp({email,password});
  if(error) return msg("authMessage",error.message);
  msg("authMessage",data.session ? "Account created and signed in." : "Account created. Check your email to confirm it, then sign in.");
});

$("signInBtn")?.addEventListener("click", async ()=>{
  if(!sb) return msg("authMessage","Configure Supabase first (see README).");
  const email=$("authEmail").value.trim(), password=$("authPassword").value;
  const {error}=await sb.auth.signInWithPassword({email,password});
  msg("authMessage",error ? error.message : "Signed in successfully.");
  if(!error) await refreshAuth();
});

$("signOutBtn")?.addEventListener("click", async ()=>{
  if(sb) await sb.auth.signOut();
  await refreshAuth();
});

$("submitConsultation")?.addEventListener("click", async ()=>{
  if(!sb) return msg("consultMessage","Configure Supabase first (see README).");
  const {data:{user}}=await sb.auth.getUser();
  if(!user) return msg("consultMessage","Please sign in first.");
  const payload={
    user_id:user.id,
    name:$("clientName").value.trim(),
    dob:$("clientDob").value || null,
    tob:$("clientTob").value || null,
    pob:$("clientPob").value.trim(),
    question:$("clientQuestion").value.trim(),
    transaction_reference:$("paymentReference").value.trim(),
    status:"new"
  };
  if(!payload.name || !payload.dob || !payload.tob || !payload.pob || !payload.question || !payload.transaction_reference)
  return msg("consultMessage","Please fill in all fields, including your UPI transaction reference.");
  const {error}=await sb.from("consultations").insert(payload);
  msg("consultMessage",error ? error.message : "Your consultation has been sent. You can see replies here.");
  if(!error){ $("clientQuestion").value=""; await loadClientRequests(user.id); }
});

async function loadClientRequests(uid){
  const box=$("clientRequests");
  if(!box || !sb) return;
  const {data,error}=await sb.from("consultations").select("id,name,dob,tob,pob,question,reply,status,created_at").eq("user_id",uid).order("created_at",{ascending:false});
  if(error){box.innerHTML=`<p class="form-note">${escapeHtml(error.message)}</p>`;return;}
  if(!data?.length){box.innerHTML='<p class="form-note">No consultation requests yet.</p>';return;}
  box.innerHTML=data.map(r=>`
    <div class="request">
      <strong>${escapeHtml(r.name)} <span class="status">${escapeHtml(r.status||"new")}</span></strong>
      <div class="meta">${escapeHtml(r.dob||"")} ${escapeHtml(r.tob||"")} • ${escapeHtml(r.pob||"")}</div>
      <div class="question">${escapeHtml(r.question)}</div>
      ${r.reply ? `<div class="result"><strong>✦ Your CurioStar reply</strong><p>${escapeHtml(r.reply).replace(/\n/g,"<br>")}</p></div>` : '<p class="form-note">Waiting for your CurioStar reply.</p>'}
    </div>`).join("");
}

async function loadAdminRequests(){
  const box=$("adminRequests");
  if(!box || !sb) return;

  const {data,error}=await sb.from("consultations")
    .select("id,user_id,name,dob,tob,pob,question,reply,status,created_at,payment_status,payment_verified_at")
    .order("created_at",{ascending:false});

  if(error){
    box.innerHTML=`<p class="form-note">${escapeHtml(error.message)}</p>`;
    return;
  }

  if(!data?.length){
    box.innerHTML='<p class="form-note">No client requests yet.</p>';
    return;
  }

  box.innerHTML=data.map(r=>`
    <div class="request">
      <strong>${escapeHtml(r.name)}
        <span class="status">${escapeHtml(r.status||"new")}</span>
      </strong>
      <div class="meta">
        ${escapeHtml(r.dob||"")} ${escapeHtml(r.tob||"")} •
        ${escapeHtml(r.pob||"")} • ${escapeHtml(r.created_at||"")}
      </div>
      <p><strong>Payment:</strong>
        ${escapeHtml(r.payment_status||"pending")}
      </p>
      ${r.payment_status==="paid"
        ? '<p class="form-note">Payment verified.</p>'
        : `<button class="btn secondary verify-payment" data-id="${r.id}" type="button">Mark ₹50 as paid</button>`}
      <div class="question">${escapeHtml(r.question)}</div>
      <div class="reply-box">
        <textarea id="reply-${r.id}" placeholder="Write your reply here...">${escapeHtml(r.reply||"")}</textarea>
        <button class="btn primary save-reply" data-id="${r.id}" type="button">Save reply</button>
      </div>
    </div>`).join("");

  box.querySelectorAll(".verify-payment").forEach(btn=>{
    btn.addEventListener("click",()=>markPaymentPaid(btn.dataset.id));
  });

  box.querySelectorAll(".save-reply").forEach(btn=>{
    btn.addEventListener("click",()=>saveReply(btn.dataset.id));
  });
}

async function markPaymentPaid(id){
  if(!sb) return;

  if(!confirm("Have you checked your UPI app and confirmed receipt of ₹50 for this consultation?")){
    return;
  }

  const {error}=await sb.from("consultations")
    .update({
      payment_status:"paid",
      payment_verified_at:new Date().toISOString()
    })
    .eq("id",id);

  if(error){
    alert("Could not update payment status: "+error.message);
    return;
  }

  alert("Payment marked as verified.");
  await loadAdminRequests();
}

async function saveReply(id){
  const textarea=$(`reply-${id}`);
  if(!sb || !textarea) return;
  const {error}=await sb.from("consultations").update({reply:textarea.value,status:textarea.value.trim()?"replied":"new",replied_at:textarea.value.trim()?new Date().toISOString():null}).eq("id",id);
  if(error) alert(error.message);
  else { alert("Reply saved."); await loadAdminRequests(); }
}
$("refreshAdmin")?.addEventListener("click",loadAdminRequests);

if(sb) sb.auth.onAuthStateChange(()=>setTimeout(refreshAuth,0));
refreshAuth();

// Original discovery experience
document.getElementById("discoverForm").addEventListener("submit", function(e) {
  e.preventDefault();
  const name = document.getElementById("name").value.trim();
  const interest = document.getElementById("interest").value;
  const result = document.getElementById("result");
  const messages = {
    "My personality": `Nice choice, ${name}. Your birth chart can be used as a fun starting point to explore traditional ideas about your personality, reactions and natural tendencies.`,
    "My past patterns": `Interesting, ${name}. Let's look for recurring themes in your chart and connect them with experiences you've already had.`,
    "What may be ahead": `Curious about the next chapter, ${name}? Astrology traditionally looks at planetary cycles to explore possible themes and periods ahead.`,
    "Love & relationships": `Let's get curious about your relationship style, ${name}, and the traditional astrological themes connected with love and partnerships.`,
    "Career & money": `Career curiosity unlocked, ${name}. Your chart can be explored for traditional ideas about work preferences, strengths and career themes.`,
    "Everything — surprise me ✨": `Now that's curiosity! ${name}, your journey can explore personality, past patterns, relationships, career and possible future themes.`
  };
  result.innerHTML = `<h3>✨ Your curiosity starts here</h3><p>${messages[interest]}</p>`;
  result.classList.remove("hidden");
  result.scrollIntoView({ behavior: "smooth", block: "center" });
});
