const express = require("express");
const bodyParser = require("body-parser");
const jwt = require("jsonwebtoken");
const CryptoJS = require("crypto-js");
const speakeasy = require("speakeasy");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());

// In-memory user storage for simplicity
const users = {};

const JWT_SECRET = "your_jwt_secret"; // Replace with your secret key

// Register endpoint
app.post("/register", (req, res) => {
  const { email, password, biometricData } = req.body;
  if (!email || !password || !biometricData)
    return res.status(400).send("Missing required fields");

  const hashedPassword = CryptoJS.SHA256(password).toString();
  const biometricKey = CryptoJS.SHA256(biometricData).toString();
  const totpSecret = speakeasy.generateSecret().base32;

  users[email] = { password: hashedPassword, biometricKey, totpSecret };
  res.status(200).send("User registered successfully");
});

// Login endpoint
app.post("/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).send("Missing required fields");

  const user = users[email];
  if (!user) return res.status(404).send("User not found");

  const hashedPassword = CryptoJS.SHA256(password).toString();
  if (user.password !== hashedPassword)
    return res.status(401).send("Invalid password");

  // Simulate key exchange
  const derivedKey = CryptoJS.PBKDF2(JWT_SECRET, user.biometricKey, {
    keySize: 256 / 32,
  }).toString();
  const token = jwt.sign({ email }, derivedKey, { expiresIn: "1h" });

  res.status(200).json({ token });
});

// Middleware to verify JWT
const verifyToken = (req, res, next) => {
  const token = req.headers["authorization"];
  if (!token) return res.status(403).send("Token is required");

  const { email } = jwt.decode(token);
  const user = users[email];
  const derivedKey = CryptoJS.PBKDF2(JWT_SECRET, user.biometricKey, {
    keySize: 256 / 32,
  }).toString();

  jwt.verify(token, derivedKey, (err, decoded) => {
    if (err) return res.status(401).send("Invalid token");
    req.user = decoded;
    next();
  });
};

// Token refresh endpoint
app.post("/refresh", (req, res) => {
  const { email, totpToken } = req.body;
  if (!email || !totpToken)
    return res.status(400).send("Missing required fields");

  const user = users[email];
  if (!user) return res.status(404).send("User not found");

  const totpValid = speakeasy.totp.verify({
    secret: user.totpSecret,
    encoding: "base32",
    token: totpToken,
  });

  if (!totpValid) return res.status(401).send("Invalid TOTP token");

  // Simulate key exchange
  const derivedKey = CryptoJS.PBKDF2(JWT_SECRET, user.biometricKey, {
    keySize: 256 / 32,
  }).toString();
  const newToken = jwt.sign({ email }, derivedKey, { expiresIn: "1h" });

  res.status(200).json({ token: newToken });
});

// Protected route
app.get("/protected", verifyToken, (req, res) => {
  res
    .status(200)
    .send(`Hello ${req.user.email}, you have accessed a protected route!`);
});

app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
