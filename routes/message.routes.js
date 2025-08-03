const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth.middleware');
const messageController = require('../controllers/message.controller');
const { deleteMessage } = require('../controllers/message.controller');
const upload = require('../middleware/upload')

router.post('/', verifyToken, messageController.sendMessage);
router.post('/file', verifyToken, upload.single('file'), messageController.sendFileMessage);
router.get('/:userId', verifyToken, messageController.getMessagesWithUser);
router.delete('/:id', verifyToken, deleteMessage);

module.exports = router;
