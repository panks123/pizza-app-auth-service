import { NextFunction, Response } from "express";
import { RegisterUserRequest } from "../types";
import { UserService } from "../services/UserService";
import createHttpError from "http-errors";
import { Logger } from "winston";

export class AuthController {
  constructor(
    private userService: UserService,
    private logger: Logger,
  ) {}

  async register(req: RegisterUserRequest, res: Response, next: NextFunction) {
    const { firstName, lastName, email, password } = req.body;
    try {
      const user = await this.userService.create({
        firstName,
        lastName,
        email,
        password,
      });
      this.logger.debug("New request to register a user", {
        firstName,
        lastName,
        email,
        password: "********",
      });
      if (user) {
        this.logger.info("User has been registered", { id: user.id });
        res.status(201).json({ id: user.id });
      } else {
        const error = createHttpError(400, "Bad request");
        throw error;
      }
    } catch (err) {
      next(err);
      return;
    }
  }
}
