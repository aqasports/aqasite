import"./hoisted.BScVxmeO.js";const l={threshold:.1,rootMargin:"0px 0px -50px 0px"},m=new IntersectionObserver(e=>{e.forEach(t=>{t.isIntersecting&&(t.target.style.animation="cardAppear 0.8s ease-out forwards")})},l);document.querySelectorAll(".activity-card").forEach((e,t)=>{e.style.animationDelay=`${t*.1+.1}s`,m.observe(e)});document.querySelectorAll(".activity-card.available").forEach(e=>{e.addEventListener("mousemove",function(t){const n=this.getBoundingClientRect(),i=t.clientX-n.left-n.width/2,o=t.clientY-n.top-n.height/2,a=this.querySelector(".activity-icon img"),c=this.querySelector(".activity-title");a.style.transform=`translate(${i*.05}px, ${o*.05}px) scale(1.1)`,c.style.transform=`translate(${i*.02}px, ${o*.02}px)`}),e.addEventListener("mouseleave",function(){const t=this.querySelector(".activity-icon img"),n=this.querySelector(".activity-title");t.style.transform="",n.style.transform=""}),e.addEventListener("click",function(t){this.querySelector(".activity-title").textContent;const n=document.createElement("div");n.style.cssText=`
                    position: absolute;
                    border-radius: 50%;
                    background: rgba(0, 255, 255, 0.3);
                    transform: scale(0);
                    animation: ripple 0.6s linear;
                    pointer-events: none;
                `;const i=this.getBoundingClientRect(),o=Math.max(i.width,i.height);n.style.width=n.style.height=o+"px",n.style.left=t.clientX-i.left-o/2+"px",n.style.top=t.clientY-i.top-o/2+"px",this.appendChild(n),setTimeout(()=>{n.remove()},600)})});document.querySelectorAll(".activity-card.coming-soon").forEach(e=>{e.addEventListener("click",function(t){t.preventDefault();const n=this.querySelector(".activity-title").textContent;this.style.animation="shake 0.5s ease-in-out",setTimeout(()=>{this.style.animation=""},500),alert(`⏳ ${n} sera bientôt disponible!

🚀 Restez à l'écoute pour le lancement de cette nouvelle activité.

📧 Inscrivez-vous à notre newsletter pour être informé en premier!`)})});const r=document.createElement("style");r.textContent=`
            @keyframes shake {
                0%, 100% { transform: translateX(0); }
                10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
                20%, 40%, 60%, 80% { transform: translateX(5px); }
            }
            @keyframes ripple {
                0% { transform: scale(0); opacity: 1; }
                100% { transform: scale(2); opacity: 0; }
            }
        `;document.head.appendChild(r);let s=0;document.addEventListener("touchend",function(e){const t=new Date().getTime();t-s<=300&&e.preventDefault(),s=t},!1);document.documentElement.style.scrollBehavior="smooth";if("loading"in HTMLImageElement.prototype)document.querySelectorAll('img[loading="lazy"]').forEach(t=>{t.src=t.src});else{const e=document.createElement("script");e.src="https://polyfill.io/v3/polyfill.min.js?features=IntersectionObserver",document.head.appendChild(e)}
