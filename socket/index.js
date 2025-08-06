const pool = require('../db');
const jwt = require('jsonwebtoken');
const onlineUsers = new Map();
let _io = null;

function setupSocket(io) {
  _io = io;
  io.on('connection', (socket) => {
    const token = socket.handshake.auth.token;
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      const userId = payload.id;
      onlineUsers.set(userId, socket.id);
      // Khi có người yêu cầu kiểm tra trạng thái online
      socket.on('check-user-status', ({ userId: targetId }) => {
  const isOnline = onlineUsers.has(targetId);
  socket.emit('user-status', { userId: targetId, online: isOnline });
      });

      // ✅ Gửi tin nhắn

      //socket/index.js
      socket.on('sendMessage', async ({ receiver, text, file_url, file_type }) => {
        const senderId = userId;
        try {
          // 🔹 Lấy thông tin người gửi
          const userRes = await pool.query(
            'SELECT id, username, avatar FROM users WHERE id = $1',
            [senderId]
          );
          const senderInfo = userRes.rows[0];
      
          // 🔹 Lấy thời gian hiện tại để gửi realtime
          const now = new Date().toISOString();
      
          const receiverSocketId = onlineUsers.get(receiver);
          if (receiverSocketId) {
            io.to(receiverSocketId).emit('receiveMessage', {
              senderId,
              receiverId: receiver,
              senderName: senderInfo.username,
              senderAvatar: senderInfo.avatar,
              text,
              file_url,
              file_type,
              created_at: now
            });
          }
        } catch (err) {
          console.error('sendMessage error:', err);
        }
      });
      
      
     // xóa real time 
     socket.on('deleteMessage', async ({ messageId }) => {
        try {
            // Kiểm tra người xóa là chủ sở hữu tin nhắn
            const msgRes = await pool.query(
                'SELECT * FROM messages WHERE id = $1 AND sender_id = $2',
                [messageId, userId]
            );
    
            if (msgRes.rows.length === 0) return;
    
            const msg = msgRes.rows[0];
    
            // Xóa khỏi DB
            await pool.query('DELETE FROM messages WHERE id = $1', [messageId]);
    
            // Gửi thông báo xóa cho cả 2 phía
            const receiverSocketId = onlineUsers.get(msg.receiver_id);
            if (receiverSocketId) {
                io.to(receiverSocketId).emit('messageDeleted', { messageId });
            }
            // Gửi về chính người xóa (nếu cần đồng bộ)
            socket.emit('messageDeleted', { messageId });
    
        } catch (err) {
            console.error('deleteMessage error:', err);
        }
        });
      // đang nhập realtime 
      socket.on('typing', ({ receiver }) => {
              const receiverSocketId = onlineUsers.get(receiver);
              if (receiverSocketId) {
                io.to(receiverSocketId).emit('userTyping', { senderId: userId });
              }
      });
      
            // ✅ Khi người dùng dừng nhập
      socket.on('stopTyping', ({ receiver }) => {
              const receiverSocketId = onlineUsers.get(receiver);
              if (receiverSocketId) {
                io.to(receiverSocketId).emit('userStopTyping', { senderId: userId });
              }
      });
      

      // ✅ Gửi lời mời kết bạn
      socket.on('friend-request', ({ toUserId }) => {
        const toSocketId = onlineUsers.get(toUserId);
        if (toSocketId) {
          io.to(toSocketId).emit('friend-request-received', { fromUserId: userId });
        }
      });

      // ✅ Trả lời lời mời
      socket.on('friend-response', ({ toUserId, accepted }) => {
        const toSocketId = onlineUsers.get(toUserId);
        if (toSocketId) {
          io.to(toSocketId).emit('friend-response-result', { accepted, fromUserId: userId });
        }
      });

      // ✅ Lấy danh sách bạn bè đang online
      socket.on('get-online-friends', async () => {
        try {
          const result = await pool.query(`
            SELECT 
              CASE 
                WHEN f.user1_id = $1 THEN f.user2_id
                ELSE f.user1_id
              END AS friend_id
            FROM friends f
            WHERE f.user1_id = $1 OR f.user2_id = $1
          `, [userId]);

          const friendsOnline = result.rows
            .map(row => row.friend_id)
            .filter(friendId => onlineUsers.has(friendId));

          socket.emit('online-friends', friendsOnline);
        } catch (err) {
          console.error('get-online-friends error:', err);
        }
      });
      // Gọi video 
      socket.on('call-offer', ({ to, offer }) => {
        const targetSocketId = onlineUsers.get(to);
        if (targetSocketId) {
          io.to(targetSocketId).emit('incoming-call', {
            from: userId,
            offer
          });
        }
      });
      socket.on('call-answer', ({ to, answer }) => {
        const targetSocketId = onlineUsers.get(to);
        if (targetSocketId) {
          io.to(targetSocketId).emit('call-answered', {
            answer
          });
        }
      });
      socket.on('ice-candidate', ({ to, candidate }) => {
        const targetSocketId = onlineUsers.get(to);
        if (targetSocketId) {
          io.to(targetSocketId).emit('ice-candidate', {
            candidate
          });
        }
      });
      socket.on('call-reject', ({ to }) => {
        const targetSocketId = onlineUsers.get(to);
        if (targetSocketId) {
          io.to(targetSocketId).emit('call-ended');
        }
      });
      socket.on('call-end', ({ to }) => {
        const targetSocketId = onlineUsers.get(to);
        if (targetSocketId) {
          io.to(targetSocketId).emit('call-ended');
        }
      });                        
      // ✅ Broadcast khi có người online
      socket.broadcast.emit('user-online', userId);

      socket.on('disconnect', () => {
        onlineUsers.delete(userId);
        socket.broadcast.emit('user-offline', userId);
      });

    } catch (err) {
      console.error('socket connection error:', err);
      socket.disconnect();
    }
  });
  // Xóa real time 


}

function getIO() {
  return _io;
}

module.exports = {
  setupSocket,
  getIO,
  onlineUsers,
};
