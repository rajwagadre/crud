import Joi from "joi";

export const createTodoValidator = Joi.object({
  title: Joi.string().required(),
  description: Joi.string().allow(""),
  priority: Joi.string().valid("low", "medium", "high").default("medium"),
  dueDate: Joi.date().optional(),
});
