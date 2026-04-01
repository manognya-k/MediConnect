# Hospital Management System - Backend

Spring Boot backend for Hospital Management System with Angular frontend.

## Technologies Used
- Java 17
- Spring Boot 3.2.0
- Spring Data JPA
- Spring Security
- MySQL 8
- Lombok
- JWT Authentication

## Database Setup

1. Create MySQL database:
```sql
CREATE DATABASE hospital_db;
```

2. Update database credentials in `src/main/resources/application.properties`:
```properties
spring.datasource.url=jdbc:mysql://localhost:3306/hospital_db
spring.datasource.username=your_username
spring.datasource.password=your_password
```

## Build and Run

1. Build the project:
```bash
mvn clean install
```

2. Run the application:
```bash
mvn spring-boot:run
```

The application will start on `http://localhost:8080`

## API Endpoints

### Authentication
- POST `/api/auth/register` - Register new user
- POST `/api/auth/login` - User login

### Hospitals
- GET `/api/hospitals` - Get all hospitals
- GET `/api/hospitals/{id}` - Get hospital by ID
- POST `/api/hospitals` - Create hospital
- PUT `/api/hospitals/{id}` - Update hospital
- DELETE `/api/hospitals/{id}` - Delete hospital

### Doctors
- GET `/api/doctors` - Get all doctors
- GET `/api/doctors/{id}` - Get doctor by ID
- GET `/api/doctors/hospital/{hospitalId}` - Get doctors by hospital
- GET `/api/doctors/specialization/{specialization}` - Get doctors by specialization
- POST `/api/doctors` - Create doctor
- PUT `/api/doctors/{id}` - Update doctor
- DELETE `/api/doctors/{id}` - Delete doctor

### Patients
- GET `/api/patients` - Get all patients
- GET `/api/patients/{id}` - Get patient by ID
- POST `/api/patients` - Create patient
- PUT `/api/patients/{id}` - Update patient
- DELETE `/api/patients/{id}` - Delete patient

### Appointments
- GET `/api/appointments` - Get all appointments
- GET `/api/appointments/{id}` - Get appointment by ID
- GET `/api/appointments/patient/{patientId}` - Get appointments by patient
- GET `/api/appointments/doctor/{doctorId}` - Get appointments by doctor
- POST `/api/appointments` - Create appointment
- PUT `/api/appointments/{id}` - Update appointment
- DELETE `/api/appointments/{id}` - Delete appointment

### Medical Records
- GET `/api/medical-records` - Get all records
- GET `/api/medical-records/{id}` - Get record by ID
- GET `/api/medical-records/patient/{patientId}` - Get records by patient
- POST `/api/medical-records` - Create record
- PUT `/api/medical-records/{id}` - Update record
- DELETE `/api/medical-records/{id}` - Delete record

### Lab Reports
- GET `/api/lab-reports` - Get all reports
- GET `/api/lab-reports/{id}` - Get report by ID
- GET `/api/lab-reports/patient/{patientId}` - Get reports by patient
- POST `/api/lab-reports` - Create report
- PUT `/api/lab-reports/{id}` - Update report
- DELETE `/api/lab-reports/{id}` - Delete report

### Beds
- GET `/api/beds` - Get all beds
- GET `/api/beds/{id}` - Get bed by ID
- GET `/api/beds/hospital/{hospitalId}` - Get beds by hospital
- GET `/api/beds/status/{status}` - Get beds by status
- POST `/api/beds` - Create bed
- PUT `/api/beds/{id}` - Update bed
- DELETE `/api/beds/{id}` - Delete bed

### Inventory
- GET `/api/inventory` - Get all inventory
- GET `/api/inventory/hospital/{hospitalId}` - Get inventory by hospital
- POST `/api/inventory` - Create inventory item
- PUT `/api/inventory/{id}` - Update inventory item
- DELETE `/api/inventory/{id}` - Delete inventory item

### Notifications
- GET `/api/notifications/user/{userId}` - Get notifications by user
- GET `/api/notifications/user/{userId}/unread` - Get unread notifications
- POST `/api/notifications` - Create notification
- PUT `/api/notifications/{id}` - Update notification
- DELETE `/api/notifications/{id}` - Delete notification

## Project Structure
```
src/main/java/com/cts/mfrp/
├── config/          # Configuration classes
├── controller/      # REST Controllers
├── dto/            # Data Transfer Objects
├── entity/         # JPA Entities
├── repository/     # JPA Repositories
└── service/        # Business Logic Services
```

## CORS Configuration
The backend is configured to accept requests from `http://localhost:4200` (Angular default port).
