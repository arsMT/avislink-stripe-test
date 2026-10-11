const {json,getStripe}=require('./stripe-test-shared.cjs');
exports.handler=async event=>{
 if(event.httpMethod!=='GET') return json(405,{connected:false,message:'Méthode non autorisée'});
 try {
  // Verify credentials against Stripe API, not only whether a string exists.
  const stripe=getStripe();
  const acct=await stripe.accounts.retrieve();
  return json(200,{connected:true,mode:'test',name:acct.business_profile?.name||acct.settings?.dashboard?.display_name||'Compte Stripe connecté',account_id:acct.id||null});
 }catch(error){
  console.error('Stripe test status:',error.code||error.type||'Error');
  const configured=error.code!=='STRIPE_NOT_READY';
  return json(configured?502:200,{connected:false,mode:'test',message:configured?'Stripe ne confirme pas cette clé. Vérifie la clé secrète de TEST et redéploie.':error.message});
 }
};
