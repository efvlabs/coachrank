/** Emulator-only delivery exercise. Creates a pending fixture, never a real purchase.
 * Start Auth + Firestore emulators and the local app with a dummy Dodo API key.
 * node --env-file=.env.local scripts/verify-buyer-delivery.mjs
 */
import assert from 'node:assert/strict';
import {createHash,randomBytes} from 'node:crypto';
import {mkdirSync,writeFileSync} from 'node:fs';
import {initializeApp,deleteApp} from 'firebase-admin/app';
import {getFirestore,Timestamp} from 'firebase-admin/firestore';
import {Webhook} from 'standardwebhooks';
const base=process.env.BUYER_TEST_BASE || 'http://localhost:3100';
if(!['localhost','127.0.0.1'].includes(new URL(base).hostname)||process.env.FIREBASE_PROJECT_ID!=='coachrank-local'||!process.env.FIRESTORE_EMULATOR_HOST||!process.env.FIREBASE_AUTH_EMULATOR_HOST)throw new Error('This exercise requires the coachrank-local Auth and Firestore emulators.');
for(const host of [process.env.FIRESTORE_EMULATOR_HOST,process.env.FIREBASE_AUTH_EMULATOR_HOST])if(!/^(localhost|127\.0\.0\.1):\d+$/.test(host))throw new Error('Only loopback emulators are allowed.');
const key=process.env.DODO_PAYMENTS_WEBHOOK_KEY;if(!key)throw new Error('Set a local webhook fixture key.');
const app=initializeApp({projectId:'coachrank-local'});const db=getFirestore(app,process.env.FIREBASE_DATABASE_ID||'coachrank');
const jar=new Map();
async function call(path,body,method=body?'POST':'GET'){
 const r=await fetch(base+path,{method,headers:{origin:base,'content-type':'application/json',cookie:[...jar].map(([k,v])=>`${k}=${v}`).join('; ')},...(body?{body:JSON.stringify(body)}:{})});
 for(const cookie of r.headers.getSetCookie()){const pair=cookie.split(';')[0];const i=pair.indexOf('=');jar.set(pair.slice(0,i),pair.slice(i+1));}
 return r;
}
async function authCall(path,body){const r=await fetch(`http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1/accounts:${path}?key=local-test-key`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});assert.equal(r.status,200);return r.json();}
const email=`buyer-${randomBytes(4).toString('hex')}@coachrank.test`;
const slug='journey-delivery-fixture';
await db.collection('blogPosts').doc(slug).set({slug,title:'Local delivery fixture',status:'published',publishedAt:Timestamp.now(),createdAt:Timestamp.now(),updatedAt:Timestamp.now(),markdownBody:'Local exercise only.',excerpt:'Local exercise only.'});
assert.equal((await call('/api/journey',{path:`/blog/${slug}`,source:'reddit',campaign:'first-sale-2026-09',content:'reddit-audit'})).status,200);
assert.ok(jar.has('cr_journey'));
await call('/api/journey',{path:'/tools/brand-clarity'});await call('/api/journey',{path:'/sign-in'});
await authCall('sendOobCode',{requestType:'EMAIL_SIGNIN',email,continueUrl:base+'/sign-in',canHandleCodeInApp:true});
const codes=await (await fetch(`http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/emulator/v1/projects/coachrank-local/oobCodes`)).json();
const code=codes.oobCodes.findLast(c=>c.email===email);assert.ok(code);
const identity=await authCall('signInWithEmailLink',{email,oobCode:code.oobCode});
assert.equal((await call('/api/account/session',{idToken:identity.idToken})).status,200);
const id=randomBytes(16).toString('hex');const token=randomBytes(32).toString('hex');const now=Date.now();
await db.collection('assessmentOrders').doc(id).set({id,ownerUid:identity.localId,ownerEmail:email,journeyId:jar.get('cr_journey'),accessHash:createHash('sha256').update(token).digest('hex'),productId:'brand-product',priceCents:900,status:'pending',preview:false,checkoutUrl:'https://checkout.example.invalid/local-fixture',dodoSessionId:'local-fixture',dodoPaymentId:null,createdAtMs:now,paidAtMs:null,acceptedTermsAtMs:now,version:1,revision:0,answers:{},completed:[],completedCount:0,feedback:null});
const answers=Object.fromEntries(['audience','offer','difference','proof','message','visibility'].flatMap(d=>[1,2,3,4].map(n=>[`${d}-${n}`,2])));
assert.equal((await call(`/api/assessment?order=${id}`,{action:'complete',revision:0,payload:answers})).status,403);
const event=JSON.stringify({business_id:'local-fixture',type:'payment.succeeded',timestamp:new Date().toISOString(),data:{payload_type:'Payment',payment_id:'pay_local_'+id,total_amount:1062,tax:162,currency:'USD',status:'succeeded',created_at:new Date().toISOString(),product_cart:[{product_id:'brand-product',quantity:1}],metadata:{cr_kind:'assessment',cr_payment_id:id}}});
const message='msg_local_'+id;const date=new Date();const signature=new Webhook(key.replace(/^whsec_/, '')).sign(message,date,event);
async function webhook(sig){return fetch(base+'/api/webhooks/dodo',{method:'POST',headers:{'content-type':'application/json','webhook-id':message,'webhook-timestamp':String(Math.floor(date.getTime()/1000)),'webhook-signature':sig},body:event});}
assert.equal((await webhook('v1,aW52YWxpZA==')).status,401);
assert.equal((await (await webhook(signature)).json()).outcome,'unlocked');
assert.equal((await (await webhook(signature)).json()).outcome,'already_processed');
const before=await (await call(`/api/assessment?order=${id}`)).json();assert.equal(before.order.status,'paid');
const complete=await call(`/api/assessment?order=${id}`,{action:'complete',revision:0,payload:answers});assert.equal(complete.status,200);assert.equal((await complete.json()).order.completedCount,1);
const pdf=await call(`/api/assessment/report?order=${id}`);assert.equal(pdf.status,200);assert.match(pdf.headers.get('content-type'),/application\/pdf/);const bytes=Buffer.from(await pdf.arrayBuffer());assert.equal(bytes.subarray(0,4).toString(),'%PDF');
// A fresh browser session for the same verified account can restore the purchase.
jar.delete('cr_customer');jar.delete('cr_brand_access');jar.delete('cr_journey');
assert.equal((await call(`/api/assessment?order=${id}`)).status,401);
assert.equal((await call('/api/account/session',{idToken:identity.idToken})).status,200);
assert.equal((await (await call(`/api/assessment?order=${id}`)).json()).order.completedCount,1);
const order=(await db.collection('assessmentOrders').doc(id).get()).data();
const journey=(await db.collection('buyingJourneys').doc(order.journeyId).get()).data();assert.equal(journey.source,'reddit');assert.ok(journey.stages.sign_in_completed);assert.ok(order.firstCompletedAtMs);
mkdirSync('tmp/buyer-delivery',{recursive:true});writeFileSync('tmp/buyer-delivery/local-report.pdf',bytes);
const result={environment:'coachrank-local emulators',emailLinkSignIn:'passed',unpaidAccess:'blocked',tamperedWebhook:'rejected',verifiedFixtureWebhook:'unlocked once',reportSave:'passed',pdfBytes:bytes.length,accountRecovery:'passed',source:'reddit / first-sale-2026-09 / reddit-audit',realPayment:false};
writeFileSync('tmp/buyer-delivery/result.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));await deleteApp(app);
