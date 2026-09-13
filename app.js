const app=document.getElementById("app");
const daySelect=document.getElementById("daySelect");
const offline=document.getElementById("offline");

let DATA=null;
let days=[];
let items=[];

onlineState();
boot();

async function boot(){
  try{
    const r=await fetch("./data.json",{cache:"no-store"});
    if(!r.ok)throw new Error(`${r.status} ${r.statusText}`);
    DATA=await r.json();
    days=DATA.days||[];
    items=DATA.items||[];
    selector();
    addEventListener("hashchange",renderRoute);
    renderRoute();
  }catch(e){
    app.innerHTML=`<div class="card empty">读取失败：${esc(e.message)}</div>`;
  }
}

function parseRoute(){
  let raw=(location.hash||"#/").slice(1);
  if(!raw.startsWith("/"))raw="/"+raw;
  const qpos=raw.indexOf("?");
  const path=qpos>=0?raw.slice(0,qpos):raw;
  const params=new URLSearchParams(qpos>=0?raw.slice(qpos+1):"");
  return {path,params};
}

function routeHref(path){return `#${path}`}

function renderRoute(){
  document.querySelectorAll(".navchips .active,.mobile-nav .active").forEach(x=>x.classList.remove("active"));
  const {path,params}=parseRoute();
  setActive(path);
  const dm=path.match(/^\/day\/(\d+)\/?$/);
  if(dm){
    const no=Number(dm[1]);
    daySelect.value=String(no);
    return renderDay(no);
  }
  daySelect.value="";
  if(path==="/info"||path==="/flights")return renderInfo();
  if(path==="/todo")return renderTodos();
  if(path==="/food")return renderFood(params);
  return renderHome();
}

function selector(){
  if(!daySelect)return;
  daySelect.innerHTML=`<option value="">选择日期 ▾</option>`+
    days.map(d=>`<option value="${d.day_no}">Day ${d.day_no} · ${fmt(d.date)}</option>`).join("");
  daySelect.onchange=()=>{if(daySelect.value)location.hash=`#/day/${daySelect.value}`};
}

function setActive(path){
  const key=(path.startsWith("/info")||path.startsWith("/flights"))?"info":
    path.startsWith("/day/")?"days":
    path.startsWith("/food")?"food":
    path.startsWith("/todo")?"todo":"overview";
  document.getElementById(`nav-${key}`)?.classList.add("active");
  document.getElementById(`m-${key}`)?.classList.add("active");
}

function dayItems(no){
  return items.filter(i=>Number(i.day_no)===Number(no)).sort((a,b)=>(a.sort_order||0)-(b.sort_order||0)||a.id-b.id);
}
function nextItem(){
  const now=Date.now();
  return items
    .filter(i=>i.starts_at&&new Date(i.starts_at).getTime()>=now)
    .sort((a,b)=>new Date(a.starts_at)-new Date(b.starts_at))[0]||null;
}

function renderHome(){
  const n=nextItem();
  app.innerHTML=`<section class="card hero">
    <div class="hero-illustration"></div>
    <div class="hero-copy">
      <div class="kicker">SEP 18 — OCT 02 · 15 DAYS</div>
      <h1>Switzerland · Italy · France</h1>
      <div class="hero-sub">${n?`下一项：${esc(n.title_zh||n.title)} · ${fmt(n.date)} ${esc(n.time_label||"")}`:"2026 欧洲旅行手册"}</div>
      ${n?`<div class="countdown"><div class="timebox"><b id=d>--</b><span>天</span></div><div class="timebox"><b id=h>--</b><span>时</span></div><div class="timebox"><b id=m>--</b><span>分</span></div><div class="timebox"><b id=s>--</b><span>秒</span></div></div>`:""}
    </div>
  </section>

  <section class="card mirror-note">
    <div class="kicker">GITHUB PAGES MIRROR</div>
    <strong>中国备用只读镜像</strong>
    <p>这里不依赖 Cloudflare Worker / D1。真实票据 PDF、二维码、后台编辑功能没有公开到 GitHub。</p>
  </section>

  <div class="section-title"><h2>行程</h2><small>按天查看</small></div>
  <div class="date-strip">${days.map(d=>`<a class="date-tab" href="${routeHref(`/day/${d.day_no}`)}"><b>${fmt(d.date)}</b><span>D${d.day_no}</span></a>`).join("")}</div>
  <section class="days-grid">${days.map(d=>`<a class="card day-link" href="${routeHref(`/day/${d.day_no}`)}">
    <span class="day-no">DAY ${d.day_no}</span><strong>${esc(d.title)}</strong><span>${esc(d.subtitle||"")} · ${esc(d.tz_label||"")}</span>
  </a>`).join("")}</section>`;

  if(n?.starts_at)countdown(n.starts_at);
}

function renderInfo(){
  const info=items.filter(i=>
    ["flight","train","bus","ticket","hotel"].includes(i.item_type) ||
    i.buy_url ||
    i.has_protected_ticket ||
    ["已出票","需购票","待出票","已购买","到店领取","需购买"].includes(i.badge_text)
  );
  const tickets=info.filter(i=>i.item_type==="ticket"||i.has_protected_ticket||i.buy_url||/票|购买/.test(String(i.badge_text||"")));
  const flights=info.filter(i=>i.item_type==="flight");
  const ground=info.filter(i=>["train","bus"].includes(i.item_type));
  const hotels=info.filter(i=>i.item_type==="hotel");

  const card=i=>{
    const map=i.map_query||i.address||i.location_name;
    return `<div class="flight-row">
      <strong>Day ${i.day_no} · ${fmt(i.date)} · ${esc(i.title_zh||i.title)}</strong>
      ${i.title_en?`<div class="step-title-en">${esc(i.title_en)}</div>`:""}
      <div style="color:var(--ink-2);font-size:13px;margin-top:4px">${esc(i.time_label||"")} ${i.description?`· ${esc(i.description)}`:""}</div>
      <div class="step-tags">${meaningfulTags(i)}</div>
      ${i.has_protected_ticket?`<div class="protected-ticket-note">🔒 已有真实票据，但未放入公开 GitHub 镜像。请在手机 Files / 对应 App / 私有主站中查看。</div>`:""}
      <div class="buttons" style="margin-top:8px">
        ${i.buy_url?`<a class="action buy" href="${attr(i.buy_url)}" target="_blank" rel="noopener">🎫 官方购票</a>`:""}
        ${map?`<a class="action" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(map)}" target="_blank" rel="noopener">🧭 Google 地图</a>`:""}
      </div>
    </div>`;
  };

  app.innerHTML=`
    <div class="section-title"><h2>信息</h2><small>票务 · 航班 · 交通 · 住宿</small></div>
    <section class="card mirror-note">
      <div class="kicker">PUBLIC MIRROR</div>
      <strong>这是公开只读备用站</strong>
      <p>为了安全，真实门票 PDF、二维码、订单号以及管理后台均未同步到此仓库。</p>
    </section>
    <section class="card list-card">
      <div class="info-section-head"><span class="kicker">TICKETS</span><h3>票务总览</h3></div>
      ${tickets.length?tickets.map(card).join(""):`<div class="empty">暂无票务信息。</div>`}
    </section>
    <div class="section-title"><h2>航班</h2><small>${flights.length} 段</small></div>
    <section class="card list-card">${flights.map(card).join("")||`<div class="empty">暂无航班。</div>`}</section>
    ${ground.length?`<div class="section-title"><h2>火车 / 公交</h2><small>${ground.length} 项</small></div><section class="card list-card">${ground.map(card).join("")}</section>`:""}
    ${hotels.length?`<div class="section-title"><h2>住宿</h2><small>${hotels.length} 项</small></div><section class="card list-card">${hotels.map(card).join("")}</section>`:""}
  `;
}

function renderTodos(){
  const todos=items.filter(i=>i.item_type==="todo"||i.status==="todo");
  const storageKey="europeTripChecklistDoneGitHubV21";
  let done={};
  try{done=JSON.parse(localStorage.getItem(storageKey)||"{}")||{}}catch{done={}}

  const generalCategories=["出发前确认","必装 App","证件与资金","电子设备","衣物","洗护健康","旅行用品","临出发再检查"];
  const generalGroups={};
  const tripTodos=[];

  for(const i of todos){
    if(generalCategories.includes(i.time_label)){
      (generalGroups[i.time_label] ||= []).push(i);
    }else tripTodos.push(i);
  }

  const doneCount=todos.filter(i=>done[i.id]).length;
  const generalHtml=generalCategories.filter(k=>generalGroups[k]?.length).map(k=>`<section class="card checklist-group">
    <div class="checklist-head"><span class="kicker">${esc(k)}</span><span>${generalGroups[k].length} 项</span></div>
    ${generalGroups[k].map(i=>todoRow(i,done,false)).join("")}
  </section>`).join("");

  const tripHtml=tripTodos.length?`<section class="card checklist-group">
    <div class="checklist-head"><span class="kicker">行程待办</span><span>${tripTodos.length} 项</span></div>
    ${tripTodos.sort((a,b)=>(a.day_no-b.day_no)||((a.sort_order||0)-(b.sort_order||0))).map(i=>todoRow(i,done,true)).join("")}
  </section>`:"";

  app.innerHTML=`<div class="section-title">
    <h2>待办与行李清单</h2>
    <small id="todoProgress">${doneCount}/${todos.length} 已完成</small>
  </div>${generalHtml}${tripHtml}`;

  document.querySelectorAll(".todo-checkbox").forEach(cb=>{
    cb.addEventListener("change",()=>{
      const id=cb.dataset.todoId;
      done[id]=cb.checked;
      if(!cb.checked)delete done[id];
      localStorage.setItem(storageKey,JSON.stringify(done));
      document.querySelector(`[data-todo-row="${id}"]`)?.classList.toggle("done",cb.checked);
      const n=todos.filter(i=>done[i.id]).length;
      document.getElementById("todoProgress").textContent=`${n}/${todos.length} 已完成`;
    });
  });
}
function todoRow(i,done,showDay){
  const dayMeta=showDay?`<div class="todo-day-meta">Day ${i.day_no} · ${fmt(i.date)}${i.time_label?` · ${esc(i.time_label)}`:""}</div>`:"";
  const official=i.external_url?`<a class="todo-official-link" href="${attr(i.external_url)}" target="_blank" rel="noopener" onclick="event.stopPropagation()">官网 ↗</a>`:"";
  return `<label class="checklist-row ${done[i.id]?"done":""}" data-todo-row="${i.id}">
    <input class="todo-checkbox" type="checkbox" data-todo-id="${i.id}" ${done[i.id]?"checked":""}>
    <div>${dayMeta}<div class="todo-title-line"><strong>${esc(i.title_zh||i.title)}</strong>${official}</div>
      <p>${esc(i.description||i.intro||"")}</p>
    </div>
  </label>`;
}

function renderDay(no){
  const day=days.find(d=>Number(d.day_no)===Number(no));
  if(!day){app.innerHTML=`<div class="card empty">没有找到 Day ${no}</div>`;return}
  document.title=`Day ${no} · ${day.title}`;
  const all=dayItems(no);
  const normal=all.filter(i=>i.item_type!=="restaurant"&&i.item_type!=="todo");
  const todo=normal.filter(i=>i.status==="todo");

  document.getElementById("m-food").href=`#/food?day=${no}`;

  app.innerHTML=`
  <div class="date-strip">${days.map(x=>`<a class="date-tab ${x.day_no===no?"active":""}" href="${routeHref(`/day/${x.day_no}`)}"><b>${fmt(x.date)}</b><span>D${x.day_no}</span></a>`).join("")}</div>
  <article class="card day-card">
    <header class="day-header">
      <div class="day-kicker">DAY ${day.day_no} · ${weekday(day.date)}</div>
      <div class="day-title">${esc(day.title)}</div>
      <div class="day-sub">${esc(day.subtitle||"")} ${day.tz_label?`· ${esc(day.tz_label)}`:""}</div>
      <div class="day-facts">
        <span class="fact">${normal.length} 个安排</span>
        ${todo.length?`<span class="fact">${todo.length} 个待处理</span>`:""}
      </div>
    </header>
    ${day.notes?`<div class="reminder"><b>当日提醒</b><p>${esc(day.notes)}</p></div>`:""}
    ${dayAgenda(normal)}
    <section class="timeline">${normal.map((i,idx)=>timelineItem(i,idx,normal.length,no)).join("")}</section>
  </article>
  <div style="display:flex;justify-content:space-between;gap:8px;margin-top:12px">
    <a class="button" href="${no>1?routeHref(`/day/${no-1}`):routeHref("/")}">← 上一天</a>
    <a class="button" href="${routeHref("/")}">全部日期</a>
    <a class="button" href="${no<days.length?routeHref(`/day/${no+1}`):routeHref("/")}">下一天 →</a>
  </div>`;
}

function timelineItem(i,idx,total,dayNo){
  const map=i.map_query||i.address||i.location_name;
  const actions=[];
  if(map)actions.push(`<a class="action" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(map)}" target="_blank" rel="noopener">🧭 导航</a>`);
  if(i.buy_url)actions.push(`<a class="action buy" href="${attr(i.buy_url)}" target="_blank" rel="noopener">🎫 购票</a>`);
  if(i.external_url)actions.push(`<a class="action" href="${attr(i.external_url)}" target="_blank" rel="noopener">↗ 官网</a>`);
  if(i.item_type==="meal")actions.push(`<a class="action primary" href="${routeHref(`/food?day=${dayNo}&meal=${i.id}`)}">🍴 美食推荐</a>`);
  if(i.has_protected_ticket)actions.push(`<span class="action protected-static">🔒 票据未公开</span>`);

  const optional=i.status==="flexible";
  const connector=idx<total-1?`<div class="connector">${connectionText(i)}</div>`:"";
  const zh=i.title_zh||i.title;
  const en=i.title_en||"";
  const media=i.image_url?`<figure class="step-media">
      <img src="${attr(i.image_url)}" alt="${attr(i.image_alt||zh)}" loading="lazy" referrerpolicy="no-referrer">
      <figcaption><span class="image-note">${esc(i.image_alt||"行程参考图")}</span></figcaption>
    </figure>`:"";

  return `<div class="timeline-card ${optional?"optional":""}">
    <div class="step-no">${idx+1}</div>
    <div class="step-main">
      <div class="step-time">${esc(i.time_label||"时间待定")}</div>
      <div class="step-title">${esc(zh)}</div>
      ${en?`<div class="step-title-en">${esc(en)}</div>`:""}
      ${media}
      ${i.description?`<div class="step-desc">${esc(i.description)}</div>`:""}
      ${i.intro?`<div class="step-intro">${esc(i.intro)}</div>`:""}
      <div class="step-tags">${meaningfulTags(i)}</div>
    </div>
    <div class="step-actions">${actions.join("")}</div>
  </div>${connector}`;
}

function meaningfulTags(i){
  const tags=[];
  const badge=String(i.badge_text||"");
  const purchasedTicket=
    ["flight","train","ticket"].includes(i.item_type) &&
    (["booked","confirmed"].includes(i.status)||/已出票|已购买|已购|已预订/.test(badge));
  const purchasedByBadge=/已出票|已购买|已购/.test(badge);
  if(i.badge_text)tags.push(`<span class="tag ${i.status==="todo"?"red":"gold"}">${esc(i.badge_text)}</span>`);
  if(i.price_label&&!(purchasedTicket||purchasedByBadge))tags.push(`<span class="tag blue">${esc(i.price_label)}</span>`);
  if(i.status==="confirmed")tags.push(`<span class="tag green">已确认</span>`);
  else if(i.status==="booked")tags.push(`<span class="tag green">已预订 / 已购买</span>`);
  else if(i.status==="todo")tags.push(`<span class="tag red">待处理</span>`);
  else if(i.status==="flexible")tags.push(`<span class="tag gold">备选 / 机动</span>`);
  return tags.join("");
}
function connectionText(i){
  if(i.item_type==="flight")return "航班衔接：以下一段落地、取行李或转乘安排为准";
  if(i.item_type==="hotel")return "从住宿点继续下一段行程";
  if(i.item_type==="meal")return "用餐后继续下一站";
  return "按当天实际交通与步行时间衔接";
}
function dayAgenda(list){
  if(!list.length)return"";
  return `<section class="daily-agenda">
    <div class="agenda-head"><div><small>DAILY SCHEDULE</small><h3>今日时间表</h3></div><span>${list.length} 项</span></div>
    <div class="agenda-list">${list.map((i,idx)=>`<div class="agenda-row">
      <div class="agenda-time">${esc(i.time_label||"时间待定")}</div>
      <div class="agenda-dot"><span>${idx+1}</span></div>
      <div class="agenda-title">${esc(i.title_zh||i.title)}</div>
    </div>`).join("")}</div>
  </section>`;
}

function renderFood(params){
  let no=Number(params.get("day"));
  if(!Number.isInteger(no)||no<1||no>days.length){
    const todayISO=new Date().toISOString().slice(0,10);
    no=days.find(d=>d.date===todayISO)?.day_no||1;
  }
  const selectedMeal=Number(params.get("meal"))||null;
  const day=days.find(d=>Number(d.day_no)===Number(no));
  const all=dayItems(no);
  const meals=all.filter(i=>i.item_type==="meal").sort((a,b)=>(a.sort_order||0)-(b.sort_order||0));
  const restaurants=all.filter(i=>i.item_type==="restaurant");
  const specs=(day.food_specialties||"").split("|").map(x=>x.trim()).filter(Boolean);

  const mealSections=meals.map((meal,mealIndex)=>{
    const list=restaurants.filter(r=>Number(r.meal_anchor_id)===Number(meal.id)).sort((a,b)=>(a.sort_order||0)-(b.sort_order||0));
    return `<section class="meal-food-section" id="meal-${meal.id}">
      <div class="meal-food-head"><div>
        <div class="kicker">MEAL ${String(mealIndex+1).padStart(2,"0")}</div>
        <h2>${esc(meal.time_label||"饭点")} · ${esc(meal.title_zh||meal.title)}</h2>
        <p>${esc(meal.description||"")}</p>
      </div>
      ${meal.map_query||meal.location_name?`<a class="action" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(meal.map_query||meal.location_name)}">饭点附近地图</a>`:""}</div>
      ${list.length?`<div class="nearby-priority">每一顿单独推荐；排序优先看这个饭点前后所在景点/区域，其次才看评分和名气。前面的店通常最省绕路。</div>
      <div class="restaurant-grid">${list.map((r,idx)=>restaurant(r,idx+1)).join("")}</div>`:`<div class="empty">这个饭点暂时没有单独配置餐厅。</div>`}
    </section>`;
  }).join("");

  app.innerHTML=`<section class="card food-page-header">
    <div class="kicker">FOOD GUIDE · DAY ${day.day_no}</div>
    <h1>当天美食安排</h1>
    <div style="color:var(--ink-2);font-size:13px">${esc(day.title)} · ${fmt(day.date)}</div>
    <div class="food-day-picker"><label for="foodDaySelect">选择第几天</label>
      <select id="foodDaySelect">${days.map(x=>`<option value="${x.day_no}" ${x.day_no===no?"selected":""}>Day ${x.day_no} · ${fmt(x.date)} · ${esc(x.title)}</option>`).join("")}</select>
    </div>
    ${meals.length?`<div class="meal-chip-row">${meals.map(m=>`<button class="meal-chip ${selectedMeal===m.id?"active":""}" data-meal="${m.id}">${esc(m.time_label||"饭点")} · ${esc(m.title_zh||m.title)}</button>`).join("")}</div>`:""}
  </section>
  <div class="date-strip">${days.map(x=>`<a class="date-tab ${x.day_no===no?"active":""}" href="${routeHref(`/food?day=${x.day_no}`)}"><b>${fmt(x.date)}</b><span>D${x.day_no}</span></a>`).join("")}</div>
  <section class="card food-guide">
    <div class="food-hero"><div class="kicker">LOCAL FOOD</div><h3>当天地区值得吃什么</h3>
      ${day.food_intro?`<p>${esc(day.food_intro)}</p>`:""}
      ${specs.length?`<div class="specialty-list">${specs.map(x=>`<span class="specialty">${esc(x)}</span>`).join("")}</div>`:""}
    </div>
    ${mealSections||`<div class="empty">这一天还没有设置饭点。</div>`}
    <div class="rating-note">Google 评分为最近核对时的快照，可能变化；到店前建议再确认最新营业时间。</div>
  </section>`;

  document.getElementById("foodDaySelect").onchange=e=>location.hash=`#/food?day=${e.target.value}`;
  document.querySelectorAll(".meal-chip").forEach(b=>b.onclick=()=>document.getElementById(`meal-${b.dataset.meal}`)?.scrollIntoView({behavior:"smooth",block:"start"}));
  if(selectedMeal)setTimeout(()=>document.getElementById(`meal-${selectedMeal}`)?.scrollIntoView({behavior:"smooth",block:"start"}),80);
}
function restaurant(i,rank){
  const rating=i.google_rating!=null
    ? `<div class="google-rating"><span class="star">★</span><b>${Number(i.google_rating).toFixed(1)}</b><span>Google</span>${i.google_review_count!=null?`<small>${Number(i.google_review_count).toLocaleString("en-US")} 条评价</small>`:""}</div>`
    : `<div class="google-rating muted-rating">Google 评分待补</div>`;
  return `<article class="restaurant-card">
    <div class="rank">RECOMMEND ${String(rank).padStart(2,"0")}</div>
    <div class="restaurant-title-row"><h4>${esc(i.title)}</h4>${rating}</div>
    <p>${esc(i.intro||i.description||"")}</p>
    ${i.price_label?`<div class="price">${esc(i.price_label)}</div>`:""}
    ${i.badge_text?`<div style="margin-top:7px"><span class="tag gold">${esc(i.badge_text)}</span></div>`:""}
    <div class="buttons">
      <a class="action primary" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(i.map_query||i.address||i.title)}" target="_blank" rel="noopener">Google 地图</a>
      ${i.external_url?`<a class="action" href="${attr(i.external_url)}" target="_blank" rel="noopener">官网 / 菜单</a>`:""}
    </div>
  </article>`;
}

function countdown(iso){
  const t=new Date(iso).getTime();
  const f=()=>{
    let x=Math.max(0,Math.floor((t-Date.now())/1000)),d=Math.floor(x/86400);x%=86400;
    let h=Math.floor(x/3600);x%=3600;let m=Math.floor(x/60),s=x%60;
    for(const [id,v] of [["d",d],["h",h],["m",m],["s",s]]){
      const el=document.getElementById(id);if(el)el.textContent=String(v).padStart(2,"0");
    }
  };
  f();setInterval(f,1000);
}
function fmt(d){if(!d)return"";const [,m,x]=d.split("-");return `${+m}/${+x}`}
function weekday(d){return new Intl.DateTimeFormat("zh-CN",{weekday:"short",timeZone:"UTC"}).format(new Date(`${d}T12:00:00Z`))}
function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function attr(s){return esc(s)}
function onlineState(){
  const f=()=>offline?.classList.toggle("show",!navigator.onLine);
  addEventListener("online",f);addEventListener("offline",f);f();
}
if("serviceWorker"in navigator)navigator.serviceWorker.register("./sw.js").catch(()=>{});
