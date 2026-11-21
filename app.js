/* FoodBridge college prototype.
   Data is stored in this browser's localStorage. This is NOT production authentication.
   For real deployment, connect Firebase Authentication + Firestore + Storage and security rules. */
const DB_KEY = "foodbridge_demo_v1";
const SESSION_KEY = "foodbridge_session_v1";
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const uid = () => Math.random().toString(36).slice(2, 10);
const readDB = () => {
  try { return JSON.parse(localStorage.getItem(DB_KEY)) || {users:[], donations:[], requests:[]}; }
  catch { return {users:[], donations:[], requests:[]}; }
};
const saveDB = (db) => localStorage.setItem(DB_KEY, JSON.stringify(db));
let db = readDB();
if (!db.users.some(u => u.email === "admin@foodbridge.demo")) {
  db.users.push({id:"admin",name:"FoodBridge Admin",email:"admin@foodbridge.demo",password:"Admin123!",role:"admin",phone:"",location:""});
  saveDB(db);
}
let currentUser = null;
let toastTimer;
function toast(msg){const el=$("#toast");el.textContent=msg;el.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove("show"),2600);}
function esc(s=""){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function getSession(){const id=sessionStorage.getItem(SESSION_KEY);return db.users.find(u=>u.id===id)||null;}
function showTab(tab){
  $$(".tab").forEach(b=>b.classList.toggle("active",b.dataset.tab===tab));
  $("#loginForm").classList.toggle("hidden",tab!=="login");
  $("#registerForm").classList.toggle("hidden",tab!=="register");
}
$$(".tab").forEach(b=>b.addEventListener("click",()=>showTab(b.dataset.tab)));
$("#loginForm").addEventListener("submit",e=>{
  e.preventDefault();const f=new FormData(e.currentTarget),email=String(f.get("email")).trim().toLowerCase(),password=String(f.get("password"));
  db=readDB();const user=db.users.find(u=>u.email.toLowerCase()===email&&u.password===password);
  if(!user)return toast("Email or password is incorrect.");
  login(user);
});
$("#registerForm").addEventListener("submit",e=>{
  e.preventDefault();db=readDB();const f=new FormData(e.currentTarget);
  const email=String(f.get("email")).trim().toLowerCase();
  if(db.users.some(u=>u.email.toLowerCase()===email))return toast("An account with this email already exists.");
  const user={id:uid(),name:String(f.get("name")).trim(),email,password:String(f.get("password")),role:String(f.get("role")),phone:String(f.get("phone")).trim(),location:String(f.get("location")).trim()};
  db.users.push(user);saveDB(db);login(user);e.currentTarget.reset();
});
function login(user){currentUser=user;sessionStorage.setItem(SESSION_KEY,user.id);render();}
function logout(){currentUser=null;sessionStorage.removeItem(SESSION_KEY);render();}
$("#logoutBtn").addEventListener("click",logout);
$("#brandHome").addEventListener("click",e=>{e.preventDefault();if(currentUser)render();else window.scrollTo({top:0,behavior:"smooth"});});
function render(){
  db=readDB();currentUser=getSession();
  $("#authView").classList.toggle("hidden",!!currentUser);
  $("#appView").classList.toggle("hidden",!currentUser);
  $("#logoutBtn").classList.toggle("hidden",!currentUser);
  $("#roleBadge").classList.toggle("hidden",!currentUser);
  if(!currentUser){$("#heroDonationCount").textContent=db.donations.filter(d=>d.status!=="cancelled").length;$("#heroMealCount").textContent=mealTotal();return;}
  $("#roleBadge").textContent=currentUser.role;
  const role=currentUser.role;
  $("#dashboardEyebrow").textContent=role==="admin"?"ADMINISTRATION":"YOUR FOODBRIDGE";
  $("#welcomeTitle").textContent=`Hello, ${currentUser.name.split(" ")[0]}`;
  $("#welcomeSubtitle").textContent=role==="donor"?"Share surplus food responsibly with your community.":role==="ngo"?"Find available donations and manage your collection requests.":"Monitor users, donations and platform activity.";
  $("#welcomeAction").innerHTML=role==="donor"?'<button class="btn btn-primary" id="quickDonate">+ Donate food</button>':"";
  if($("#quickDonate"))$("#quickDonate").onclick=()=>showDonationForm();
  renderStats();role==="donor"?renderDonor():role==="ngo"?renderNGO():renderAdmin();
}
function mealTotal(){return db.donations.filter(d=>d.status==="completed").reduce((n,d)=>n+Math.max(0,Number(d.quantity)||0),0);}
function renderStats(){
  const mine=db.donations.filter(d=>d.donorId===currentUser.id);
  const requests=db.requests.filter(r=>r.ngoId===currentUser.id);
  const stats=currentUser.role==="donor"?[
    ["My donations",mine.length,"All listings"],["Pending requests",db.requests.filter(r=>mine.some(d=>d.id===r.donationId)&&r.status==="pending").length,"Awaiting response"],["Completed",mine.filter(d=>d.status==="completed").length,"Successful handovers"],["Food packets",mine.reduce((n,d)=>n+(+d.quantity||0),0),"Listed quantity"]
  ]:currentUser.role==="ngo"?[
    ["Available listings",db.donations.filter(d=>d.status==="available").length,"Across the platform"],["My requests",requests.length,"Requests submitted"],["Approved",requests.filter(r=>r.status==="approved").length,"Ready to collect"],["Completed",requests.filter(r=>r.status==="completed").length,"Collected donations"]
  ]:[
    ["Registered users",db.users.filter(u=>u.role!=="admin").length,"Donors and NGOs"],["Total donations",db.donations.length,"All listings"],["Pending requests",db.requests.filter(r=>r.status==="pending").length,"Need review"],["Completed",db.donations.filter(d=>d.status==="completed").length,"Handovers confirmed"]
  ];
  $("#statsGrid").innerHTML=stats.map(s=>`<div class="stat-card"><span>${s[0]}</span><strong>${s[1]}</strong><small>${s[2]}</small></div>`).join("");
}
function showDonationForm(){
  $("#dashboardContent").innerHTML=`<section class="panel"><div class="panel-head"><div><h2>Post a food donation</h2><p class="muted">Share accurate details so an organisation can assess the offer.</p></div><button class="btn btn-outline" id="cancelForm">Back</button></div>
  <form id="donationForm"><div class="form-grid">
  <label class="field">Food name<input name="food" required maxlength="60" placeholder="e.g. Vegetable rice"></label>
  <label class="field">Quantity (packets / servings)<input name="quantity" type="number" min="1" max="10000" required></label>
  <label class="field">Food category<select name="category"><option>Vegetarian</option><option>Non-vegetarian</option><option>Vegan</option><option>Bakery</option><option>Packaged food</option></select></label>
  <label class="field">Prepared at<input name="prepared" type="datetime-local" required></label>
  <label class="field">Collection deadline<input name="deadline" type="datetime-local" required></label>
  <label class="field">Pickup area<input name="location" required value="${esc(currentUser.location)}" placeholder="Area / city"></label>
  <label class="field span-2">Storage and handling details<textarea name="storage" required placeholder="How has the food been stored? Mention temperature/storage where known."></textarea></label>
  <label class="field span-2">Allergens / ingredients (if known)<input name="allergens" placeholder="e.g. contains dairy, peanuts"></label>
  <label class="field span-2">Photo (optional)<input name="photo" type="file" accept="image/*"><span class="small-note">For demo, use a small image. Large images may exceed browser storage.</span></label>
  </div><p class="notice">Only list food that you have verified is suitable for donation. Do not donate food with uncertain safety, unsafe storage or unknown handling history. The app does not certify food safety.</p><button class="btn btn-primary" type="submit">Publish donation</button></form></section>`;
  $("#cancelForm").onclick=render;
  $("#donationForm").onsubmit=async e=>{
    e.preventDefault();const f=new FormData(e.currentTarget),prepared=new Date(f.get("prepared")),deadline=new Date(f.get("deadline"));
    if(Number.isNaN(+prepared)||Number.isNaN(+deadline)||deadline<=new Date()||deadline<=prepared)return toast("Check preparation time and future collection deadline.");
    let photo="";const file=f.get("photo");
    if(file&&file.size){if(file.size>350000)return toast("Please choose an image smaller than 350 KB for this demo.");photo=await fileToDataURL(file);}
    db=readDB();db.donations.unshift({id:uid(),donorId:currentUser.id,donorName:currentUser.name,food:String(f.get("food")).trim(),quantity:+f.get("quantity"),category:f.get("category"),prepared:f.get("prepared"),deadline:f.get("deadline"),location:String(f.get("location")).trim(),storage:String(f.get("storage")).trim(),allergens:String(f.get("allergens")).trim(),photo,status:"available",createdAt:new Date().toISOString()});
    saveDB(db);toast("Donation published.");render();
  };
}
function fileToDataURL(file){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file);});}
function donationCard(d,actions=""){
 const expired=new Date(d.deadline)<=new Date();
 return `<article class="food-card"><div class="food-image">${d.photo?`<img src="${d.photo}" alt="Food donation">`:"🍲"}</div><div class="food-info"><span class="tag ${d.status==="completed"?"completed":""}">${esc(d.status)}</span><h3>${esc(d.food)}</h3><p>${esc(d.quantity)} servings · ${esc(d.category)}</p><p>📍 ${esc(d.location)}</p><p>Donor: ${esc(d.donorName)}</p><p>Collect by: ${new Date(d.deadline).toLocaleString()}</p><p>${expired?'<b style="color:#b94a48">Deadline passed — do not request.</b>':""}</p>${actions}</div></article>`;
}
function renderDonor(){
 const mine=db.donations.filter(d=>d.donorId===currentUser.id);
 const requests=db.requests.filter(r=>mine.some(d=>d.id===r.donationId));
 $("#dashboardContent").innerHTML=`<section class="panel"><div class="panel-head"><div><h2>My food donations</h2><p class="muted">Manage listings and respond to NGO requests.</p></div><button class="btn btn-primary" id="newDonation">+ Add donation</button></div>${mine.length?`<div class="food-list">${mine.map(d=>donationCard(d,donorActions(d))).join("")}</div>`:'<div class="empty">You have not posted any donations yet.</div>'}</section>
 <section class="panel"><h2>Requests from NGOs</h2><p class="muted">Approve or decline requests after checking collection arrangements.</p>${requests.length?`<div class="table-wrap"><table><thead><tr><th>Food</th><th>NGO</th><th>Requested</th><th>Status</th><th>Action</th></tr></thead><tbody>${requests.map(r=>{const d=mine.find(x=>x.id===r.donationId);return `<tr><td>${esc(d?.food||"Removed")}</td><td>${esc(r.ngoName)}</td><td>${new Date(r.createdAt).toLocaleDateString()}</td><td><span class="tag ${r.status}">${r.status}</span></td><td>${r.status==="pending"?`<button class="btn btn-soft" onclick="updateRequest('${r.id}','approved')">Approve</button> <button class="btn btn-danger" onclick="updateRequest('${r.id}','declined')">Decline</button>`:r.status==="approved"?`<button class="btn btn-primary" onclick="completeDonation('${r.id}')">Confirm handover</button>`:"—"}</td></tr>`}).join("")}</tbody></table></div>`:'<div class="empty">No NGO requests yet.</div>'}</section>`;
 $("#newDonation").onclick=showDonationForm;
}
function donorActions(d){return `<div class="food-actions">${d.status==="available"?`<button class="btn btn-outline" onclick="cancelDonation('${d.id}')">Close listing</button>`:""}</div>`;}
function renderNGO(){
 const available=db.donations.filter(d=>d.status==="available"&&new Date(d.deadline)>new Date());
 const mine=db.requests.filter(r=>r.ngoId===currentUser.id);
 $("#dashboardContent").innerHTML=`<section class="panel"><div class="panel-head"><div><h2>Available food donations</h2><p class="muted">Review details and request a suitable collection.</p></div></div><div class="search-row"><input id="foodSearch" placeholder="Search food, category or area..."><button class="btn btn-outline" id="clearSearch">Clear</button></div><div id="availableList" class="food-list">${available.length?available.map(d=>donationCard(d,ngoActions(d))).join(""):'<div class="empty">No available donations right now.</div>'}</div></section>
 <section class="panel"><h2>My requests</h2><p class="muted">Track your request and collection status.</p>${mine.length?`<div class="table-wrap"><table><thead><tr><th>Food</th><th>Donor</th><th>Quantity</th><th>Status</th></tr></thead><tbody>${mine.map(r=>{const d=db.donations.find(x=>x.id===r.donationId);return `<tr><td>${esc(d?.food||"Donation removed")}</td><td>${esc(r.donorName)}</td><td>${d?.quantity??"—"}</td><td><span class="tag ${r.status}">${r.status}</span></td></tr>`}).join("")}</tbody></table></div>`:'<div class="empty">You have not requested any donations yet.</div>'}</section>`;
 $("#foodSearch").oninput=filterFoods;$("#clearSearch").onclick=()=>{$("#foodSearch").value="";filterFoods();};
}
function ngoActions(d){const requested=db.requests.some(r=>r.donationId===d.id&&r.ngoId===currentUser.id);return `<div class="food-actions">${requested?'<span class="small-note">Request already submitted</span>':`<button class="btn btn-primary" onclick="requestFood('${d.id}')">Request food</button>`}</div>`;}
function filterFoods(){const q=$("#foodSearch").value.toLowerCase();const list=db.donations.filter(d=>d.status==="available"&&new Date(d.deadline)>new Date()&&`${d.food} ${d.category} ${d.location} ${d.donorName}`.toLowerCase().includes(q));$("#availableList").innerHTML=list.length?list.map(d=>donationCard(d,ngoActions(d))).join(""):'<div class="empty">No matching donations found.</div>';}
function renderAdmin(){
 $("#dashboardContent").innerHTML=`<section class="panel"><h2>All donations</h2><p class="muted">Admin overview for the college demonstration.</p>${db.donations.length?`<div class="table-wrap"><table><thead><tr><th>Food</th><th>Donor</th><th>Quantity</th><th>Area</th><th>Status</th></tr></thead><tbody>${db.donations.map(d=>`<tr><td>${esc(d.food)}</td><td>${esc(d.donorName)}</td><td>${d.quantity}</td><td>${esc(d.location)}</td><td><span class="tag ${d.status}">${d.status}</span></td></tr>`).join("")}</tbody></table></div>`:'<div class="empty">No donations have been listed.</div>'}</section>
 <section class="panel"><h2>Registered users</h2><div class="table-wrap"><table><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Area</th></tr></thead><tbody>${db.users.map(u=>`<tr><td>${esc(u.name)}</td><td>${esc(u.email)}</td><td>${esc(u.role)}</td><td>${esc(u.location||"—")}</td></tr>`).join("")}</tbody></table></div></section>
 <section class="panel"><div class="panel-head"><h2>Donation impact</h2><button class="btn btn-outline" id="resetDemo">Reset demo data</button></div><p class="muted">Completed quantity: <b>${mealTotal()}</b> estimated servings. This is a quantity estimate, not a verified count of people fed.</p></section>`;
 $("#resetDemo").onclick=()=>{if(confirm("Delete all demo users, donations and requests in this browser?")){localStorage.removeItem(DB_KEY);sessionStorage.removeItem(SESSION_KEY);location.reload();}};
}
window.requestFood=(id)=>{
 db=readDB();const d=db.donations.find(x=>x.id===id);if(!d||d.status!=="available"||new Date(d.deadline)<=new Date())return toast("This donation is no longer available.");
 if(db.requests.some(r=>r.donationId===id&&r.ngoId===currentUser.id))return toast("You already requested this donation.");
 db.requests.push({id:uid(),donationId:id,ngoId:currentUser.id,ngoName:currentUser.name,donorName:d.donorName,status:"pending",createdAt:new Date().toISOString()});saveDB(db);toast("Request sent to donor.");render();
};
window.updateRequest=(id,status)=>{
 db=readDB();const r=db.requests.find(x=>x.id===id);if(!r)return;
 if(!["approved","declined"].includes(status))return;
 if(status==="approved"&&db.requests.some(x=>x.donationId===r.donationId&&x.status==="approved"))return toast("Another request has already been approved.");
 r.status=status;if(status==="approved"){const d=db.donations.find(x=>x.id===r.donationId);if(d)d.status="reserved";}
 saveDB(db);toast(`Request ${status}.`);render();
};
window.completeDonation=(requestId)=>{
 db=readDB();const r=db.requests.find(x=>x.id===requestId);if(!r||r.status!=="approved")return;
 r.status="completed";const d=db.donations.find(x=>x.id===r.donationId);if(d)d.status="completed";saveDB(db);toast("Handover marked completed.");render();
};
window.cancelDonation=(id)=>{
 db=readDB();const d=db.donations.find(x=>x.id===id);if(!d||d.donorId!==currentUser.id)return;
 if(!confirm("Close this donation listing?"))return;d.status="cancelled";saveDB(db);toast("Listing closed.");render();
};
if("serviceWorker" in navigator && location.protocol.startsWith("http"))navigator.serviceWorker.register("./sw.js").catch(()=>{});
render();
