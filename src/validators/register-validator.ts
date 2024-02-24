import { checkSchema } from "express-validator";
// import { body } from "express-validator";

// Schema method
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
  firstName: {
    trim: true,
    notEmpty: true,
    errorMessage: "firstName is required!",
  },
  lastName: {
    trim: true,
    notEmpty: true,
    errorMessage: "lastName is required!",
  },
  password: {
    notEmpty: {
      errorMessage: "password is required!",
    },
    isLength: {
      options: { min: 8 },
      errorMessage: "Password should be atleast 8 characters!",
    },
  },
});

// Validation chain method
// export default [
//     body("email").notEmpty().withMessage("Email is required!").isEmail().withMessage("Invalid email format!")
// ]
