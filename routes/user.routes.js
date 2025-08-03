const express = require('express');
const { verifyToken } = require('../middleware/auth.middleware');
const {
    getMe,
    getAllUsers,
    toggleFriend,
    updateProfile,
    sendFriendRequest,
    respondRequest,
    unfriend, // 👈 THÊM DÒNG NÀY
  } = require('../controllers/user.controller');
  

const router = express.Router();
const upload = require('../middleware/upload');
const userController = require('../controllers/user.controller');

// ...


router.get('/me', verifyToken, getMe);
router.get('/all', verifyToken, getAllUsers);
router.post('/toggle-friend/:id', verifyToken, toggleFriend);
router.put('/update', verifyToken, upload.single('avatar'), updateProfile);
router.get('/all', verifyToken, getAllUsers);
router.post('/request/:id', verifyToken, sendFriendRequest);
router.post('/respond/:id', verifyToken, respondRequest);
router.post('/unfriend/:id', verifyToken, unfriend);
router.get('/friends', verifyToken, userController.getFriends);

module.exports = router;
