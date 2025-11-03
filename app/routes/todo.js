import express from 'express';
import { createTodo , getAllTodos , getTodosById , updateTodo , deleteTodo} from '../controllers/todo.js';
import auth from '../middlewares/auth.js';

const router = express.Router();

router.post('/', auth , createTodo);
router.get('/', auth , getAllTodos);
router.get('/:id', auth , getTodosById);
router.patch('/:id', auth , updateTodo);
router.delete('/:id', auth , deleteTodo);

export default router;