fetch('http://localhost:8080/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'patient@health.com', password: 'patient123' })
}).then(async res => {
  console.log("Status:", res.status);
  console.log(await res.text());
}).catch(console.error);
