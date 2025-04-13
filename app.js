/* File: app.js */
const db = openDatabase('SpaDB', '1.0', 'Spa Booking DB', 2 * 1024 * 1024);
db.transaction(tx => {
  tx.executeSql('CREATE TABLE IF NOT EXISTS users (username TEXT PRIMARY KEY, password TEXT)');
  tx.executeSql('CREATE TABLE IF NOT EXISTS bookings (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT, service TEXT, time TEXT, employee TEXT)');
});

function registerUser(e) {
  e.preventDefault();
  const user = document.getElementById('newUsername').value;
  const pass = document.getElementById('newPassword').value;
  db.transaction(tx => {
    tx.executeSql('INSERT INTO users (username, password) VALUES (?, ?)', [user, pass]);
    alert('User registered! Login now.');
    window.location.href = 'login.html';
  });
}

function loginUser(e) {
  e.preventDefault();
  const user = document.getElementById('username').value;
  const pass = document.getElementById('password').value;
  db.transaction(tx => {
    tx.executeSql('SELECT * FROM users WHERE username=? AND password=?', [user, pass], (tx, results) => {
      if (results.rows.length > 0) {
        localStorage.setItem('user', user);
        window.location.href = 'services.html';
      } else {
        alert('Invalid credentials');
      }
    });
  });
}

const services = ["Massage", "Facial", "Manicure"];
const employees = ["Alice", "Bob", "Chloe"];

function loadServices() {
  if (!localStorage.getItem('user')) {
    alert('Login to access services');
    window.location.href = 'login.html';
    return;
  }
  const now = new Date();
  const hour = now.getHours();
  if (hour < 9 || hour >= 22) {
    document.body.innerHTML = '<h2>Services available from 9AM to 10PM only</h2>';
    return;
  }
  let serviceList = document.getElementById('services');
  services.forEach(s => {
    let btn = document.createElement('button');
    btn.textContent = `Book ${s}`;
    btn.onclick = () => {
      document.getElementById('bookingForm').style.display = 'block';
      document.getElementById('bookingForm').dataset.service = s;
      let empSelect = document.getElementById('employeeSelect');
      empSelect.innerHTML = '';
      employees.forEach(emp => {
        let opt = document.createElement('option');
        opt.value = emp; opt.textContent = emp;
        empSelect.appendChild(opt);
      });
    };
    serviceList.appendChild(btn);
  });
}

function bookService(e) {
  e.preventDefault();
  const user = localStorage.getItem('user');
  const service = document.getElementById('bookingForm').dataset.service;
  const time = document.getElementById('bookingTime').value;
  const employee = document.getElementById('employeeSelect').value;

  db.transaction(tx => {
    tx.executeSql('SELECT * FROM bookings WHERE time=? AND employee=?', [time, employee], (tx, results) => {
      if (results.rows.length > 0) {
        alert('Employee is booked at this time. Choose another.');
        return;
      }
      tx.executeSql('SELECT * FROM bookings WHERE username=? AND time=?', [user, time], (tx, res2) => {
        if (res2.rows.length > 0) {
          alert('You already have a service booked at this time.');
          return;
        }
        tx.executeSql('INSERT INTO bookings (username, service, time, employee) VALUES (?, ?, ?, ?)', [user, service, time, employee]);
        alert('Booking successful!');
        localStorage.setItem('invoice', JSON.stringify({ user, service, time, employee }));
        window.location.href = 'invoice.html';
      });
    });
  });
}

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