const pool = require('../db');
const { getIO, onlineUsers } = require('../socket');
const io = getIO();


// Lấy thông tin chính mình
exports.getMe = async (req, res) => {
    const result = await pool.query(
      'SELECT id, username, avatar, bio FROM users WHERE id = $1',
      [req.user.id]
    );
  
    // Đếm bạn bè (user1_id hoặc user2_id)
    const friendCount = await pool.query(`
      SELECT COUNT(*) as count FROM friends
      WHERE user1_id = $1 OR user2_id = $1
    `, [req.user.id]);
  
    res.json({
      ...result.rows[0],
      friendCount: parseInt(friendCount.rows[0].count)
    });
  };
  

// Lấy danh sách tất cả người dùng (trừ chính mình)
exports.getAllUsers = async (req, res) => {
  const myId = req.user.id;

  const users = await pool.query(`
    SELECT u.id, u.username, u.avatar, u.bio,
      CASE 
        WHEN f.id IS NOT NULL THEN 'friend'
        WHEN fr1.id IS NOT NULL THEN 'sent'
        WHEN fr2.id IS NOT NULL THEN 'received'
        ELSE 'none'
      END as status
    FROM users u
    LEFT JOIN friends f ON (f.user1_id = $1 AND f.user2_id = u.id) OR (f.user2_id = $1 AND f.user1_id = u.id)
    LEFT JOIN friend_requests fr1 ON fr1.sender_id = $1 AND fr1.receiver_id = u.id
    LEFT JOIN friend_requests fr2 ON fr2.receiver_id = $1 AND fr2.sender_id = u.id
    WHERE u.id != $1
  `, [myId]);

  res.json(users.rows);
};


// Kết bạn / hủy kết bạn
exports.toggleFriend = async (req, res) => {
  const userId = req.user.id;
  const friendId = parseInt(req.params.id);

  const existing = await pool.query(`
    SELECT * FROM friends WHERE user_id = $1 AND friend_id = $2
  `, [userId, friendId]);

  if (existing.rows.length > 0) {
    await pool.query('DELETE FROM friends WHERE user_id = $1 AND friend_id = $2', [userId, friendId]);
  } else {
    await pool.query('INSERT INTO friends (user_id, friend_id) VALUES ($1, $2)', [userId, friendId]);
  }

  res.sendStatus(200);
};
// update profile
exports.updateProfile = async (req, res) => {
    const { username, bio } = req.body;
    const avatarUrl = req.file?.path;
  
    const fields = [];
    const values = [];
    let index = 1;
  
    if (username) {
      fields.push(`username = $${index++}`);
      values.push(username);
    }
    if (bio) {
      fields.push(`bio = $${index++}`);
      values.push(bio);
    }
    if (avatarUrl) {
      fields.push(`avatar = $${index++}`);
      values.push(avatarUrl);
    }
  
    if (fields.length === 0) {
      return res.status(400).json({ message: 'Không có dữ liệu cần cập nhật' });
    }
  
    values.push(req.user.id);
    const query = `UPDATE users SET ${fields.join(', ')} WHERE id = $${values.length}`;
    await pool.query(query, values);
  
    res.json({ message: 'Cập nhật thành công' });
  };
// gửi lời mời 
// Lấy danh sách người dùng (với trạng thái mối quan hệ)

  
// Gửi lời mời
// Gửi lời mời
exports.sendFriendRequest = async (req, res) => {
    const io = require('../socket').getIO(); // ✅ gọi trong hàm
    const { onlineUsers } = require('../socket');
    const senderId = req.user.id;
    const receiverId = parseInt(req.params.id);
  
    const check = await pool.query(`
      SELECT * FROM friend_requests WHERE sender_id = $1 AND receiver_id = $2
    `, [senderId, receiverId]);
  
    if (check.rows.length > 0) {
      return res.status(400).json({ message: 'Đã gửi rồi' });
    }
  
    await pool.query(`
      INSERT INTO friend_requests (sender_id, receiver_id) VALUES ($1, $2)
    `, [senderId, receiverId]);
  
    const receiverSocketId = onlineUsers.get(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('friend-request-received', { fromUserId: senderId });
    }
  
    res.sendStatus(200);
  };
  
  // Chấp nhận / từ chối lời mời
  exports.respondRequest = async (req, res) => {
    const io = require('../socket').getIO(); // ✅ gọi trong hàm
    const { onlineUsers } = require('../socket');
    const receiverId = req.user.id;
    const senderId = parseInt(req.params.id);
    const { accepted } = req.body;
  
    if (accepted) {
        await pool.query(`
          INSERT INTO friends (user1_id, user2_id) VALUES ($1, $2)
        `, [receiverId, senderId]);
      
        // 🔔 Gửi realtime cập nhật danh sách bạn bè cho cả 2
        const senderSocketId = onlineUsers.get(senderId);
        const receiverSocketId = onlineUsers.get(receiverId);
      
        if (senderSocketId) io.to(senderSocketId).emit('friend-list-updated');
        if (receiverSocketId) io.to(receiverSocketId).emit('friend-list-updated');
      }
      
  
    await pool.query(`
      DELETE FROM friend_requests WHERE sender_id = $1 AND receiver_id = $2
    `, [senderId, receiverId]);
  
    const senderSocketId = onlineUsers.get(senderId);
    if (senderSocketId) {
      io.to(senderSocketId).emit('friend-response-result', {
        fromUserId: receiverId,
        accepted,
      });
    }
  
    res.sendStatus(200);
  };
  
  // Hủy kết bạn
  exports.unfriend = async (req, res) => {
    const myId = req.user.id;
    const userId = parseInt(req.params.id);
  
    await pool.query(`
        DELETE FROM friends 
        WHERE (user1_id = $1 AND user2_id = $2)
           OR (user2_id = $1 AND user1_id = $2)
      `, [myId, userId]);
  
    const { getIO, onlineUsers } = require('../socket');
    const io = getIO();
  
    const senderSocketId = onlineUsers.get(userId);
    const receiverSocketId = onlineUsers.get(myId);
  
    // Gửi realtime để cả hai bên cập nhật giao diện
    if (senderSocketId) io.to(senderSocketId).emit('friend-removed', { userId: myId });
    if (receiverSocketId) io.to(receiverSocketId).emit('friend-removed', { userId });

  
    res.sendStatus(200);
  };
  
  
// Lấy danh sách bạn bè
exports.getFriends = async (req, res) => {
    const myId = req.user.id;
  
    const result = await pool.query(`
      SELECT u.id, u.username, u.avatar
      FROM users u
      JOIN friends f
        ON (f.user1_id = u.id AND f.user2_id = $1)
        OR (f.user2_id = u.id AND f.user1_id = $1)
    `, [myId]);
  
    res.json(result.rows);
  };
  