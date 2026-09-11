exports.handler = async (event) => {
  const H = {'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type'};
  if(event.httpMethod==='OPTIONS') return {statusCode:200,headers:H,body:''};
  if(event.httpMethod!=='POST') return {statusCode:405,headers:H,body:JSON.stringify({error:'Method not allowed'})};
  const SK = process.env.STRIPE_SECRET_KEY;
  if(!SK) return {statusCode:503,headers:H,body:JSON.stringify({error:'Stripe not configured. Add your key in the dashboard Settings tab.'})};
  try{
    const {productName,price} = JSON.parse(event.body||'{}');
    const origin = event.headers.origin || 'https://landraxequipment.shop';
    const amount = Math.round(parseFloat(String(price).replace(/,/g,'')) * 100);
    const params = new URLSearchParams({
      'payment_method_types[]':'card',
      'line_items[0][price_data][currency]':'usd',
      'line_items[0][price_data][product_data][name]':productName||'Mini Excavator',
      'line_items[0][price_data][unit_amount]':amount,
      'line_items[0][quantity]':'1',
      'mode':'payment',
      'success_url':origin+'/success.html?product='+encodeURIComponent(productName||''),
      'cancel_url':origin+'/',
      'shipping_address_collection[allowed_countries][]':'US',
    });
    const res = await fetch('https://api.stripe.com/v1/checkout/sessions',{
      method:'POST',
      headers:{'Authorization':'Bearer '+SK,'Content-Type':'application/x-www-form-urlencoded'},
      body:params.toString()
    });
    const data = await res.json();
    if(data.error) return {statusCode:400,headers:H,body:JSON.stringify({error:data.error.message})};
    return {statusCode:200,headers:H,body:JSON.stringify({url:data.url})};
  }catch(err){return {statusCode:500,headers:H,body:JSON.stringify({error:err.message})};}
};
