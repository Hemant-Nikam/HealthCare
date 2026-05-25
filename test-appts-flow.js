const token = "eyJhbGciOiJIUzM4NCJ9.eyJzdWIiOiJwYXRpZW50QGhlYWx0aC5jb20iLCJyb2xlIjoiUEFUSUVOVCIsImlhdCI6MTc3NjkyMzcwNCwiZXhwIjoxNzc3MDEwMTA0fQ.JrY6i0_hMywkjd8zjitK0vuzT1RIwAMgpMNyCgJpMqwO6tiKWaSyZKLMQhVI1a0g";

(async () => {
    try {
        // Book an appointment
        const resBook = await fetch('http://localhost:8080/api/appointments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({
                patientId: 3,
                doctorId: 2,
                appointmentDate: '2027-01-01',
                appointmentTime: '10:00:00',
                reason: 'Test Appointment'
            })
        });
        console.log("Book Status:", resBook.status);
        console.log("Booked Appt:", await resBook.text());

        // Fetch appointments
        const resFetch = await fetch('http://localhost:8080/api/appointments/patient/3', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        console.log("Fetch Status:", resFetch.status);
        console.log("Fetched Appts:", await resFetch.text());
    } catch (e) {
        console.error(e);
    }
})();
