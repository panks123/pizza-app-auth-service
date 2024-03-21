import createJWKSMock from "mock-jwks";
import { DataSource } from "typeorm";
import { AppDataSource } from "../../src/config/data-source";
import { User } from "../../src/entity/User";
import { Roles } from "../../src/constants";
import { RefreshToken } from "../../src/entity/RefreshToken";
import request from "supertest";
import app from "../../src/app";
import { sign } from "jsonwebtoken";
import { Config } from "../../src/config";
import { isJWT } from "../utils";

describe("POST /auth/logout", () => {
  let connection: DataSource;
  let jwks: ReturnType<typeof createJWKSMock>;
  beforeAll(async () => {
    // Create DB connection - before all the testcases
    jwks = createJWKSMock("http://localhost:5501"); // Create JWKS mock server
    connection = await AppDataSource.initialize();
  });

  beforeEach(async () => {
    jwks.start(); // Start JWKS mock server
    await connection.dropDatabase();
    await connection.synchronize();
  });

  afterEach(() => {
    jwks.stop();
  });

  afterAll(async () => {
    // Close DB connection
    await connection.destroy();
  });

  describe("Given all fields", () => {
    it("should return 200 status code", async () => {
      const userData = {
        firstName: "Pankaj",
        lastName: "Kumar",
        email: "pankaj@testemail.com",
        password: "secret123",
      };
      const userRepository = connection.getRepository(User);
      const user = await userRepository.save({
        ...userData,
        role: Roles.CUSTOMER,
      });
      const refreshTokenRepo = connection.getRepository(RefreshToken);
      const refreshTokenData = await refreshTokenRepo.save({
        user: user,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365),
      });
      // Generate tokens
      const accessToken = jwks.token({ sub: String(user.id), role: user.role });
      const payload = {
        sub: String(user.id),
        role: user.role,
        id: refreshTokenData.id,
      };
      const refreshToken = sign(payload, Config.REFRESH_TOKEN_SECRET!, {
        algorithm: "HS256",
        expiresIn: "1y",
        issuer: "auth-service",
        jwtid: String(payload.id), // id of the saved referesh token in DB
      });
      // Action
      const response = await request(app)
        .post("/auth/logout")
        .set("Cookie", [
          `accessToken=${accessToken}`,
          `refreshToken=${refreshToken}`,
        ])
        .send();

      // Assert
      expect(response.statusCode).toBe(200);
    });

    it("should clear the accessToken and refreshTOken cookies", async () => {
      const userData = {
        firstName: "Pankaj",
        lastName: "Kumar",
        email: "pankaj@testemail.com",
        password: "secret123",
      };
      const userRepository = connection.getRepository(User);
      const user = await userRepository.save({
        ...userData,
        role: Roles.CUSTOMER,
      });
      const refreshTokenRepo = connection.getRepository(RefreshToken);
      const refreshTokenData = await refreshTokenRepo.save({
        user: user,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365),
      });
      // Generate tokens
      const accessToken = jwks.token({ sub: String(user.id), role: user.role });
      const payload = {
        sub: String(user.id),
        role: user.role,
        id: refreshTokenData.id,
      };
      const refreshToken = sign(payload, Config.REFRESH_TOKEN_SECRET!, {
        algorithm: "HS256",
        expiresIn: "1y",
        issuer: "auth-service",
        jwtid: String(payload.id), // id of the saved referesh token in DB
      });
      // Action
      const response = await request(app)
        .post("/auth/logout")
        .set("Cookie", [
          `accessToken=${accessToken}`,
          `refreshToken=${refreshToken}`,
        ])
        .send();

      interface Headers {
        ["set-cookie"]: string[];
      }
      const cookies =
        (response.headers as unknown as Headers)["set-cookie"] || [];
      let accessTokenFromCookie: string | null = null;
      let refreshTokenFromCookie: string | null = null;

      cookies.forEach((cookie) => {
        if (cookie.startsWith("accessToken=")) {
          accessTokenFromCookie = cookie.split(";")[0].split("=")[1];
        }

        if (cookie.startsWith("refreshToken")) {
          refreshTokenFromCookie = cookie.split(";")[0].split("=")[1];
        }
      });

      // Assert
      expect(accessTokenFromCookie).toHaveLength(0); // checking empty string
      expect(refreshTokenFromCookie).toHaveLength(0); // checking empty string
      expect(isJWT(accessTokenFromCookie)).toBeFalsy();
      expect(isJWT(refreshTokenFromCookie)).toBeFalsy();
    });

    it("should remove the refrehToken from the DB", async () => {
      const userData = {
        firstName: "Pankaj",
        lastName: "Kumar",
        email: "pankaj@testemail.com",
        password: "secret123",
      };
      const userRepository = connection.getRepository(User);
      const user = await userRepository.save({
        ...userData,
        role: Roles.CUSTOMER,
      });
      const refreshTokenRepo = connection.getRepository(RefreshToken);
      const refreshTokenData = await refreshTokenRepo.save({
        user: user,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365),
      });
      // Generate tokens
      const accessToken = jwks.token({ sub: String(user.id), role: user.role });
      const payload = {
        sub: String(user.id),
        role: user.role,
        id: refreshTokenData.id,
      };
      const refreshToken = sign(payload, Config.REFRESH_TOKEN_SECRET!, {
        algorithm: "HS256",
        expiresIn: "1y",
        issuer: "auth-service",
        jwtid: String(payload.id), // id of the saved referesh token in DB
      });
      // Action
      await request(app)
        .post("/auth/logout")
        .set("Cookie", [
          `accessToken=${accessToken}`,
          `refreshToken=${refreshToken}`,
        ])
        .send();

      const data = await refreshTokenRepo.findOne({
        where: { id: refreshTokenData.id },
      });

      // Assert
      expect(data).toBeNull();
    });
  });

  describe("Fields are missing", () => {
    it("should return 401 status code if accessToken is missing in the cookie", async () => {
      const response = await request(app)
        .post("/auth/logout")
        // .set("Cookie", [`accessToken=${accessToken}`, `refreshToken=${refreshToken}`])
        .send();

      expect(response.statusCode).toBe(401);
    });

    it("should return 401 status code if accessToken is present but refreshToken is missing in the cookie", async () => {
      // Arrange
      const userData = {
        firstName: "Pankaj",
        lastName: "Kumar",
        email: "pankaj@testemail.com",
        password: "secret123",
      };
      const userRepository = connection.getRepository(User);
      const user = await userRepository.save({
        ...userData,
        role: Roles.CUSTOMER,
      });
      const accessToken = jwks.token({ sub: String(user.id), role: user.role });
      // Action
      const response = await request(app)
        .post("/auth/logout")
        .set("Cookie", [`accessToken=${accessToken}`])
        .send();

      // Assert
      expect(response.statusCode).toBe(401);
    });
  });
});
