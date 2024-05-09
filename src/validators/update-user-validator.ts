import { checkSchema } from "express-validator";
import { CreateUserRequest } from "../types";

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
    errorMessage: "Tenant id is required!",
    trim: true,
    custom: {
      options: async (value: string, { req }) => {
        const role = (req as CreateUserRequest).body.role;
        if (role === "admin") {
          return true;
        } else {
          return !!value;
        }
      },
    },
  },
});
