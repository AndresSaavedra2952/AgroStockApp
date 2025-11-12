// Script para resetear contraseña desde Node.js/Deno
// Ejecutar: deno run --allow-net --allow-env test-reset-password.js

const API_URL = "http://localhost:8000/auth/reset-password";

const resetPassword = async (email, newPassword) => {
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: email,
        newPassword: newPassword,
      }),
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log("✅ Contraseña reseteada exitosamente");
      console.log("Respuesta:", data);
    } else {
      console.error("❌ Error al resetear contraseña");
      console.error("Respuesta:", data);
    }
  } catch (error) {
    console.error("❌ Error de conexión:", error);
  }
};

// Resetear contraseña para el usuario admin
resetPassword("andresfelipesaa2006@gmail.com", "Admin123!");

