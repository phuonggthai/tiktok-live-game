const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { WebcastPushConnection } = require('tiktok-live-connector');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

// CẤU HÌNH TÊN KÊNH TIKTOK (Thay bằng username kênh đang Live)
const TIKTOK_USERNAME = 'your_tiktok_username';

let tiktok = null;
try {
    tiktok = new WebcastPushConnection(TIKTOK_USERNAME, {
        processInitialData: false,
        enableExtendedGiftInfo: true
    });

    tiktok.connect().then(state => {
        console.info(`[TikTok] Đã kết nối phòng Live: ${state.roomId}`);
    }).catch(err => {
        console.warn('[TikTok] Chưa kết nối Live (Bỏ qua nếu chưa bật Live):', err.message || err);
    });

    tiktok.on('chat', data => {
        io.emit('chat', {
            userId: data.uniqueId,
            name: data.nickname,
            avatar: data.profilePictureUrl,
            text: data.comment
        });
    });

    tiktok.on('gift', data => {
        if (data.giftType === 1 && !data.repeatEnd) return;
        const totalCoins = data.diamondCount * (data.repeatCount || 1);
        io.emit('gift', {
            userId: data.uniqueId,
            name: data.nickname,
            avatar: data.profilePictureUrl,
            giftName: data.giftName,
            totalCoins: totalCoins
        });
    });
} catch (e) {
    console.error('[Lỗi khởi tạo TikTok]:', e.message);
}

// BỘ GIẢ LẬP TEST THỬ (Cho phép test thử bàn học và quà từ trình duyệt)
io.on('connection', socket => {
    console.log('[Socket] Giao diện game đã kết nối');

    socket.on('simulate_chat', data => {
        io.emit('chat', data);
    });

    socket.on('simulate_gift', data => {
        io.emit('gift', data);
    });
});

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Server đang chạy thành công tại http://localhost:${PORT}`);
});