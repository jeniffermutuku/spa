let db;

const request = indexedDB.open("SpaDB", 1);

// This will execute when the database is successfully opened
request.onsuccess = function(event) {
  db = event.target.result;
  console.log("Database initialized");
};

// This is triggered if we need to create or update the database
request.onupgradeneeded = function(event) {
  db = event.target.result;

  // Create object stores with indexes
  if (!db.objectStoreNames.contains("users")) {
    db.createObjectStore("users", { keyPath: "username" });
  }
  
  if (!db.objectStoreNames.contains("services")) {
    const serviceStore = db.createObjectStore("services", { keyPath: "id", autoIncrement: true });
    serviceStore.createIndex("name", "name", { unique: true });
  }

  if (!db.objectStoreNames.contains("employees")) {
    const employeeStore = db.createObjectStore("employees", { keyPath: "id", autoIncrement: true });
    employeeStore.createIndex("name", "name", { unique: true });
  }

  if (!db.objectStoreNames.contains("bookings")) {
    const bookingStore = db.createObjectStore("bookings", { keyPath: "id", autoIncrement: true });
    bookingStore.createIndex("start_time", "start_time", { unique: false });
  }

  // Sample data for services and employees
  const services = [
    { name: "Swedish Massage", price: 60 },
    { name: "Deep Tissue Massage", price: 80 },
    { name: "Hot Stone Therapy", price: 75 },
    { name: "Aromatherapy Facial", price: 65 },
    { name: "Hydrating Body Wrap", price: 70 },
    { name: "Reflexology", price: 50 },
    { name: "Scalp & Head Massage", price: 40 },
    { name: "Couples Massage", price: 120 }
  ];

  const employees = ["Alice", "Bob", "Chloe", "David", "Eve"];

  const transaction = db.transaction(["services", "employees"], "readwrite");

  const serviceStore = transaction.objectStore("services");
  services.forEach(service => {
    serviceStore.add({ name: service.name, price: service.price });
  });

  const employeeStore = transaction.objectStore("employees");
  employees.forEach(employee => {
    employeeStore.add({ name: employee });
  });
};

// Book a service
function bookService(e) {
  e.preventDefault();

  const user = JSON.parse(localStorage.getItem('user'));
  const serviceName = document.getElementById('service').value;
  const employeeName = document.getElementById('employee').value;
  const startTime = document.getElementById('start-time').value;
  const endTime = new Date(new Date(startTime).getTime() + 60 * 60000).toISOString(); // 1 hour later

  const transaction = db.transaction(["services", "employees", "bookings"], "readwrite");
  const serviceStore = transaction.objectStore("services");
  const employeeStore = transaction.objectStore("employees");
  const bookingStore = transaction.objectStore("bookings");

  // Get service ID
  const serviceRequest = serviceStore.index("name").get(serviceName);
  
  serviceRequest.onsuccess = function(event) {
    const serviceResult = event.target.result;
    if (!serviceResult) {
      alert('Service not found.');
      return;
    };

    const serviceId = serviceResult.id;

    // Get employee ID
    const employeeRequest = employeeStore.index("name").get(employeeName);

    employeeRequest.onsuccess = function(event) {
      const employeeResult = event.target.result;
      if (!employeeResult) {
        alert('Employee not found.');
        return;
      }

      const employeeId = employeeResult.id;

      // Check for booking conflicts
      const bookingConflictRequest = bookingStore.index("start_time").getAll(startTime);

      bookingConflictRequest.onsuccess = function(event) {
        const existingBookings = event.target.result;
        if (existingBookings.some(booking => booking.employee_id === employeeId)) {
          alert('This employee is already booked at this time.');
          return;
        };

        // Insert booking
        const newBooking = {
          user_id: user.username,
          service_id: serviceId,
          employee_id: employeeId,
          start_time: startTime,
          end_time: endTime
        };

        const bookingAddRequest = bookingStore.add(newBooking);

        bookingAddRequest.onsuccess = function() {
          alert('Booking successful!');
          localStorage.setItem('invoice', JSON.stringify({ user: user.username, service: serviceName, time: startTime, employee: employeeName }));
          location.reload();
        };

        bookingAddRequest.onerror = function() {
          alert('Booking failed.');
        };
      };
    };
  };
}
