// Script simple para resetear contraseña
// Uso: node reset-password.js <email> <nueva-contraseña>

const email = process.argv[2];
const newPassword = process.argv[3];

if (!email || !newPassword) {
  console.log('Uso: node reset-password.js <email> <nueva-contraseña>');
  console.log('Ejemplo: node reset-password.js usuario@ejemplo.com nueva123');
  process.exit(1);
}

const API_URL = 'http://localhost:8000/auth/reset-password';

fetch(API_URL, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: email,
    newPassword: newPassword
  })
})
.then(response => response.json())
.then(data => {
  console.log('Respuesta:', JSON.stringify(data, null, 2));
  if (data.success) {
    console.log('\n✅ Contraseña reseteada exitosamente!');
    console.log(`Ahora puedes iniciar sesión con:\n  Email: ${email}\n  Contraseña: ${newPassword}`);
  } else {
    console.log('\n❌ Error al resetear contraseña:', data.message);
  }
})
.catch(error => {
  console.error('❌ Error:', error.message);
  console.log('\n💡 Asegúrate de que:');
  console.log('  1. El servidor backend esté corriendo en http://localhost:8000');
  console.log('  2. El email sea correcto');
  console.log('  3. La nueva contraseña tenga al menos 8 caracteres');
});









