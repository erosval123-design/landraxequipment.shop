exports.handler = async (event) => {
  const H = {'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type'};
  if(event.httpMethod==='OPTIONS') return {statusCode:200,headers:H,body:''};
  if(event.httpMethod!=='POST') return {statusCode:405,headers:H,body:JSON.stringify({error:'Method not allowed'})};
  const {secretKey, webhookSecret} = JSON.parse(event.body||'{}');
  const keyToSave = secretKey || webhookSecret;
  const envKey = secretKey ? 'STRIPE_SECRET_KEY' : 'STRIPE_WEBHOOK_SECRET';
  if(secretKey && !secretKey.startsWith('sk_')) return {statusCode:400,headers:H,body:JSON.stringify({error:'Key must start with sk_live_ or sk_test_'})};
  if(webhookSecret && !webhookSecret.startsWith('whsec_')) return {statusCode:400,headers:H,body:JSON.stringify({error:'Secret must start with whsec_'})};
  if(!keyToSave) return {statusCode:400,headers:H,body:JSON.stringify({error:'No key provided'})};
  const siteId = process.env.NETLIFY_SITE_ID;
  const nToken = process.env.NETLIFY_API_TOKEN;
  if(!siteId||!nToken) return {statusCode:500,headers:H,body:JSON.stringify({error:'Netlify env vars not configured on server'})};
  try{
    let res = await fetch('https://api.netlify.com/api/v1/sites/'+siteId+'/env',{
      method:'POST',
      headers:{'Authorization':'Bearer '+nToken,'Content-Type':'application/json'},
      body:JSON.stringify([{key:envKey,values:[{value:keyToSave,context:'all'}]}])
    });
    if(!res.ok){
      res = await fetch('https://api.netlify.com/api/v1/sites/'+siteId+'/env/'+envKey,{
        method:'PUT',
        headers:{'Authorization':'Bearer '+nToken,'Content-Type':'application/json'},
        body:JSON.stringify({key:envKey,values:[{value:keyToSave,context:'all'}]})
      });
    }
    if(secretKey){
      await fetch('https://api.netlify.com/api/v1/sites/'+siteId+'/builds',{
        method:'POST',
        headers:{'Authorization':'Bearer '+nToken,'Content-Type':'application/json'},
        body:JSON.stringify({clear_cache:false})
      });
    }
    return {statusCode:200,headers:H,body:JSON.stringify({success:true,message:secretKey?'Stripe connected! Store will be live in ~30 seconds.':'Webhook secret saved!'})};
  }catch(err){return {statusCode:500,headers:H,body:JSON.stringify({error:err.message})};}
};
