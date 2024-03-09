import { DataSource } from "typeorm";
import { AppDataSource } from "../../src/config/data-source";
import request from "supertest";
import app from "../../src/app";
import { isJWT } from "../utils";
import { RefreshToken } from "../../src/entity/RefreshToken";

describe("POST /auth/login", () => {
  let connection: DataSource;

  beforeAll(async () => {
    // Create DB connection - before all the testcases
    connection = await AppDataSource.initialize();
  });

  beforeEach(async () => {
    await connection.dropDatabase();
    await connection.synchronize();
  });

  afterAll(async () => {
    // Close DB connection
    await connection.destroy();
  });

  describe("Given all fields", () => {
    describe("Credentials are Correct", () => {
      it("should return 200 status code", async () => {
        // Arrange
        const userRegisterData = {
          firstName: "Panka",
          lastName: "Kumar",
          email: "pankaj@testemail.com",
          password: "secret123",
        };
        const userLoginData = {
          email: userRegisterData.email,
          password: userRegisterData.password,
        };
        // Act
        await request(app).post("/auth/register").send(userRegisterData);
        const response = await request(app)
          .post("/auth/login")
          .send(userLoginData);
        // Assert
        expect(response.statusCode).toBe(200);
      });

      it("should return a valid json response", async () => {
        // Arrange
        const userRegisterData = {
          firstName: "Panka",
          lastName: "Kumar",
          email: "pankaj@testemail.com",
          password: "secret123",
        };
        const userLoginData = {
          email: userRegisterData.email,
          password: userRegisterData.password,
        };
        // Act
        await request(app).post("/auth/register").send(userRegisterData);
        const response = await request(app)
          .post("/auth/login")
          .send(userLoginData);
        expect(response.headers["content-type"]).toEqual(
          expect.stringContaining("json"),
        );
      });

      it("should return id of the user", async () => {
        // Arrange
        const userRegisterData = {
          firstName: "Panka",
          lastName: "Kumar",
          email: "pankaj@testemail.com",
          password: "secret123",
        };
        const userLoginData = {
          email: userRegisterData.email,
          password: userRegisterData.password,
        };
        // Act
        const registerResponse = await request(app)
          .post("/auth/register")
          .send(userRegisterData);
        const loginResponse = await request(app)
          .post("/auth/login")
          .send(userLoginData);
        expect(loginResponse.body).toHaveProperty("id");
        expect((loginResponse.body as { id: number | string }).id).toBe(
          (registerResponse.body as { id: number | string }).id,
        );
      });

      it("should return access token and refresh token inside a cookie", async () => {
        const userRegisterData = {
          firstName: "Panka",
          lastName: "Kumar",
          email: "pankaj@testemail.com",
          password: "secret123",
        };
        const userLoginData = {
          email: userRegisterData.email,
          password: userRegisterData.password,
        };
        // Act
        await request(app).post("/auth/register").send(userRegisterData);
        const response = await request(app)
          .post("/auth/login")
          .send(userLoginData);
        interface Headers {
          ["set-cookie"]: string[];
        }
        const cookies =
          (response.headers as unknown as Headers)["set-cookie"] || [];
        let accessToken: string | null = null;
        let refreshToken: string | null = null;

        cookies.forEach((cookie) => {
          if (cookie.startsWith("accessToken=")) {
            accessToken = cookie.split(";")[0].split("=")[1];
          }

          if (cookie.startsWith("refreshToken")) {
            refreshToken = cookie.split(";")[0].split("=")[1];
          }
        });
        expect(accessToken).not.toBeNull();
        expect(refreshToken).not.toBeNull();

        expect(isJWT(accessToken)).toBeTruthy();
        expect(isJWT(refreshToken)).toBeTruthy();
      });

      it("should store the refresh token in the database after login", async () => {
        const userRegisterData = {
          firstName: "Panka",
          lastName: "Kumar",
          email: "pankaj@testemail.com",
          password: "secret123",
        };
        const userLoginData = {
          email: userRegisterData.email,
          password: userRegisterData.password,
        };
        // Act
        await request(app).post("/auth/register").send(userRegisterData);
        const response = await request(app)
          .post("/auth/login")
          .send(userLoginData);

        // Assert
        const refreshTokenRepo = connection.getRepository(RefreshToken);
        // const refreshTokens = await refreshTokenRepo.find();
        // expect(refreshTokens).toHaveLength(2);
        const tokens = await refreshTokenRepo
          .createQueryBuilder("refreshToken")
          .where("refreshToken.userId = :userId", {
            userId: (response.body as Record<string, string>).id,
          })
          .getMany();
        // tokens - is all the records in refreshToken Table whose userId is equal to response.body.id

        expect(tokens).toHaveLength(2);
      });
    });

    describe("Credentials are Incorrect", () => {
      it("should return 400 status code if email field is incorrect", async () => {
        const userRegisterData = {
          firstName: "Panka",
          lastName: "Kumar",
          email: "pankaj@testemail.com",
          password: "secret123",
        };
        const userLoginData = {
          email: "incorrectemail@testemail.com",
          password: userRegisterData.password,
        };
        // Act
        await request(app).post("/auth/register").send(userRegisterData);
        const response = await request(app)
          .post("/auth/login")
          .send(userLoginData);
        expect(response.statusCode).toBe(400);
      });

      it("should return 400 status code if password field is incorrect", async () => {
        const userRegisterData = {
          firstName: "Panka",
          lastName: "Kumar",
          email: "pankaj@testemail.com",
          password: "secret123",
        };
        const userLoginData = {
          email: userRegisterData.email,
          password: "incorrectpssword",
        };
        // Act
        await request(app).post("/auth/register").send(userRegisterData);
        const response = await request(app)
          .post("/auth/login")
          .send(userLoginData);
        expect(response.statusCode).toBe(400);
      });
    });
  });

  describe("Fields are missing", () => {
    it("should return 400 status code if email field is missing", async () => {
      const userData = {
        email: "",
        password: "secret123",
      };
      // Act
      const response = await request(app).post("/auth/login").send(userData);
      expect(response.statusCode).toBe(400);
    });

    it("should return 400 status code if password field is missing", async () => {
      const userData = {
        email: "pankaj@testemail.com",
        password: "",
      };
      // Act
      const response = await request(app).post("/auth/login").send(userData);
      expect(response.statusCode).toBe(400);
    });

    it("should return an array of errors if email field is missing", async () => {
      const userData = {
        email: "",
        password: "secret123",
      };
      // Act
      const response = await request(app).post("/auth/login").send(userData);
      expect(response.body).toHaveProperty("errors");
      const errors = (
        response.body as {
          errors: {
            type: string;
            msg: string;
            location: string;
            path: string;
          }[];
        }
      ).errors;

      expect(Array.isArray(errors)).toBeTruthy();
    });
  });

  describe("Fields are not in proper format", () => {
    it("should return 400 status code if email is not in valid email format", async () => {
      const userData = {
        email: "testemail.com",
        password: "secret123",
      };
      // Act
      const response = await request(app).post("/auth/login").send(userData);
      expect(response.statusCode).toBe(400);
    });
  });
});
