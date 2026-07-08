import { Router } from 'express';
import multer from 'multer';
import { chat } from '@/controllers/ai.controller.js';

const upload = multer({ storage: multer.memoryStorage() });

export const aiRoutes = Router();
aiRoutes.post('/chat', chat);
aiRoutes.post('/upload-placeholder', upload.single('image'), (_req, res) => {
  res.json({ success: true, message: 'Image upload placeholder accepted' });
});
