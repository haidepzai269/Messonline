const token = localStorage.getItem('token');
if (!token) window.location.href = 'auth.html';

// Load hồ sơ chính mình
async function loadProfile() {
  const res = await fetch('http://localhost:3000/api/users/me', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const user = await res.json();
  document.getElementById('profile-username').textContent = user.username;
  document.getElementById('profile-bio').textContent = user.bio || '';
  document.getElementById('profile-friends-count').textContent =
  `Bạn bè: ${user.friendCount}`;

  const avatarDiv = document.getElementById('profile-avatar');
  avatarDiv.innerHTML = ''; // Xóa avatar cũ nếu có
  const img = document.createElement('img');
  img.src = user.avatar || 'default-avatar.png'; // fallback nếu không có ảnh
  img.alt = 'avatar';
  avatarDiv.appendChild(img);

  // Sự kiện click để mở ảnh
  img.addEventListener('click', () => {
    document.getElementById('modal-avatar-img').src = user.avatar || 'default-avatar.png';
    document.getElementById('avatar-modal').classList.remove('hidden');
  });
  
  }

// Load danh sách người dùng khác
async function loadUsers() {
  const list = document.getElementById('user-list');

  // Hiển thị skeleton trước khi fetch dữ liệu
  list.innerHTML = '';
  for (let i = 0; i < 5; i++) {
      const skeleton = document.createElement('div');
      skeleton.className = 'skeleton-item';
      skeleton.innerHTML = `
          <div style="display:flex;align-items:center;gap:8px;">
              <div class="skeleton-avatar"></div>
              <div class="skeleton-name"></div>
          </div>
      `;
      list.appendChild(skeleton);
  }

  // Fetch dữ liệu thật
  const res = await fetch('http://localhost:3000/api/users/all', {
      headers: { Authorization: `Bearer ${token}` },
  });
  const users = await res.json();

  // Hiển thị danh sách thật
  list.innerHTML = '';
  users.forEach((user, index) => {
    const item = document.createElement('div');
    item.className = 'user-item';

    // ⏳ Hiển thị lần lượt từng user
    item.style.animationDelay = `${index * 0.05}s`;

    const infoWrapper = document.createElement('div');
    infoWrapper.className = 'user-info';
    infoWrapper.addEventListener('click', () => {
        localStorage.setItem('chatWithUser', JSON.stringify(user));
        window.location.href = 'chat.html';
    });

    const avatar = document.createElement('img');
    avatar.src = user.avatar || 'default-avatar.png';
    avatar.alt = 'avatar';
    avatar.className = 'user-avatar';
    if (onlineFriendIds.has(user.id)) {
        avatar.classList.add('online');
    }

    const name = document.createElement('span');
    name.textContent = user.username;

    infoWrapper.appendChild(avatar);
    infoWrapper.appendChild(name);

    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'user-buttons';

    if (user.status === 'none') {
        const btn = document.createElement('button');
        btn.textContent = 'Kết bạn';
        btn.onclick = () => sendRequest(user.id);
        buttonContainer.appendChild(btn);
    } else if (user.status === 'sent') {
        const btn = document.createElement('button');
        btn.textContent = 'Đã gửi lời mời';
        btn.disabled = true;
        buttonContainer.appendChild(btn);
    } else if (user.status === 'received') {
        const acceptBtn = document.createElement('button');
        acceptBtn.textContent = 'Chấp nhận';
        acceptBtn.onclick = () => respondRequest(user.id, true);

        const declineBtn = document.createElement('button');
        declineBtn.textContent = 'Từ chối';
        declineBtn.onclick = () => respondRequest(user.id, false);

        buttonContainer.appendChild(acceptBtn);
        buttonContainer.appendChild(declineBtn);
    } else if (user.status === 'friend') {
        const btn = document.createElement('button');
        btn.textContent = 'Hủy kết bạn';
        btn.onclick = () => unfriend(user.id);
        buttonContainer.appendChild(btn);
    }

    const moreBtn = document.createElement('button');
    moreBtn.className = 'more-options';
    moreBtn.innerHTML = '⋮';
    moreBtn.onclick = (e) => {
        e.stopPropagation();
        showProfilePopup(user, moreBtn);
    };

    buttonContainer.appendChild(moreBtn);

    item.appendChild(infoWrapper);
    item.appendChild(buttonContainer);
    list.appendChild(item);
});

}

  
  async function sendRequest(userId) {
    await fetch(`http://localhost:3000/api/users/request/${userId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    loadUsers();
  }
  
  async function respondRequest(userId, accepted) {
    await fetch(`http://localhost:3000/api/users/respond/${userId}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ accepted }),
    });
    loadUsers();
  }
  
  async function unfriend(userId) {
    await fetch(`http://localhost:3000/api/users/unfriend/${userId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    loadUsers();
  }
  

async function toggleFriend(userId) {
  await fetch(`http://localhost:3000/api/users/toggle-friend/${userId}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  loadUsers();
}

loadProfile();
loadUsers();

// sửa thông tin 
document.getElementById('edit-profile').addEventListener('click', () => {
    document.getElementById('edit-modal').classList.remove('hidden');
  });
  
  function closeModal() {
    document.getElementById('edit-modal').classList.add('hidden');
  }
  
  async function submitEdit() {
    const formData = new FormData();
    const username = document.getElementById('edit-username').value;
    const bio = document.getElementById('edit-bio').value;
    const avatar = document.getElementById('edit-avatar').files[0];
  
    if (username) formData.append('username', username);
    if (bio) formData.append('bio', bio);
    if (avatar) formData.append('avatar', avatar);
  
    const res = await fetch('http://localhost:3000/api/users/update', {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });
  
    if (res.ok) {
      alert('Cập nhật thành công');
      loadProfile();
      closeModal();
    } else {
      alert('Lỗi khi cập nhật');
    }
  }

// phóng ảnh 
document.getElementById('close-avatar-modal').addEventListener('click', () => {
    document.getElementById('avatar-modal').classList.add('hidden');
  });
  
  // Đóng modal nếu click ra ngoài nội dung
  document.getElementById('avatar-modal').addEventListener('click', (e) => {
    if (e.target.id === 'avatar-modal') {
      document.getElementById('avatar-modal').classList.add('hidden');
    }
  });

// socket gửi lời mời
const socket = io('http://localhost:3000', {
    auth: { token }
  });
  
  socket.on('friend-request-received', ({ fromUserId }) => {
    console.log('Có lời mời từ:', fromUserId);
    loadUsers(); // cập nhật giao diện
  });
  
  socket.on('friend-response-result', ({ accepted, fromUserId }) => {
    console.log('Phản hồi từ:', fromUserId, accepted ? 'chấp nhận' : 'từ chối');
    loadUsers(); // cập nhật lại
  });
  socket.on('friend-list-updated', () => {
    console.log('🔄 Danh sách bạn bè đã thay đổi');
    loadProfile(); // cập nhật số lượng bạn bè ngay lập tức
  });
  socket.on('friend-removed', ({ userId }) => {
    console.log('🚫 Hủy kết bạn với:', userId);
    loadUsers();    // cập nhật nút trạng thái
    loadProfile();  // cập nhật số lượng bạn bè
  });
  
// hiển thị online
let onlineFriendIds = new Set();
socket.emit('get-online-friends');

socket.on('online-friends', (onlineIds) => {
  onlineFriendIds = new Set(onlineIds);
  loadUsers(); // reload để hiển thị trạng thái online
});
socket.on('user-online', (id) => {
    onlineFriendIds.add(id);
    loadUsers();
  });
  
  socket.on('user-offline', (id) => {
    onlineFriendIds.delete(id);
    loadUsers();
  });

// tìm kiêms
document.getElementById('search').addEventListener('input', function () {
    const keyword = this.value.toLowerCase();
    const users = document.querySelectorAll('#user-list .user-item');
    users.forEach(user => {
      const name = user.querySelector('span').textContent.toLowerCase();
      user.style.display = name.includes(keyword) ? 'flex' : 'none';
    });
  });
  

// xem trang cá nhân 
let currentPopup = null;

function showProfilePopup(user, buttonElement) {
  // Xoá popup cũ nếu có
  if (currentPopup) currentPopup.remove();

  // Tạo popup
  const popup = document.createElement('div');
  popup.className = 'profile-popup fade-in';
  popup.innerHTML = `
    <div class="popup-header">
      <img src="${user.avatar || 'default-avatar.png'}" alt="avatar" />
      <div class="popup-info">
        <h3>${user.username}</h3>
        <p>${user.bio || 'Chưa có bio'}</p>
      </div>
    </div>
    <button class="popup-chat-btn">💬 Nhắn tin</button>
  `;

  // ✅ Định vị popup luôn giữa màn hình
  popup.style.position = 'fixed';
  popup.style.top = '50%';
  popup.style.left = '50%';
  popup.style.transform = 'translate(-50%, -50%)';

  document.body.appendChild(popup);
  currentPopup = popup;

  // Sự kiện nhắn tin
  popup.querySelector('.popup-chat-btn').addEventListener('click', () => {
    localStorage.setItem('chatWithUser', JSON.stringify(user));
    window.location.href = 'chat.html';
  });

  // Click ra ngoài để đóng popup
  document.addEventListener('click', function closePopup(e) {
    if (!popup.contains(e.target) && e.target !== buttonElement) {
      popup.remove();
      currentPopup = null;
      document.removeEventListener('click', closePopup);
    }
  });
}



