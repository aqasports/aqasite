import"./hoisted.BScVxmeO.js";const l={threshold:.1,rootMargin:"0px 0px -50px 0px"},u=new IntersectionObserver(e=>{e.forEach(t=>{t.isIntersecting&&t.target.classList.add("animate")})},l);document.querySelectorAll(".animate-on-scroll").forEach(e=>{u.observe(e)});const c=document.getElementById("tickerTrack"),o=document.getElementById("tickerContainer"),r=document.getElementById("scorePopup"),d=c.querySelectorAll(".badge");d.forEach(e=>{e.addEventListener("click",t=>{const n=e.getBoundingClientRect();r.style.left=n.left+n.width/2+"px",r.style.top=n.top+"px",r.textContent=e.dataset.score||"",r.style.display="block",setTimeout(()=>r.style.display="none",2e3)})});function i(){c.classList.add("paused")}function s(){c.classList.remove("paused")}o.addEventListener("mouseenter",i);o.addEventListener("mouseleave",s);o.addEventListener("touchstart",i,{passive:!0});o.addEventListener("touchend",()=>{setTimeout(s,100)},{passive:!0});o.addEventListener("pointerdown",i,{passive:!0});o.addEventListener("pointerup",()=>{setTimeout(s,120)},{passive:!0});d.forEach(e=>{e.addEventListener("focus",i),e.addEventListener("blur",s),e.setAttribute("tabindex","0")});let a=0;document.addEventListener("touchend",function(e){const t=new Date().getTime();t-a<=300&&e.preventDefault(),a=t},!1);document.querySelectorAll('a[href^="#"]').forEach(e=>{e.addEventListener("click",function(t){t.preventDefault();const n=document.querySelector(this.getAttribute("href"));n&&n.scrollIntoView({behavior:"smooth",block:"start"})})});document.getElementById("scrollToDownload").addEventListener("click",()=>{const e=document.querySelector(".final-cta");e&&e.scrollIntoView({behavior:"smooth",block:"start"})});"serviceWorker"in navigator&&document.addEventListener("astro:page-load",function(){const e=document.createElement("div");e.style.cssText=`
                    position: fixed;
                    bottom: 20px;
                    left: 20px;
                    right: 20px;
                    background: linear-gradient(135deg, #0099ff, #00ffff);
                    color: #000;
                    padding: 1rem;
                    border-radius: 15px;
                    font-weight: 600;
                    text-align: center;
                    display: none;
                    z-index: 1000;
                    animation: slideIn 0.5s ease-out;
                `,e.innerHTML=`
                    📱 Ajoute AQA à ton écran d'accueil pour un accès rapide !
                    <button onclick="this.parentElement.style.display='none'" style="margin-left: 10px; background: rgba(0,0,0,0.2); border: none; color: #000; padding: 5px 10px; border-radius: 5px; cursor: pointer;">×</button>
                `,window.innerWidth<=768&&setTimeout(()=>{document.body.appendChild(e),e.style.display="block"},3e3)});
