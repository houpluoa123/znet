const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const app = express();
const PORT = process.env.PORT || 10000;

// Cấu hình Multer lưu tạm ảnh trên RAM (Memory Storage) để tự động xóa sạch sau khi xử lý
const upload = multer({ storage: multer.memoryStorage() });

app.use(express.urlencoded({ extended: true }));

// Giao diện trang web thuần HTML/CSS trực quan, không lo lỗi Vite
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="vi">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>ZNet - Đóng Dấu Bản Quyền Ảnh</title>
        <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f6f9; margin: 0; padding: 20px; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
            .container { background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); width: 100%; max-width: 450px; box-sizing: border-box; }
            h2 { text-align: center; color: #333; margin-bottom: 20px; }
            .form-group { margin-bottom: 15px; }
            label { display: block; margin-bottom: 5px; font-weight: bold; color: #555; }
            input[type="text"], input[type="file"] { width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 6px; box-sizing: border-box; }
            button { width: 100%; background-color: #007bff; color: white; border: none; padding: 12px; border-radius: 6px; font-size: 16px; font-weight: bold; cursor: pointer; transition: background 0.3s; margin-top: 10px; }
            button:hover { background-color: #0056b3; }
            .note { font-size: 12px; color: #888; text-align: center; margin-top: 15px; }
        </style>
    </head>
    <body>
        <div class="container">
            <h2>Đóng Dấu Bản Quyền Ảnh</h2>
            <form action="/upload" method="POST" enctype="multipart/form-data">
                <div class="form-group">
                    <label>Chọn ảnh cần đóng dấu:</label>
                    <input type="file" name="image" accept="image/*" required>
                </div>
                <div class="form-group">
                    <label>Thông tin bản quyền (Tên/Chữ ký):</label>
                    <input type="text" name="watermarkText" placeholder="Ví dụ: Bản quyền thuộc về Vũ" required>
                </div>
                <button type="submit">Xử lý & Tải ảnh về ngay</button>
            </form>
            <p class="note">🔒 Bảo mật: Ảnh được xử lý trực tiếp trên RAM và xóa sạch khỏi server ngay sau khi bạn tải xuống thành công.</p>
        </div>
    </body>
    </html>
  `);
});

// Tuyến đường xử lý đóng dấu ảnh bản quyền
app.post('/upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file || !req.body.watermarkText) {
      return res.status(400).send('Vui lòng điền đầy đủ thông tin và chọn ảnh.');
    }

    const watermarkText = req.body.watermarkText;
    const imageBuffer = req.file.buffer;

    // Đọc kích thước ảnh gốc để tự căn chỉnh cỡ chữ bản quyền cho đẹp
    const metadata = await sharp(imageBuffer).metadata();
    const width = metadata.width || 800;
    const height = metadata.height || 600;
    
    // Tính toán kích thước chữ động dựa trên độ rộng của bức ảnh
    const fontSize = Math.max(Math.floor(width / 25), 20);

    // Tạo một lớp SVG chứa chữ bản quyền (Hỗ trợ tiếng Việt Unicode hoàn hảo)
    const svgText = `
      <svg width="${width}" height="${height}">
        <style>
          .watermark {
            fill: rgba(255, 255, 255, 0.45);
            font-size: ${fontSize}px;
            font-weight: bold;
            font-family: 'Helvetica Neue', Arial, sans-serif;
          }
          .shadow {
            fill: rgba(0, 0, 0, 0.25);
            font-size: ${fontSize}px;
            font-weight: bold;
            font-family: 'Helvetica Neue', Arial, sans-serif;
          }
        </style>
        <text x="50%" y="90%" text-anchor="middle" class="shadow">${watermarkText}</text>
        <text x="50%" y="89.7%" text-anchor="middle" class="watermark">${watermarkText}</text>
      </svg>
    `;

    // Thực hiện chèn lớp chữ đóng dấu vào góc dưới của ảnh gốc
    const processedImageBuffer = await sharp(imageBuffer)
      .composite([{ input: Buffer.from(svgText), top: 0, left: 0 }])
      .toBuffer();

    // Thiết lập header bắt trình duyệt tự động tải file về tên là 'copyrighted_image.png'
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', 'attachment; filename=copyrighted_image.png');
    
    // Gửi file trả về cho người dùng và giải phóng RAM lập tức
    res.send(processedImageBuffer);

  } catch (error) {
    console.error(error);
    res.status(500).send('Có lỗi xảy ra trong quá trình xử lý đóng dấu ảnh.');
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Ứng dụng đang chạy mượt mà tại cổng: ${PORT}`);
});

