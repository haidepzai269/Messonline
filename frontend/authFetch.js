// ✅ authFetch.js
export async function authFetch(url, options = {}) {
    let accessToken = localStorage.getItem('accessToken');
    const refreshToken = localStorage.getItem('refreshToken');
  
    // Thêm Authorization nếu chưa có
    options.headers = {
      ...(options.headers || {}),
      Authorization: `Bearer ${accessToken}`,
    };
  
    let response = await fetch(url, options);
  
    if (response.status === 401 && refreshToken) {
      // Token hết hạn, gọi refresh token
      const refreshRes = await fetch('http://localhost:3000/api/auth/refresh-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
  
      if (refreshRes.ok) {
        const data = await refreshRes.json();
      
        // ✅ Lưu access token mới
        localStorage.setItem('accessToken', data.accessToken);
      
        // ✅ Cập nhật lại token cho socket (nếu đang kết nối)
        if (window.socket) {
          window.socket.disconnect();
          window.socket.auth.token = data.accessToken;
          window.socket.connect();
        }
      
        // ✅ Gửi lại request ban đầu
        options.headers.Authorization = `Bearer ${data.accessToken}`;
        response = await fetch(url, options);
      }
       else {
        // Nếu refresh token cũng hết hạn → đăng xuất
        alert('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.');
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/auth.html';
        
        throw new Error('Refresh token expired'); // ✅ THÊM DÒNG NÀY
      }
    }
  
    return response; // ✅ Trả về nguyên response
  }
  


  export async function getFreshToken() {
    let accessToken = localStorage.getItem('accessToken');
    const refreshToken = localStorage.getItem('refreshToken');
  
    const test = await fetch('/api/users/me', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
  
    if (test.status === 401 && refreshToken) {
      const res = await fetch('http://localhost:3000/api/auth/refresh-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken })
      });
  
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('accessToken', data.accessToken);
        return data.accessToken;
      } else {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = 'auth.html';
        throw new Error('Refresh token expired');
      }
    }
  
    return accessToken;
  }
  