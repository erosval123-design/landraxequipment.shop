exports.handler = async (event) => {
  const H = {'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type'};
  if(event.httpMethod==='OPTIONS') return {statusCode:200,headers:H,body:''};
  const SK = process.env.STRIPE_SECRET_KEY;
  if(!SK) return {statusCode:503,headers:H,body:JSON.stringify({error:'Stripe not configured'})};
  try{
    const [sessRes,piRes] = await Promise.all([
      fetch('https://api.stripe.com/v1/checkout/sessions?limit=100&expand[]=data.line_items',{
        headers:{'Authorization':'Bearer '+SK}
      }),
      fetch('https://api.stripe.com/v1/payment_intents?limit=100',{
        headers:{'Authorization':'Bearer '+SK}
      })
    ]);
    const [sessData,piData] = await Promise.all([sessRes.json(),piRes.json()]);
    if(sessData.error) return {statusCode:400,headers:H,body:JSON.stringify({error:sessData.error.message})};
    const sessions = sessData.data||[];
    const paid = sessions.filter(s=>s.payment_status==='paid').map(s=>({
      id:s.id,
      customer:s.customer_details?.email||s.customer_details?.name||'Unknown',
      product:s.line_items?.data?.[0]?.description||'Mini Excavator',
      amount:(s.amount_total/100).toFixed(2),
      date:new Date(s.created*1000).toLocaleDateString(),
      status:'paid'
    }));
    const abandoned = sessions.filter(s=>s.status==='expired'||s.payment_status==='unpaid').map(s=>({
      id:s.id,
      customer:s.customer_details?.email||'Anonymous',
      product:s.line_items?.data?.[0]?.description||'Unknown',
      amount:s.amount_total?(s.amount_total/100).toFixed(2):'—',
      date:new Date(s.created*1000).toLocaleDateString(),
      status:'abandoned'
    }));
    return {statusCode:200,headers:H,body:JSON.stringify({orders:paid,abandoned,revenue:(paid.reduce((t,o)=>t+parseFloat(o.amount),0)).toFixed(2)})};
  }catch(err){return {statusCode:500,headers:H,body:JSON.stringify({error:err.message})};}
};
