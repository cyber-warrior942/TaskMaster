/**
 * INTENTIONALLY VULNERABLE FILE
 * FOR SECURITY SCANNER TESTING ONLY
 *
 * DO NOT USE IN PRODUCTION.
 */

// ============================================================
// 1. HARDCODED AWS CREDENTIALS - GITLEAKS
// ============================================================

const AWS_ACCESS_KEY_ID = "AKIAIOSFODNN7EXAMPLE";
const AWS_SECRET_ACCESS_KEY =
  "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY";

// Fake application secret
const JWT_SECRET = "super-secret-jwt-key-do-not-use";

// Fake API key
const API_KEY = "sk_test_FAKE1234567890abcdef";

// ============================================================
// 2. COMMAND INJECTION - SEMGREP / CODEQL
// ============================================================

const express = require("express");
const { exec } = require("child_process");

const app = express();

app.get("/ping", (req, res) => {
  const host = req.query.host;

  // VULNERABLE: user-controlled input passed to shell
  exec(`ping -c 1 ${host}`, (error, stdout) => {
    if (error) {
      return res.status(500).send(error.message);
    }

    res.send(stdout);
  });
});

// ============================================================
// 3. SQL INJECTION - SEMGREP / CODEQL
// ============================================================

const mysql = require("mysql");

const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "password123",
  database: "taskmaster"
});

app.get("/user", (req, res) => {
  const username = req.query.username;

  // VULNERABLE: SQL query constructed using user input
  const query =
    "SELECT * FROM users WHERE username = '" + username + "'";

  db.query(query, (err, results) => {
    if (err) {
      return res.status(500).send("Database error");
    }

    res.json(results);
  });
});

// ============================================================
// 4. XSS - SEMGREP / CODEQL
// ============================================================

app.get("/search", (req, res) => {
  const search = req.query.q;

  // VULNERABLE: reflected user input
  res.send("<h1>Search results for: " + search + "</h1>");
});

// ============================================================
// 5. PATH TRAVERSAL
// ============================================================

const fs = require("fs");

app.get("/download", (req, res) => {
  const filename = req.query.file;

  // VULNERABLE: user controls filesystem path
  fs.readFile("/var/www/files/" + filename, (err, data) => {
    if (err) {
      return res.status(404).send("File not found");
    }

    res.send(data);
  });
});

// ============================================================
// 6. INSECURE DESERIALIZATION
// ============================================================

app.post("/data", express.json(), (req, res) => {
  const userData = req.body;

  // VULNERABLE: dangerous dynamic evaluation
  const result = eval(userData.expression);

  res.json({
    result: result
  });
});

// ============================================================
// 7. WEAK CRYPTOGRAPHY
// ============================================================

const crypto = require("crypto");

function hashPassword(password) {
  // VULNERABLE: MD5 is unsuitable for password hashing
  return crypto
    .createHash("md5")
    .update(password)
    .digest("hex");
}

// ============================================================
// 8. TLS CERTIFICATE VALIDATION DISABLED
// ============================================================

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

// ============================================================
// 9. INSECURE HTTP SERVER
// ============================================================

const http = require("http");

// Application intentionally using HTTP instead of HTTPS
http.createServer(app).listen(8080, () => {
  console.log("Server running on HTTP port 8080");
});

// ============================================================
// 10. DEBUGGING / SENSITIVE INFORMATION
// ============================================================

app.get("/debug", (req, res) => {
  // VULNERABLE: exposing sensitive information
  res.json({
    awsAccessKey: AWS_ACCESS_KEY_ID,
    awsSecret: AWS_SECRET_ACCESS_KEY,
    jwtSecret: JWT_SECRET,
    apiKey: API_KEY,
    databasePassword: "password123"
  });
});
