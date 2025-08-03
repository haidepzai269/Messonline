const token = localStorage.getItem('token');
if (!token) window.location.href = 'auth.html';

// ✅ Lấy ID của mình từ JWT
function getMyIdFromToken() {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.id;
  } catch (e) {
    return null;
  }
}
async function loadMyInfo() {
  try {
    const res = await fetch('/api/users/me', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const me = await res.json();

    // Hiển thị tên của chính mình
    document.getElementById('chat-title').textContent = `ChatWeb - ${me.username}`;
  } catch (err) {
    console.error("Lỗi tải tên tài khoản:", err);
  }
}

loadMyInfo();


const myId = getMyIdFromToken();
const chatWithUser = JSON.parse(localStorage.getItem('chatWithUser'));
const socket = io("http://localhost:3000", { auth: { token } });

// ✅ Khai báo msgBox
const msgBox = document.getElementById('chat-messages');

// Hiển thị người đang chat
if (chatWithUser) {
  document.getElementById('chat-header').innerHTML = `
  <img src="${chatWithUser.avatar || 'default-avatar.png'}" />
  <div style="display:flex;flex-direction:column;">
    <span id="user">${chatWithUser.username}</span>
    <small id="user-status-text" style="color:gray;font-size:13px;">Đang kiểm tra...</small>
  </div>
 `;
 socket.emit('check-user-status', { userId: chatWithUser.id });

  loadChatHistory();
}

// Load lịch sử tin nhắn
async function loadChatHistory() {
  const msgBox = document.getElementById('chat-messages');

  // Hiển thị 3 skeleton giả lập
  msgBox.innerHTML = `
    <div class="skeleton-message"></div>
    <div class="skeleton-message mine"></div>
    <div class="skeleton-message"></div>
  `;

  // Giả lập delay tải API
  const res = await fetch(`/api/messages/${chatWithUser.id}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const messages = await res.json();

  // Sau khi load xong -> xoá skeleton
  msgBox.innerHTML = '';

  // Hiển thị tin nhắn thật
  messages.forEach(msg => {
    if (msg.file_url) {
      appendFileMessage(msg.sender_id, msg.file_url, msg.file_type, msg.id, msg.created_at);
    } else {
      appendMessage(msg.sender_id, msg.content, msg.id, msg.created_at);
    }
  });
  
  
}


// ✅ Hàm hiển thị tin nhắn
function appendMessage(senderId, text, msgId, createdAt) {
  const isMine = senderId === myId;
  const msgDiv = document.createElement('div');
  msgDiv.className = `message ${isMine ? 'mine' : 'other'}`;
  if (msgId) msgDiv.dataset.id = msgId;

  // Format thời gian
  const time = createdAt ? new Date(createdAt).toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }) : '';

  msgDiv.innerHTML = `<p title="${time}">${text}</p>`;
  msgBox.appendChild(msgDiv);
  msgBox.scrollTop = msgBox.scrollHeight;
}

  

// Nhận tin nhắn từ server
socket.on('receiveMessage', (msg) => {
  if (msg.senderId === chatWithUser.id) {
    const isMine = msg.senderId === myId;
    if (msg.file_url) {
      appendFileMessage(isMine ? myId : msg.senderId, msg.file_url, msg.file_type, null, msg.created_at);
    } else {
      appendMessage(isMine ? myId : msg.senderId, msg.text, null, msg.created_at);
    }
  } else {
    showChatNotification(
      msg.senderId, 
      msg.text || '📎 Tin nhắn mới', 
      msg.senderName, 
      msg.senderAvatar
    );
  }
});

// Nhận thông báo đang nhập
socket.on('userTyping', ({ senderId }) => {
  if (senderId === chatWithUser.id) {
      document.getElementById('typing-indicator').innerHTML = `
          ${chatWithUser.username} đang nhập 
          <span class="dots">
            <span class="dot"></span>
            <span class="dot"></span>
            <span class="dot"></span>
          </span>
      `;
      document.getElementById('typing-indicator').style.display = 'block';
  }
});

// Nhận thông báo dừng nhập
socket.on('userStopTyping', ({ senderId }) => {
  if (senderId === chatWithUser.id) {
      document.getElementById('typing-indicator').style.display = 'none';
  }
});

// Gửi tin nhắn
document.getElementById('send-btn').addEventListener('click', async () => {
    const input = document.getElementById('message-input');
    if (!input.value.trim()) return;

    try {
        // Gọi API lưu tin nhắn trước
        const res = await fetch('/api/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
                receiver: chatWithUser.id,
                text: input.value
            })
        });

        const data = await res.json();

        // ✅ Hiển thị với msgId thật từ DB
        appendMessage(myId, input.value, data.id);

        // Gửi socket
        socket.emit('sendMessage', {
            receiver: chatWithUser.id,
            text: input.value
        });

        input.value = '';
    } catch (err) {
        console.error("Lỗi gửi tin nhắn:", err);
    }
});
// nhập  real time  
let typingTimeout;

document.getElementById('message-input').addEventListener('input', () => {
    socket.emit('typing', { receiver: chatWithUser.id });

     clearTimeout(typingTimeout);
     typingTimeout = setTimeout(() => {
     socket.emit('stopTyping', { receiver: chatWithUser.id });
  }, 1500);
});

// Gửi tin nhắn khi bấm Enter
document.getElementById('message-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault(); // Ngăn xuống dòng
      document.getElementById('send-btn').click(); // Gọi sự kiện nút gửi
    }
  });

  
// gửi ảnh    video
document.getElementById('uploadBtn').addEventListener('click', () => {
    document.getElementById('fileInput').click();
  });
  
  document.getElementById('fileInput').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('receiver', chatWithUser.id);

    try {
        const res = await fetch('/api/messages/file', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: formData,
        });

        const data = await res.json();
        console.log("📦 Upload response:", data);

        if (data.file_url) {
            // Hiển thị ngay lập tức
            appendFileMessage(myId, data.file_url, data.file_type);

            // Chỉ emit socket để gửi cho người nhận
            socket.emit('sendMessage', { 
                receiver: chatWithUser.id, 
                file_url: data.file_url, 
                file_type: data.file_type 
            });
        }
    } catch (error) {
        console.error("❌ Lỗi upload file:", error);
    }
});

  
function appendFileMessage(senderId, fileUrl, fileType, msgId, createdAt) {
  const div = document.createElement('div');
  div.className = senderId === myId ? 'message file-message mine' : 'message file-message other';
  if (msgId) div.dataset.id = msgId;

  // Format thời gian
  const time = createdAt ? new Date(createdAt).toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }) : '';

  if (fileType === 'image') {
    div.innerHTML = `<img src="${fileUrl}" class="chat-image" style="max-width: 200px; border-radius: 8px; cursor: pointer;" title="${time}" />`;
  } else if (fileType === 'video') {
    div.innerHTML = `<video controls src="${fileUrl}" style="max-width: 200px; border-radius: 8px;" title="${time}"></video>`;
  }

  document.getElementById('chat-messages').appendChild(div);
  msgBox.scrollTop = msgBox.scrollHeight;
}



// Mở modal khi ấn vào ảnh
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('chat-image')) {
        document.getElementById('modalImage').src = e.target.src;
        document.getElementById('imageModal').style.display = 'flex';
    }
});

// Đóng modal khi click X hoặc bất kỳ đâu ngoài ảnh
document.getElementById('closeModal').addEventListener('click', () => {
    document.getElementById('imageModal').style.display = 'none';
});
document.getElementById('imageModal').addEventListener('click', (e) => {
    if (e.target.id === 'imageModal') {
        document.getElementById('imageModal').style.display = 'none';
    }
});

    
// nhận thông báo tin nhắn 
function showChatNotification(fromUserId, messageText, senderName, senderAvatar) {
    const container = document.getElementById('chat-notification-container');
    const notif = document.createElement('div');
    notif.className = 'chat-notification';

    notif.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;">
        <img src="${senderAvatar || 'default-avatar.png'}" style="width:35px;height:35px;border-radius:50%;">
        <div>
          <strong>${senderName || 'Người dùng'}</strong><br>
          <span>${messageText}</span>
        </div>
      </div>
    `;

    // Khi click -> mở chat với người gửi
    notif.addEventListener('click', () => {
        localStorage.setItem('chatWithUser', JSON.stringify({ 
            id: fromUserId, 
            username: senderName,
            avatar: senderAvatar
        }));
        window.location.reload();
    });

    container.appendChild(notif);

    setTimeout(() => notif.classList.add('show'), 100);
    setTimeout(() => {
        notif.classList.remove('show');
        setTimeout(() => notif.remove(), 300);
    }, 5000);
}

// xóa
// PC: click chuột phải
document.getElementById('chat-messages').addEventListener('contextmenu', async (e) => {
    if (e.target.closest('.message.mine')) {
        e.preventDefault();
        const msgDiv = e.target.closest('.message');
        const msgId = msgDiv.dataset.id;

        if (confirm("Bạn có chắc muốn xóa tin nhắn này?")) {
            await deleteMessage(msgId, msgDiv);
        }
    }
});

// Mobile: double-tap
let lastTapTime = 0;
document.getElementById('chat-messages').addEventListener('touchend', async (e) => {
    if (e.target.closest('.message.mine')) {
        const currentTime = Date.now();
        if (currentTime - lastTapTime < 300) { // double tap < 300ms
            const msgDiv = e.target.closest('.message');
            const msgId = msgDiv.dataset.id;
            if (confirm("Bạn có chắc muốn xóa tin nhắn này?")) {
                await deleteMessage(msgId, msgDiv);
            }
        }
        lastTapTime = currentTime;
    }
});

// Hàm gọi API xóa
async function deleteMessage(msgId, msgDiv) {
    try {
        // Gọi API xóa DB
        const res = await fetch(`/api/messages/${msgId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) {
            // ✅ Phát socket để xóa real-time trên cả 2 client
            socket.emit('deleteMessage', { messageId: msgId });

            // Xóa tại chỗ
            msgDiv.remove();
        } else {
            alert("Không thể xóa tin nhắn này!");
        }
    } catch (err) {
        console.error("Lỗi xóa tin nhắn:", err);
    }
}
socket.on('messageDeleted', ({ messageId }) => {
    const msgDiv = document.querySelector(`.message[data-id='${messageId}']`);
    if (msgDiv) {
        msgDiv.remove();
    }
});

// bạn bè online
let onlineFriendIds = new Set();

// Load danh sách bạn bè
async function loadFriends() {
  const res = await fetch('http://localhost:3000/api/users/friends', {
    headers: { Authorization: `Bearer ${token}` }
  });
  const friends = await res.json();

  const list = document.getElementById('user-suggestions');
  list.innerHTML = '';

  friends.forEach(friend => {
    const li = document.createElement('li');
    li.addEventListener('click', () => {
      localStorage.setItem('chatWithUser', JSON.stringify(friend));
      window.location.href = 'chat.html';
    });

    const avatar = document.createElement('img');
    avatar.src = friend.avatar || 'default-avatar.png';
    avatar.alt = friend.username;

    // Hiển thị online
    if (onlineFriendIds.has(friend.id)) {
        avatar.classList.add('online');
    }

    const name = document.createElement('span');
    name.textContent = friend.username;

    li.appendChild(avatar);
    li.appendChild(name);
    list.appendChild(li);
  });
}

// Nhận danh sách bạn bè online ban đầu
socket.emit('get-online-friends');

socket.on('online-friends', (onlineIds) => {
  onlineFriendIds = new Set(onlineIds);
  loadFriends();
});

// Khi bạn bè online/offline
socket.on('user-online', (id) => {
  onlineFriendIds.add(id);
  loadFriends();
});
socket.on('user-offline', (id) => {
  onlineFriendIds.delete(id);
  loadFriends();
});

// Tải lần đầu
loadFriends();
// hiển thị on/off
socket.on('user-status', ({ userId, online }) => {
  if (userId === chatWithUser.id) {
    const statusEl = document.getElementById('user-status-text');
    if (online) {
      statusEl.innerHTML = 'Online 🟢';
      statusEl.style.color = '#39FF14';
    } else {
      statusEl.innerHTML = 'Offline 🔴';
      statusEl.style.color = 'white';
    }
  }
});

// Cập nhật realtime khi người đó online/offline
socket.on('user-online', (id) => {
  if (id === chatWithUser.id) {
    const statusEl = document.getElementById('user-status-text');
    statusEl.innerHTML = 'Online 🟢';
    statusEl.style.color = '#39FF14';
  }
});
socket.on('user-offline', (id) => {
  if (id === chatWithUser.id) {
    const statusEl = document.getElementById('user-status-text');
    statusEl.innerHTML = 'Offline 🔴';
    statusEl.style.color = 'white';
  }
});

// cuộn 
const chatMessages = document.getElementById('chat-messages');
const scrollBtn = document.getElementById('scrollToBottomBtn');

// Hiện nút khi cuộn lên
chatMessages.addEventListener('scroll', () => {
  const nearBottom = chatMessages.scrollHeight - chatMessages.scrollTop - chatMessages.clientHeight < 100;
  scrollBtn.style.display = nearBottom ? 'none' : 'block';
});

// Cuộn xuống khi ấn nút
scrollBtn.addEventListener('click', () => {
  chatMessages.scrollTo({
    top: chatMessages.scrollHeight,
    behavior: 'smooth'
  });
});
