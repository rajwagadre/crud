import express from 'express';
import dotenv from 'dotenv';
import connectDB from './app/dbConfig/dbConfig.js';
import setupRoutes from './app/routes/index.js';
import morgan from 'morgan';
import mediasetup from "./app/routes/media.js"

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.use(morgan('dev'));

app.get('/', (req, res) => {
  res.send('Hello, World!');
});

connectDB(); 
setupRoutes(app);
mediasetup(app);

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});