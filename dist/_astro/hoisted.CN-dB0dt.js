import"./hoisted.BScVxmeO.js";document.addEventListener("astro:page-load",()=>{console.log("✅ AQA Kids Mobile Optimized");const _=new IntersectionObserver((e,o)=>{e.forEach(s=>{s.isIntersecting&&(s.target.classList.add("animate"),o.unobserve(s.target))})},{threshold:.1});document.querySelectorAll(".animate-on-scroll").forEach(e=>_.observe(e)),window.toggleFaq=function(e){const o=e.closest(".kids-faq__item"),s=o.classList.contains("kids-faq__item--active");document.querySelectorAll(".kids-faq__item").forEach(u=>u.classList.remove("kids-faq__item--active")),s||o.classList.add("kids-faq__item--active")},window.openLightbox=function(e){const o=document.getElementById("lightbox");document.getElementById("lightboxImage").src=e,o.style.display="flex"},window.closeLightbox=function(){document.getElementById("lightbox").style.display="none"};const c=document.getElementById("mainVideo"),l=document.getElementById("mainIframe");document.querySelectorAll(".thumb").forEach(e=>{e.addEventListener("click",()=>{const o=e.getAttribute("data-type");document.querySelectorAll(".thumb").forEach(s=>s.style.boxShadow="0 0 5px #00ffff"),e.style.boxShadow="0 0 15px #00ffff",o==="youtube"?(c.style.display="none",l.style.display="block",l.src=e.getAttribute("data-src")):(l.style.display="none",c.style.display="block",c.src=e.src,c.play())})});let a=0;const d=document.querySelectorAll(".kids-reviews__item"),v=document.getElementById("reviewsTrack");function h(){v.style.transform=`translateX(-${a*100}%)`}window.nextReview=function(){a=(a+1)%d.length,h()},window.previousReview=function(){a=(a-1+d.length)%d.length,h()};const y=document.querySelectorAll(".equipment-step"),w=document.querySelectorAll(".step-dot");let r=0;window.goToStep=function(e){r=e,k()},document.querySelectorAll(".next-btn").forEach(e=>{e.addEventListener("click",()=>{r=(r+1)%y.length,k()})});function k(){y.forEach((e,o)=>e.classList.toggle("active",o===r)),w.forEach((e,o)=>e.classList.toggle("active",o===r))}async function E(){try{const e=await fetch("/api/schedule");if(!e.ok)return;const o=await e.json(),s=[],u={reghaia:"ADM AZAL — Reghaïa",cheraga:"BK Sport — Chéraga"};Object.keys(o).forEach(t=>{const i=o[t];if(!i||!i.categories)return;const b=u[t]||t;Object.keys(i.categories).forEach(f=>{if(f!=="enfants"&&f!=="kids")return;const m=i.categories[f];!m||!m.coaches||m.coaches.forEach(g=>{g.slots&&g.slots.forEach(n=>{s.push({coach:g.name.replace(/^[Cc]oach\s+/,""),pool:b,day:n.day,time:n.time,total:n.total,taken:n.taken,type:n.type,group:n.group||"",locKey:t})})})})});const p=document.querySelector(".kids-groups__wrapper");if(!p)return;s.length>0?p.innerHTML=s.map((t,i)=>`

                            <div class="kids-groups__card">

                              <div class="kids-groups__icon">${t.group?t.group:String.fromCharCode(65+i)}</div>

                              <h3 class="kids-groups__title">Groupe ${t.group?t.group:String.fromCharCode(65+i)}</h3>

                              <div class="kids-groups__age">${t.coach}</div>

                              <ul class="kids-groups__features">

                                <li class="kids-groups__feature">${t.day} — ${t.time}</li>

                                <li class="kids-groups__feature">Piscine ${t.pool}</li>

                                <li class="kids-groups__feature" style="${t.taken>=t.total?"color:#ff3333;font-weight:700":"color:#00ffff;font-weight:700"}">

                                  ${t.taken>=t.total?"Groupe Complet":`${t.total-t.taken} place(s) disponible(s)`}

                                </li>

                              </ul>

                            </div>

                        `).join(""):p.innerHTML=`

                            <div style="grid-column:1/-1;text-align:center;padding:2rem;opacity:0.6;">

                              Aucun groupe disponible pour le moment. Contactez-nous via WhatsApp.

                            </div>

                        `}catch(e){console.error("Error fetching schedule dynamically:",e)}}E()});
