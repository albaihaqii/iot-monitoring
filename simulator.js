const URL = "http://localhost:3000/api/readings";

setInterval(async () => {
  const data = {
    device_id: "GH-01",
    suhu: +(25 + Math.random() * 12).toFixed(1), // 25-37 °C
    kelembapan: +(60 + Math.random() * 25).toFixed(1), // 60-85 %
  };

  try {
    const res = await fetch(URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const hasil = await res.json();
    console.log(
      `[${new Date().toLocaleTimeString("id-ID")}] status ${res.status}`,
      data,
      "->",
      hasil.id ? `id ${hasil.id}` : hasil,
    );
  } catch (err) {
    console.error("Gagal mengirim data:", err.message);
  }
}, 5000);
