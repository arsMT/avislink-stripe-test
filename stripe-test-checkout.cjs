const {json,getStripe,getSiteUrl,catalog}=require('./stripe-test-shared.cjs');
exports.handler=async event=>{
 if(event.httpMethod!=='POST') return json(405,{error:'Méthode non autorisée'});
 if((event.body||'').length>1500) return json(413,{error:'Requête trop volumineuse'});
 try {
  const body=JSON.parse(event.body||'{}');
  const product=catalog[body.product];
  if(!product) return json(400,{error:'Choisis un produit valide.'});
  const stripe=getStripe(),site=getSiteUrl();
  const session=await stripe.checkout.sessions.create({
   mode:'payment',
   // TEST ONLY: no webhook, no fulfillment or physical product will be dispatched.
   line_items:[{price_data:{currency:'eur',unit_amount:product.cents,product_data:{name:'TEST — '+product.name,description:'Simulation AvisLink : aucune commande réelle, aucun envoi.'}},quantity:1}],
   payment_method_types:['card'],
   success_url:site+'/stripe-test.html?session_id={CHECKOUT_SESSION_ID}#resultat',
   cancel_url:site+'/stripe-test.html?annule=1#resultat',
   metadata:{app:'AvisLink',test_only:'true',product_key:body.product}
  });
  if(!session.url||!session.url.startsWith('https://checkout.stripe.com/')) throw Error('Destination Stripe inattendue');
  return json(200,{checkout_url:session.url});
 }catch(error){
  console.error('Stripe test checkout:',error.code||error.type||'Error');
  if(error.code==='STRIPE_NOT_READY'||error.code==='SITE_NOT_READY')return json(503,{error:error.message});
  return json(502,{error:'Impossible de créer le paiement test. Vérifie la connexion Stripe et le déploiement des fonctions Netlify.'});
 }
};
