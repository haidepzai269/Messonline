let isLogin = true;

document.getElementById('toggle-auth').addEventListener('click', (e) => {
  e.preventDefault();
  isLogin = !isLogin;
  document.getElementById('form-title').textContent = isLogin ? 'Đăng nhập' : 'Đăng ký';
  document.getElementById('auth-btn').textContent = isLogin ? 'Đăng nhập' : 'Đăng ký';
  document.getElementById('toggle-auth').innerHTML = isLogin
    ? 'Chưa có tài khoản? <a href="#">Đăng ký</a>'
    : 'Đã có tài khoản? <a href="#">Đăng nhập</a>';
});

document.getElementById('auth-btn').addEventListener('click', async () => {
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;

  const endpoint = isLogin ? 'login' : 'register';

  const res = await fetch(`/api/auth/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  const data = await res.json();

  if (!res.ok) {
    document.getElementById('auth-message').textContent = data.message || 'Có lỗi xảy ra';
    return;
  }

  localStorage.setItem('token', data.token);
  localStorage.setItem('justLoggedIn', 'true');
  window.location.href = 'home.html';
});
// Lắng nghe phím Enter để tự động bấm nút đăng nhập/đăng ký
document.addEventListener('keydown', function (event) {
    if (event.key === 'Enter') {
      document.getElementById('auth-btn').click();
    }
  });
  