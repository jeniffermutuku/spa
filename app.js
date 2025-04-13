// Open database
const db = openDatabase('SpaDB.sqlite3', '1.0', 'Spa Booking DB', 2 * 1024 * 1024);

// Sample data
const services = [
  { name: "Swedish Massage", description: "", price: 60 },
  { name: "Deep Tissue Massage", description: "", price: 80 },
  { name: "Hot Stone Therapy", description: "", price: 75 },
  { name: "Aromatherapy Facial", description: "", price: 65 },
  { name: "Hydrating Body Wrap", description: "", price: 70 },
  { name: "Reflexology", description: "", price: 50 },
  { name: "Scalp & Head Massage", description: "", price: 40 },
  { name: "Couples Massage", description: "", price: 120 }
];

const employees = ["Alice", "Bob", "Chloe", "David", "Eve"];

// Initialize tables and insert data if not exists
db.transaction(tx => {
  tx.executeSql('CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE NOT NULL, password TEXT NOT NULL)');
  tx.executeSql('CREATE TABLE IF NOT EXISTS services (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL)');
  tx.executeSql('CREATE TABLE IF NOT EXISTS employees (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL)');
  tx.executeSql('CREATE TABLE IF NOT EXISTS bookings (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, service_id INTEGER NOT NULL, employee_id INTEGER NOT NULL, start_time TEXT NOT NULL, end_time TEXT NOT NULL, FOREIGN KEY(user_id) REFERENCES users(id), FOREIGN KEY(service_id) REFERENCES services(id), FOREIGN KEY(employee_id) REFERENCES employees(id))');

  // Insert services and employees if not present
  services.forEach(service => {
    tx.executeSql('INSERT OR IGNORE INTO services (name) VALUES (?)', [service.name]);
  });

  employees.forEach(name => {
    tx.executeSql('INSERT OR IGNORE INTO employees (name) VALUES (?)', [name]);
  });
});

// Register a new user
function registerUser(e) {
  e.preventDefault();
  const user = document.getElementById('newUsername').value;
  const pass = document.getElementById('newPassword').value;

  db.transaction(tx => {
    tx.executeSql('INSERT INTO users (username, password) VALUES (?, ?)', [user, pass],
      () => {
        alert('User registered! Please login.');
        window.location.href = 'login.html';
      },
      (tx, error) => {
        alert('Registration failed. User might already exist.');
      }
    );
  });
}

// Login a user
function loginUser(e) {
  e.preventDefault();
  const user = document.getElementById('username').value;
  const pass = document.getElementById('password').value;

  db.transaction(tx => {
    tx.executeSql('SELECT * FROM users WHERE username=? AND password=?', [user, pass], (tx, results) => {
      if (results.rows.length > 0) {
        localStorage.setItem('user', JSON.stringify(results.rows.item(0)));
        window.location.href = 'services.html';
      } else {
        alert('Invalid credentials');
      }
    });
  });
}

// Book a service
function bookService(e) {
  e.preventDefault();

  const user = JSON.parse(localStorage.getItem('user'));
  const serviceName = document.getElementById('service').value;
  const employeeName = document.getElementById('employee').value;
  const startTime = document.getElementById('start-time').value;
  const endTime = new Date(new Date(startTime).getTime() + 60 * 60000).toISOString(); // 1 hour later

  db.transaction(tx => {
    // Get service ID
    tx.executeSql('SELECT id FROM services WHERE name=?', [serviceName], (tx, res1) => {
      const serviceId = res1.rows.item(0).id;

      // Get employee ID
      tx.executeSql('SELECT id FROM employees WHERE name=?', [employeeName], (tx, res2) => {
        const employeeId = res2.rows.item(0).id;

        // Check for booking conflicts
        tx.executeSql('SELECT * FROM bookings WHERE start_time=? AND employee_id=?', [startTime, employeeId], (tx, check) => {
          if (check.rows.length > 0) {
            alert('This employee is already booked at this time.');
            return;
          }

          // Insert booking
          tx.executeSql(
            'INSERT INTO bookings (user_id, service_id, employee_id, start_time, end_time) VALUES (?, ?, ?, ?, ?)',
            [user.id, serviceId, employeeId, startTime, endTime],
            () => {
              alert('Booking successful!');
              localStorage.setItem('invoice', JSON.stringify({ user: user.username, service: serviceName, time: startTime, employee: employeeName }));
              location.reload();
            }
          );
        });
      });
    });
  });
}

// Load data into dropdowns
document.addEventListener('DOMContentLoaded', () => {
  if (!localStorage.getItem('user')) {
    window.location.href = 'login.html';
    return;
  }

  const serviceDropdown = document.getElementById('service');
  const employeeDropdown = document.getElementById('employee');

  db.transaction(tx => {
    tx.executeSql('SELECT * FROM services', [], (tx, results) => {
      for (let i = 0; i < results.rows.length; i++) {
        const row = results.rows.item(i);
        const option = document.createElement('option');
        option.value = row.name;
        option.textContent = row.name;
        serviceDropdown.appendChild(option);
      }
    });

    tx.executeSql('SELECT * FROM employees', [], (tx, results) => {
      for (let i = 0; i < results.rows.length; i++) {
        const row = results.rows.item(i);
        const option = document.createElement('option');
        option.value = row.name;
        option.textContent = row.name;
        employeeDropdown.appendChild(option);
      }
    });
  });

  // Bind booking
  const bookingForm = document.getElementById('booking-form');
  if (bookingForm) {
    bookingForm.addEventListener('submit', bookService);
  }

  // Show invoice
  const invoiceData = localStorage.getItem('invoice');
  if (invoiceData) {
    const invoice = JSON.parse(invoiceData);
    const invoiceDetails = document.getElementById('invoice-details');
    invoiceDetails.innerText = `Invoice for ${invoice.user}\nService: ${invoice.service}\nTime: ${invoice.time}\nWith: ${invoice.employee}`;
    document.getElementById('invoice').style.display = 'block';
  }
});

// Download invoice
function downloadInvoice() {
  const invoice = JSON.parse(localStorage.getItem('invoice'));
  const content = `Invoice for ${invoice.user}\nService: ${invoice.service}\nTime: ${invoice.time}\nWith: ${invoice.employee}`;
  const blob = new Blob([content], { type: 'text/plain' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'invoice.txt';
  link.click();
  alert('Invoice downloaded!');
  localStorage.removeItem('invoice');
}
