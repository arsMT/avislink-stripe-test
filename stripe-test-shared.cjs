// Shared server-side safeguards: test keys only, fixed product catalogue, no real orders.
const Stripe = require('stripe');
const catalog = Object.freeze({
  solo: {name:'Carte NFC Solo', cents:2990},
  duo: {name:'Pack Duo', cents:4990},
  pro: {name:'Pack Pro', cents:8990},
  premium_unisign: {name:'AvisLink Signature — bois & doré', cents:4990},
  premium_izikard: {name:'AvisLink Prestige — bois personnalisé', cents:9990}
});
const json=(statusCode,data)=>({statusCode,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'},body:JSON.stringify(data)});
function getStripe(){
 const secret=(process.env.STRIPE_SECRET_KEY||'').trim();
 if(!secret.startsWith('sk_test_')||secret.length<22) throw Object.assign(new Error('Clé Stripe de TEST non configurée. Ajoute STRIPE_SECRET_KEY (sk_test_...) dans les variables Netlify.'),{code:'STRIPE_NOT_READY'});
 return new Stripe(secret);
}
function getSiteUrl(){
 const candidate=(process.env.SITE_URL||process.env.URL||'').replace(/\/+$/,'');
 try { const url=new URL(candidate); if(url.protocol!=='https:' || url.username||url.password||url.search||url.hash) throw Error('bad'); return url.origin; }
 catch {throw Object.assign(new Error('Adresse HTTPS du site inconnue : vérifie SITE_URL ou la variable URL de Netlify.'),{code:'SITE_NOT_READY'});}
}
module.exports={catalog,json,getStripe,getSiteUrl};
