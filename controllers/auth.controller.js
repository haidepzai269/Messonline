const pool = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
require('dotenv').config();

exports.register = async (req, res) => {
  const { username, password } = req.body;
  try {
    const hashed = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (username, password) VALUES ($1, $2) RETURNING *',
      [username, hashed]
    );

    const token = jwt.sign({ id: result.rows[0].id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token });
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ message: 'Tên tài khoản đã tồn tại' });
    res.status(500).json({ message: 'Lỗi server' });
  }
};

exports.login = async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    const user = result.rows[0];
    if (!user) return res.status(400).json({ message: 'Sai tài khoản hoặc mật khẩu' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ message: 'Sai tài khoản hoặc mật khẩu' });

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server' });
  }
};

// đặt lại password

// Lưu tạm mã xác minh (có thể dùng Redis hoặc DB nếu muốn bảo mật hơn)
const resetCodes = new Map();

// Gửi mã xác minh qua email
exports.sendResetCode = async (req, res) => {
  const { email } = req.body;
  try {
    const userRes = await pool.query('SELECT * FROM users WHERE username = $1', [email]);
    const user = userRes.rows[0];
    if (!user) return res.status(400).json({ message: 'Email không tồn tại' });

    const code = Math.floor(100000 + Math.random() * 900000).toString(); // 6 số
    resetCodes.set(email, code);

    // Cấu hình Gmail SMTP
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `"Hệ thống" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Mã xác minh đặt lại mật khẩu',
      html: `<p>Mã xác minh của bạn là: <b>${code}</b></p>`,
    });

    res.json({ message: 'Đã gửi mã xác minh' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi khi gửi mã xác minh' });
  }
};

// Đặt lại mật khẩu
exports.resetPassword = async (req, res) => {
  const { email, code, newPassword } = req.body;
  try {
    const savedCode = resetCodes.get(email);
    if (!savedCode || savedCode !== code)
      return res.status(400).json({ message: 'Mã xác minh không đúng hoặc đã hết hạn' });

    const hashed = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password = $1 WHERE username = $2', [hashed, email]);

    resetCodes.delete(email); // xoá mã sau khi sử dụng
    res.json({ message: 'Đặt lại mật khẩu thành công' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server' });
  }
};
