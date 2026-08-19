(function(){"use strict";function c(t,e,i,n,o){return!(i>0)||!(n>0)||n<=i?null:{resource:t,phase:e,startMs:i,endMs:n,note:o}}function w(t){try{const e=new URL(t,"https://example.invalid");return e.pathname.split("/").filter(Boolean).pop()||e.hostname}catch{return t}}function k(t){const e=w(t.name),i=t.requestStart>0,n=t.transferSize??0,o=t.decodedBodySize??0,r=n===0&&o>0,d=[c(e,"queued",t.startTime,t.domainLookupStart||t.fetchStart,"Queued by the browser before the request was dispatched."),c(e,"dns",t.domainLookupStart,t.domainLookupEnd,"DNS resolution. Zero when the hostname was already cached."),c(e,"tcp",t.connectStart,t.secureConnectionStart>0?t.secureConnectionStart:t.connectEnd,"TCP handshake. Zero when an existing connection was reused."),c(e,"tls",t.secureConnectionStart,t.connectEnd,"TLS handshake, measured separately from the TCP connect."),c(e,"ttfb-wait",t.requestStart,t.responseStart,"Request sent; waiting for the first byte. Server time plus one round trip."),c(e,"download",t.responseStart,t.responseEnd,"Response body arriving.")].filter(h=>h!==null);return{name:e,url:t.name,initiatorType:t.initiatorType,protocol:t.nextHopProtocol??"",startMs:t.startTime,durationMs:t.duration,transferBytes:n,decodedBytes:o,fromCache:r,timingsVisible:i,spans:d}}function S(t){const e={};let i=0,n=0,o=0,r=null;for(const s of t){s.timingsVisible||(n+=1),s.fromCache&&(o+=1),i+=s.transferBytes;const d=s.protocol||"unknown";e[d]=(e[d]??0)+1,(!r||s.durationMs>r.durationMs)&&(r=s)}return{requests:t.length,opaque:n,cached:o,totalTransferBytes:i,protocols:e,slowest:r}}function z(t,e={}){const{ignore:i,includeExisting:n=!0}=e;if(typeof PerformanceObserver>"u")return{stop:()=>{}};const o=s=>{i?.(s.name)||t(k(s))},r=new PerformanceObserver(s=>{for(const d of s.getEntries())o(d)});return r.observe({type:"resource",buffered:n}),{stop:()=>r.disconnect()}}const l={minimized:!0,edge:"right",y:.72,open:!1},m="pipe-anatomy:panel:v1";function $(){try{const t=localStorage.getItem(m);if(!t)return{...l};const e=JSON.parse(t);return{minimized:typeof e.minimized=="boolean"?e.minimized:l.minimized,edge:e.edge==="left"||e.edge==="right"?e.edge:l.edge,y:typeof e.y=="number"&&e.y>=0&&e.y<=1?e.y:l.y,open:typeof e.open=="boolean"?e.open:l.open}}catch{return{...l}}}function M(t){try{localStorage.setItem(m,JSON.stringify(t))}catch{}}const f=(t,e,i)=>Math.min(i,Math.max(e,t));function E(t,e,i,n,o){const s=t+i/2<n/2?"left":"right",h=(s==="left"?Math.max(0,-t):Math.max(0,t+i-n))>i*.35;return{edge:s,y:f(e/Math.max(o,1),0,1),minimized:h}}const g={queued:"#8b8f98",dns:"#c084fc",tcp:"#60a5fa",tls:"#34d399",request:"#fbbf24","ttfb-wait":"#fbbf24",download:"#f472b6",parse:"#a3a3a3",render:"#f87171"},b={queued:"Queued",dns:"DNS",tcp:"TCP",tls:"TLS",request:"Request","ttfb-wait":"Waiting (TTFB)",download:"Download",parse:"Parse",render:"Render"},x=`
  :host {
    --bg: #12141a;
    --panel: #1a1d26;
    --ink: #e8eaf0;
    --muted: #9aa0ad;
    --rule: #2a2f3a;
    all: initial;
    position: fixed;
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
    cursor: grab;
    user-select: none;
    touch-action: none;
  }
  header:active { cursor: grabbing; }
  .grip { color: var(--muted); letter-spacing: -2px; font-size: 14px; }
  .icon-btn {
    display: grid; place-items: center;
    width: 22px; height: 22px; padding: 0;
    border: 0; border-radius: 4px;
    background: transparent; color: var(--muted);
    font-size: 15px; line-height: 1; cursor: pointer;
  }
  .icon-btn:hover { background: rgba(127,127,127,.18); color: var(--ink); }

  /* Docked tab — the panel tucked against an edge. */
  .tab {
    display: flex; align-items: center; justify-content: center;
    width: 34px; height: 46px;
    background: var(--panel);
    border: 1px solid var(--rule);
    color: var(--muted);
    cursor: grab;
    touch-action: none;
    box-shadow: 0 6px 20px rgba(0,0,0,.3);
  }
  .tab:hover { color: var(--ink); }
  .tab:active { cursor: grabbing; }
  :host([data-edge="right"]) .tab { border-radius: 8px 0 0 8px; border-right: 0; }
  :host([data-edge="left"]) .tab { border-radius: 0 8px 8px 0; border-left: 0; }
  .tab svg { display: block; }
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
`;class q extends HTMLElement{static observedAttributes=["open","limit"];#i=[];#a=null;#t=0;#n;#e;#o=null;constructor(){super(),this.#n=this.attachShadow({mode:"open"}),this.#e=$(),this.hasAttribute("open")&&(this.#e.minimized=!1,this.#e.open=!0)}get limit(){return Number(this.getAttribute("limit")??"30")}get open(){return!this.#e.minimized&&this.#e.open}get minimized(){return this.#e.minimized}connectedCallback(){this.#r(),this.#a=z(e=>{this.#i.push(e),!this.#t&&(this.#t=requestAnimationFrame(()=>{this.#t=0,this.#r()}))})}disconnectedCallback(){this.#a?.stop(),this.#t&&cancelAnimationFrame(this.#t)}attributeChangedCallback(e){e==="open"&&this.hasAttribute("open")&&(this.#e.minimized=!1,this.#e.open=!0),this.#r()}minimize(){this.#s({minimized:!0})}restore(){this.#s({minimized:!1,open:!0})}#s(e){this.#e={...this.#e,...e},M(this.#e),this.#r()}#p(){const{edge:e,y:i,minimized:n}=this.#e,o=n?46:260,r=f(i*window.innerHeight,8,Math.max(8,window.innerHeight-o-8));this.setAttribute("data-edge",e),this.style.top=`${r}px`,e==="left"?(this.style.left=n?"0px":"16px",this.style.right="auto"):(this.style.right=n?"0px":"16px",this.style.left="auto")}#c(e,i){const n=this.getBoundingClientRect();this.#o={pointerId:e.pointerId,offsetX:e.clientX-n.left,offsetY:e.clientY-n.top,moved:!1},i.setPointerCapture(e.pointerId),e.preventDefault()}#l=e=>{const i=this.#o;if(!i||e.pointerId!==i.pointerId)return;const n=e.clientX-i.offsetX,o=e.clientY-i.offsetY;Math.abs(e.movementX)+Math.abs(e.movementY)>0&&(i.moved=!0),this.style.left=`${n}px`,this.style.right="auto",this.style.top=`${o}px`};#d=e=>{const i=this.#o;if(!i||e.pointerId!==i.pointerId)return;this.#o=null;const n=this.getBoundingClientRect(),o=E(n.left,n.top,n.width,window.innerWidth,window.innerHeight);if(!i.moved){this.#s(this.#e.minimized?{minimized:!1,open:!0}:{open:!this.#e.open});return}this.#s(o)};#r(){this.#p(),this.#n.innerHTML=this.#e.minimized?this.#h():this.#u(),this.#m()}#h(){const e=this.#i.length;return`
      <style>${x}</style>
      <div class="tab" part="tab" role="button" tabindex="0"
           title="Pipe anatomy — ${e} request${e===1?"":"s"}. Click to open, drag to move.">
        <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
          <rect x="1" y="3"  width="9"  height="2" rx="1" fill="currentColor" opacity=".55"/>
          <rect x="4" y="7"  width="10" height="2" rx="1" fill="currentColor"/>
          <rect x="2" y="11" width="7"  height="2" rx="1" fill="currentColor" opacity=".55"/>
        </svg>
        <span class="visually-hidden" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)">Open pipe anatomy</span>
      </div>`}#u(){const e=this.#i.slice(-this.limit),i=S(this.#i),n=e.length?Math.min(...e.map(a=>a.startMs)):0,o=e.length?Math.max(...e.map(a=>a.startMs+a.durationMs)):1,r=Math.max(o-n,1),s=i.totalTransferBytes>1024*1024?`${(i.totalTransferBytes/1024/1024).toFixed(1)}MB`:`${Math.round(i.totalTransferBytes/1024)}KB`,d=Object.entries(i.protocols).map(([a,u])=>`${a}×${u}`).join(" "),h=e.map(a=>{const u=a.spans.map(p=>{const A=(p.startMs-n)/r*100,B=(p.endMs-p.startMs)/r*100,P=`${b[p.phase]} — ${(p.endMs-p.startMs).toFixed(1)}ms
${p.note}`;return`<div class="bar" style="left:${A}%;width:${B}%;background:${g[p.phase]}" title="${y(P)}"></div>`}).join(""),L=a.timingsVisible?"":'<div class="opaque">no Timing-Allow-Origin — phases withheld by the browser</div>';return`
          <div class="row" title="${y(a.url)}">
            <span class="name">${v(a.name)}</span>
            <div class="track">${u}</div>
          </div>${L}`}).join(""),C=["dns","tcp","tls","ttfb-wait","download","queued"].map(a=>`<span><i class="swatch" style="background:${g[a]}"></i>${b[a]}</span>`).join("");return`
      <style>${x}</style>
      <div class="panel">
        <header part="header">
          <span class="grip" aria-hidden="true">⋮⋮</span>
          <h2>Pipe anatomy</h2>
          <span class="stats">${i.requests} req · ${s}${d?` · ${d}`:""}</span>
          <button class="icon-btn" data-minimize type="button" title="Tuck away" aria-label="Minimise panel">–</button>
        </header>
        <div class="body" ${this.#e.open?"":"hidden"}>
          ${e.length?h:'<div class="empty">Waiting for requests…</div>'}
          <div class="legend">${C}</div>
        </div>
      </div>`}#m(){const e=this.#n.querySelector("header, .tab");e&&(e.addEventListener("pointerdown",i=>this.#c(i,e)),e.addEventListener("pointermove",this.#l),e.addEventListener("pointerup",this.#d),e.addEventListener("pointercancel",this.#d),e.addEventListener("keydown",i=>{const n=i.key;(n==="Enter"||n===" ")&&(i.preventDefault(),this.#e.minimized?this.restore():this.minimize())}),this.#n.querySelector("[data-minimize]")?.addEventListener("click",i=>{i.stopPropagation(),this.minimize()}))}}function v(t){return t.replace(/[&<>]/g,e=>({"&":"&amp;","<":"&lt;",">":"&gt;"})[e])}function y(t){return v(t).replace(/"/g,"&quot;")}function T(t="pipe-anatomy"){typeof customElements<"u"&&!customElements.get(t)&&customElements.define(t,q)}T(),typeof document<"u"&&!document.querySelector("pipe-anatomy")&&document.body.appendChild(document.createElement("pipe-anatomy"))})();
