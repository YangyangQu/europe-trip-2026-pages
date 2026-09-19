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
      <div class="hero-sub">${n?`下一项：${esc(displayTitle(n))} · ${fmt(n.date)} ${esc(n.time_label||"")}`:"2026 欧洲旅行手册"}</div>
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

function displayTitle(i){
  const en=String(i?.title_en||"").trim();
  const zh=String(i?.title_zh||"").trim();
  if(en && zh && en!==zh)return `${en}（${zh}）`;
  return en||zh||String(i?.title||"");
}

function renderInfo(){
  const info=items.filter(i=>["flight","train","bus","hotel"].includes(i.item_type));
  const flights=info.filter(i=>i.item_type==="flight");
  const ground=info.filter(i=>["train","bus"].includes(i.item_type));
  const hotels=info.filter(i=>i.item_type==="hotel");

  const card=i=>{
    const map=i.map_query||i.address||i.location_name;
    return `<div class="flight-row">
      <strong>Day ${i.day_no} · ${fmt(i.date)} · ${esc(displayTitle(i))}</strong>
      <div style="color:var(--ink-2);font-size:13px;margin-top:4px">${esc(i.time_label||"")} ${i.description?`· ${esc(i.description)}`:""}</div>
      <div class="step-tags">${meaningfulTags(i)}</div>
      <div class="buttons" style="margin-top:8px">
        ${map?`<a class="action" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(map)}" target="_blank" rel="noopener">🧭 Google 地图</a>`:""}
        ${i.external_url?`<a class="action" href="${attr(i.external_url)}" target="_blank" rel="noopener">↗ 官网</a>`:""}
      </div>
    </div>`;
  };

  app.innerHTML=`
    <div class="section-title"><h2>信息</h2><small>航班 · 交通 · 住宿</small></div>
    <section class="card mirror-note">
      <div class="kicker">PUBLIC GITHUB MIRROR</div>
      <strong>公开只读备用站</strong>
      <p>这里保留完整公开行程、交通、住宿、美食和待办；不包含真实票据 PDF、二维码、订单号、付款信息和管理后台。</p>
    </section>
    <div class="section-title"><h2>航班</h2><small>${flights.length} 段</small></div>
    <section class="card list-card">${flights.map(card).join("")||`<div class="empty">暂无航班。</div>`}</section>
    ${ground.length?`<div class="section-title"><h2>火车 / 公交</h2><small>${ground.length} 项</small></div><section class="card list-card">${ground.map(card).join("")}</section>`:""}
    ${hotels.length?`<div class="section-title"><h2>住宿</h2><small>${hotels.length} 项</small></div><section class="card list-card">${hotels.map(card).join("")}</section>`:""}
  `;
}

function renderTodos(){
  const todos=items.filter(i=>i.item_type==="todo"||i.status==="todo");
  const storageKey="europeTripChecklistDoneGitHub";
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
    <div>${dayMeta}<div class="todo-title-line"><strong>${esc(displayTitle(i))}</strong>${official}</div>
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
    ${localFoodIntro(day)}
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

  const optional=i.status==="flexible";
  const connector=idx<total-1?`<div class="connector">${connectionText(i)}</div>`:"";
  const display=displayTitle(i);
  const zh=i.title_zh||i.title;
  const media=i.image_url?`<figure class="step-media">
      <img src="${attr(i.image_url)}" alt="${attr(i.image_alt||zh)}" loading="lazy" referrerpolicy="no-referrer">
      <figcaption><span class="image-note">${esc(i.image_alt||"行程参考图")}</span></figcaption>
    </figure>`:"";

  return `<div class="timeline-card ${optional?"optional":""}">
    <div class="step-no">${idx+1}</div>
    <div class="step-main">
      <div class="step-time">${esc(i.time_label||"时间待定")}</div>
      <div class="step-title">${esc(display)}</div>
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
      <div class="agenda-title">${esc(displayTitle(i))}</div>
    </div>`).join("")}</div>
  </section>`;
}

function parseSpecialties(raw){
  return String(raw||"").split("|").map(x=>x.trim()).filter(Boolean).map(x=>{
    const p=x.split("::");
    return {name:(p.shift()||"").trim(),desc:p.join("::").trim()};
  });
}
function parseRestaurantDescription(raw){
  const s=String(raw||"");
  const marker="【招牌】";
  if(!s.includes(marker))return {about:s,signatures:[]};
  const [about,sig]=s.split(marker);
  return {about:about.trim(),signatures:String(sig||"").split("|").map(x=>x.trim()).filter(Boolean)};
}
const SIGNATURE_GLOSSARY={
  "Carbonara":"罗马经典意面：鸡蛋、Pecorino 羊奶酪、guanciale 猪颊肉和黑胡椒；传统做法不加奶油。",
  "Cacio e Pepe":"罗马经典意面：Pecorino Romano 羊奶酪 + 黑胡椒，用面水乳化成浓郁酱汁。",
  "Amatriciana":"番茄、guanciale 猪颊肉和 Pecorino 羊奶酪做的罗马经典意面，酸香咸鲜。",
  "Gricia":"没有番茄和鸡蛋的罗马意面：guanciale 猪颊肉、Pecorino 羊奶酪和黑胡椒。",
  "Rösti":"瑞士薯饼：土豆刨丝煎到外脆内软，可配肉、蛋或酱汁。",
  "Älplermagronen":"瑞士高山通心粉：通心粉、土豆、奶酪、奶油和炸洋葱，常配苹果泥。",
  "Fondue moitié-moitié":"瑞士经典奶酪火锅：通常由 Gruyère 和 Vacherin Fribourgeois 混合，蘸面包吃。",
  "Cheese fondue with Gruyère & Vacherin":"Gruyère + Vacherin 奶酪火锅，蘸面包吃。",
  "Raclette with potatoes & pickles":"融化 Raclette 奶酪配土豆、酸黄瓜和腌洋葱。",
  "Luzerner Chügelipastete":"卢塞恩代表菜：大酥皮盅里装奶油汁肉丸、蘑菇等馅料。",
  "Zürcher Geschnetzeltes":"苏黎世代表菜：切片小牛肉配奶油蘑菇白汁，通常搭 Rösti。",
  "Socca":"尼斯代表小吃：鹰嘴豆粉和橄榄油做的薄饼，外缘焦脆。",
  "Pissaladière":"南法咸饼：慢炒洋葱、橄榄和凤尾鱼铺在面饼上。",
  "Salade niçoise":"尼斯沙拉：番茄、鸡蛋、橄榄、凤尾鱼/金枪鱼等组成。",
  "Petits farcis":"尼斯传统填馅蔬菜：西葫芦、番茄、洋葱等填肉馅/面包馅烤制。",
  "Daube niçoise":"尼斯风味红酒慢炖牛肉。",
  "Boeuf bourguignon":"勃艮第红酒炖牛肉。",
  "Confit de canard":"油封鸭腿：鸭肉软嫩、外皮酥脆。",
  "Duck confit":"油封鸭腿：鸭肉软嫩、外皮酥脆。",
  "Soupe à l’oignon":"法式洋葱汤，通常加面包和奶酪焗烤。",
  "Soupe à l’oignon gratinée":"焗烤法式洋葱汤，上面铺面包和奶酪烤至金黄。",
  "Steak-frites":"法式 bistro 经典：牛排配炸薯条。",
  "Escargots":"法式蜗牛，常用蒜香欧芹黄油烤制。",
  "Crème brûlée":"法式焦糖布丁：奶蛋布丁上覆盖焦糖脆壳。",
  "Tiramisù":"提拉米苏：咖啡浸手指饼干 + mascarpone 奶酪霜 + 可可粉。",
  "Tiramisu":"提拉米苏：咖啡、mascarpone、手指饼干和可可粉组成。",
  "Biryani":"南亚香料焖饭，米饭与肉类/蔬菜分层焖制。",
  "Butter chicken":"印度奶油鸡：番茄、黄油和香料做的浓郁咖喱鸡。",
  "Naan":"印度烤饼，常用于蘸咖喱。",
  "Sole meunière":"法式黄油香煎鳎目鱼，以黄油、柠檬和欧芹调味。",
  "Seafood platter":"综合海鲜拼盘，通常含贝类、虾、蟹等。",
  "Oysters":"生蚝，通常配柠檬或醋汁。",
  "Crêpe":"法式可丽饼，可做甜口或咸口。",
  "Sweet crêpe":"甜可丽饼，可搭糖、巧克力、焦糖或水果。",
  "Saucisse-purée":"香肠配土豆泥，典型法式家常菜。",
  "Île flottante":"漂浮岛甜点：蛋白霜浮在英式奶油酱上，通常淋焦糖。"
};
function explainSignature(name){
  if(SIGNATURE_GLOSSARY[name])return SIGNATURE_GLOSSARY[name];
  const s=String(name||"").toLowerCase();
  if(s.includes("fish"))return "鱼类/海鲜料理，具体鱼种和做法以当天菜单为准。";
  if(s.includes("seafood"))return "海鲜料理，可能包含鱼、虾、贝类或章鱼等。";
  if(s.includes("meat")||s.includes("steak"))return "肉类主菜，具体肉类和做法以当天菜单为准。";
  if(s.includes("pasta"))return "意面类主食，面型和酱汁以当天菜单为准。";
  if(s.includes("pizza"))return "披萨，配料和口味以当天菜单为准。";
  if(s.includes("salad"))return "沙拉类轻食/前菜，具体配料按当天菜单。";
  if(s.includes("dessert")||s.includes("cake")||s.includes("pastr"))return "甜点/糕点，具体品种以当天菜单为准。";
  if(s.includes("cheese"))return "奶酪类料理或拼盘，具体奶酪以当天菜单为准。";
  if(s.includes("sausage"))return "香肠类热食，常配土豆、面包或蔬菜。";
  if(s.includes("mediterranean"))return "地中海风格料理，常用橄榄油、番茄、香草和海鲜。";
  return "餐厅当前菜单中的推荐菜；具体食材和做法以当天菜单为准。";
}
function localFoodIntro(day){
  const specs=parseSpecialties(day.food_specialties);
  if(!day.food_intro&&!specs.length)return"";
  return `<section class="local-food-intro"><div class="local-food-head"><div><small>LOCAL FOOD</small><h3>今天当地最值得吃什么</h3></div><a class="action" href="${routeHref(`/food?day=${day.day_no}`)}">🍴 查看餐厅</a></div>${day.food_intro?`<p>${esc(day.food_intro)}</p>`:""}${specs.length?`<div class="specialty-list">${specs.map(x=>`<span class="specialty">${esc(x.name)}</span>`).join("")}</div>`:""}</section>`;
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
  const specs=parseSpecialties(day.food_specialties);

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
    <div class="food-hero"><div class="kicker">LOCAL FOOD</div><h3>这个城市 / 区域有哪些必吃</h3>
      ${day.food_intro?`<p>${esc(day.food_intro)}</p>`:""}
      ${specs.length?`<div class="must-eat-grid">${specs.map((x,idx)=>`<div class="must-eat-card"><div class="must-eat-no">${String(idx+1).padStart(2,"0")}</div><div><strong>${esc(x.name)}</strong>${x.desc?`<p>${esc(x.desc)}</p>`:""}</div></div>`).join("")}</div>`:""}
    </div>
    ${mealSections||`<div class="empty">这一天还没有设置饭点。</div>`}
    <div class="rating-note">Google 评分为最近核对时的快照，可能变化；到店前建议再确认最新营业时间。</div>
  </section>`;

  document.getElementById("foodDaySelect").onchange=e=>location.hash=`#/food?day=${e.target.value}`;
  document.querySelectorAll(".meal-chip").forEach(b=>b.onclick=()=>document.getElementById(`meal-${b.dataset.meal}`)?.scrollIntoView({behavior:"smooth",block:"start"}));
  if(selectedMeal)setTimeout(()=>document.getElementById(`meal-${selectedMeal}`)?.scrollIntoView({behavior:"smooth",block:"start"}),80);
}
function restaurant(i,rank){
  const rating=i.google_rating!=null?`<div class="google-rating"><span class="star">★</span><b>${Number(i.google_rating).toFixed(1)}</b><span>Google</span>${i.google_review_count!=null?`<small>${Number(i.google_review_count).toLocaleString("en-US")} 条评价</small>`:""}</div>`:`<div class="google-rating muted-rating">Google 评分待补</div>`;
  const detail=parseRestaurantDescription(i.description);
  const why=i.intro||detail.about||"";
  return `<article class="restaurant-card">
    <div class="rank">RECOMMEND ${String(rank).padStart(2,"0")}</div>
    <div class="restaurant-title-row"><h4>${esc(i.title)}</h4>${rating}</div>
    ${why?`<div class="restaurant-info-block"><div class="restaurant-info-label">为什么推荐</div><p>${esc(why)}</p></div>`:""}
    ${detail.about&&detail.about!==why?`<div class="restaurant-info-block"><div class="restaurant-info-label">餐厅特点</div><p>${esc(detail.about)}</p></div>`:""}
    ${detail.signatures.length?`<div class="restaurant-info-block signature-block"><div class="restaurant-info-label">招牌 / 推荐点单 <span>以当天菜单为准</span></div><div class="signature-detail-list">${detail.signatures.map(x=>`<div class="signature-detail"><strong>${esc(x)}</strong><p>${esc(explainSignature(x))}</p></div>`).join("")}</div></div>`:""}
    ${i.price_label?`<div class="price">${esc(i.price_label)}</div>`:""}
    ${i.badge_text?`<div style="margin-top:7px"><span class="tag gold">${esc(i.badge_text)}</span></div>`:""}
    <div class="buttons"><a class="action primary" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(i.map_query||i.address||i.title)}" target="_blank" rel="noopener">Google 地图</a>${i.external_url?`<a class="action" href="${attr(i.external_url)}" target="_blank" rel="noopener">官网 / 菜单</a>`:""}</div>
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
