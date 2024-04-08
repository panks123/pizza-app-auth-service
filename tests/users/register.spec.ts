import request from "supertest";
import app from "../../src/app";
import { DataSource } from "typeorm";
import { AppDataSource } from "../../src/config/data-source";
import { User } from "../../src/entity/User";
import { Roles } from "../../src/constants";
import { isJWT } from "../utils";
import { RefreshToken } from "../../src/entity/RefreshToken";

describe("POST /auth/register", () => {
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
    it("should return 201 status code", async () => {
      // AAA rule
      // A - Arrange data
      const userData = {
        firstName: "Panka",
        lastName: "Kumar",
        email: "pankaj@testemail.com",
        password: "secret123",
      };
      // A - Act
      const response = await request(app).post("/auth/register").send(userData);
      // A - Assert
      expect(response.statusCode).toBe(201);
    });

    it("should return a valid json response", async () => {
      const userData = {
        firstName: "Panka",
        lastName: "Kumar",
        email: "pankaj@testemail.com",
        password: "secret123",
      };

      const response = await request(app).post("/auth/register").send(userData);
      expect(response.headers["content-type"]).toEqual(
        expect.stringContaining("json"),
      );
    });

    it("should persist the user in database", async () => {
      // A - Arrange data
      const userData = {
        firstName: "Panka",
        lastName: "Kumar",
        email: "pankaj@testemail.com",
        password: "secret123",
      };

      // A - Act
      await request(app).post("/auth/register").send(userData);

      // A - Assert
      const userRepository = connection.getRepository(User);
      const users = await userRepository.find();

      expect(users).toHaveLength(1);
      expect(users[0].firstName).toBe(userData.firstName);
      expect(users[0].lastName).toBe(userData.lastName);
      expect(users[0].email).toBe(userData.email);
    });

    it("should return an id of the created user", async () => {
      // A - Arrange data
      const userData = {
        firstName: "Pankaj",
        lastName: "Kumar",
        email: "pankaj@testemail.com",
        password: "secret123",
      };

      // A - Act
      const response = await request(app).post("/auth/register").send(userData);

      // A - Assert
      expect(response.body).toHaveProperty("id");
      expect(
        typeof (response.body as { id: number | string }).id === "string" ||
          typeof (response.body as { id: number | string }).id === "number",
      ).toBe(true);
    });

    it("should aassign a 'customer' role", async () => {
      // A - Arrange data
      const userData = {
        firstName: "Pankaj",
        lastName: "Kumar",
        email: "pankaj@testemail.com",
        password: "secret123",
      };

      // A - Act
      await request(app).post("/auth/register").send(userData);

      // A - Assert
      const userRepository = connection.getRepository(User);
      const users = await userRepository.find();
      expect(users[0]).toHaveProperty("role");
      expect(users[0].role).toBe(Roles.CUSTOMER);
    });

    it("should store the hashed password and not plain text", async () => {
      // A - Arrange data
      const userData = {
        firstName: "Pankaj",
        lastName: "Kumar",
        email: "pankaj@testemail.com",
        password: "secret123",
      };

      // A - Act
      await request(app).post("/auth/register").send(userData);

      // A - Assert
      const userRepository = connection.getRepository(User);
      const users = await userRepository.find({ select: ["password"] });
      expect(users[0].password).not.toBe(userData.password);
      expect(users[0].password).toHaveLength(60); // bcrypt hash length
      expect(users[0].password).toMatch(/^\$2b\$\d+\$/);
    });

    it("should return 400 status code if email already exists", async () => {
      // A - Arrange data
      const userData = {
        firstName: "Pankaj",
        lastName: "Kumar",
        email: "pankaj@testemail.com",
        password: "secret123",
      };

      // A - Act
      const userRepository = connection.getRepository(User);
      await userRepository.save({ ...userData, role: Roles.CUSTOMER });

      const response = await request(app).post("/auth/register").send(userData);

      const users = await userRepository.find();

      // A - Assert
      expect(response.statusCode).toBe(400);
      expect(users.length).toBe(1);
    });

    it("should return access token and refresh token inside a cookie", async () => {
      const userData = {
        firstName: "Pankaj",
        lastName: "Kumar",
        email: "pankaj@testemail.com",
        password: "secret123",
      };

      // A - Act

      const response = await request(app).post("/auth/register").send(userData);
      // Assert
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

    it("should store the refresh token in the database", async () => {
      const userData = {
        firstName: "Pankaj",
        lastName: "Kumar",
        email: "pankaj@testemail.com",
        password: "secret123",
      };

      // A - Act

      const response = await request(app).post("/auth/register").send(userData);

      // Assert
      const refreshTokenRepo = connection.getRepository(RefreshToken);
      // const refreshTokens = await refreshTokenRepo.find();
      // expect(refreshTokens).toHaveLength(1);

      // to check if the token belongs to the same user
      const tokens = await refreshTokenRepo
        .createQueryBuilder("refreshToken")
        .where("refreshToken.userId = :userId", {
          userId: (response.body as Record<string, string>).id,
        })
        .getMany();

      expect(tokens).toHaveLength(1);
    });
  });

  describe("Fields are missing", () => {
    it("should return 400 staus code if email field is missing", async () => {
      // A - Arrange data
      const userData = {
        firstName: "Pankaj",
        lastName: "Kumar",
        email: "",
        password: "secret123",
      };

      // A - Act
      const response = await request(app).post("/auth/register").send(userData);
      const userRepository = connection.getRepository(User);
      const users = await userRepository.find();
      // A - Assert
      expect(response.statusCode).toBe(400);
      expect(users.length).toBe(0);
    });

    it("should return an array of errors if email field is missing", async () => {
      // A - Arrange data
      const userData = {
        firstName: "Pankaj",
        lastName: "Kumar",
        email: "",
        password: "secret123",
      };

      // A - Act
      const response = await request(app).post("/auth/register").send(userData);
      // A - Assert
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
      expect(Array.isArray(errors)).toBe(true);
    });

    it("should return 400 status code if firstName is missing", async () => {
      // A - Arrange data
      const userData = {
        firstName: "",
        lastName: "Kumar",
        email: "pankajkumar@email.com",
        password: "secret123",
      };

      // A - Act
      const response = await request(app).post("/auth/register").send(userData);
      const userRepository = connection.getRepository(User);
      const users = await userRepository.find();
      // Assert
      expect(response.statusCode).toBe(400);
      expect(users.length).toBe(0);
    });

    it("should return 400 status code if lastName is missing", async () => {
      // A - Arrange data
      const userData = {
        firstName: "Pankaj",
        lastName: "  ",
        email: "pankajkumar@email.com",
        password: "secret123",
      };

      // A - Act
      const response = await request(app).post("/auth/register").send(userData);
      const userRepository = connection.getRepository(User);
      const users = await userRepository.find();
      // Assert
      expect(response.statusCode).toBe(400);
      expect(users.length).toBe(0);
    });

    it("should return 400 status code if password is missing", async () => {
      // A - Arrange data
      const userData = {
        firstName: "Pamkaj",
        lastName: "Kumar",
        email: "pankajkumar@email.com",
        password: "",
      };

      // A - Act
      const response = await request(app).post("/auth/register").send(userData);
      const userRepository = connection.getRepository(User);
      const users = await userRepository.find();
      // Assert
      expect(response.statusCode).toBe(400);
      expect(users.length).toBe(0);
    });
  });

  describe("Fields are not in proper format", () => {
    it("should trim the email field", async () => {
      // A - Arrange data
      const userData = {
        firstName: "Pankaj",
        lastName: "Kumar",
        email: "  pankaj@testemail.com ",
        password: "secret123",
      };

      // A - Act
      await request(app).post("/auth/register").send(userData);
      const userRepository = connection.getRepository(User);
      // A - Assert
      const users = await userRepository.find();
      expect(users[0].email).toBe(userData.email.trim());
    });

    it("should return 400 status code if email is not a valid email", async () => {
      // A - Arrange data
      const userData = {
        firstName: "Pankaj",
        lastName: "Kumar",
        email: "  pankajtestemail.com ",
        password: "secret123",
      };

      // A - Act
      const response = await request(app).post("/auth/register").send(userData);
      const userRepository = connection.getRepository(User);
      const users = await userRepository.find();

      // A - Assert0
      expect(response.statusCode).toBe(400);
      expect(users.length).toBe(0);
    });

    it("should return 400 status code if password length is less than 8 characters", async () => {
      // A - Arrange data
      const userData = {
        firstName: "Pankaj",
        lastName: "Kumar",
        email: "  pankajtest@email.com ",
        password: "secret",
      };

      // A - Act
      const response = await request(app).post("/auth/register").send(userData);
      const userRepository = connection.getRepository(User);
      const users = await userRepository.find();

      // A - Assert0
      expect(response.statusCode).toBe(400);
      expect(users.length).toBe(0);
    });
  });
});
