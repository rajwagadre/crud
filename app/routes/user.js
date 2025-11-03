import express from 'express';
import { createUser , loginUser, me } from '../controllers/user.js';
import { uploadImage } from '../middlewares/fileUploader.js';
import auth from '../middlewares/auth.js';

const router = express.Router();

router.post('/register', uploadImage , createUser);
router.post('/login', loginUser);
router.get('/me', auth , me);

export default router;