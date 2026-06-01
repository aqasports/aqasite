const url = 'http://localhost:4322/api/save-schedule';

async function run() {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ schedule: { foo: "bar" } })
    });
    console.log('Status:', res.status);
    console.log('Body:', await res.text());
  } catch (err) {
    console.error('Error:', err);
  }
}

run();
