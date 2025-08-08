const pool = require('../db');
const { getIO, onlineUsers } = require('../socket');

exports.sendMessage = async (req, res) => {
  const senderId = req.user.id;
  const { receiver, text } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO messages (sender_id, receiver_id, content, seen)
       VALUES ($1, $2, $3, false)
       RETURNING id, sender_id, receiver_id, content, created_at, seen`,
      [senderId, receiver, text]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Gửi tin nhắn thất bại' });
  }
};

exports.getMessagesWithUser = async (req, res) => {
  const myId = req.user.id;
  const otherId = parseInt(req.params.userId);

  try {
    const result = await pool.query(
      `SELECT * FROM messages
       WHERE (sender_id = $1 AND receiver_id = $2)
          OR (sender_id = $2 AND receiver_id = $1)
       ORDER BY created_at ASC`,
      [myId, otherId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Lấy tin nhắn thất bại' });
  }
};

// gửi ảnh  và video 
exports.sendFileMessage = async (req, res) => {
  const senderId = req.user.id;
  const { receiver } = req.body;
  const file = req.file;

  if (!file) return res.status(400).json({ error: 'Không có file được upload' });

  try {
    const result = await pool.query(
      `INSERT INTO messages (sender_id, receiver_id, file_url, file_type, seen)
       VALUES ($1, $2, $3, $4, false)
       RETURNING id, sender_id, receiver_id, file_url, file_type, created_at, seen`,
      [senderId, receiver, file.path, fileType]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('🔥 Lỗi GỬI FILE:', err);
    res.status(500).json({ error: 'Gửi file thất bại' });
  }
};
// xóa tn
exports.deleteMessage = async (req, res) => {
    const myId = req.user.id;
    const messageId = parseInt(req.params.id);
  
    try {
      // Xóa và trả về ID người nhận
      const msgRes = await pool.query(
        'DELETE FROM messages WHERE id = $1 AND sender_id = $2 RETURNING id, receiver_id',
        [messageId, myId]
      );
  
      if (msgRes.rowCount === 0) {
        return res.status(403).json({ error: 'Không thể xóa tin nhắn này' });
      }
  
      const deletedMsg = msgRes.rows[0];
  
      // ✅ Phát socket real-time
      const io = getIO();
  
      // Gửi cho chính người xóa
      const senderSocketId = onlineUsers.get(myId);
      if (senderSocketId) {
        io.to(senderSocketId).emit('messageDeleted', { messageId });
      }
  
      // Gửi cho đối phương nếu đang online
      if (deletedMsg.receiver_id) {
        const receiverSocketId = onlineUsers.get(deletedMsg.receiver_id);
        if (receiverSocketId) {
          io.to(receiverSocketId).emit('messageDeleted', { messageId });
        }
      }
  
      return res.json({ success: true, deletedId: messageId });
    } catch (err) {
      console.error('❌ deleteMessage error:', err);
      return res.status(500).json({ error: 'Lỗi xóa tin nhắn' });
    }
  };
  

  // exports.markMessageAsSeen = async (req, res) => {
  //   const myId = req.user.id;
  //   const { messageId } = req.body;
  
  //   try {
  //     const result = await pool.query(
  //       `UPDATE messages 
  //        SET seen = true 
  //        WHERE id = $1 AND receiver_id = $2
  //        RETURNING id, sender_id`,
  //       [messageId, myId]
  //     );
  
  //     if (result.rowCount === 0) {
  //       return res.status(404).json({ error: 'Không tìm thấy tin nhắn hoặc bạn không phải người nhận' });
  //     }
  
  //     const { sender_id } = result.rows[0];
  
  //     // ✅ Gửi socket thông báo cho người gửi (real-time)
  //     const io = getIO();
  //     const senderSocketId = onlineUsers.get(sender_id);
  //     if (senderSocketId) {
  //       io.to(senderSocketId).emit('messageSeenByReceiver', { messageId });
  //     }
  
  //     res.json({ success: true });
  //   } catch (err) {
  //     console.error('🔥 markMessageAsSeen error:', err);
  //     res.status(500).json({ error: 'Lỗi cập nhật trạng thái đã xem' });
  //   }
  // };
  
  