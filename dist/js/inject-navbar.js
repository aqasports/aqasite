// js/inject-navbar.js
(async () => {
  try {
    const resp = await fetch("navbar.html");
    if (!resp.ok) throw new Error("Failed to fetch navbar.html: " + resp.status);
    const html = await resp.text();
    document.getElementById("navbar").innerHTML = html;

    // Load navbar.css (if not already linked)
    if (!document.querySelector('link[href="css/navbar.css"]')) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "css/navbar.css";
      document.head.appendChild(link);
    }

    // Load navbar.js
    await new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "js/navbar.js";
      s.onload = resolve;
      s.onerror = reject;
      document.body.appendChild(s);
    });
  } catch (err) {
    console.error("Navbar injection error:", err);
  }
})();
