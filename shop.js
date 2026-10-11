(() => {
'use strict';
const $=id=>document.getElementById(id);
// Les prix sont dupliqués côté serveur. Seul le catalogue serveur fait foi au paiement.
const prices={
 solo:{name:'Carte NFC Solo',quantity:1,cents:2990,description:'1 carte NFC + page commerçant',tag:'L’essentiel',kind:'card'},
 duo:{name:'Pack Duo',quantity:2,cents:4990,description:'2 cartes NFC pour un même commerce',tag:'Pour les petits commerces',kind:'card'},
 pro:{name:'Pack Pro',quantity:5,cents:8990,description:'5 cartes NFC + fiche commerce',tag:'Pour votre équipe',kind:'card'},
 premium_unisign:{name:'Signature · Bois & doré',quantity:1,cents:4990,description:'Chevalet de comptoir 10 × 11,5 cm, socle noyer, plaque dorée gravée, NFC + QR code, page AvisLink.',tag:'Collection Signature',kind:'stand',supplier:'Unisign',supplierOriginal:2490,supplierUrl:'https://unisign.fr/products/chevalet-qr-code-nfc-personnalise-avis-google-professionnels',features:'Bois de noyer · plaque dorée · logo gravé · NFC · QR code',warning:'Fabrication / revente sous réserve de l’accord d’Unisign et de sa capacité à inscrire une URL AvisLink.'},
 premium_izikard:{name:'Prestige · Bois sur mesure',quantity:1,cents:9990,description:'Chevalet bois verni 100 % personnalisé. Maquette fournisseur, NFC + QR code et redirection vers la page AvisLink.',tag:'Collection Prestige',kind:'stand',supplier:'Izikard',supplierOriginal:5700,supplierUrl:'https://izikard.com/produit/chevalet-nfc-personnalise-bois/',features:'Bois verni · design sur mesure · maquette à valider · NFC · QR code',warning:'Fabrication / revente sous réserve de l’accord d’Izikard et de ses conditions B2B.'}
};
let selected='premium_unisign',auth=null,client=null;
const cfg=window.AVISLINK_CONFIG||{};
const configured=Boolean(cfg.SUPABASE_URL&&cfg.SUPABASE_ANON_KEY&&window.supabase);
const salesOpen=cfg.LIVE_ORDERS_ENABLED===true;
const money=c=>(c/100).toLocaleString('fr-FR',{style:'currency',currency:'EUR'});
function text(id,value){const el=$(id);if(el)el.textContent=value}
function safe(s){return String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function illustration(kind){return `<div class="premium-art" aria-label="Illustration graphique non contractuelle d’un présentoir"><div class="stand ${kind==='premium_izikard'?'izikard':''}"><div class="metal"></div><div class="mini-brand">VOTRE SALON</div><div class="qr-mark" aria-hidden="true"></div><div class="nfc-mark">))) NFC</div></div><span class="art-note">Illustration non contractuelle</span></div>`}
function productCard(key,p){const chosen=key===selected,stand=p.kind==='stand';return `<article class="product-tile ${chosen?'chosen':''}">${stand?illustration(key):`<div class="cart-icon">AL<span>NFC × ${p.quantity}</span></div>`}<div class="badge">${safe(p.tag)}</div><h3>${safe(p.name)}</h3><div class="price-number">${money(p.cents)}</div><p>${safe(p.description)}</p>${stand?`<div class="product-details">${safe(p.features)}<br><strong>Fournisseur du modèle :</strong> ${safe(p.supplier)} (partenariat non conclu)</div><a class="vendor-link" target="_blank" rel="noopener noreferrer" href="${safe(p.supplierUrl)}">Consulter le modèle du fabricant ↗</a>`:''}<button class="btn ${chosen?'purple':'light'}" type="button" data-select="${safe(key)}" aria-pressed="${chosen}">${chosen?'✓ Modèle sélectionné':'Choisir ce modèle'}</button></article>`}
function renderProducts(){
 $('product-grid').innerHTML=Object.entries(prices).filter(([,p])=>p.kind==='card').map(([k,p])=>productCard(k,p)).join('');
 $('premium-grid').innerHTML=Object.entries(prices).filter(([,p])=>p.kind==='stand').map(([k,p])=>productCard(k,p)).join('');
 const p=prices[selected];text('cart-label',p.name);text('cart-price',money(p.cents));text('cart-total',money(p.cents));text('cart-shipping','Incluse*');
 text('cart-notes','*Prix de vente proposés pour la France métropolitaine, livraison incluse dans la simulation. À finaliser avec les fournisseurs et vos CGV avant de passer en production.');
 $('supplier-info').innerHTML=p.kind==='stand'?`<b>Modèle de ${safe(p.supplier)}</b><br>${safe(p.features)}<br><br><span class="micro">${safe(p.warning)}<br>Le prix AvisLink comprend la préparation de la page digitale et le suivi de votre commande.</span>`:'<b>Collection Essentielle</b><br>Commande de cartes NFC et création d’une page commerçant. Fabrication et livraison à organiser avant le lancement.';
 document.querySelectorAll('[data-select]').forEach(btn=>btn.addEventListener('click',()=>{selected=btn.dataset.select;renderProducts();text('checkout-status','')}));
}
function configure(){
 renderProducts();
 if(!configured || !salesOpen){
   text('pay-config-notice','⏳ Catalogue en démonstration : les commandes réelles ne sont pas encore ouvertes. Stripe, Supabase et les accords fournisseurs doivent être activés.');
   $('buy-btn').textContent='Découvrir le parcours de commande ↗';
   return;
 }
 client=window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY);
 text('pay-config-notice','Paiement hébergé Stripe. Pour les modèles Premium, commande possible uniquement après validation et activation des fournisseurs.');
 client.auth.getSession().then(({data})=>onSession(data?.session)).catch(()=>text('auth-status','Erreur de session'));
 client.auth.onAuthStateChange((_event,session)=>onSession(session));
}
function onSession(session){auth=session;$('logout-btn').hidden=!auth;text('auth-status',auth?'Connecté : '+auth.user.email:'Non connecté. Vous pouvez demander un lien de connexion.');showMemberPages()}
async function showMemberPages(){
 if(!client||!auth){$('member-list').innerHTML='<p>Connectez-vous pour voir vos pages et commandes.</p>';return}
 const [profiles,orders]=await Promise.all([client.from('merchants').select('id,slug,name,logo_url,created_at').order('created_at',{ascending:false}).limit(30),client.from('orders').select('id,status,pack_key,created_at,amount_cents').order('created_at',{ascending:false}).limit(30)]);
 if(profiles.error||orders.error){text('member-list','Lecture impossible : '+(profiles.error?.message||orders.error?.message));return}
 const links=(profiles.data||[]).map(m=>`<div class="merchant-card"><b>${safe(m.name)}</b><br><a href="./p.html?slug=${encodeURIComponent(m.slug)}" target="_blank" rel="noopener">Ouvrir ma page publique ↗</a> · <a href="/.netlify/functions/generate-qr?slug=${encodeURIComponent(m.slug)}" target="_blank" rel="noopener">Télécharger le QR code ↗</a> · <button class="btn light small" data-load="${safe(m.id)}">Modifier cette page</button></div>`).join('');
 const rows=(orders.data||[]).map(o=>`<div class="merchant-card"><b>${safe(prices[o.pack_key]?.name||o.pack_key)}</b> · Commande <code>${safe(o.id.slice(0,8))}</code> · ${money(o.amount_cents)} · <b>${safe(o.status)}</b> · ${new Date(o.created_at).toLocaleDateString('fr-FR')}<br><span class="micro">${o.status==='paid'?'Paiement reçu · fabrication / livraison à organiser par AvisLink':o.status==='pending'?'Paiement non confirmé':'Statut de commande'}</span></div>`).join('');
 $('member-list').innerHTML=`<h4>Mes fiches publiques</h4>${links||'<p>Aucune fiche publiée.</p>'}<h4>Mes commandes</h4>${rows||'<p>Aucune commande.</p>'}`;
 $('member-list').querySelectorAll('[data-load]').forEach(b=>b.addEventListener('click',async()=>{const {data,error}=await client.from('merchants').select('*').eq('id',b.dataset.load).single();if(error){alert(error.message);return}window.avislinkSetMerchant({...data,desc:data.description||'',google:data.google_url||'',logo:data.logo_url||''});localStorage.setItem('avislink-edit-merchant',data.id);window.avislinkNavigate('espace');ensureSaveButton()}));
}
function ensureSaveButton(){if($('publish-updates'))return;const form=$('merchant-form');const btn=document.createElement('button');btn.type='button';btn.id='publish-updates';btn.className='btn light';btn.textContent='Publier mes modifications sur ma page';btn.style.marginTop='12px';form.appendChild(btn);btn.addEventListener('click',publishEdit)}
async function publishEdit(){if(!auth||!client){alert('Connectez-vous.');return}const id=localStorage.getItem('avislink-edit-merchant');if(!id){alert('Ouvrez une page existante depuis Mon compte.');return}const d=window.avislinkGetMerchant();let logo_url=d.logo;
 try{
 if(d.logo?.startsWith('data:image/')){const res=await fetch(d.logo);const blob=await res.blob();if(blob.size>1048576)throw Error('Logo trop volumineux');const path=`${auth.user.id}/${id}-${Date.now()}.webp`;const uploaded=await client.storage.from('merchant-logos').upload(path,blob,{contentType:blob.type||'image/webp'});if(uploaded.error)throw uploaded.error;logo_url=client.storage.from('merchant-logos').getPublicUrl(path).data.publicUrl}
 const {error}=await client.from('merchants').update({name:d.name,description:d.desc,google_url:d.google,phone:d.phone,instagram:d.instagram,website:d.website,address:d.address,hours:d.hours,logo_url}).eq('id',id);if(error)throw error;text('save-status','✓ Modifications publiées sur la page de votre commerce.');showMemberPages();
 }catch(e){text('save-status','Impossible de publier : '+e.message)}
}
$('login-form').addEventListener('submit',async e=>{e.preventDefault();if(!client){text('auth-status','Boutique non connectée. Renseignez config.js et activez les services.');return}const email=$('login-email').value.trim();text('auth-status','Envoi du lien…');const {error}=await client.auth.signInWithOtp({email,options:{emailRedirectTo:location.origin+'/index.html#compte'}});text('auth-status',error?'Erreur : '+error.message:'Lien envoyé à '+email+'. Vérifiez votre boîte mail.')});
$('logout-btn').addEventListener('click',()=>client?.auth.signOut());
$('buy-btn').addEventListener('click',async()=>{
 if(!salesOpen || !client){text('checkout-status','Démonstration : pour accepter des commandes, il faut activer les paiements avec ton compte Stripe AvisLink et confirmer les fournisseurs.');return}
 if(!auth){window.avislinkNavigate('compte');text('auth-status','Connectez-vous avant de passer commande.');return}
 if(!$('accept-terms').checked){text('checkout-status','Cochez la case confirmant votre lecture des CGV avant de payer.');return}
 const d=window.avislinkGetMerchant();if(!d.name?.trim()||d.name.trim().length<2){window.avislinkNavigate('espace');text('save-status','Renseignez le nom de votre commerce avant de commander.');return}
 if(!/^https:\/\/[^\s]+$/i.test(d.google||'')){window.avislinkNavigate('espace');text('save-status','Renseignez un lien d’avis Google valide commençant par https:// avant la commande.');return}
 text('checkout-status','Préparation de votre paiement…');$('buy-btn').disabled=true;
 try {const {data:{session}}=await client.auth.getSession();if(!session)throw Error('Session expirée : reconnectez-vous.');
 const response=await fetch('/.netlify/functions/create-checkout',{method:'POST',headers:{'content-type':'application/json',Authorization:'Bearer '+session.access_token},body:JSON.stringify({pack:selected,merchant:d})});const result=await response.json();if(!response.ok)throw Error(result.error||'Impossible de créer la commande');if(!result.url?.startsWith('https://checkout.stripe.com/'))throw Error('URL de paiement invalide');location.assign(result.url)
 }catch(error){text('checkout-status','Paiement indisponible : '+error.message);$('buy-btn').disabled=false}
});
async function verifyConfirmation(){const params=new URLSearchParams(location.search);const session=params.get('session_id');if(!session||!/^cs_[\w]+$/.test(session)){text('confirmation-message','Aucune session de paiement à vérifier.');return}try{const r=await fetch('/.netlify/functions/order-status?session_id='+encodeURIComponent(session));const d=await r.json();if(!r.ok)throw Error(d.error||'Erreur');text('confirmation-message',d.status==='paid'?'✓ Paiement confirmé ! Votre page est en préparation. Votre présentoir doit ensuite être fabriqué et expédié. Consultez votre compte pour le détail.':d.status==='awaiting_payment'?'Paiement en cours de traitement. Actualisez la page dans quelques instants.':'Commande non confirmée. Aucun paiement validé.') }catch(e){text('confirmation-message','La confirmation est indisponible : '+e.message)}}
configure();if(location.hash==='#confirmation')verifyConfirmation();
})();
