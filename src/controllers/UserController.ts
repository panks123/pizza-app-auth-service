import { NextFunction, Request, Response } from "express";
import { UserService } from "../services/UserService";
import { CreateUserRequest } from "../types";
import { validationResult } from "express-validator";
import createHttpError from "http-errors";
import { Logger } from "winston";

export class UserController {
  constructor(
    private userService: UserService,
    private logger: Logger,
  ) {}

  async create(req: CreateUserRequest, res: Response, next: NextFunction) {
    const validationRes = validationResult(req);
    if (!validationRes.isEmpty()) {
      return res.status(400).json({ errors: validationRes.array() });
    }
    const { firstName, lastName, email, password, role, tenantId } = req.body;
    try {
      const user = await this.userService.create({
        firstName,
        lastName,
        email,
        password,
        role,
        tenantId,
      });
      res.status(201).json({ id: user.id });
    } catch (err) {
      next(err);
    }
  }

  async update(req: CreateUserRequest, res: Response, next: NextFunction) {
    // In our project: We are not allowing user to change the email id since it is used as username
    // In our project: We are not allowing admin user to change others password
    const validationRes = validationResult(req);
    if (!validationRes.isEmpty()) {
      return res.status(400).json({ errors: validationRes.array() });
    }

    const userId = req.params.id;
    if (isNaN(Number(userId))) {
      return next(createHttpError(400, "Invalid url param"));
    }

    const { firstName, lastName, role } = req.body;
    try {
      const user = await this.userService.findById(Number(userId));
      if (!user) {
        const error = createHttpError(400, "User does not exist");
        return next(error);
      }
      await this.userService.updateById(Number(userId), {
        firstName,
        lastName,
        role,
      });
      this.logger.info("User has been updated", { id: userId });
      res.json({ id: Number(userId) });
    } catch (err) {
      next(err);
    }
  }

  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const users = await this.userService.getAll();

      this.logger.info("All users have been fetched");
      res.json(users);
    } catch (err) {
      next(err);
    }
  }

  async getOne(req: Request, res: Response, next: NextFunction) {
    const userId = req.params.id;

    if (isNaN(Number(userId))) {
      next(createHttpError(400, "Invalid url param."));
      return;
    }

    try {
      const user = await this.userService.findById(Number(userId));

      if (!user) {
        next(createHttpError(400, "User does not exist."));
        return;
      }

      this.logger.info("User has been fetched", { id: user.id });
      res.json(user);
    } catch (err) {
      next(err);
    }
  }

  async remove(req: Request, res: Response, next: NextFunction) {
    const userId = req.params.id;
    if (isNaN(Number(userId))) {
      return next(createHttpError(400, "Invalid uel param"));
    }

    try {
      const user = await this.userService.findById(Number(userId));
      if (!user) {
        return next(createHttpError(400, "User doesn't exist"));
      }

      await this.userService.deleteById(Number(userId));

      res.json({ id: Number(userId) });
    } catch (err) {
      next(err);
    }
  }
}
