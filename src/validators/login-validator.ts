import { checkSchema } from "express-validator";

export default checkSchema({
  email: {
    trim: true,
    notEmpty: {
      errorMessage: "email is required!",
    },
    isEmail: {
      errorMessage: "Invalid email format!",
    },
  },
  password: {
    notEmpty: {
      errorMessage: "password is required!",
    },
  },
});
