import { NextFunction, Response } from "express";
import { AuthRequest, RegisterUserRequest } from "../types";
import { UserService } from "../services/UserService";
import createHttpError from "http-errors";
import { Logger } from "winston";
import { validationResult } from "express-validator";
import { JwtPayload } from "jsonwebtoken";
import { TokenService } from "../services/TokenService";
import { CredentialService } from "../services/CredentialService";

export class AuthController {
  constructor(
    private userService: UserService,
    private logger: Logger,
    private tokenService: TokenService,
    private credentialServise: CredentialService,
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

        const newRefreshToken =
          await this.tokenService.persistRefreshToken(user);
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

  async login(req: RegisterUserRequest, res: Response, next: NextFunction) {
    const validationRes = validationResult(req);
    if (!validationRes.isEmpty()) {
      return res.status(400).json({ errors: validationRes.array() });
    }

    const { email, password } = req.body;

    this.logger.debug("New request to login a user", {
      email,
      password: "********",
    });
    try {
      // Check if username (email in our case) exists in DB
      const user = await this.userService.findByEmail(email);
      if (!user) {
        const error = createHttpError(400, "Email or Password does not match");
        throw error;
      } else {
        // Compare password
        const passwordMatched = await this.credentialServise.comaparePassword(
          password,
          user.password,
        );
        if (!passwordMatched) {
          const error = createHttpError(
            400,
            "Email or Password does not match",
          );
          throw error;
        } else {
          // Generate tokens
          const payload: JwtPayload = {
            sub: String(user.id),
            role: user.role,
          };

          const accessToken = this.tokenService.generateAccessToken(payload);
          const newRefreshToken =
            await this.tokenService.persistRefreshToken(user);
          const refreshToken = this.tokenService.generateRefreshToken({
            ...payload,
            id: newRefreshToken.id,
          });
          // Add tokens to Cookies
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

          this.logger.info("User has been logged in", { id: user.id });
          // Return response
          res.json({ id: user.id });
        }
      }
    } catch (err) {
      next(err);
      return;
    }
  }

  async self(req: AuthRequest, res: Response) {
    const user = await this.userService.findById(Number(req.auth.sub));
    res.json(user);
  }
}
