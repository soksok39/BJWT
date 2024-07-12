async function loadModels() {
  await faceapi.nets.tinyFaceDetector.loadFromUri("/models");
  await faceapi.nets.faceLandmark68Net.loadFromUri("/models");
  await faceapi.nets.faceRecognitionNet.loadFromUri("/models");
}

function getFaceDescriptor(videoElement) {
  return faceapi
    .detectSingleFace(videoElement, new faceapi.TinyFaceDetectorOptions())
    .withFaceLandmarks()
    .withFaceDescriptor();
}

async function captureBiometricData(videoElement, hiddenInputElement) {
  const detection = await getFaceDescriptor(videoElement);
  if (detection) {
    const descriptor = detection.descriptor;
    const descriptorString = descriptor.toString();
    hiddenInputElement.value = CryptoJS.SHA256(descriptorString).toString();
  } else {
    alert("Face not detected. Please try again.");
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  await loadModels();

  const registerVideo = document.getElementById("register-video");

  navigator.mediaDevices.getUserMedia({ video: {} }).then((stream) => {
    registerVideo.srcObject = stream;
  });

  document
    .getElementById("capture-register")
    .addEventListener("click", async () => {
      await captureBiometricData(
        registerVideo,
        document.getElementById("register-biometric")
      );
    });

  document
    .getElementById("register-form")
    .addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = document.getElementById("register-email").value;
      const password = document.getElementById("register-password").value;
      const biometricData = document.getElementById("register-biometric").value;

      const response = await fetch("/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, biometricData }),
      });

      const result = await response.text();
      alert(result);
    });

  document
    .getElementById("login-form")
    .addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = document.getElementById("login-email").value;
      const password = document.getElementById("login-password").value;

      const response = await fetch("/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const result = await response.json();
      if (result.token) {
        localStorage.setItem("jwt", result.token);
        alert("Login successful!");
      } else {
        alert(result);
      }
    });

  document
    .getElementById("refresh-form")
    .addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = document.getElementById("refresh-email").value;
      const totpToken = document.getElementById("totp-token").value;

      const response = await fetch("/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, totpToken }),
      });

      const result = await response.json();
      if (result.token) {
        localStorage.setItem("jwt", result.token);
        alert("Token refreshed successfully!");
      } else {
        alert(result);
      }
    });

  document
    .getElementById("access-protected")
    .addEventListener("click", async () => {
      const token = localStorage.getItem("jwt");
      if (!token) {
        alert("Please login first");
        return;
      }

      const response = await fetch("/protected", {
        headers: { Authorization: token },
      });

      const message = await response.text();
      document.getElementById("protected-message").textContent = message;
    });
});
