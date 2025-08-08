// Chỉ hiển thị hiệu ứng nếu vừa đăng nhập thành công
if (localStorage.getItem('justLoggedIn') === 'true') {
  const overlay = document.getElementById('login-effect-overlay');
  overlay.classList.remove('hidden');
  setTimeout(() => {
    overlay.classList.add('hidden');
    localStorage.removeItem('justLoggedIn');
  }, 3000); // Hiệu ứng 3s
}