import { NextFunction, Request, Response } from "express";
import { AuthRequest } from "../types";
import createHttpError from "http-errors";
import { Roles } from "../constants";

export const canAccess = (roles: (typeof Roles)[keyof typeof Roles][]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const _req = req as AuthRequest;
    const roleFromTOken = _req.auth.role;

    if (!roles.includes(roleFromTOken as (typeof Roles)[keyof typeof Roles])) {
      const error = createHttpError(403, "You don't have enough permissions");
      return next(error);
    }
    next();
  };
};
