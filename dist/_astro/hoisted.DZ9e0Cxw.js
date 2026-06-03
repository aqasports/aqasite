import"./hoisted.BScVxmeO.js";document.addEventListener("astro:page-load",()=>{const a={threshold:.1,rootMargin:"0px 0px -50px 0px"},c=new IntersectionObserver(e=>{e.forEach(t=>{t.isIntersecting&&(t.target.style.animation="cardAppear 0.8s ease-out forwards")})},a);document.querySelectorAll(".activity-card").forEach((e,t)=>{e.style.animationDelay=`${t*.1+.1}s`,c.observe(e)}),document.querySelectorAll(".activity-card.available").forEach(e=>{e.addEventListener("mousemove",function(t){const n=this.getBoundingClientRect(),o=t.clientX-n.left-n.width/2,i=t.clientY-n.top-n.height/2,l=this.querySelector(".activity-icon img"),m=this.querySelector(".activity-title");l.style.transform=`translate(${o*.05}px, ${i*.05}px) scale(1.1)`,m.style.transform=`translate(${o*.02}px, ${i*.02}px)`}),e.addEventListener("mouseleave",function(){const t=this.querySelector(".activity-icon img"),n=this.querySelector(".activity-title");t.style.transform="",n.style.transform=""}),e.addEventListener("click",function(t){this.querySelector(".activity-title").textContent;const n=document.createElement("div");n.style.cssText=`
                    position: absolute;
                    border-radius: 50%;
                    background: rgba(0, 255, 255, 0.3);
                    transform: scale(0);
                    animation: ripple 0.6s linear;
                    pointer-events: none;
                `;const o=this.getBoundingClientRect(),i=Math.max(o.width,o.height);n.style.width=n.style.height=i+"px",n.style.left=t.clientX-o.left-i/2+"px",n.style.top=t.clientY-o.top-i/2+"px",this.appendChild(n),setTimeout(()=>{n.remove()},600)})}),document.querySelectorAll(".activity-card.coming-soon").forEach(e=>{e.addEventListener("click",function(t){t.preventDefault();const n=this.querySelector(".activity-title").textContent;this.style.animation="shake 0.5s ease-in-out",setTimeout(()=>{this.style.animation=""},500),alert(`⏳ ${n} sera bientôt disponible!

🚀 Restez à l'écoute pour le lancement de cette nouvelle activité.

📧 Inscrivez-vous à notre newsletter pour être informé en premier!`)})});const s=document.createElement("style");s.textContent=`
            @keyframes shake {
                0%, 100% { transform: translateX(0); }
                10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
                20%, 40%, 60%, 80% { transform: translateX(5px); }
            }
            @keyframes ripple {
                0% { transform: scale(0); opacity: 1; }
                100% { transform: scale(2); opacity: 0; }
            }
        `,document.head.appendChild(s);let r=0;if(document.addEventListener("touchend",function(e){const t=new Date().getTime();t-r<=300&&e.preventDefault(),r=t},!1),document.documentElement.style.scrollBehavior="smooth","loading"in HTMLImageElement.prototype)document.querySelectorAll('img[loading="lazy"]').forEach(t=>{t.src=t.src});else{const e=document.createElement("script");e.src="https://polyfill.io/v3/polyfill.min.js?features=IntersectionObserver",document.head.appendChild(e)}});
