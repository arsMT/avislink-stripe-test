const {json,getStripe}=require('./stripe-test-shared.cjs');
exports.handler=async event=>{
 if(event.httpMethod!=='GET') return json(405,{error:'Méthode non autorisée'});
 const id=(event.queryStringParameters||{}).session_id||'';
 if(!/^cs_test_[A-Za-z0-9_]{5,250}$/.test(id))return json(400,{error:'Session test invalide.'});
 try{
   const session=await getStripe().checkout.sessions.retrieve(id);
   if(session.livemode!==false||session.metadata?.app!=='AvisLink'||session.metadata?.test_only!=='true') return json(403,{error:'Cette session ne correspond pas à un test AvisLink.'});
   return json(200,{paid:session.payment_status==='paid',status:session.payment_status,product:session.metadata.product_key,amount_cents:session.amount_total,currency:session.currency});
 }catch(error){console.error('Stripe test result:',error.code||error.type||'Error');return json(502,{error:'La confirmation Stripe ne peut pas être vérifiée.'});}
};
