import multer from 'multer';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

const __dirname = path.dirname(new URL(import.meta.url).pathname);
const BASE_PATH = path.join(__dirname, "../uploads");

const uploadImage = (req, res, next) => {
  const BASE_PATH = path.join(__dirname, "../uploads");

  if (!fs.existsSync(BASE_PATH)) {
    fs.mkdirSync(BASE_PATH, { recursive: true });
  }

  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, BASE_PATH),
    filename: (req, file, cb) => {
      const fileNameWithoutExt = path.parse(file.originalname).name;
      cb(null, fileNameWithoutExt + '-' + Date.now() + path.extname(file.originalname));
    },
  });

  const upload = multer({
    storage: storage,
    limits: { fileSize: 1024 * 1024 * 1024 * 5 },
    fileFilter: (req, file, cb) => cb(null, true),
  });

  upload.any()(req, res, async (err) => {
    if (err) {
      console.error("Upload Error:", err);
      return res.status(400).send({ message: "File upload failed." });
    }

    const convertedFiles = {};

    try {
      if (Array.isArray(req.files)) {
        for (const file of req.files) {
          const uploadedFilePath = path.join(BASE_PATH, file.filename);
          const ext = path.extname(file.originalname).toLowerCase();
          const isImage = ['.jpg', '.jpeg', '.png'].includes(ext);

          let finalFileName;

          if (isImage) {
            finalFileName = `${Date.now()}-${path.parse(file.originalname).name}.webp`;
            const webpFilePath = path.join(BASE_PATH, finalFileName);

            await sharp(uploadedFilePath)
              .webp({ quality: 80 })
              .toFile(webpFilePath);

            fs.unlinkSync(uploadedFilePath);
          } else {
            finalFileName = file.filename;
          }

          const match = file.fieldname.match(/^([^\[]+)/);
          const key = match ? match[1] : 'unknown';

          const indexMatch = file.fieldname.match(/\[(\d+)\]/);
          const index = indexMatch ? parseInt(indexMatch[1], 10) : null;

          if (!convertedFiles[key]) {
            convertedFiles[key] = [];
          }

        const fileUrl = `${process.env.BASE_URL}/media/${encodeURIComponent(finalFileName)}`;
        //   const fileUrl = `http://192.168.0.152:8050/media/${encodeURIComponent(finalFileName)}`;
          // const fileUrl = `${process.env.BASE_URL}/media/${encodeURIComponent(finalFileName)}`;

          if (index !== null) {
            if (!Array.isArray(convertedFiles[key][index])) {
              convertedFiles[key][index] = [];
            }
            convertedFiles[key][index].push(fileUrl);
          } else {
            convertedFiles[key].push(fileUrl);
          }
        }
      }

      req.convertedFiles = convertedFiles;
      next();
    } catch (error) {
      console.error("Conversion error:", error);
      return res.status(500).send({ message: "Error processing media files." });
    }
  });
};

export { uploadImage };
