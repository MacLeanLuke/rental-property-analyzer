(function(){"use strict";function p(e,t,o,n,r){return!(o>0)||!(n>0)||n<=o?null:{resource:e,phase:t,startMs:o,endMs:n,note:r}}function g(e){try{const t=new URL(e,"https://example.invalid");return t.pathname.split("/").filter(Boolean).pop()||t.hostname}catch{return e}}function x(e){const t=g(e.name),o=e.requestStart>0,n=e.transferSize??0,r=e.decodedBodySize??0,i=n===0&&r>0,d=[p(t,"queued",e.startTime,e.domainLookupStart||e.fetchStart,"Queued by the browser before the request was dispatched."),p(t,"dns",e.domainLookupStart,e.domainLookupEnd,"DNS resolution. Zero when the hostname was already cached."),p(t,"tcp",e.connectStart,e.secureConnectionStart>0?e.secureConnectionStart:e.connectEnd,"TCP handshake. Zero when an existing connection was reused."),p(t,"tls",e.secureConnectionStart,e.connectEnd,"TLS handshake, measured separately from the TCP connect."),p(t,"ttfb-wait",e.requestStart,e.responseStart,"Request sent; waiting for the first byte. Server time plus one round trip."),p(t,"download",e.responseStart,e.responseEnd,"Response body arriving.")].filter(l=>l!==null);return{name:t,url:e.name,initiatorType:e.initiatorType,protocol:e.nextHopProtocol??"",startMs:e.startTime,durationMs:e.duration,transferBytes:n,decodedBytes:r,fromCache:i,timingsVisible:o,spans:d}}function w(e){const t={};let o=0,n=0,r=0,i=null;for(const s of e){s.timingsVisible||(n+=1),s.fromCache&&(r+=1),o+=s.transferBytes;const d=s.protocol||"unknown";t[d]=(t[d]??0)+1,(!i||s.durationMs>i.durationMs)&&(i=s)}return{requests:e.length,opaque:n,cached:r,totalTransferBytes:o,protocols:t,slowest:i}}function v(e,t={}){const{ignore:o,includeExisting:n=!0}=t;if(typeof PerformanceObserver>"u")return{stop:()=>{}};const r=s=>{o?.(s.name)||e(x(s))},i=new PerformanceObserver(s=>{for(const d of s.getEntries())r(d)});return i.observe({type:"resource",buffered:n}),{stop:()=>i.disconnect()}}const h={queued:"#8b8f98",dns:"#c084fc",tcp:"#60a5fa",tls:"#34d399",request:"#fbbf24","ttfb-wait":"#fbbf24",download:"#f472b6",parse:"#a3a3a3",render:"#f87171"},f={queued:"Queued",dns:"DNS",tcp:"TCP",tls:"TLS",request:"Request","ttfb-wait":"Waiting (TTFB)",download:"Download",parse:"Parse",render:"Render"},S=`
  :host {
    --bg: #12141a;
    --panel: #1a1d26;
    --ink: #e8eaf0;
    --muted: #9aa0ad;
    --rule: #2a2f3a;
    all: initial;
    position: fixed;
    right: 16px;
    bottom: 16px;
    z-index: 2147483000;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 12px;
    color: var(--ink);
  }
  * { box-sizing: border-box; }
  .panel {
    width: min(460px, calc(100vw - 32px));
    background: var(--bg);
    border: 1px solid var(--rule);
    border-radius: 8px;
    box-shadow: 0 12px 40px rgba(0,0,0,.45);
    overflow: hidden;
  }
  header {
    display: flex; align-items: center; gap: 8px;
    padding: 8px 10px;
    background: var(--panel);
    border-bottom: 1px solid var(--rule);
    cursor: pointer;
    user-select: none;
  }
  header h2 { margin: 0; font-size: 12px; font-weight: 600; letter-spacing: .02em; }
  .stats { margin-left: auto; color: var(--muted); font-size: 11px; }
  .body { max-height: 320px; overflow-y: auto; }
  .body[hidden] { display: none; }
  .row { display: grid; grid-template-columns: 120px 1fr; gap: 8px; align-items: center; padding: 3px 10px; }
  .row:hover { background: rgba(255,255,255,.04); }
  .name { color: var(--muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .track { position: relative; height: 12px; background: rgba(255,255,255,.05); border-radius: 2px; }
  .bar { position: absolute; top: 0; height: 100%; min-width: 2px; border-radius: 2px; }
  .opaque { color: #f59e0b; font-size: 10px; padding: 0 10px 4px 138px; }
  .legend { display: flex; flex-wrap: wrap; gap: 8px; padding: 8px 10px; border-top: 1px solid var(--rule); background: var(--panel); }
  .legend span { display: inline-flex; align-items: center; gap: 4px; color: var(--muted); font-size: 10px; }
  .swatch { width: 8px; height: 8px; border-radius: 2px; }
  .empty { padding: 16px 10px; color: var(--muted); }
  @media (prefers-color-scheme: light) {
    :host { --bg: #ffffff; --panel: #f4f5f8; --ink: #14161c; --muted: #5b6270; --rule: #d9dde5; }
  }
`;class y extends HTMLElement{static observedAttributes=["open","limit"];#t=[];#s=null;#e=0;#o;constructor(){super(),this.#o=this.attachShadow({mode:"open"})}get limit(){return Number(this.getAttribute("limit")??"30")}get open(){return this.hasAttribute("open")}connectedCallback(){this.#n(),this.#s=v(t=>{this.#t.push(t),!this.#e&&(this.#e=requestAnimationFrame(()=>{this.#e=0,this.#n()}))})}disconnectedCallback(){this.#s?.stop(),this.#e&&cancelAnimationFrame(this.#e)}attributeChangedCallback(){this.#n()}#n(){const t=this.#t.slice(-this.limit),o=w(this.#t),n=t.length?Math.min(...t.map(a=>a.startMs)):0,r=t.length?Math.max(...t.map(a=>a.startMs+a.durationMs)):1,i=Math.max(r-n,1),s=o.totalTransferBytes>1024*1024?`${(o.totalTransferBytes/1024/1024).toFixed(1)}MB`:`${Math.round(o.totalTransferBytes/1024)}KB`,d=Object.entries(o.protocols).map(([a,u])=>`${a}×${u}`).join(" "),l=t.map(a=>{const u=a.spans.map(c=>{const T=(c.startMs-n)/i*100,M=(c.endMs-c.startMs)/i*100,E=`${f[c.phase]} — ${(c.endMs-c.startMs).toFixed(1)}ms
${c.note}`;return`<div class="bar" style="left:${T}%;width:${M}%;background:${h[c.phase]}" title="${b(E)}"></div>`}).join(""),q=a.timingsVisible?"":'<div class="opaque">no Timing-Allow-Origin — phases withheld by the browser</div>';return`
          <div class="row" title="${b(a.url)}">
            <span class="name">${m(a.name)}</span>
            <div class="track">${u}</div>
          </div>${q}`}).join(""),k=["dns","tcp","tls","ttfb-wait","download","queued"].map(a=>`<span><i class="swatch" style="background:${h[a]}"></i>${f[a]}</span>`).join("");this.#o.innerHTML=`
      <style>${S}</style>
      <div class="panel">
        <header part="header">
          <h2>Pipe anatomy</h2>
          <span class="stats">${o.requests} req · ${s}${d?` · ${d}`:""}</span>
        </header>
        <div class="body" ${this.open?"":"hidden"}>
          ${t.length?l:'<div class="empty">Waiting for requests…</div>'}
          <div class="legend">${k}</div>
        </div>
      </div>`,this.#o.querySelector("header")?.addEventListener("click",()=>{this.toggleAttribute("open")})}}function m(e){return e.replace(/[&<>]/g,t=>({"&":"&amp;","<":"&lt;",">":"&gt;"})[t])}function b(e){return m(e).replace(/"/g,"&quot;")}function $(e="pipe-anatomy"){typeof customElements<"u"&&!customElements.get(e)&&customElements.define(e,y)}if($(),typeof document<"u"&&!document.querySelector("pipe-anatomy")){const e=document.createElement("pipe-anatomy");e.setAttribute("open",""),document.body.appendChild(e)}})();
