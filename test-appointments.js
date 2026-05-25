const token = "eyJhbGciOiJIUzM4NCJ9.eyJzdWIiOiJwYXRpZW50QGhlYWx0aC5jb20iLCJyb2xlIjoiUEFUSUVOVCIsImlhdCI6MTc3NjkyMzcwNCwiZXhwIjoxNzc3MDEwMTA0fQ.JrY6i0_hMywkjd8zjitK0vuzT1RIwAMgpMNyCgJpMqwO6tiKWaSyZKLMQhVI1a0g";

fetch('http://localhost:8080/api/appointments/patient/3', {
  headers: { 'Authorization': `Bearer ${token}` }
}).then(async res => {
  console.log("Status:", res.status);
  console.log(await res.text());
}).catch(console.error);
