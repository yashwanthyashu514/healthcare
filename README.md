# Smart Emergency QR Health – Emergency Medical Identity System

🚑 **Save lives by enabling doctors to instantly access critical patient health data during emergencies using a QR Code.**

---

## 📋 Table of Contents
- [Features](#features)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Setup Instructions](#setup-instructions)
- [Test Credentials](#test-credentials)
- [API Documentation](#api-documentation)
- [Deployment](#deployment)

---

## ✨ Features

### Admin Portal (Protected)
- ✅ Secure JWT authentication with bcrypt password hashing
- ✅ Dashboard with real-time statistics (Total Patients, Risk Level Counts)
- ✅ Complete Patient CRUD operations
- ✅ Automatic QR code generation for each patient
- ✅ Downloadable QR codes for printing
- ✅ Multi-field patient records (allergies, conditions, medications)
- ✅ Emergency contact management

### Public Emergency Page
- ✅ Instant access without login via QR scan
- ✅ Critical patient information display
- ✅ Color-coded risk level badges (High/Medium/Low)
- ✅ One-tap emergency contact calling
- ✅ Fully responsive mobile design

---

## 🛠 Technology Stack

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (jsonwebtoken)
- **Security**: bcrypt for password hashing
- **QR Generation**: qrcode npm library
- **Environment**: dotenv
- **Middleware**: CORS enabled, error handling

### Frontend
- **Framework**: React 18
- **Build Tool**: Vite
- **Routing**: React Router v6
- **Styling**: Tailwind CSS
- **HTTP Client**: Axios
- **Notifications**: React Hot Toast
- **State Management**: Context API

---

## 📁 Project Structure

```
smart-emergency-qr/
├── server/                    # Backend
│   ├── config/
│   │   └── db.js             # MongoDB connection
│   ├── middleware/
│   │   ├── auth.js           # JWT authentication
│   │   └── errorHandler.js   # Global error handling
│   ├── models/
│   │   ├── Admin.js          # Admin schema
│   │   └── Patient.js        # Patient schema
│   ├── routes/
│   │   ├── auth.js           # Auth routes
│   │   ├── patients.js       # Patient CRUD routes
│   │   └── public.js         # Public emergency route
│   ├── uploads/              # QR code images storage
│   ├── .env                  # Environment variables
│   ├── .env.example          # Environment template
│   ├── server.js             # Server entry point
│   └── package.json
│
├── client/                    # Frontend
│   ├── public/
│   ├── src/
│   │   ├── api/
│   │   │   └── axios.js      # Axios configuration
│   │   ├── components/
│   │   │   ├── Navbar.jsx
│   │   │   ├── Sidebar.jsx
│   │   │   ├── StatsCard.jsx
│   │   │   └── ProtectedRoute.jsx
│   │   ├── context/
│   │   │   └── AuthContext.jsx
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── PatientList.jsx
│   │   │   ├── PatientForm.jsx
│   │   │   ├── PatientDetail.jsx
│   │   │   └── EmergencyPage.jsx
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── index.html
│   ├── tailwind.config.js
│   ├── vite.config.js
│   └── package.json
│
└── README.md
```

---

## 🚀 Setup Instructions

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (local installation or MongoDB Atlas account)
- npm or yarn

### Backend Setup

1. **Navigate to server directory**
   ```bash
   cd server
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   # Copy the example file
   cp .env.example .env
   
   # Edit .env with your settings
   ```
   
   Required variables:
   ```env
   PORT=5000
   MONGO_URI=mongodb://localhost:27017/emergency-qr
   JWT_SECRET=your_super_secret_jwt_key_change_in_production
   ```

4. **Start the backend server**
   ```bash
   # Development mode with nodemon
   npm run dev
   
   # OR production mode
   npm start
   ```
   
   Backend will run on `http://localhost:5000`

### Frontend Setup

1. **Navigate to client directory**
   ```bash
   cd client
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```
   
   Frontend will run on `http://localhost:5173`

### First-Time Admin Registration

Use an API client (Postman/Insomnia) or create via MongoDB directly:

```bash
POST http://localhost:5000/api/auth/register
Content-Type: application/json

{
  "email": "admin@emergency.com",
  "password": "admin123"
}
```

---

## 🔐 Test Credentials

**Admin Login**
- Email: `admin@emergency.com`
- Password: `admin123`

> **⚠️ IMPORTANT**: Change these credentials in production!

---

## 📡 API Documentation

### Authentication Endpoints

#### Register Admin
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "admin@emergency.com",
  "password": "admin123"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@emergency.com",
  "password": "admin123"
}

Response:
{
  "token": "jwt_token_here",
  "admin": { "id": "...", "email": "..." }
}
```

### Patient Endpoints (Protected - Requires JWT)

#### Get All Patients
```http
GET /api/patients
Authorization: Bearer <token>
```

#### Get Single Patient
```http
GET /api/patients/:id
Authorization: Bearer <token>
```

#### Create Patient
```http
POST /api/patients
Authorization: Bearer <token>
Content-Type: application/json

{
  "fullName": "John Doe",
  "age": 45,
  "gender": "Male",
  "photoUrl": "https://example.com/photo.jpg",
  "bloodGroup": "O+",
  "allergies": ["Penicillin", "Peanuts"],
  "medicalConditions": ["Diabetes", "Hypertension"],
  "medications": ["Metformin", "Lisinopril"],
  "emergencyContact": {
    "name": "Jane Doe",
    "phone": "+919876543210"
  },
  "riskLevel": "High"
}
```

#### Update Patient
```http
PUT /api/patients/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "fullName": "John Doe Updated",
  ...
}
```

#### Delete Patient
```http
DELETE /api/patients/:id
Authorization: Bearer <token>
```

### Public Endpoint (No Authentication)

#### Get Patient by QR Token
```http
GET /api/public/patient/:token

Response:
{
  "patient": {
    "fullName": "John Doe",
    "age": 45,
    "gender": "Male",
    "bloodGroup": "O+",
    "allergies": ["Penicillin"],
    "medicalConditions": ["Diabetes"],
    "medications": ["Metformin"],
    "emergencyContact": {
      "name": "Jane Doe",
      "phone": "+919876543210"
    },
    "riskLevel": "High"
  }
}
```

---

## 🌐 Deployment

### Backend Deployment (e.g., Render, Railway, Heroku)

1. **Set environment variables** on your hosting platform:
   ```
   PORT=5000
   MONGO_URI=<your_mongodb_atlas_uri>
   JWT_SECRET=<strong_random_secret>
   NODE_ENV=production
   ```

2. **Deploy commands**:
   ```bash
   npm install
   npm start
   ```

### Frontend Deployment (e.g., Vercel, Netlify)

1. **Update API base URL** in `client/src/api/axios.js`:
   ```javascript
   baseURL: 'https://your-backend-url.com/api'
   ```

2. **Build the project**:
   ```bash
   npm run build
   ```

3. **Deploy the `dist` folder** to your hosting platform

### MongoDB Setup (Production)

1. Create a MongoDB Atlas account at https://www.mongodb.com/cloud/atlas
2. Create a new cluster
3. Set up database access (username/password)
4. Whitelist your application's IP or use 0.0.0.0/0 for all IPs
5. Get your connection string and update `MONGO_URI`

---

## 🎨 Design Features

- **Color Scheme**:
  - Primary: Emergency Red (#E53935)
  - Secondary: Healthcare Blue (#1E88E5)
  - Success: Green (#4CAF50)
  - Warning: Yellow (#FFC107)
  
- **Risk Level Badges**:
  - HIGH → Red badge with alert icon
  - MEDIUM → Yellow badge
  - LOW → Green badge

- **Responsive Design**: Optimized for mobile emergency access

- **Glassmorphism**: Modern card designs with subtle shadows

- **Toast Notifications**: User-friendly feedback for all actions

---

## 🔒 Security Features

- ✅ JWT-based authentication
- ✅ Bcrypt password hashing (10 salt rounds)
- ✅ Protected API routes
- ✅ CORS configuration
- ✅ Environment variable protection
- ✅ Input validation
- ✅ Error handling middleware

---

## 📝 License

This project is open source and available for medical and educational purposes.

---

## 👨‍⚕️ Support

For emergency medical systems implementation or support, contact your system administrator.

**Remember**: This system is designed to assist medical professionals during emergencies. Always verify critical information through multiple sources.

---

**Built with ❤️ for saving lives**
