(function(){
"use strict";
var RK="vp_records_v2",SK="vp_seq_v2",UK="vp_users_v2",SES="vp_session_v2";
var CATS=["Guest","Contractor","Delivery","Interview","Official"];
var FIELDS=["name","contact","category","purpose","host","entry","exit"];
var records=[],seq=0,users=[],pendingDelete=null,pendingAfter=null;
var $=function(i){return document.getElementById(i)};
var app=$("app");

function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]})}
function pad(n){return n<10?"0"+n:""+n}
function localInput(d){return d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate())+"T"+pad(d.getHours())+":"+pad(d.getMinutes())}
function fmt(s){if(!s)return "—";var d=new Date(s);return isNaN(d)?"—":d.toLocaleString([],{year:"numeric",month:"short",day:"numeric",hour:"numeric",minute:"2-digit"})}
function toast(m){var t=$("toast");t.textContent=m;t.classList.add("show");clearTimeout(toast.t);toast.t=setTimeout(function(){t.classList.remove("show")},2200)}
function get(k,d){try{var v=JSON.parse(localStorage.getItem(k));return v==null?d:v}catch(e){return d}}
function put(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){toast("Storage unavailable: changes will not persist")}}
function load(){records=get(RK,[]);seq=get(SK,0);users=get(UK,[]);
 if(!Array.isArray(records))records=[];if(!Array.isArray(users))users=[];
 if(!users.length){users=[{username:"admin",fullname:"Front Desk Admin",password:"admin123"}];put(UK,users)}}
function save(){put(RK,records);put(SK,seq)}
function byId(id){return records.filter(function(r){return r.id===id})[0]}
function status(r){return r.exit?"out":"in"}
function badge(r){var s=status(r);return '<span class="badge '+s+'">'+(s==="in"?"Inside":"Checked out")+'</span>'}
function session(){try{return sessionStorage.getItem(SES)}catch(e){return null}}

/* validation */
function validate(v){var e={},n=v.name.trim(),c=v.contact.replace(/[\s-]/g,"");
 if(!n)e.name="Enter the visitor's full name.";else if(!/^[A-Za-z][A-Za-z .,'-]{1,59}$/.test(n))e.name="Use letters only (2–60 characters).";
 if(!c)e.contact="Enter a contact number.";else if(!/^(\+63|0)9\d{9}$/.test(c)&&!/^\+?\d{7,13}$/.test(c))e.contact="Enter a valid number, e.g. 09171234567.";
 if(!v.category)e.category="Choose a category.";
 if(!v.purpose.trim())e.purpose="Enter the purpose of the visit.";else if(v.purpose.trim().length<3)e.purpose="Purpose is too short.";
 if(!v.host.trim())e.host="Enter who the visitor is seeing.";
 if(!v.entry)e.entry="Enter the entry time.";
 if(v.exit&&v.entry&&new Date(v.exit)<=new Date(v.entry))e.exit="Exit must be after entry.";
 return e}
function showErrors(form,e){FIELDS.forEach(function(k){var s=form.querySelector("[data-e="+k+"]"),i=form.elements[k];if(s)s.textContent=e[k]||"";if(i)i.classList.toggle("bad",!!e[k])})}

/* screens */
function screenAuth(mode){
 var su=mode==="signup";
 app.innerHTML='<section class="panel auth"><h1>'+(su?'Create an account':'Log in')+'</h1><p class="sub">Visitor Pass Management System</p><form id="af" novalidate>'+
 (su?'<label>Full name<input name="fullname" autocomplete="name"></label>':'')+
 '<label>Username<input name="username" autocomplete="username"></label><label>Password<input name="password" type="password" autocomplete="'+(su?'new-password':'current-password')+'"></label>'+
 '<span class="err" id="aerr"></span><button class="primary" type="submit">'+(su?'Sign up':'Log in')+'</button></form>'+
 '<p>'+(su?'Already have an account? <button class="link" id="sw" type="button">Log in</button>':'No account yet? <button class="link" id="sw" type="button">Sign up</button>')+'</p>'+
 (su?'':'<p class="sub">Demo account: admin / admin123</p>')+'</section>';
 $("sw").onclick=function(){screenAuth(su?"login":"signup")};
 $("af").onsubmit=function(ev){ev.preventDefault();var f=ev.target,u=f.elements.username.value.trim(),p=f.elements.password.value,m=$("aerr");
  if(!u||!p){m.textContent="Enter a username and password.";return}
  if(su){var fn=f.elements.fullname.value.trim();
   if(!fn){m.textContent="Enter your full name.";return}
   if(p.length<6){m.textContent="Password must be at least 6 characters.";return}
   if(users.some(function(x){return x.username.toLowerCase()===u.toLowerCase()})){m.textContent="That username is taken.";return}
   users.push({username:u,fullname:fn,password:p});put(UK,users);start(u);
  }else{var ok=users.filter(function(x){return x.username.toLowerCase()===u.toLowerCase()&&x.password===p})[0];
   if(!ok){m.textContent="Wrong username or password.";return}start(ok.username)}}}
function start(u){try{sessionStorage.setItem(SES,u)}catch(e){}location.hash="#/";route()}

function screenHome(){
 var inside=records.filter(function(r){return !r.exit}).length,today=new Date().toDateString();
 var tc=records.filter(function(r){return new Date(r.entry).toDateString()===today}).length,cats={};
 records.forEach(function(r){cats[r.category]=(cats[r.category]||0)+1});
 var recent=records.slice().sort(function(a,b){return new Date(b.entry)-new Date(a.entry)}).slice(0,5);
 app.innerHTML='<div class="row"><div><h1>Dashboard</h1><p class="sub">Records visitor details, purpose of visit, host, entry time, and exit time.</p></div><a class="btn primary" href="#/add">Add visitor</a></div>'+
 '<section class="stats"><div class="stat"><b>'+records.length+'</b><span>Total visitors</span></div><div class="stat"><b>'+inside+'</b><span>Currently inside</span></div><div class="stat"><b>'+(records.length-inside)+'</b><span>Checked out</span></div><div class="stat"><b>'+tc+'</b><span>Arrived today</span></div></section>'+
 '<section class="panel"><h2>Visitors by category</h2><div class="chips">'+(Object.keys(cats).length?Object.keys(cats).map(function(k){return '<span class="chip">'+esc(k)+': <b>'+cats[k]+'</b></span>'}).join(""):'<span class="sub">Category counts appear once you add records.</span>')+'</div></section>'+
 '<section class="panel"><div class="row"><h2>Recent visitors</h2><a href="#/records">View all records</a></div>'+
 (recent.length?'<div class="scroll"><table class="cards"><thead><tr><th>Pass ID</th><th>Visitor</th><th>Host</th><th>Entry</th><th>Status</th></tr></thead><tbody>'+recent.map(function(r){return '<tr><td data-l="Pass ID"><a href="#/view/'+esc(r.id)+'">'+esc(r.id)+'</a></td><td data-l="Visitor">'+esc(r.name)+'</td><td data-l="Host">'+esc(r.host)+'</td><td data-l="Entry">'+fmt(r.entry)+'</td><td data-l="Status">'+badge(r)+'</td></tr>'}).join("")+'</tbody></table></div>':'<div class="empty">No visitors yet. Add the first visitor to get started.</div>')+'</section>'}

function screenList(){
 app.innerHTML='<div class="row"><h1>Visitor records</h1><a class="btn primary" href="#/add">Add visitor</a></div><section class="panel"><div class="filters"><input id="q" type="search" placeholder="Search by name, ID, category, or keyword" aria-label="Search records"><select id="fs" aria-label="Filter by status"><option value="">All statuses</option><option value="in">Inside</option><option value="out">Checked out</option></select><select id="fc" aria-label="Filter by category"><option value="">All categories</option>'+CATS.map(function(c){return '<option>'+c+'</option>'}).join("")+'</select></div><div class="scroll"><table class="cards"><thead><tr><th>Pass ID</th><th>Visitor</th><th>Category</th><th>Host</th><th>Entry</th><th>Exit</th><th>Status</th><th>Actions</th></tr></thead><tbody id="rows"></tbody></table></div><div class="empty" id="empty" hidden></div><p class="sub" id="cnt"></p></section>';
 function draw(){var q=$("q").value.trim().toLowerCase(),s=$("fs").value,c=$("fc").value;
  var list=records.filter(function(r){if(s&&status(r)!==s)return false;if(c&&r.category!==c)return false;return !q||[r.id,r.name,r.category,r.purpose,r.host,r.contact].join(" ").toLowerCase().indexOf(q)>-1});
  $("rows").innerHTML=list.map(function(r){var id=esc(r.id);return '<tr><td data-l="Pass ID"><b>'+id+'</b></td><td data-l="Visitor">'+esc(r.name)+'</td><td data-l="Category">'+esc(r.category)+'</td><td data-l="Host">'+esc(r.host)+'</td><td data-l="Entry">'+fmt(r.entry)+'</td><td data-l="Exit">'+fmt(r.exit)+'</td><td data-l="Status">'+badge(r)+'</td><td data-l="Actions"><div class="actions"><a class="btn sm" href="#/view/'+id+'">View</a><a class="btn sm" href="#/edit/'+id+'">Edit</a><button class="sm danger" data-del="'+id+'">Delete</button></div></td></tr>'}).join("");
  $("empty").hidden=list.length>0;$("empty").textContent=records.length?"No records match your search or filters.":"No visitors yet. Add the first visitor to get started.";
  $("cnt").textContent="Showing "+list.length+" of "+records.length+" records.";}
 ["q","fs","fc"].forEach(function(i){$(i).addEventListener("input",draw)});
 $("rows").addEventListener("click",function(ev){var b=ev.target.closest("[data-del]");if(b)askDelete(b.getAttribute("data-del"),"#/records")});
 draw()}

function formHtml(r){r=r||{};
 function f(k,label,type,cls,extra){return '<label class="'+(cls||"")+'">'+label+'<input name="'+k+'" type="'+(type||"text")+'" value="'+esc(r[k]||"")+'" '+(extra||"")+'><span class="err" data-e="'+k+'"></span></label>'}
 return '<form class="grid" id="rf" novalidate>'+f("name","Full name","text","",'autocomplete="off"')+f("contact","Contact number","tel","",'placeholder="09171234567"')+
 '<label>Category<select name="category"><option value="">Select category</option>'+CATS.map(function(c){return '<option'+(r.category===c?' selected':'')+'>'+c+'</option>'}).join("")+'</select><span class="err" data-e="category"></span></label>'+
 f("purpose","Purpose of visit","text","wide")+f("host","Host (person visited)")+f("entry","Entry time","datetime-local")+f("exit","Exit time (blank if still inside)","datetime-local")+
 '<div class="actions full"><button class="primary" type="submit">Save</button><a class="btn" href="'+(r.id?"#/view/"+esc(r.id):"#/records")+'">Cancel</a></div></form>'}
function bindForm(onSave){var f=$("rf");f.onsubmit=function(ev){ev.preventDefault();var v={};FIELDS.forEach(function(k){v[k]=f.elements[k].value});
 var e=validate(v);showErrors(f,e);var bad=FIELDS.filter(function(k){return e[k]})[0];if(bad){f.elements[bad].focus();return}
 ["name","contact","purpose","host"].forEach(function(k){v[k]=v[k].trim()});onSave(v)}}

function screenAdd(){app.innerHTML='<h1>Add visitor</h1><section class="panel">'+formHtml({entry:localInput(new Date())})+'</section>';
 bindForm(function(v){seq++;v.id="VP-"+String(seq).padStart(4,"0");records.unshift(v);save();toast("Saved as "+v.id);location.hash="#/view/"+v.id})}

function screenView(id){var r=byId(id);if(!r)return notFound();
 function d(l,v){return '<dt>'+l+'</dt><dd>'+v+'</dd>'}
 app.innerHTML='<div class="row"><div><h1>'+esc(r.name)+'</h1><p class="sub">Pass '+esc(r.id)+' '+badge(r)+'</p></div><div class="actions"><a class="btn" href="#/records">Back to records</a>'+(r.exit?'':'<button id="co" class="primary" type="button">Check out now</button>')+'<a class="btn" href="#/edit/'+esc(r.id)+'">Edit</a><button id="dl" class="danger" type="button">Delete</button></div></div><section class="panel"><dl>'+d("Pass ID",esc(r.id))+d("Full name",esc(r.name))+d("Contact number",esc(r.contact))+d("Category",esc(r.category))+d("Purpose of visit",esc(r.purpose))+d("Host",esc(r.host))+d("Entry time",fmt(r.entry))+d("Exit time",fmt(r.exit))+d("Status",badge(r))+'</dl></section>';
 $("dl").onclick=function(){askDelete(r.id,"#/records")};
 if($("co"))$("co").onclick=function(){var n=new Date();if(n<=new Date(r.entry)){toast("Entry time is in the future");return}r.exit=localInput(n);save();toast("Checked out");screenView(id)}}

function screenEdit(id){var r=byId(id);if(!r)return notFound();
 app.innerHTML='<h1>Edit '+esc(r.id)+'</h1><section class="panel">'+formHtml(r)+'</section>';
 bindForm(function(v){Object.assign(r,v);save();toast("Visitor updated");location.hash="#/view/"+r.id})}
function notFound(){app.innerHTML='<section class="panel"><h1>Record not found</h1><p class="sub">It may have been deleted.</p><a class="btn primary" href="#/records">Back to records</a></section>'}

/* delete dialog */
function askDelete(id,after){var r=byId(id);if(!r)return;pendingDelete=id;pendingAfter=after;
 $("dlgMsg").textContent="Delete the record for "+r.name+" ("+id+")? This cannot be undone.";$("dlg").showModal()}
$("dNo").onclick=function(){pendingDelete=null;$("dlg").close()};
$("dYes").onclick=function(){records=records.filter(function(x){return x.id!==pendingDelete});save();$("dlg").close();pendingDelete=null;toast("Record deleted");if(location.hash===pendingAfter)route();else location.hash=pendingAfter};

/* router */
function route(){var h=(location.hash||"#/").replace(/^#\/?/,""),p=h.split("/"),page=p[0]||"home",u=session();
 $("top").hidden=!u;
 if(!u){screenAuth("login");return}
 [].forEach.call(document.querySelectorAll("#nav a"),function(a){a.classList.toggle("on",a.getAttribute("data-r")===page||(page==="view"||page==="edit")&&a.getAttribute("data-r")==="records")});
 if(page==="home")screenHome();else if(page==="records")screenList();else if(page==="add")screenAdd();
 else if(page==="view")screenView(decodeURIComponent(p[1]||""));else if(page==="edit")screenEdit(decodeURIComponent(p[1]||""));else screenHome();
 window.scrollTo(0,0)}
$("logout").onclick=function(){try{sessionStorage.removeItem(SES)}catch(e){}location.hash="#/";route()};
window.addEventListener("hashchange",route);
load();route();
})();
