# 🏥 Smart Healthcare Platform v2

A full-stack Healthcare Web Application with AI integration, built with React + Spring Boot + MySQL.

---

## 🗂 Project Structure

```
healthcare-platform/
├── frontend/          # React app (Vite)
├── backend/           # Spring Boot REST API
└── README.md
```

---

## ⚙️ Prerequisites

- Node.js >= 18
- Java 17+
- Maven 3.8+
- MySQL 8+
- Google Gemini API Key (free): https://aistudio.google.com/
- Google Maps API Key (free credits): https://console.cloud.google.com/

---

## 🚀 Quick Start

### 1. Database Setup

```sql
CREATE DATABASE healthcare_db;
-- Then run: backend/src/main/resources/schema.sql
```

### 2. Backend (Spring Boot)

```bash
cd backend
# Edit src/main/resources/application.properties with your DB & API keys
mvn spring-boot:run
# Runs on http://localhost:8080
```

### 3. Frontend (React)

```bash
cd frontend
npm install
# Edit .env with your API keys
npm run dev
# Runs on http://localhost:5173
```

---

## 🔑 Default Credentials (after seeding)

| Role    | Email                  | Password  |
|---------|------------------------|-----------|
| Admin   | admin@health.com       | admin123  |
| Doctor  | doctor@health.com      | doctor123 |
| Patient | patient@health.com     | patient123|

---

## 📦 Key Features

- ✅ JWT Authentication with Role-Based Access
- ✅ Patient Dashboard (appointments, health score, chatbot)
- ✅ Doctor Dashboard (patients, prescriptions, appointments)
- ✅ Admin Panel (user management, stats)
- ✅ AI Chatbot + Symptom Checker (Google Gemini)
- ✅ E-Prescription with PDF export
- ✅ Health Analytics with Chart.js
- ✅ Hospital Finder (Google Maps)
- ✅ Medicine Reminders + Browser Notifications
- ✅ Voice Input (Web Speech API)
- ✅ Emergency Page (public access)
- ✅ Report Upload & Analysis

---

## 🔌 API Keys Setup

### Frontend `.env`
```
VITE_GEMINI_API_KEY=your_gemini_key_here
VITE_GOOGLE_MAPS_KEY=your_maps_key_here
VITE_API_BASE_URL=http://localhost:8080/api
```

### Backend `application.properties`
```
gemini.api.key=your_gemini_key_here
spring.datasource.url=jdbc:mysql://localhost:3306/healthcare_db
spring.datasource.username=root
spring.datasource.password=yourpassword
```

---

## 🏗 Tech Stack

| Layer      | Technology                          |
|------------|-------------------------------------|
| Frontend   | React 18, Vite, Chart.js, Axios    |
| Backend    | Spring Boot 3, Spring Security, JWT |
| Database   | MySQL 8                             |
| AI         | Google Gemini API (free tier)       |
| Maps       | Google Maps JavaScript API          |
| PDF        | jsPDF (frontend)                    |
| Auth       | JWT + BCrypt                        |
