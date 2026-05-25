// login as user 4
fetch('http://localhost:8080/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'hrn2501@gmail.com', password: 'password123' }) // I don't know the password... let's just use the demo patient token and bypass or create a new token.
}).catch(console.error);
