import { checkSchema } from "express-validator";

export default checkSchema(
  {
    q: {
      trim: true,
      customSanitizer: {
        options: (value: string) => {
          return value ? value : "";
        },
      },
    },
    role: {
      customSanitizer: {
        options: (value: string) => {
          return value ? value : "";
        },
      },
    },
    currentPage: {
      // in: ["query"],
      customSanitizer: {
        options: (value) => {
          const parsedValue = Number(value);
          return Number.isNaN(parsedValue) ? 1 : parsedValue;
        },
      },
    },
    perPage: {
      // in: ["query"],
      customSanitizer: {
        options: (value) => {
          const parsedValue = Number(value);
          return Number.isNaN(parsedValue) ? 6 : parsedValue;
        },
      },
    },
  },
  ["query"],
);
