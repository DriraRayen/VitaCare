import {createVitaCareClient} from './client.js';
const app=document.querySelector('#app'), modal=document.querySelector('#dialog');
const categories=['Analyse','Imagerie','Ordonnance','Compte rendu','Autre'];
const logo='<img src="./ui/brand.png" alt="">', brand='<div class="vc-brand">'+logo+'VitaCare</div>';
const paths={home:'<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>',patient:'<circle cx="12" cy="8" r="3.5"/><path d="M4 21a8 8 0 0 1 16 0"/>',doctor:'<path d="M4 3v5a5 5 0 0 0 10 0V3M4 3h2m6 0h2M9 13v2a5 5 0 0 0 10 0v-3"/><circle cx="19" cy="9" r="2.5"/>',docs:'<path d="M5 2h9l5 5v15H5zM14 2v6h5M8 13h8M8 17h6"/>',tasks:'<path d="m3 6 2 2 3-4m3 2h10M3 13l2 2 3-4m3 2h10M3 20l2 2 3-4m3 2h10"/>',links:'<path d="m10 14 4-4M8 15l-1 1a3 3 0 0 1-4-4l4-4a3 3 0 0 1 4 0m2 8a3 3 0 0 0 4 0l4-4a3 3 0 0 0-4-4l-1 1"/>'};
const icon=k=>'<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+paths[k]+'</svg>';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let state=null, role='patient', auth='login', email='', page='home', selected=0, filter='', timer;
const doctor=()=>state.me.role==='doctor';
const active=()=>state.links.filter(l=>l.active);
const peerName=id=>state.links.find(l=>l.id===id)?.name||'';
const empty=s=>'<p class="vc-empty">'+esc(s)+'</p>';
const btn=(act,label,id='',primary=false)=>`<button type="button" class="${primary?'vc-primary':'vc-secondary'}" data-action="${act}" data-id="${id}">${esc(label)}</button>`;
const field=(label,name,type='text',value='',extra='required')=>`<label>${esc(label)}<input name="${name}" type="${type}" value="${esc(value)}" ${extra}></label>`;
const area=(label,name,value='',len=1200)=>`<label>${label}<textarea name="${name}" rows="3" maxlength="${len}">${esc(value)}</textarea></label>`;
const options=(values,current)=>values.map(c=>`<option ${c===current?'selected':''}>${esc(c)}</option>`).join('');
const catSelect=c=>'<label>Catégorie<select name="category">'+options(categories,c)+'</select></label>';
const form=(action,body,submit,id='')=>`<form class="vc-form" data-form="${action}" data-id="${id}">${body}<p class="vc-alert" role="alert" hidden></p><button class="vc-primary">${esc(submit)}</button></form>`;
const heading=(title,side='')=>`<div class="vc-cardhead"><h2>${esc(title)}</h2>${side}</div>`;
const row=(title,detail,actions='')=>`<div class="vc-row"><div><b>${esc(title)}</b><p class="vc-note">${esc(detail)}</p></div><div class="vc-actions">${actions}</div></div>`;
const pill=(s,cls='')=>`<span class="vc-pill ${cls}">${esc(s)}</span>`;
function notify(s){clearTimeout(timer);document.querySelector('#message').textContent=s;timer=setTimeout(()=>document.querySelector('#message').textContent='',6000)}
function clearSession(){state=null;selected=0;page='home';filter='';auth='login';email='';if(modal.open)modal.close();modal.innerHTML='';notify('');render()}
const client = createVitaCareClient({onUnauthorized: () => { if(state)clearSession() }});
const api = client.call;
async function refresh(){state=await api('state');if(selected&&!active().some(l=>l.id===selected))selected=0;render()}
function authScreen(){
 const title={login:'Bienvenue sur VitaCare',register:'Créer un compte'}[auth];
 let fields=field('Adresse e-mail','email','email',email,'required maxlength="254" autocomplete="email"');
 if(auth==='register')fields+=field('Nom affiché','name','text','','required maxlength="100" autocomplete="name"');
 fields+=field(auth==='register'?'Mot de passe (12 caractères minimum)':'Mot de passe','password','password','',auth==='register'?'required minlength="12" maxlength="256" autocomplete="new-password"':'required maxlength="256" autocomplete="current-password"');
 const roles=['patient','doctor'].map(r=>`<button class="vc-role" data-action="role" data-role="${r}" aria-pressed="${role===r}"><span class="vc-icon">${icon(r)}</span><span><b>${r==='doctor'?'Médecin':'Patient'}</b><small>${r==='doctor'?'Suivre mes patients':'Gérer mon parcours de soins'}</small></span><span class="vc-radio"></span></button>`).join('');
 return `<main class="vc-login"><section class="vc-art">${brand}<div class="vc-artmain"><p class="vc-tag">Parcours de soins</p><h1>Votre santé,<br><span>étape par étape.</span></h1><div class="vc-preview"><strong>Mon parcours de soins</strong><div class="vc-line"><span class="vc-check">✓</span> Consultation initiale</div><div class="vc-line"><span class="vc-check">✓</span> Bilan sanguin</div><div class="vc-line"><span class="vc-check vc-circle"></span> Rendez-vous de suivi</div></div></div></section><section class="vc-access"><div class="vc-formbox"><div class="vc-tag">Espace personnel</div><h2>${title}</h2>${roles}${form(auth,fields,{login:'Se connecter',register:'Créer mon compte'}[auth])}<p class="vc-inline">${['login','register'].filter(k=>k!==auth).map(k=>`<button class="vc-link" data-action="auth" data-mode="${k}">${{login:'Se connecter',register:'Créer un compte'}[k]}</button>`).join('')}</p></div></section></main>`;
}
function dialog(title,html){
 modal.innerHTML='<div class="vc-cardhead"><h2 id="dialog-title">'+esc(title)+'</h2>'+btn('close','Fermer')+'</div>'+html;
 if(!modal.open)modal.showModal();
}
function nav(){
 const entries=[['home','Tableau de bord','home'],['links',doctor()?'Mes patients':'Mes médecins','links'],['docs','Documents','docs'],['tasks','Plan de soins','tasks'],['profile','Mon profil','patient']];
 return entries.map(([k,label,ic])=>`<button class="vc-nav" aria-current="${page===k?'page':'false'}" data-action="nav" data-page="${k}">${icon(ic)} ${label}</button>`).join('')+(!doctor()?'<a class="vc-nav" href="./parcours#costs">Dépenses et remboursements</a>':'');
}
function peerSelect(){
 if(!doctor()||page==='record')return '';
 return `<label class="vc-inline">Patient<select class="vc-filter" id="select-patient"><option value="0">Tous mes patients</option>${active().map(l=>`<option value="${l.id}" ${selected===l.id?'selected':''}>${esc(l.name)} · ${esc(l.email)}</option>`).join('')}</select></label>`;
}
function tasks(){
 const list=state.tasks.filter(t=>!doctor()||!selected||t.patient===selected);
 const rows=list.map(t=>row(t.title,[doctor()?peerName(t.patient):t.clinician,t.due,t.instructions].filter(Boolean).join(' · '),
 t.done?pill('Terminée','done'):pill('À faire')+(doctor()?btn('edit-task','Modifier',t.id):btn('complete','Marquer terminée',t.id)))).join('');
 return '<section class="vc-card">'+heading('Plan de soins',doctor()&&active().length?btn('task','＋ Attribuer une tâche','',true):'')+peerSelect()+(rows||empty('Aucune tâche pour le moment.'))+(!doctor()?'<a class="vc-link" href="./parcours#journey">Voir mon parcours étape par étape →</a>':'')+'</section>';
}
function links(){
 const pending=state.links.filter(l=>!l.active);
 const listing=l=>row(l.name,l.email,l.active?((doctor()?btn('record','Ouvrir le dossier',l.id):'')+btn('unlink','Déconnecter',l.id)):(l.sender===state.me.id?pill('Envoyée','pending')+btn('remove','Annuler',l.id):pill('Reçue','pending')+btn('approve','Accepter',l.id,true)+btn('remove','Refuser',l.id)));
 return '<section class="vc-card">'+heading(doctor()?'Mes patients':'Mes médecins',doctor()?btn('provision','＋ Créer un compte patient'):'')+form('find',field(doctor()?'Rechercher un patient par e-mail':'Rechercher un médecin par e-mail','email','email'),'Rechercher')+'<div id="match" class="vc-dir-results" aria-live="polite"></div></section><section class="vc-card">'+heading('Invitations')+(pending.map(listing).join('')||empty('Aucune invitation en attente.'))+'</section><section class="vc-card">'+heading('Connexions actives')+(active().map(listing).join('')||empty('Aucune connexion approuvée.'))+'</section>';
}
function documents(){
 const docs=state.docs.filter(d=>(!doctor()||!selected||selected===d.patient)&&(!filter||d.category===filter));
 const bar=peerSelect()+'<label class="vc-inline">Catégorie<select class="vc-filter" id="select-category"><option value="">Toutes les catégories</option>'+options(categories,filter)+'</select></label>';
 return '<section class="vc-card">'+heading(doctor()?'Documents partagés':'Mes documents',doctor()?'':btn('upload','＋ Ajouter un document','',true))+'<div class="vc-inline">'+bar+'</div>'+ (docs.map(d=>{
 const names=state.grants.filter(g=>g.doc===d.id).map(g=>peerName(g.doctor));
 return row(d.title,[d.category,d.ext.toUpperCase(),doctor()?peerName(d.patient):(names.length?'Partagé avec '+names.join(', '):'Privé')].join(' · '),`<a class="vc-link" href="${client.documentURL(d.id)}">Télécharger</a>`+(doctor()?'':btn('sharing','Partage',d.id)+btn('organize','Organiser',d.id)));
 }).join('')||empty(doctor()?'Aucun document partagé pour cette sélection.':'Aucun document dans cette sélection.'))+'</section>';
}
function home(){
 const waiting=state.links.filter(l=>!l.active&&l.sender!==state.me.id).length;
 const stats=[[doctor()?'Patients connectés':'Médecins connectés',active().length,'links'],['Documents',state.docs.length,'docs'],['Tâches à faire',state.tasks.filter(t=>!t.done).length,'tasks']];
 return `<section class="vc-welcome"><div><p class="vc-tag">Espace ${doctor()?'médecin':'patient'}</p><h1>Bonjour, ${esc(state.me.name)}</h1></div>${logo}</section><div class="vc-stats">${stats.map(([label,n,k])=>`<div class="vc-stat"><span class="vc-icon">${icon(k)}</span><div><small>${label}</small><strong>${n}</strong></div></div>`).join('')}</div>${waiting?'<section class="vc-card">'+heading(waiting+' invitation(s) à examiner',btn('connections','Voir les invitations'))+'</section>':''}${tasks()}`;
}
function render(){
 if(!state){app.innerHTML=authScreen();return}
 const labels={home:'Tableau de bord',docs:'Documents',tasks:'Plan de soins',profile:'Mon profil',links:doctor()?'Mes patients':'Mes médecins',record:'Dossier patient'};
 let content;
 if(page==='links')content=links();
 else if(page==='docs')content=documents();
 else if(page==='tasks')content=tasks();
 else if(page==='record')content=selected?'<section class="vc-welcome"><div><p class="vc-tag">Dossier patient</p><h1>'+esc(peerName(selected))+'</h1></div>'+logo+'</section>'+tasks()+documents():links();
 else if(page==='profile')content='<section class="vc-card">'+heading('Informations personnelles')+'<p class="vc-sub">'+esc(state.me.email)+'</p>'+form('profile',field('Nom affiché','name','text',state.me.name,'required maxlength="100"')+area('Présentation personnelle','bio',state.me.bio,500),'Enregistrer')+'</section>';
 else content=home();
 app.innerHTML=`<div class="vc-layout"><aside class="vc-side">${brand}${nav()}<button class="vc-out" data-action="logout">Se déconnecter</button></aside><section><header class="vc-top"><strong>${labels[page]}</strong><div class="vc-topnav"><button class="vc-link" data-action="refresh">Actualiser</button><span class="vc-icon">${icon(state.me.role)}</span></div></header><main class="vc-main">${content}</main></section></div>`;
}
function taskForm(t){
 const pid=t?.patient||selected;
 const target=t?'<p class="vc-sub">'+esc(peerName(pid))+'</p>':'<label>Patient<select name="patient" required><option value="">Choisir un patient</option>'+active().map(l=>`<option value="${l.id}" ${pid===l.id?'selected':''}>${esc(l.name)} · ${esc(l.email)}</option>`).join('')+'</select></label>';
 dialog(t?'Modifier la tâche':'Attribuer une tâche',form(t?'edit-task':'task',target+field('Tâche à réaliser','title','text',t?.title,'required maxlength="140"')+field('Date prévue','due','date',t?.due,'')+area('Consignes','instructions',t?.instructions),t?'Enregistrer':'Attribuer',t?.id||''));
}
document.addEventListener('change',e=>{
 if(e.target.id==='select-patient'){selected=Number(e.target.value);if(page==='record'&&!selected)page='tasks';render()}
 if(e.target.id==='select-category'){filter=e.target.value;render()}
});
document.addEventListener('click',async e=>{
 const b=e.target.closest('[data-action]');if(!b||b.disabled)return;
 const a=b.dataset.action,id=Number(b.dataset.id);
 try{
  if(a==='auth'||a==='role'){email=app.querySelector('[name=email]')?.value||email;if(a==='auth')auth=b.dataset.mode;else role=b.dataset.role;render();return}
  if(a==='close'){modal.close();return}
  if(a==='logout'){await api('logout');clearSession();return}
  if(a==='nav'||a==='connections'||a==='record'||a==='refresh'){
    if(a!=='refresh'){page=a==='nav'?b.dataset.page:a==='record'?'record':'links';selected=a==='record'?id:0;filter=''}
    await refresh();return
  }
  if(a==='task'||a==='edit-task'){taskForm(state.tasks.find(t=>t.id===id));return}
  if(a==='provision'){dialog('Créer un compte patient',form('provision','<p class="vc-sub">Le patient peut créer son compte avec cette adresse et retrouver votre invitation dans « Mes médecins ». Si son compte existe déjà, il reçoit une invitation dans VitaCare.</p>'+field('Nom du patient','name','text','','required maxlength="100"')+field('Adresse du patient','email','email'),'Ajouter à ma liste'));return}
  if(a==='upload'){dialog('Ajouter un document',form('upload',field('Titre','title','text','','required maxlength="120"')+catSelect(categories[0])+field('Fichier (PDF, PNG ou JPEG · 8 Mio maximum)','file','file','','required accept=".pdf,.png,.jpg,.jpeg"')+'<p class="vc-sub">Ce document est privé. Vous pourrez choisir les médecins autorisés après son ajout.</p>','Enregistrer'));return}
  const doc=state.docs.find(d=>d.id===id);
  if(a==='organize'){dialog('Organiser le document',form('organize',field('Titre','title','text',doc.title,'required maxlength="120"')+catSelect(doc.category),'Enregistrer',id)+btn('delete','Supprimer le document',id));return}
  if(a==='sharing'){
    const list=active().map(l=>{const shared=state.grants.some(g=>g.doc===id&&g.doctor===l.id);return row(l.name,shared?'Accès autorisé':'Aucun accès',`<button class="vc-secondary" data-action="${shared?'unshare':'share'}" data-id="${id}" data-peer="${l.id}">${shared?'Retirer l’accès':'Autoriser'}</button>`)}).join('');
    dialog('Partage · '+doc.title,list||empty('Connectez-vous à un médecin pour partager ce document.'));return
  }
  if(a==='unlink'||a==='delete'){dialog(a==='unlink'?'Déconnecter '+peerName(id)+' ?':'Supprimer ce document ?', '<p>'+ (a==='unlink'?'L’accès aux documents partagés et au suivi médical sera révoqué immédiatement.':'Le fichier et ses autorisations de partage seront supprimés.')+'</p>'+btn(a==='unlink'?'remove':'delete-doc','Confirmer',id,true));return}
  const routes={invite:['invite',{peer:id}],approve:['approve',{peer:id}],remove:['disconnect',{peer:id}],complete:['complete',{task:id}],share:['share',{doc:id,doctor:Number(b.dataset.peer)}],unshare:['unshare',{doc:id,doctor:Number(b.dataset.peer)}],'delete-doc':['delete-doc',{doc:id}]};
  if(routes[a]){b.disabled=true;await api(...routes[a]);if(modal.open)modal.close();await refresh();notify({invite:'Invitation envoyée.',approve:'Connexion approuvée.',remove:'Connexion retirée.',complete:'Tâche terminée.',share:'Accès accordé.',unshare:'Accès retiré.','delete-doc':'Document supprimé.'}[a])}
 }catch(err){notify(err.message)}finally{b.disabled=false}
});
document.addEventListener('submit',async e=>{
 e.preventDefault();const f=e.target,a=f.dataset.form,id=Number(f.dataset.id),data=Object.fromEntries(new FormData(f)),submit=f.querySelector('[type=submit],button.vc-primary'),error=f.querySelector('[role=alert]');
 if(submit.disabled)return;submit.disabled=true;error.hidden=true;
 try{
  if(['login','register'].includes(a)){
    email=data.email;await api(a,{...data,role});
    page='home';await refresh();email='';return
  }
  if(a==='find'){
   const {match}=await api('find',data),l=match&&state.links.find(r=>r.id===match.id);
   document.querySelector('#match').innerHTML=match?row(match.name,data.email,l?pill(l.active?'Déjà connecté':'Invitation en attente'):btn('invite','Envoyer une invitation',match.id,true)):empty('Aucun compte actif trouvé à cette adresse.');return
  }
  if(a==='upload'){
    if(data.file.size>8*1024*1024)throw Error('Le fichier dépasse 8 Mio.');
    await client.uploadDocument(data.file, data.title, data.category);
  }else{
    if(a==='task')data.patient=Number(data.patient);
    if(a==='edit-task'){data.task=id;data.patient=state.tasks.find(t=>t.id===id).patient}
    if(a==='organize')data.doc=id;
    await api(a,data);
  }
  if(modal.open)modal.close();await refresh();notify(a==='provision'?'Patient ajouté à votre liste.':'Enregistré.');
 }catch(err){error.textContent=err.message;error.hidden=false}finally{submit.disabled=false}
});
api('state').then(s=>{state=s;render()}).catch(err=>{render();if(err.message!=='Connectez-vous pour continuer.')notify(err.message)});
window.addEventListener('pageshow',e=>{if(e.persisted)location.reload()});
