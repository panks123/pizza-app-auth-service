import { NextFunction, Response } from "express";
import { RegisterUserRequest } from "../types";
import { UserService } from "../services/UserService";
import createHttpError from "http-errors";
import { Logger } from "winston";
import { validationResult } from "express-validator";
import { JwtPayload } from "jsonwebtoken";
import { AppDataSource } from "../config/data-source";
import { RefreshToken } from "../entity/RefreshToken";
import { TokenService } from "../services/TokenService";

export class AuthController {
  constructor(
    private userService: UserService,
    private logger: Logger,
    private tokenService: TokenService,
  ) {}

  async register(req: RegisterUserRequest, res: Response, next: NextFunction) {
    const validationRes = validationResult(req);
    if (!validationRes.isEmpty()) {
      return res.status(400).json({ errors: validationRes.array() });
    }

    const { firstName, lastName, email, password } = req.body;

    this.logger.debug("New request to register a user", {
      firstName,
      lastName,
      email,
      password: "********",
    });

    try {
      const user = await this.userService.create({
        firstName,
        lastName,
        email,
        password,
      });

      if (user) {
        this.logger.info("User has been registered", { id: user.id });

        const payload: JwtPayload = {
          sub: String(user.id),
          role: user.role,
        };

        const accessToken = this.tokenService.generateAccessToken(payload);

        // Persist the refresh token in DB
        const MS_IN_YEAR = 1000 * 60 * 60 * 24 * 365;
        const refreshTokenRepository =
          AppDataSource.getRepository(RefreshToken);
        const newRefreshToken = await refreshTokenRepository.save({
          user: user,
          expiresAt: new Date(Date.now() + MS_IN_YEAR),
        });

        // const refreshToken = sign(payload, Config.REFRESH_TOKEN_SECRET!, {
        //   algorithm: "HS256",
        //   expiresIn: "1y",
        //   issuer: "auth-service",
        //   jwtid: String(newRefreshToken.id) // id of the saved referesh token in DB
        // });

        const refreshToken = this.tokenService.generateRefreshToken({
          ...payload,
          id: newRefreshToken.id,
        });

        res.cookie("accessToken", accessToken, {
          domain: "localhost",
          sameSite: "strict",
          maxAge: 3600000, // 60* 1000 * 60 (time in ms) => for 1 hour
          httpOnly: true,
        });
        res.cookie("refreshToken", refreshToken, {
          domain: "localhost",
          sameSite: "strict",
          maxAge: 31536000000, // 60* 1000 * 60 * 24 * 365 (time in ms) => for 1 year
          httpOnly: true,
        });

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
