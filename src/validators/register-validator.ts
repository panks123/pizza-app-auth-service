import { checkSchema } from "express-validator";
// import { body } from "express-validator";

// Schema method
export default checkSchema({
  email: {
    notEmpty: true,
    errorMessage: "Email is required!",
  },
});

// Validation chain method
// export default [
//     body("email").notEmpty().withMessage("Email is required!").isEmail().withMessage("Invalid email format!")
// ]
