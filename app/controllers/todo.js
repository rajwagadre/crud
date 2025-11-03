import Todo from "../models/todo.js";
import { handleResponse } from "../utils/helper.js";
import { createTodoValidator } from "../validators/todo.js";

export const createTodo = async (req, res) => {
  try {
    const { error, value } = createTodoValidator.validate(req.body, { abortEarly: false });
    if (error) {
      return handleResponse(res, 400, "Validation Error", {
        details: error.details.map((err) => err.message),
      });
    }

    const newTodo = await Todo.create(value);

    return handleResponse(res, 201, "Todo created successfully", newTodo);
  } catch (error) {
    console.error("Error creating todo:", error.message);
    return handleResponse(res, 500, "Server Error", { error: error.message });
  }
};

export const getAllTodos = async (req, res) => {
  try {
    const todos = await Todo.find().sort({ createdAt: -1 });
    return handleResponse(res, 200, "Todos fetched successfully", todos);
  } catch (error) {
    console.error("Error fetching todos:", error.message);
    return handleResponse(res, 500, "Server Error", { error: error.message });
  }
};

export const getTodosById = async (req, res) => {
  try {
    const { id } = req.params;
    const todo = await Todo.findById(id);
    if (!todo) {
      return handleResponse(res, 404, "Todo not found");
    }
    return handleResponse(res, 200, "Todo fetched successfully", todo);
  } catch (error) {
    console.error("Error fetching todo by ID:", error.message);
    return handleResponse(res, 500, "Server Error", { error: error.message });
  }
};

export const updateTodo = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const updatedTodo = await Todo.findByIdAndUpdate(id, updates, { new: true });
    if (!updatedTodo) {
      return handleResponse(res, 404, "Todo not found");
    }
    return handleResponse(res, 200, "Todo updated successfully", updatedTodo);
  } catch (error) {
    console.error("Error updating todo:", error.message);
    return handleResponse(res, 500, "Server Error", { error: error.message });
  }
};

export const deleteTodo = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedTodo = await Todo.findByIdAndDelete(id);
    if (!deletedTodo) {
      return handleResponse(res, 404, "Todo not found");
    }
    return handleResponse(res, 200, "Todo deleted successfully", deletedTodo);
  } catch (error) {
    console.error("Error deleting todo:", error.message);
    return handleResponse(res, 500, "Server Error", { error: error.message });
  }
};