import { checkSchema } from "express-validator";

export default checkSchema({
  firstName: {
    errorMessage: "First name is required!",
    notEmpty: true,
    trim: true,
  },
  lastName: {
    errorMessage: "Last name is required!",
    notEmpty: true,
    trim: true,
  },
  email: {
    trim: true,
    notEmpty: {
      errorMessage: "email is required!",
    },
    isEmail: {
      errorMessage: "Invalid email format!",
    },
  },
  role: {
    errorMessage: "Role is required!",
    notEmpty: true,
    trim: true,
  },
  tenantId: {
    notEmpty: true,
    errorMessage: "tenantId is required!",
  },
});
