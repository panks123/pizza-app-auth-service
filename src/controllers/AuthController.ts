import { NextFunction, Response } from "express";
import { AuthRequest, RegisterUserRequest } from "../types";
import { UserService } from "../services/UserService";
import createHttpError from "http-errors";
import { Logger } from "winston";
import { validationResult } from "express-validator";
import { JwtPayload } from "jsonwebtoken";
import { TokenService } from "../services/TokenService";
import { CredentialService } from "../services/CredentialService";
import { Roles } from "../constants";

export class AuthController {
  constructor(
    private userService: UserService,
    private logger: Logger,
    private tokenService: TokenService,
    private credentialServise: CredentialService,
  ) {}

  setAccessTokenCookie(res: Response, accessToken: string) {
    res.cookie("accessToken", accessToken, {
      domain: "localhost",
      sameSite: "strict",
      maxAge: 3600000, // 60* 1000 * 60 (time in ms) => for 1 hour
      httpOnly: true,
    });
  }

  setRefreshTokenCookie(res: Response, refreshToken: string) {
    res.cookie("refreshToken", refreshToken, {
      domain: "localhost",
      sameSite: "strict",
      maxAge: 31536000000, // 60* 1000 * 60 * 24 * 365 (time in ms) => for 1 year
      httpOnly: true,
    });
  }

  async register(req: RegisterUserRequest, res: Response, next: NextFunction) {
    const validationRes = validationResult(req);
    if (!validationRes.isEmpty()) {
      return next(createHttpError(400, validationRes.array()[0].msg as string));
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
        role: Roles.CUSTOMER,
      });

      if (user) {
        this.logger.info("User has been registered", { id: user.id });

        const payload: JwtPayload = {
          sub: String(user.id),
          role: user.role,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
        };

        const accessToken = this.tokenService.generateAccessToken(payload);

        const newRefreshToken =
          await this.tokenService.persistRefreshToken(user);
        const refreshToken = this.tokenService.generateRefreshToken({
          ...payload,
          id: newRefreshToken.id,
        });

        this.setAccessTokenCookie(res, accessToken);
        this.setRefreshTokenCookie(res, refreshToken);

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
      return next(createHttpError(400, validationRes.array()[0].msg as string));
    }

    const { email, password } = req.body;

    this.logger.debug("New request to login a user", {
      email,
      password: "********",
    });
    try {
      // Check if username (email in our case) exists in DB
      const user = await this.userService.findByEmailWithPassword(email);
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
            tenant: user.tenant ? String(user.tenant.id) : "",
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
          };

          const accessToken = this.tokenService.generateAccessToken(payload);
          const newRefreshToken =
            await this.tokenService.persistRefreshToken(user);
          const refreshToken = this.tokenService.generateRefreshToken({
            ...payload,
            id: newRefreshToken.id,
          });
          // Add tokens to Cookies
          this.setAccessTokenCookie(res, accessToken);
          this.setRefreshTokenCookie(res, refreshToken);

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
    res.json({ ...user, password: undefined }); // do no send password
  }

  async refresh(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const payload: JwtPayload = {
        sub: req.auth.sub,
        role: req.auth.role,
        tenant: req.auth.tenant,
        firstName: req.auth.firstName,
        lastName: req.auth.lastName,
        email: req.auth.email,
      };

      const user = await this.userService.findById(Number(req.auth.sub));
      if (!user) {
        next(createHttpError(400, "User with the token could not be found"));
        return;
      }
      // persist refresh token
      const newRefreshToken = await this.tokenService.persistRefreshToken(user);

      this.logger.info("New refresh token has been added", {
        id: newRefreshToken.id,
      });

      // delete prevoius request token (doing token rotation)
      await this.tokenService.deleteRefreshToken(Number(req.auth.id));

      this.logger.info("Previous refresh token has been removed", {
        id: req.auth.id,
      });

      const accessToken = this.tokenService.generateAccessToken(payload);
      const refreshToken = this.tokenService.generateRefreshToken({
        ...payload,
        id: newRefreshToken.id,
      });

      this.setAccessTokenCookie(res, accessToken);
      this.setRefreshTokenCookie(res, refreshToken);

      res.json({ id: user.id });
    } catch (err) {
      next(err);
      return;
    }
  }

  async logout(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id: refreshTokenId, sub: userId } = req.auth;
      await this.tokenService.deleteRefreshToken(Number(refreshTokenId));

      this.logger.info("RefreshToken has been deleted from DB", {
        refreshTokenId,
      });
      this.logger.info("User has been logged out", { userId });

      // Clear cookies
      res.clearCookie("accessToken");
      res.clearCookie("refreshToken");
      res.json({});
    } catch (err) {
      next(err);
      return;
    }
  }
}
