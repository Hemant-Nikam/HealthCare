const apiKey = "AIzaSyAaR_P8Cesnw3-iOWYUN2FCrT7t4KUNyyk";
const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    contents: [{ role: 'user', parts: [{ text: 'Hello' }] }]
  })
}).then(async res => {
    console.log("Status:", res.status);
    console.log(await res.json());
}).catch(console.error);
