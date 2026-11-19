var ResumeRenderer=(()=>{var N=Object.defineProperty;var _e=Object.getOwnPropertyDescriptor;var ke=Object.getOwnPropertyNames;var Ce=Object.prototype.hasOwnProperty;var xe=(s,e)=>{for(var t in e)N(s,t,{get:e[t],enumerable:!0})},Oe=(s,e,t,n)=>{if(e&&typeof e=="object"||typeof e=="function")for(let i of ke(e))!Ce.call(s,i)&&i!==t&&N(s,i,{get:()=>e[i],enumerable:!(n=_e(e,i))||n.enumerable});return s};var Re=s=>Oe(N({},"__esModule",{value:!0}),s);var ze={};xe(ze,{generateResumeHtml:()=>Ge});var C={};var v=class s extends Error{constructor(e){super("ClientResponseError"),this.url="",this.status=0,this.response={},this.isAbort=!1,this.originalError=null,Object.setPrototypeOf(this,s.prototype),e!==null&&typeof e=="object"&&(this.originalError=e.originalError,this.url=typeof e.url=="string"?e.url:"",this.status=typeof e.status=="number"?e.status:0,this.isAbort=!!e.isAbort||e.name==="AbortError"||e.message==="Aborted",e.response!==null&&typeof e.response=="object"?this.response=e.response:e.data!==null&&typeof e.data=="object"?this.response=e.data:this.response={}),this.originalError||e instanceof s||(this.originalError=e),this.name="ClientResponseError "+this.status,this.message=this.response?.message,this.message||(this.isAbort?this.message="The request was aborted (most likely autocancelled; you can find more info in https://github.com/pocketbase/js-sdk#auto-cancellation).":this.originalError?.cause?.message?.includes("ECONNREFUSED ::1")?this.message="Failed to connect to the PocketBase server. Try changing the SDK URL from localhost to 127.0.0.1 (https://github.com/pocketbase/js-sdk/issues/21).":this.message="Something went wrong."),this.cause=this.originalError}get data(){return this.response}toJSON(){return{...this}}},A=/^[\u0009\u0020-\u007e\u0080-\u00ff]+$/;function Pe(s,e){let t={};if(typeof s!="string")return t;let n=Object.assign({},e||{}).decode||Ae,i=0;for(;i<s.length;){let o=s.indexOf("=",i);if(o===-1)break;let r=s.indexOf(";",i);if(r===-1)r=s.length;else if(r<o){i=s.lastIndexOf(";",o-1)+1;continue}let a=s.slice(i,o).trim();if(t[a]===void 0){let c=s.slice(o+1,r).trim();c.charCodeAt(0)===34&&(c=c.slice(1,-1));try{t[a]=n(c)}catch{t[a]=c}}i=r+1}return t}function ee(s,e,t){let n=Object.assign({},t||{}),i=n.encode||Le;if(!A.test(s))throw new TypeError("argument name is invalid");let o=i(e);if(o&&!A.test(o))throw new TypeError("argument val is invalid");let r=s+"="+o;if(n.maxAge!=null){let a=n.maxAge-0;if(isNaN(a)||!isFinite(a))throw new TypeError("option maxAge is invalid");r+="; Max-Age="+Math.floor(a)}if(n.domain){if(!A.test(n.domain))throw new TypeError("option domain is invalid");r+="; Domain="+n.domain}if(n.path){if(!A.test(n.path))throw new TypeError("option path is invalid");r+="; Path="+n.path}if(n.expires){if(!(function(c){return Object.prototype.toString.call(c)==="[object Date]"||c instanceof Date})(n.expires)||isNaN(n.expires.valueOf()))throw new TypeError("option expires is invalid");r+="; Expires="+n.expires.toUTCString()}if(n.httpOnly&&(r+="; HttpOnly"),n.secure&&(r+="; Secure"),n.priority)switch(typeof n.priority=="string"?n.priority.toLowerCase():n.priority){case"low":r+="; Priority=Low";break;case"medium":r+="; Priority=Medium";break;case"high":r+="; Priority=High";break;default:throw new TypeError("option priority is invalid")}if(n.sameSite)switch(typeof n.sameSite=="string"?n.sameSite.toLowerCase():n.sameSite){case!0:r+="; SameSite=Strict";break;case"lax":r+="; SameSite=Lax";break;case"strict":r+="; SameSite=Strict";break;case"none":r+="; SameSite=None";break;default:throw new TypeError("option sameSite is invalid")}return r}function Ae(s){return s.indexOf("%")!==-1?decodeURIComponent(s):s}function Le(s){return encodeURIComponent(s)}var Ie=typeof navigator<"u"&&navigator.product==="ReactNative"||typeof global<"u"&&global.HermesInternal,oe;function R(s){if(s)try{let e=decodeURIComponent(oe(s.split(".")[1]).split("").map((function(t){return"%"+("00"+t.charCodeAt(0).toString(16)).slice(-2)})).join(""));return JSON.parse(e)||{}}catch{}return{}}function re(s,e=0){let t=R(s);return!(Object.keys(t).length>0&&(!t.exp||t.exp-e>Date.now()/1e3))}oe=typeof atob!="function"||Ie?s=>{let e=String(s).replace(/=+$/,"");if(e.length%4==1)throw new Error("'atob' failed: The string to be decoded is not correctly encoded.");for(var t,n,i=0,o=0,r="";n=e.charAt(o++);~n&&(t=i%4?64*t+n:n,i++%4)?r+=String.fromCharCode(255&t>>(-2*i&6)):0)n="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=".indexOf(n);return r}:atob;var te="pb_auth",T=class{constructor(){this.baseToken="",this.baseModel=null,this._onChangeCallbacks=[]}get token(){return this.baseToken}get record(){return this.baseModel}get model(){return this.baseModel}get isValid(){return!re(this.token)}get isSuperuser(){let e=R(this.token);return e.type=="auth"&&(this.record?.collectionName=="_superusers"||!this.record?.collectionName&&e.collectionId=="pbc_3142635823")}get isAdmin(){return console.warn("Please replace pb.authStore.isAdmin with pb.authStore.isSuperuser OR simply check the value of pb.authStore.record?.collectionName"),this.isSuperuser}get isAuthRecord(){return console.warn("Please replace pb.authStore.isAuthRecord with !pb.authStore.isSuperuser OR simply check the value of pb.authStore.record?.collectionName"),R(this.token).type=="auth"&&!this.isSuperuser}save(e,t){this.baseToken=e||"",this.baseModel=t||null,this.triggerChange()}clear(){this.baseToken="",this.baseModel=null,this.triggerChange()}loadFromCookie(e,t=te){let n=Pe(e||"")[t]||"",i={};try{i=JSON.parse(n),(typeof i===null||typeof i!="object"||Array.isArray(i))&&(i={})}catch{}this.save(i.token||"",i.record||i.model||null)}exportToCookie(e,t=te){let n={secure:!0,sameSite:!0,httpOnly:!0,path:"/"},i=R(this.token);n.expires=i?.exp?new Date(1e3*i.exp):new Date("1970-01-01"),e=Object.assign({},n,e);let o={token:this.token,record:this.record?JSON.parse(JSON.stringify(this.record)):null},r=ee(t,JSON.stringify(o),e),a=typeof Blob<"u"?new Blob([r]).size:r.length;if(o.record&&a>4096){o.record={id:o.record?.id,email:o.record?.email};let c=["collectionId","collectionName","verified"];for(let p in this.record)c.includes(p)&&(o.record[p]=this.record[p]);r=ee(t,JSON.stringify(o),e)}return r}onChange(e,t=!1){return this._onChangeCallbacks.push(e),t&&e(this.token,this.record),()=>{for(let n=this._onChangeCallbacks.length-1;n>=0;n--)if(this._onChangeCallbacks[n]==e)return delete this._onChangeCallbacks[n],void this._onChangeCallbacks.splice(n,1)}}triggerChange(){for(let e of this._onChangeCallbacks)e&&e(this.token,this.record)}},j=class extends T{constructor(e="pocketbase_auth"){super(),this.storageFallback={},this.storageKey=e,this._bindStorageEvent()}get token(){return(this._storageGet(this.storageKey)||{}).token||""}get record(){let e=this._storageGet(this.storageKey)||{};return e.record||e.model||null}get model(){return this.record}save(e,t){this._storageSet(this.storageKey,{token:e,record:t}),super.save(e,t)}clear(){this._storageRemove(this.storageKey),super.clear()}_storageGet(e){if(typeof window<"u"&&window?.localStorage){let t=window.localStorage.getItem(e)||"";try{return JSON.parse(t)}catch{return t}}return this.storageFallback[e]}_storageSet(e,t){if(typeof window<"u"&&window?.localStorage){let n=t;typeof t!="string"&&(n=JSON.stringify(t)),window.localStorage.setItem(e,n)}else this.storageFallback[e]=t}_storageRemove(e){typeof window<"u"&&window?.localStorage&&window.localStorage?.removeItem(e),delete this.storageFallback[e]}_bindStorageEvent(){typeof window<"u"&&window?.localStorage&&window.addEventListener&&window.addEventListener("storage",(e=>{if(e.key!=this.storageKey)return;let t=this._storageGet(this.storageKey)||{};super.save(t.token||"",t.record||t.model||null)}))}},k=class{constructor(e){this.client=e}},U=class extends k{async getAll(e){return e=Object.assign({method:"GET"},e),this.client.send("/api/settings",e)}async update(e,t){return t=Object.assign({method:"PATCH",body:e},t),this.client.send("/api/settings",t)}async testS3(e="storage",t){return t=Object.assign({method:"POST",body:{filesystem:e}},t),this.client.send("/api/settings/test/s3",t).then((()=>!0))}async testEmail(e,t,n,i){return i=Object.assign({method:"POST",body:{email:t,template:n,collection:e}},i),this.client.send("/api/settings/test/email",i).then((()=>!0))}async generateAppleClientSecret(e,t,n,i,o,r){return r=Object.assign({method:"POST",body:{clientId:e,teamId:t,keyId:n,privateKey:i,duration:o}},r),this.client.send("/api/settings/apple/generate-client-secret",r)}},Ne=["requestKey","$cancelKey","$autoCancel","fetch","headers","body","query","params","cache","credentials","headers","integrity","keepalive","method","mode","redirect","referrer","referrerPolicy","signal","window"];function V(s){if(s){s.query=s.query||{};for(let e in s)Ne.includes(e)||(s.query[e]=s[e],delete s[e])}}function Q(s){let e=[];for(let t in s){let n=encodeURIComponent(t),i=Array.isArray(s[t])?s[t]:[s[t]];for(let o of i)o=qe(o),o!==null&&e.push(n+"="+o)}return e.join("&")}function qe(s){return s==null?null:s instanceof Date?encodeURIComponent(s.toISOString().replace("T"," ")):encodeURIComponent(typeof s=="object"?JSON.stringify(s):s)}var L=class extends k{constructor(){super(...arguments),this.clientId="",this.eventSource=null,this.subscriptions={},this.lastSentSubscriptions=[],this.maxConnectTimeout=15e3,this.reconnectAttempts=0,this.maxReconnectAttempts=1/0,this.predefinedReconnectIntervals=[200,300,500,1e3,1200,1500,2e3],this.pendingConnects=[]}get isConnected(){return!!this.eventSource&&!!this.clientId&&!this.pendingConnects.length}async subscribe(e,t,n){if(!e)throw new Error("topic must be set.");let i=e;if(n){V(n=Object.assign({},n));let r="options="+encodeURIComponent(JSON.stringify({query:n.query,headers:n.headers}));i+=(i.includes("?")?"&":"?")+r}let o=function(r){let a=r,c;try{c=JSON.parse(a?.data)}catch{}t(c||{})};return this.subscriptions[i]||(this.subscriptions[i]=[]),this.subscriptions[i].push(o),this.isConnected?this.subscriptions[i].length===1?await this.submitSubscriptions():this.eventSource?.addEventListener(i,o):await this.connect(),async()=>this.unsubscribeByTopicAndListener(e,o)}async unsubscribe(e){let t=!1;if(e){let n=this.getSubscriptionsByTopic(e);for(let i in n)if(this.hasSubscriptionListeners(i)){for(let o of this.subscriptions[i])this.eventSource?.removeEventListener(i,o);delete this.subscriptions[i],t||(t=!0)}}else this.subscriptions={};this.hasSubscriptionListeners()?t&&await this.submitSubscriptions():this.disconnect()}async unsubscribeByPrefix(e){let t=!1;for(let n in this.subscriptions)if((n+"?").startsWith(e)){t=!0;for(let i of this.subscriptions[n])this.eventSource?.removeEventListener(n,i);delete this.subscriptions[n]}t&&(this.hasSubscriptionListeners()?await this.submitSubscriptions():this.disconnect())}async unsubscribeByTopicAndListener(e,t){let n=!1,i=this.getSubscriptionsByTopic(e);for(let o in i){if(!Array.isArray(this.subscriptions[o])||!this.subscriptions[o].length)continue;let r=!1;for(let a=this.subscriptions[o].length-1;a>=0;a--)this.subscriptions[o][a]===t&&(r=!0,delete this.subscriptions[o][a],this.subscriptions[o].splice(a,1),this.eventSource?.removeEventListener(o,t));r&&(this.subscriptions[o].length||delete this.subscriptions[o],n||this.hasSubscriptionListeners(o)||(n=!0))}this.hasSubscriptionListeners()?n&&await this.submitSubscriptions():this.disconnect()}hasSubscriptionListeners(e){if(this.subscriptions=this.subscriptions||{},e)return!!this.subscriptions[e]?.length;for(let t in this.subscriptions)if(this.subscriptions[t]?.length)return!0;return!1}async submitSubscriptions(){if(this.clientId)return this.addAllSubscriptionListeners(),this.lastSentSubscriptions=this.getNonEmptySubscriptionKeys(),this.client.send("/api/realtime",{method:"POST",body:{clientId:this.clientId,subscriptions:this.lastSentSubscriptions},requestKey:this.getSubscriptionsCancelKey()}).catch((e=>{if(!e?.isAbort)throw e}))}getSubscriptionsCancelKey(){return"realtime_"+this.clientId}getSubscriptionsByTopic(e){let t={};e=e.includes("?")?e:e+"?";for(let n in this.subscriptions)(n+"?").startsWith(e)&&(t[n]=this.subscriptions[n]);return t}getNonEmptySubscriptionKeys(){let e=[];for(let t in this.subscriptions)this.subscriptions[t].length&&e.push(t);return e}addAllSubscriptionListeners(){if(this.eventSource){this.removeAllSubscriptionListeners();for(let e in this.subscriptions)for(let t of this.subscriptions[e])this.eventSource.addEventListener(e,t)}}removeAllSubscriptionListeners(){if(this.eventSource)for(let e in this.subscriptions)for(let t of this.subscriptions[e])this.eventSource.removeEventListener(e,t)}async connect(){if(!(this.reconnectAttempts>0))return new Promise(((e,t)=>{this.pendingConnects.push({resolve:e,reject:t}),this.pendingConnects.length>1||this.initConnect()}))}initConnect(){this.disconnect(!0),clearTimeout(this.connectTimeoutId),this.connectTimeoutId=setTimeout((()=>{this.connectErrorHandler(new Error("EventSource connect took too long."))}),this.maxConnectTimeout),this.eventSource=new EventSource(this.client.buildURL("/api/realtime")),this.eventSource.onerror=e=>{this.connectErrorHandler(new Error("Failed to establish realtime connection."))},this.eventSource.addEventListener("PB_CONNECT",(e=>{let t=e;this.clientId=t?.lastEventId,this.submitSubscriptions().then((async()=>{let n=3;for(;this.hasUnsentSubscriptions()&&n>0;)n--,await this.submitSubscriptions()})).then((()=>{for(let i of this.pendingConnects)i.resolve();this.pendingConnects=[],this.reconnectAttempts=0,clearTimeout(this.reconnectTimeoutId),clearTimeout(this.connectTimeoutId);let n=this.getSubscriptionsByTopic("PB_CONNECT");for(let i in n)for(let o of n[i])o(e)})).catch((n=>{this.clientId="",this.connectErrorHandler(n)}))}))}hasUnsentSubscriptions(){let e=this.getNonEmptySubscriptionKeys();if(e.length!=this.lastSentSubscriptions.length)return!0;for(let t of e)if(!this.lastSentSubscriptions.includes(t))return!0;return!1}connectErrorHandler(e){if(clearTimeout(this.connectTimeoutId),clearTimeout(this.reconnectTimeoutId),!this.clientId&&!this.reconnectAttempts||this.reconnectAttempts>this.maxReconnectAttempts){for(let n of this.pendingConnects)n.reject(new v(e));return this.pendingConnects=[],void this.disconnect()}this.disconnect(!0);let t=this.predefinedReconnectIntervals[this.reconnectAttempts]||this.predefinedReconnectIntervals[this.predefinedReconnectIntervals.length-1];this.reconnectAttempts++,this.reconnectTimeoutId=setTimeout((()=>{this.initConnect()}),t)}disconnect(e=!1){if(this.clientId&&this.onDisconnect&&this.onDisconnect(Object.keys(this.subscriptions)),clearTimeout(this.connectTimeoutId),clearTimeout(this.reconnectTimeoutId),this.removeAllSubscriptionListeners(),this.client.cancelRequest(this.getSubscriptionsCancelKey()),this.eventSource?.close(),this.eventSource=null,this.clientId="",!e){this.reconnectAttempts=0;for(let t of this.pendingConnects)t.resolve();this.pendingConnects=[]}}},I=class extends k{decode(e){return e}async getFullList(e,t){if(typeof e=="number")return this._getFullList(e,t);let n=1e3;return(t=Object.assign({},e,t)).batch&&(n=t.batch,delete t.batch),this._getFullList(n,t)}async getList(e=1,t=30,n){return(n=Object.assign({method:"GET"},n)).query=Object.assign({page:e,perPage:t},n.query),this.client.send(this.baseCrudPath,n).then((i=>(i.items=i.items?.map((o=>this.decode(o)))||[],i)))}async getFirstListItem(e,t){return(t=Object.assign({requestKey:"one_by_filter_"+this.baseCrudPath+"_"+e},t)).query=Object.assign({filter:e,skipTotal:1},t.query),this.getList(1,1,t).then((n=>{if(!n?.items?.length)throw new v({status:404,response:{code:404,message:"The requested resource wasn't found.",data:{}}});return n.items[0]}))}async getOne(e,t){if(!e)throw new v({url:this.client.buildURL(this.baseCrudPath+"/"),status:404,response:{code:404,message:"Missing required record id.",data:{}}});return t=Object.assign({method:"GET"},t),this.client.send(this.baseCrudPath+"/"+encodeURIComponent(e),t).then((n=>this.decode(n)))}async create(e,t){return t=Object.assign({method:"POST",body:e},t),this.client.send(this.baseCrudPath,t).then((n=>this.decode(n)))}async update(e,t,n){return n=Object.assign({method:"PATCH",body:t},n),this.client.send(this.baseCrudPath+"/"+encodeURIComponent(e),n).then((i=>this.decode(i)))}async delete(e,t){return t=Object.assign({method:"DELETE"},t),this.client.send(this.baseCrudPath+"/"+encodeURIComponent(e),t).then((()=>!0))}_getFullList(e=1e3,t){(t=t||{}).query=Object.assign({skipTotal:1},t.query);let n=[],i=async o=>this.getList(o,e||1e3,t).then((r=>{let a=r.items;return n=n.concat(a),a.length==r.perPage?i(o+1):n}));return i(1)}};function O(s,e,t,n){let i=n!==void 0;return i||t!==void 0?i?(console.warn(s),e.body=Object.assign({},e.body,t),e.query=Object.assign({},e.query,n),e):Object.assign(e,t):e}function q(s){s._resetAutoRefresh?.()}var F=class extends I{constructor(e,t){super(e),this.collectionIdOrName=t}get baseCrudPath(){return this.baseCollectionPath+"/records"}get baseCollectionPath(){return"/api/collections/"+encodeURIComponent(this.collectionIdOrName)}get isSuperusers(){return this.collectionIdOrName=="_superusers"||this.collectionIdOrName=="_pbc_2773867675"}async subscribe(e,t,n){if(!e)throw new Error("Missing topic.");if(!t)throw new Error("Missing subscription callback.");return this.client.realtime.subscribe(this.collectionIdOrName+"/"+e,t,n)}async unsubscribe(e){return e?this.client.realtime.unsubscribe(this.collectionIdOrName+"/"+e):this.client.realtime.unsubscribeByPrefix(this.collectionIdOrName)}async getFullList(e,t){if(typeof e=="number")return super.getFullList(e,t);let n=Object.assign({},e,t);return super.getFullList(n)}async getList(e=1,t=30,n){return super.getList(e,t,n)}async getFirstListItem(e,t){return super.getFirstListItem(e,t)}async getOne(e,t){return super.getOne(e,t)}async create(e,t){return super.create(e,t)}async update(e,t,n){return super.update(e,t,n).then((i=>{if(this.client.authStore.record?.id===i?.id&&(this.client.authStore.record?.collectionId===this.collectionIdOrName||this.client.authStore.record?.collectionName===this.collectionIdOrName)){let o=Object.assign({},this.client.authStore.record.expand),r=Object.assign({},this.client.authStore.record,i);o&&(r.expand=Object.assign(o,i.expand)),this.client.authStore.save(this.client.authStore.token,r)}return i}))}async delete(e,t){return super.delete(e,t).then((n=>(!n||this.client.authStore.record?.id!==e||this.client.authStore.record?.collectionId!==this.collectionIdOrName&&this.client.authStore.record?.collectionName!==this.collectionIdOrName||this.client.authStore.clear(),n)))}authResponse(e){let t=this.decode(e?.record||{});return this.client.authStore.save(e?.token,t),Object.assign({},e,{token:e?.token||"",record:t})}async listAuthMethods(e){return e=Object.assign({method:"GET",fields:"mfa,otp,password,oauth2"},e),this.client.send(this.baseCollectionPath+"/auth-methods",e)}async authWithPassword(e,t,n){let i;n=Object.assign({method:"POST",body:{identity:e,password:t}},n),this.isSuperusers&&(i=n.autoRefreshThreshold,delete n.autoRefreshThreshold,n.autoRefresh||q(this.client));let o=await this.client.send(this.baseCollectionPath+"/auth-with-password",n);return o=this.authResponse(o),i&&this.isSuperusers&&(function(a,c,p,y){q(a);let b=a.beforeSend,w=a.authStore.record,u=a.authStore.onChange(((l,h)=>{(!l||h?.id!=w?.id||(h?.collectionId||w?.collectionId)&&h?.collectionId!=w?.collectionId)&&q(a)}));a._resetAutoRefresh=function(){u(),a.beforeSend=b,delete a._resetAutoRefresh},a.beforeSend=async(l,h)=>{let f=a.authStore.token;if(h.query?.autoRefresh)return b?b(l,h):{url:l,sendOptions:h};let m=a.authStore.isValid;if(m&&re(a.authStore.token,c))try{await p()}catch{m=!1}m||await y();let S=h.headers||{};for(let g in S)if(g.toLowerCase()=="authorization"&&f==S[g]&&a.authStore.token){S[g]=a.authStore.token;break}return h.headers=S,b?b(l,h):{url:l,sendOptions:h}}})(this.client,i,(()=>this.authRefresh({autoRefresh:!0})),(()=>this.authWithPassword(e,t,Object.assign({autoRefresh:!0},n)))),o}async authWithOAuth2Code(e,t,n,i,o,r,a){let c={method:"POST",body:{provider:e,code:t,codeVerifier:n,redirectURL:i,createData:o}};return c=O("This form of authWithOAuth2Code(provider, code, codeVerifier, redirectURL, createData?, body?, query?) is deprecated. Consider replacing it with authWithOAuth2Code(provider, code, codeVerifier, redirectURL, createData?, options?).",c,r,a),this.client.send(this.baseCollectionPath+"/auth-with-oauth2",c).then((p=>this.authResponse(p)))}authWithOAuth2(...e){if(e.length>1||typeof e?.[0]=="string")return console.warn("PocketBase: This form of authWithOAuth2() is deprecated and may get removed in the future. Please replace with authWithOAuth2Code() OR use the authWithOAuth2() realtime form as shown in https://pocketbase.io/docs/authentication/#oauth2-integration."),this.authWithOAuth2Code(e?.[0]||"",e?.[1]||"",e?.[2]||"",e?.[3]||"",e?.[4]||{},e?.[5]||{},e?.[6]||{});let t=e?.[0]||{},n=null;t.urlCallback||(n=ne(void 0));let i=new L(this.client);function o(){n?.close(),i.unsubscribe()}let r={},a=t.requestKey;return a&&(r.requestKey=a),this.listAuthMethods(r).then((c=>{let p=c.oauth2.providers.find((b=>b.name===t.provider));if(!p)throw new v(new Error(`Missing or invalid provider "${t.provider}".`));let y=this.client.buildURL("/api/oauth2-redirect");return new Promise((async(b,w)=>{let u=a?this.client.cancelControllers?.[a]:void 0;u&&(u.signal.onabort=()=>{o(),w(new v({isAbort:!0,message:"manually cancelled"}))}),i.onDisconnect=l=>{l.length&&w&&(o(),w(new v(new Error("realtime connection interrupted"))))};try{await i.subscribe("@oauth2",(async m=>{let S=i.clientId;try{if(!m.state||S!==m.state)throw new Error("State parameters don't match.");if(m.error||!m.code)throw new Error("OAuth2 redirect error or missing code: "+m.error);let g=Object.assign({},t);delete g.provider,delete g.scopes,delete g.createData,delete g.urlCallback,u?.signal?.onabort&&(u.signal.onabort=null);let x=await this.authWithOAuth2Code(p.name,m.code,p.codeVerifier,y,t.createData,g);b(x)}catch(g){w(new v(g))}o()}));let l={state:i.clientId};t.scopes?.length&&(l.scope=t.scopes.join(" "));let h=this._replaceQueryParams(p.authURL+y,l);await(t.urlCallback||function(m){n?n.location.href=m:n=ne(m)})(h)}catch(l){u?.signal?.onabort&&(u.signal.onabort=null),o(),w(new v(l))}}))})).catch((c=>{throw o(),c}))}async authRefresh(e,t){let n={method:"POST"};return n=O("This form of authRefresh(body?, query?) is deprecated. Consider replacing it with authRefresh(options?).",n,e,t),this.client.send(this.baseCollectionPath+"/auth-refresh",n).then((i=>this.authResponse(i)))}async requestPasswordReset(e,t,n){let i={method:"POST",body:{email:e}};return i=O("This form of requestPasswordReset(email, body?, query?) is deprecated. Consider replacing it with requestPasswordReset(email, options?).",i,t,n),this.client.send(this.baseCollectionPath+"/request-password-reset",i).then((()=>!0))}async confirmPasswordReset(e,t,n,i,o){let r={method:"POST",body:{token:e,password:t,passwordConfirm:n}};return r=O("This form of confirmPasswordReset(token, password, passwordConfirm, body?, query?) is deprecated. Consider replacing it with confirmPasswordReset(token, password, passwordConfirm, options?).",r,i,o),this.client.send(this.baseCollectionPath+"/confirm-password-reset",r).then((()=>!0))}async requestVerification(e,t,n){let i={method:"POST",body:{email:e}};return i=O("This form of requestVerification(email, body?, query?) is deprecated. Consider replacing it with requestVerification(email, options?).",i,t,n),this.client.send(this.baseCollectionPath+"/request-verification",i).then((()=>!0))}async confirmVerification(e,t,n){let i={method:"POST",body:{token:e}};return i=O("This form of confirmVerification(token, body?, query?) is deprecated. Consider replacing it with confirmVerification(token, options?).",i,t,n),this.client.send(this.baseCollectionPath+"/confirm-verification",i).then((()=>{let o=R(e),r=this.client.authStore.record;return r&&!r.verified&&r.id===o.id&&r.collectionId===o.collectionId&&(r.verified=!0,this.client.authStore.save(this.client.authStore.token,r)),!0}))}async requestEmailChange(e,t,n){let i={method:"POST",body:{newEmail:e}};return i=O("This form of requestEmailChange(newEmail, body?, query?) is deprecated. Consider replacing it with requestEmailChange(newEmail, options?).",i,t,n),this.client.send(this.baseCollectionPath+"/request-email-change",i).then((()=>!0))}async confirmEmailChange(e,t,n,i){let o={method:"POST",body:{token:e,password:t}};return o=O("This form of confirmEmailChange(token, password, body?, query?) is deprecated. Consider replacing it with confirmEmailChange(token, password, options?).",o,n,i),this.client.send(this.baseCollectionPath+"/confirm-email-change",o).then((()=>{let r=R(e),a=this.client.authStore.record;return a&&a.id===r.id&&a.collectionId===r.collectionId&&this.client.authStore.clear(),!0}))}async listExternalAuths(e,t){return this.client.collection("_externalAuths").getFullList(Object.assign({},t,{filter:this.client.filter("recordRef = {:id}",{id:e})}))}async unlinkExternalAuth(e,t,n){let i=await this.client.collection("_externalAuths").getFirstListItem(this.client.filter("recordRef = {:recordId} && provider = {:provider}",{recordId:e,provider:t}));return this.client.collection("_externalAuths").delete(i.id,n).then((()=>!0))}async requestOTP(e,t){return t=Object.assign({method:"POST",body:{email:e}},t),this.client.send(this.baseCollectionPath+"/request-otp",t)}async authWithOTP(e,t,n){return n=Object.assign({method:"POST",body:{otpId:e,password:t}},n),this.client.send(this.baseCollectionPath+"/auth-with-otp",n).then((i=>this.authResponse(i)))}async impersonate(e,t,n){(n=Object.assign({method:"POST",body:{duration:t}},n)).headers=n.headers||{},n.headers.Authorization||(n.headers.Authorization=this.client.authStore.token);let i=new P(this.client.baseURL,new T,this.client.lang),o=await i.send(this.baseCollectionPath+"/impersonate/"+encodeURIComponent(e),n);return i.authStore.save(o?.token,this.decode(o?.record||{})),i}_replaceQueryParams(e,t={}){let n=e,i="";e.indexOf("?")>=0&&(n=e.substring(0,e.indexOf("?")),i=e.substring(e.indexOf("?")+1));let o={},r=i.split("&");for(let a of r){if(a=="")continue;let c=a.split("=");o[decodeURIComponent(c[0].replace(/\+/g," "))]=decodeURIComponent((c[1]||"").replace(/\+/g," "))}for(let a in t)t.hasOwnProperty(a)&&(t[a]==null?delete o[a]:o[a]=t[a]);i="";for(let a in o)o.hasOwnProperty(a)&&(i!=""&&(i+="&"),i+=encodeURIComponent(a.replace(/%20/g,"+"))+"="+encodeURIComponent(o[a].replace(/%20/g,"+")));return i!=""?n+"?"+i:n}};function ne(s){if(typeof window>"u"||!window?.open)throw new v(new Error("Not in a browser context - please pass a custom urlCallback function."));let e=1024,t=768,n=window.innerWidth,i=window.innerHeight;e=e>n?n:e,t=t>i?i:t;let o=n/2-e/2,r=i/2-t/2;return window.open(s,"popup_window","width="+e+",height="+t+",top="+r+",left="+o+",resizable,menubar=no")}var $=class extends I{get baseCrudPath(){return"/api/collections"}async import(e,t=!1,n){return n=Object.assign({method:"PUT",body:{collections:e,deleteMissing:t}},n),this.client.send(this.baseCrudPath+"/import",n).then((()=>!0))}async getScaffolds(e){return e=Object.assign({method:"GET"},e),this.client.send(this.baseCrudPath+"/meta/scaffolds",e)}async truncate(e,t){return t=Object.assign({method:"DELETE"},t),this.client.send(this.baseCrudPath+"/"+encodeURIComponent(e)+"/truncate",t).then((()=>!0))}},W=class extends k{async getList(e=1,t=30,n){return(n=Object.assign({method:"GET"},n)).query=Object.assign({page:e,perPage:t},n.query),this.client.send("/api/logs",n)}async getOne(e,t){if(!e)throw new v({url:this.client.buildURL("/api/logs/"),status:404,response:{code:404,message:"Missing required log id.",data:{}}});return t=Object.assign({method:"GET"},t),this.client.send("/api/logs/"+encodeURIComponent(e),t)}async getStats(e){return e=Object.assign({method:"GET"},e),this.client.send("/api/logs/stats",e)}},D=class extends k{async check(e){return e=Object.assign({method:"GET"},e),this.client.send("/api/health",e)}},H=class extends k{getUrl(e,t,n={}){return console.warn("Please replace pb.files.getUrl() with pb.files.getURL()"),this.getURL(e,t,n)}getURL(e,t,n={}){if(!t||!e?.id||!e?.collectionId&&!e?.collectionName)return"";let i=[];i.push("api"),i.push("files"),i.push(encodeURIComponent(e.collectionId||e.collectionName)),i.push(encodeURIComponent(e.id)),i.push(encodeURIComponent(t));let o=this.client.buildURL(i.join("/"));n.download===!1&&delete n.download;let r=Q(n);return r&&(o+=(o.includes("?")?"&":"?")+r),o}async getToken(e){return e=Object.assign({method:"POST"},e),this.client.send("/api/files/token",e).then((t=>t?.token||""))}},K=class extends k{async getFullList(e){return e=Object.assign({method:"GET"},e),this.client.send("/api/backups",e)}async create(e,t){return t=Object.assign({method:"POST",body:{name:e}},t),this.client.send("/api/backups",t).then((()=>!0))}async upload(e,t){return t=Object.assign({method:"POST",body:e},t),this.client.send("/api/backups/upload",t).then((()=>!0))}async delete(e,t){return t=Object.assign({method:"DELETE"},t),this.client.send(`/api/backups/${encodeURIComponent(e)}`,t).then((()=>!0))}async restore(e,t){return t=Object.assign({method:"POST"},t),this.client.send(`/api/backups/${encodeURIComponent(e)}/restore`,t).then((()=>!0))}getDownloadUrl(e,t){return console.warn("Please replace pb.backups.getDownloadUrl() with pb.backups.getDownloadURL()"),this.getDownloadURL(e,t)}getDownloadURL(e,t){return this.client.buildURL(`/api/backups/${encodeURIComponent(t)}?token=${encodeURIComponent(e)}`)}},M=class extends k{async getFullList(e){return e=Object.assign({method:"GET"},e),this.client.send("/api/crons",e)}async run(e,t){return t=Object.assign({method:"POST"},t),this.client.send(`/api/crons/${encodeURIComponent(e)}`,t).then((()=>!0))}};function B(s){return typeof Blob<"u"&&s instanceof Blob||typeof File<"u"&&s instanceof File||s!==null&&typeof s=="object"&&s.uri&&(typeof navigator<"u"&&navigator.product==="ReactNative"||typeof global<"u"&&global.HermesInternal)}function G(s){return s&&(s.constructor?.name==="FormData"||typeof FormData<"u"&&s instanceof FormData)}function ie(s){for(let e in s){let t=Array.isArray(s[e])?s[e]:[s[e]];for(let n of t)if(B(n))return!0}return!1}var je=/^[\-\.\d]+$/;function se(s){if(typeof s!="string")return s;if(s=="true")return!0;if(s=="false")return!1;if((s[0]==="-"||s[0]>="0"&&s[0]<="9")&&je.test(s)){let e=+s;if(""+e===s)return e}return s}var z=class extends k{constructor(){super(...arguments),this.requests=[],this.subs={}}collection(e){return this.subs[e]||(this.subs[e]=new J(this.requests,e)),this.subs[e]}async send(e){let t=new FormData,n=[];for(let i=0;i<this.requests.length;i++){let o=this.requests[i];if(n.push({method:o.method,url:o.url,headers:o.headers,body:o.json}),o.files)for(let r in o.files){let a=o.files[r]||[];for(let c of a)t.append("requests."+i+"."+r,c)}}return t.append("@jsonPayload",JSON.stringify({requests:n})),e=Object.assign({method:"POST",body:t},e),this.client.send("/api/batch",e)}},J=class{constructor(e,t){this.requests=[],this.requests=e,this.collectionIdOrName=t}upsert(e,t){t=Object.assign({body:e||{}},t);let n={method:"PUT",url:"/api/collections/"+encodeURIComponent(this.collectionIdOrName)+"/records"};this.prepareRequest(n,t),this.requests.push(n)}create(e,t){t=Object.assign({body:e||{}},t);let n={method:"POST",url:"/api/collections/"+encodeURIComponent(this.collectionIdOrName)+"/records"};this.prepareRequest(n,t),this.requests.push(n)}update(e,t,n){n=Object.assign({body:t||{}},n);let i={method:"PATCH",url:"/api/collections/"+encodeURIComponent(this.collectionIdOrName)+"/records/"+encodeURIComponent(e)};this.prepareRequest(i,n),this.requests.push(i)}delete(e,t){t=Object.assign({},t);let n={method:"DELETE",url:"/api/collections/"+encodeURIComponent(this.collectionIdOrName)+"/records/"+encodeURIComponent(e)};this.prepareRequest(n,t),this.requests.push(n)}prepareRequest(e,t){if(V(t),e.headers=t.headers,e.json={},e.files={},t.query!==void 0){let i=Q(t.query);i&&(e.url+=(e.url.includes("?")?"&":"?")+i)}let n=t.body;G(n)&&(n=(function(o){let r={};return o.forEach(((a,c)=>{if(c==="@jsonPayload"&&typeof a=="string")try{let p=JSON.parse(a);Object.assign(r,p)}catch(p){console.warn("@jsonPayload error:",p)}else r[c]!==void 0?(Array.isArray(r[c])||(r[c]=[r[c]]),r[c].push(se(a))):r[c]=se(a)})),r})(n));for(let i in n){let o=n[i];if(B(o))e.files[i]=e.files[i]||[],e.files[i].push(o);else if(Array.isArray(o)){let r=[],a=[];for(let c of o)B(c)?r.push(c):a.push(c);if(r.length>0&&r.length==o.length){e.files[i]=e.files[i]||[];for(let c of r)e.files[i].push(c)}else if(e.json[i]=a,r.length>0){let c=i;i.startsWith("+")||i.endsWith("+")||(c+="+"),e.files[c]=e.files[c]||[];for(let p of r)e.files[c].push(p)}}else e.json[i]=o}}},P=class{get baseUrl(){return this.baseURL}set baseUrl(e){this.baseURL=e}constructor(e="/",t,n="en-US"){this.cancelControllers={},this.recordServices={},this.enableAutoCancellation=!0,this.baseURL=e,this.lang=n,t?this.authStore=t:typeof window<"u"&&window.Deno?this.authStore=new T:this.authStore=new j,this.collections=new $(this),this.files=new H(this),this.logs=new W(this),this.settings=new U(this),this.realtime=new L(this),this.health=new D(this),this.backups=new K(this),this.crons=new M(this)}get admins(){return this.collection("_superusers")}createBatch(){return new z(this)}collection(e){return this.recordServices[e]||(this.recordServices[e]=new F(this,e)),this.recordServices[e]}autoCancellation(e){return this.enableAutoCancellation=!!e,this}cancelRequest(e){return this.cancelControllers[e]&&(this.cancelControllers[e].abort(),delete this.cancelControllers[e]),this}cancelAllRequests(){for(let e in this.cancelControllers)this.cancelControllers[e].abort();return this.cancelControllers={},this}filter(e,t){if(!t)return e;for(let n in t){let i=t[n];switch(typeof i){case"boolean":case"number":i=""+i;break;case"string":i="'"+i.replace(/'/g,"\\'")+"'";break;default:i=i===null?"null":i instanceof Date?"'"+i.toISOString().replace("T"," ")+"'":"'"+JSON.stringify(i).replace(/'/g,"\\'")+"'"}e=e.replaceAll("{:"+n+"}",i)}return e}getFileUrl(e,t,n={}){return console.warn("Please replace pb.getFileUrl() with pb.files.getURL()"),this.files.getURL(e,t,n)}buildUrl(e){return console.warn("Please replace pb.buildUrl() with pb.buildURL()"),this.buildURL(e)}buildURL(e){let t=this.baseURL;return typeof window>"u"||!window.location||t.startsWith("https://")||t.startsWith("http://")||(t=window.location.origin?.endsWith("/")?window.location.origin.substring(0,window.location.origin.length-1):window.location.origin||"",this.baseURL.startsWith("/")||(t+=window.location.pathname||"/",t+=t.endsWith("/")?"":"/"),t+=this.baseURL),e&&(t+=t.endsWith("/")?"":"/",t+=e.startsWith("/")?e.substring(1):e),t}async send(e,t){t=this.initSendOptions(e,t);let n=this.buildURL(e);if(this.beforeSend){let i=Object.assign({},await this.beforeSend(n,t));i.url!==void 0||i.options!==void 0?(n=i.url||n,t=i.options||t):Object.keys(i).length&&(t=i,console?.warn&&console.warn("Deprecated format of beforeSend return: please use `return { url, options }`, instead of `return options`."))}if(t.query!==void 0){let i=Q(t.query);i&&(n+=(n.includes("?")?"&":"?")+i),delete t.query}return this.getHeader(t.headers,"Content-Type")=="application/json"&&t.body&&typeof t.body!="string"&&(t.body=JSON.stringify(t.body)),(t.fetch||fetch)(n,t).then((async i=>{let o={};try{o=await i.json()}catch(r){if(t.signal?.aborted||r?.name=="AbortError"||r?.message=="Aborted")throw r}if(this.afterSend&&(o=await this.afterSend(i,o,t)),i.status>=400)throw new v({url:i.url,status:i.status,data:o});return o})).catch((i=>{throw new v(i)}))}initSendOptions(e,t){if((t=Object.assign({method:"GET"},t)).body=(function(i){if(typeof FormData>"u"||i===void 0||typeof i!="object"||i===null||G(i)||!ie(i))return i;let o=new FormData;for(let r in i){let a=i[r];if(a!==void 0)if(typeof a!="object"||ie({data:a})){let c=Array.isArray(a)?a:[a];for(let p of c)o.append(r,p)}else{let c={};c[r]=a,o.append("@jsonPayload",JSON.stringify(c))}}return o})(t.body),V(t),t.query=Object.assign({},t.params,t.query),t.requestKey===void 0&&(t.$autoCancel===!1||t.query.$autoCancel===!1?t.requestKey=null:(t.$cancelKey||t.query.$cancelKey)&&(t.requestKey=t.$cancelKey||t.query.$cancelKey)),delete t.$autoCancel,delete t.query.$autoCancel,delete t.$cancelKey,delete t.query.$cancelKey,this.getHeader(t.headers,"Content-Type")!==null||G(t.body)||(t.headers=Object.assign({},t.headers,{"Content-Type":"application/json"})),this.getHeader(t.headers,"Accept-Language")===null&&(t.headers=Object.assign({},t.headers,{"Accept-Language":this.lang})),this.authStore.token&&this.getHeader(t.headers,"Authorization")===null&&(t.headers=Object.assign({},t.headers,{Authorization:this.authStore.token})),this.enableAutoCancellation&&t.requestKey!==null){let n=t.requestKey||(t.method||"GET")+e;delete t.requestKey,this.cancelRequest(n);let i=new AbortController;this.cancelControllers[n]=i,t.signal=i.signal}return t}getHeader(e,t){e=e||{},t=t.toLowerCase();for(let n in e)if(n.toLowerCase()==t)return e[n];return null}};function Ue(){let s=C.VITE_POCKETBASE_URL?.trim();if(s)return s;if(typeof window<"u"){if(C.PROD)return window.location.origin;let e=C.VITE_POCKETBASE_PORT?.trim()||"8091";return`${window.location.protocol==="https:"?"https:":"http:"}//${window.location.hostname}:${e}`}return"http://127.0.0.1:8091"}var Fe=Ue(),Y=new P(Fe);Y.afterSend=function(s,e){return s.status===401&&Y.authStore.clear(),e};var ae=[["elementary","Elementary"],["junior_high","Junior High School"],["senior_high","Senior High School"],["college","College"],["vocational","Vocational / TESDA"],["graduate","Graduate"],["other","Other"]];function $e(){return{level:"",school_name:"",course:"",start_year:"",end_year:"",notes:""}}var We=[["school_elementary","elementary"],["school_junior_high","junior_high"],["school_senior_high","senior_high"],["school_college","college"],["school_other","other"]];function ce(s){let e=Array.isArray(s.educations)?[...s.educations]:[],t=n=>n.trim().toLowerCase();for(let[n,i]of We){let o=s[n];typeof o!="string"||!o.trim()||e.some(r=>r.level===i&&t(r.school_name)===t(o))||e.push({...$e(),level:i,school_name:o.trim(),legacy_school_field:n})}return e}function le(s){return!(s.position.trim()||s.company.trim()||s.location.trim()||s.start_date||s.end_date||s.is_current||s.description.trim())}function de(s){return!(s.level||s.school_name.trim()||s.course.trim()||s.start_year||s.end_year||s.notes.trim())}function ue(s){let e=s.start_year,t=s.end_year;return e&&t?`${e} - ${t}`:e||t}function he(s){return ae.find(([e])=>e===s)?.[1]??String(s)}function De(s){let e=[],t=[],n=s.children;for(let i=0;i<n.length;i+=1){let o=n[i];o.classList.contains("footer")||t.push(o)}return t.forEach(function(i,o){let r=i.querySelector("tbody")||i.querySelector(".info-grid")||i.querySelector(".paragraph-block");if(!r||r.children.length<2){e.push({node:i,block:i,host:null,groupKey:o});return}r.setAttribute("data-resume-host","1");for(let a=0;a<r.children.length;a+=1){let c=r.children[a];c.setAttribute("data-resume-atom","1"),e.push({node:c,block:i,host:r,groupKey:o})}}),e}function He(s,e){let t=e.pageHeight,n=e.measure,i=e.createSheet,o=function(u){let l=[],h=u.querySelectorAll("[data-resume-live]");for(let f=0;f<h.length;f+=1){let m=h[f].getAttribute("data-resume-live"),S=Number(m);l.indexOf(S)===-1&&l.push(S)}return l},r=function(u,l,h){let f=u.querySelector(".footer");if(!l.host){let g=l.block.cloneNode(!0);g.setAttribute("data-resume-live",String(l.groupKey)),u.insertBefore(g,f);return}let m=u.querySelector('[data-resume-live="'+l.groupKey+'"]');if(!m){m=l.block.cloneNode(!0);let g=m.querySelector("[data-resume-host]");if(g&&(g.textContent=""),m.setAttribute("data-resume-live",String(l.groupKey)),h.indexOf(l.groupKey)!==-1){let x=m.querySelector(".section-title");x&&x.textContent&&x.textContent.indexOf("(continued)")===-1&&(x.textContent=x.textContent+" (continued)")}u.insertBefore(m,f)}(m.querySelector("[data-resume-host]")||m).appendChild(l.node.cloneNode(!0))},a=function(u,l){let h=u.querySelector('[data-resume-live="'+l.groupKey+'"]');if(!h)return;if(!l.host){u.removeChild(h);return}let f=h.querySelector("[data-resume-host]");f&&f.lastElementChild&&f.removeChild(f.lastElementChild),(!f||f.children.length===0)&&u.removeChild(h)},c=[],p=[],y=i(),b=0,w=function(){let u=o(y);for(let l=0;l<u.length;l+=1)p.indexOf(u[l])===-1&&p.push(u[l]);c.push(y),y=i(),b=0};for(let u=0;u<s.length;u+=1){let l=s[u];if(r(y,l,p),b+=1,!(n(y)<=t)){if(b===1){w();continue}a(y,l),b-=1,w(),r(y,l,p)}}return(b>0||c.length===0)&&c.push(y),c}function Ke(s){for(let e=0;e<s.length;e+=1){let t=s[e].querySelector(".page-number");t&&(t.textContent="Page "+(e+1)+" / "+s.length)}}function Me(s,e){let t=s[0],n=s[1],i=s[2],o=document.getElementById("resume-flow"),r=document.getElementById("resume-book"),a=document.getElementById("resume-measure");if(!o||!r||!a)return;let c=document.createElement("section");c.className="sheet",c.style.height="100mm",a.appendChild(c);let p=c.getBoundingClientRect().height/100;if(a.removeChild(c),!p)return;let y=t(o);if(y.length===0)return;let b=function(){let l=document.createElement("section");l.className="sheet",l.style.height="auto";let h=document.createElement("footer");h.className="footer";let f=document.createElement("span");f.textContent=e.brand;let m=document.createElement("span");return m.className="page-number",h.appendChild(f),h.appendChild(m),l.appendChild(h),l},w=function(l){a.appendChild(l);let h=l.getBoundingClientRect().height;return a.removeChild(l),h},u=n(y,{pageHeight:297*p,measure:w,createSheet:b});i(u);for(let l=0;l<u.length;l+=1)u[l].style.height="",r.appendChild(u[l]);o.style.display="none",r.style.display="block",e.onPrint()}function pe(s){let e=[De,He,Ke],t=s.printGraceMs===void 0?1200:s.printGraceMs;return"(function () {var fns=["+e.map(function(n){return n.toString()}).join(",")+"];var done=false;var printNow=function(){if(done){return;}done=true;window.__resumePrinted=true;try{window.print();}catch(e){/* print blocked: the popup stays open for a manual Ctrl+P */}};try{("+Me.toString()+")(fns,{brand:"+JSON.stringify(s.brand)+",onPrint:printNow});}catch(e){/* unpaged fallback: the flow document below is already printable */}setTimeout(printNow,"+t+");})();"}var me="SkillsTrader";function Be(s){return Array.isArray(s)?s:[]}function Ge(s,e){function t(d){return d==null?"":String(d).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}function n(d,E="N/A"){return t(d).trim()||E}function i(){let d=n(s.full_name,"");return d||[s.first_name,s.middle_name,s.last_name,s.suffix].map(_=>n(_,"")).filter(Boolean).join(" ")||"Candidate"}function o(d){return n(d).split(/\r?\n/).map(E=>E.trim()).filter(Boolean).map(E=>`<div class="para-line">${E}</div>`).join("")}let r=i(),a=n(s.email,""),c=n(s.phone,""),p=n(s.id,"N/A"),y=n(s.home_address||s.permanent_address||s.address),b=n(s.marital_status),w=n(s.birthdate),u=n(s.gender),l=n(s.religion),h=n(s.height),f=n(s.weight),m=n(s.pagibig_number,""),S=n(s.sss_number,""),g=n(s.philhealth,""),x=n(s.highest_educ_attainment,""),fe=o(s.skills),ge=o(s.certifications),X=n(s.desired_salary,""),be=n(s.position_screened,""),ye=n(s.status,"");function Z(d){if(typeof d!="string"||!d.trim())return[];let E=new DOMParser().parseFromString(d,"text/html");return E.querySelectorAll("script, style, template").forEach(_=>_.remove()),E.querySelectorAll("br").forEach(_=>_.replaceWith(`
`)),E.querySelectorAll("p, div, li, h1, h2, h3, h4").forEach(_=>_.append(`
`)),(E.body.textContent??"").split(/\r?\n/).map(_=>_.trim()).filter(Boolean)}let we=ce(s).filter(d=>!de(d)),Ee=[["Highest Educational Attainment",x],...we.map(d=>[n(he(d.level),"Other"),[n(d.school_name,""),n(d.course,""),n(ue(d),""),n(d.notes,"")].filter(Boolean).join(" - ")]),...Z(s.education).map(d=>["Education summary",n(d,"")])].filter(([,d])=>d).map(([d,E])=>`
        <tr><td>${d}</td><td>${E}</td></tr>`).join(""),ve=Be(s.work_experiences).filter(d=>!le(d)).map(d=>`
        <tr>
          <td>${n(d.company)}</td>
          <td>${n(d.position)}</td>
          <td>${n(d.start_date?.slice(0,4))}</td>
          <td>${n(d.is_current?"Present":d.end_date?.slice(0,4))}</td>
          <td>${n(d.location)}</td>
        </tr>
        ${d.description?`<tr><td colspan="5">${o(d.description)}</td></tr>`:""}`).join("")+Z(s.work_history).map(d=>`<tr><td colspan="5">${n(d,"")}</td></tr>`).join(""),Se=[["PAG-IBIG",m,"N/A"],["SSS",S,"N/A"],["PhilHealth",g,"N/A"]].filter(([,d])=>d).map(([d,E,_])=>`
        <tr>
          <td>${d}</td>
          <td>${E}</td>
          <td>${_}</td>
        </tr>`).join("");return`<!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Resume - ${r}</title>
        <style>
          * {
            box-sizing: border-box;
          }

          body {
            margin: 0;
            background: #f3f3f3;
            color: #1e1e1e;
            font-family: Arial, Helvetica, sans-serif;
            font-size: 13px;
            line-height: 1.35;
          }

          .page {
            width: 210mm;
            min-height: 297mm;
            margin: 0 auto;
            padding: 24mm 18mm 16mm;
            background: #fff;
            position: relative;
          }

          .header {
            display: grid;
            grid-template-columns: 1fr 165px;
            gap: 24px;
            align-items: start;
            min-height: 150px;
            margin-bottom: 26px;
          }

          .candidate-id {
            margin-top: 24px;
            font-size: 25px;
            letter-spacing: 0.02em;
          }

          .candidate-name {
            margin-top: 2px;
            font-size: 21px;
            font-weight: 700;
            text-transform: uppercase;
          }

          .candidate-email {
            margin-top: 2px;
            font-size: 18px;
            font-weight: 700;
          }

          .candidate-phone {
            margin-top: 8px;
            font-size: 12px;
          }

          .photo {
            width: 165px;
            height: 165px;
            object-fit: cover;
            object-position: center top;
          }

          .section {
            margin-top: 28px;
            break-inside: avoid;
            page-break-inside: avoid;
          }

          .section-title {
            margin: 0 0 14px;
            font-size: 24px;
            font-weight: 700;
          }

          .section-title.small-gap {
            margin-bottom: 10px;
          }

          .info-grid {
            border-top: 1px solid #dedede;
          }

          .info-row {
            display: grid;
            grid-template-columns: 120px 1fr 110px 1fr 125px 1fr;
            gap: 12px;
            min-height: 56px;
            align-items: center;
            border-bottom: 1px solid #dedede;
          }

          .info-row.two-col {
            grid-template-columns: 120px 1fr 110px 1fr;
          }

          .info-row.one-col {
            grid-template-columns: 120px 1fr;
          }

          .label {
            font-size: 16px;
          }

          .value {
            font-size: 16px;
            font-weight: 700;
            overflow-wrap: anywhere;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
          }

          th {
            text-align: left;
            font-size: 15px;
            font-weight: 700;
            padding: 8px 8px 8px 0;
          }

          td {
            vertical-align: top;
            padding: 5px 8px 7px 0;
            font-size: 15px;
            overflow-wrap: anywhere;
          }

          .ruled {
            border-top: 1px solid #dedede;
          }

          .ruled th,
          .ruled td {
            border-top: 1px solid #efefef;
          }

          .muted-empty {
            color: #555;
            font-style: italic;
          }

          .paragraph-block {
            border-top: 1px solid #dedede;
            padding-top: 10px;
            font-size: 15px;
            overflow-wrap: anywhere;
          }

          .footer {
            position: absolute;
            left: 18mm;
            right: 18mm;
            bottom: 8mm;
            display: flex;
            justify-content: space-between;
            color: #222;
            font-size: 10px;
          }

          /*
           * Sheets are exactly one A4 page each and are produced by the inline pacer. With the page
           * margin switched off, the sheet's own padding is the only margin, so a sheet cannot drift
           * across a page boundary and the footer inside it sits where it is stamped.
           */
          @page {
            size: A4;
            margin: 0;
          }

          .sheet {
            width: 210mm;
            height: 297mm;
            margin: 0 auto;
            padding: 18mm 14mm 16mm;
            background: #fff;
            position: relative;
            overflow: visible;
          }

          .sheet .footer {
            left: 14mm;
            right: 14mm;
            bottom: 6mm;
          }

          #resume-book {
            display: none;
          }

          /* Screen-only preview gap between stacked sheets. Scoped to @media screen so it cannot leak
             into print: a 6mm margin on a 297mm sheet on a 297mm page overflows onto a blank page. */
          @media screen {
            #resume-book .sheet + .sheet {
              margin-top: 6mm;
            }
          }

          /* Off-screen rig the pacer measures candidate sheets in; never a printed surface. */
          #resume-measure {
            position: fixed;
            top: 0;
            left: 0;
            width: 210mm;
            visibility: hidden;
            pointer-events: none;
          }

          @media print {
            body {
              background: #fff;
            }

            .page {
              width: auto;
              min-height: auto;
              margin: 0;
              padding: 18mm 14mm 16mm;
            }

            .sheet {
              break-after: page;
              page-break-after: always;
            }

            .sheet:last-child {
              break-after: auto;
              page-break-after: auto;
            }
          }
        </style>
      </head>
      <body>
        <main class="page" id="resume-flow">
          <header class="header">
            <div>
              <div class="candidate-id">${p}</div>
              <div class="candidate-name">${r}</div>
              <div class="candidate-email">${a||"N/A"}</div>
              <div class="candidate-phone">${c?`Contact No: ${c}`:""}</div>
            </div>
            <img src="${t(e)}" class="photo" alt="profile" />
          </header>

          <section class="section">
            <h1 class="section-title">Personal Information</h1>
            <div class="info-grid">
              <div class="info-row two-col">
                <div class="label">Date of Birth</div>
                <div class="value">${w}</div>
                <div class="label">Age:</div>
                <div class="value">N/A</div>
              </div>
              <div class="info-row">
                <div class="label">Gender:</div>
                <div class="value">${u}</div>
                <div class="label">Religion:</div>
                <div class="value">${l}</div>
                <div class="label">Civil Status:</div>
                <div class="value">${b}</div>
              </div>
              <div class="info-row two-col">
                <div class="label">Weight:</div>
                <div class="value">${f}</div>
                <div class="label">Height:</div>
                <div class="value">${h}</div>
              </div>
              <div class="info-row one-col">
                <div class="label">Address:</div>
                <div class="value">${y}</div>
              </div>
            </div>
          </section>

          <section class="section">
            <h2 class="section-title">Identification:</h2>
            <table>
              <thead>
                <tr>
                  <th>Identification Type</th>
                  <th>Identification No</th>
                  <th>Expiry Date</th>
                </tr>
              </thead>
              <tbody>
                ${Se||'<tr><td colspan="3" class="muted-empty">No identification information provided</td></tr>'}
              </tbody>
            </table>
          </section>

          <section class="section">
            <h2 class="section-title small-gap">Education</h2>
            <table class="ruled">
              <tbody>
                ${Ee||'<tr><td class="muted-empty">No education information provided</td></tr>'}
              </tbody>
            </table>
          </section>

          <section class="section">
            <h2 class="section-title small-gap">Certificates</h2>
            <div class="paragraph-block">${ge}</div>
          </section>

          <section class="section">
            <h2 class="section-title small-gap">Trainings</h2>
            <div class="paragraph-block">${fe}</div>
          </section>

          <section class="section">
            <h2 class="section-title">Work Experience</h2>
            <table>
              <thead>
                <tr>
                  <th style="width: 28%;">Company</th>
                  <th style="width: 38%;">Position</th>
                  <th style="width: 10%;">Start</th>
                  <th style="width: 10%;">End</th>
                  <th style="width: 14%;">Country</th>
                </tr>
              </thead>
              <tbody>
                ${ve||'<tr><td colspan="5" class="muted-empty">No work experience information provided</td></tr>'}
              </tbody>
            </table>
          </section>

          <section class="section">
            <h2 class="section-title">Language Spoken</h2>
            <table class="ruled">
              <thead>
                <tr>
                  <th>Language</th>
                  <th>Competency</th>
                  <th>Spoken</th>
                  <th>Written</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td class="muted-empty" colspan="4">No language information provided</td>
                </tr>
              </tbody>
            </table>
          </section>

          <section class="section">
            <h2 class="section-title">Job Preference</h2>
            <table>
              <thead>
                <tr>
                  <th style="width: 14%;">Class</th>
                  <th style="width: 22%;">Application Type</th>
                  <th style="width: 38%;">Position</th>
                  <th style="width: 14%;">Industry</th>
                  <th style="width: 12%;">Country</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>N/A</td>
                  <td>N/A</td>
                  <td>${be||"N/A"}</td>
                  <td>${X?`Salary: ${X}`:ye||"N/A"}</td>
                  <td>N/A</td>
                </tr>
              </tbody>
            </table>
          </section>

          <footer class="footer">
            <span>${me}</span>
          </footer>
        </main>

        <div id="resume-book"></div>
        <div id="resume-measure"></div>
        <script>
          ${pe({brand:me})}
        <\/script>
      </body>
    </html>`}return Re(ze);})();
