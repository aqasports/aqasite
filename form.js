const form = document.getElementById("listenForm");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const audioFile = document.getElementById("voiceInput").files[0];
  if (!audioFile) {
    alert("Choisis un fichier !");
    return;
  }

  const formData = new FormData();
  formData.append("file", audioFile);

  try {
    const res = await fetch("http://localhost:3000/upload", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    console.log("✅ Réponse serveur :", data);
    alert("Upload réussi !");
  } catch (err) {
    console.error("❌ Erreur :", err);
    alert("Impossible de contacter le serveur");
  }
});
