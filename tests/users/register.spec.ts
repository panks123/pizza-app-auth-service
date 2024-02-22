import request from "supertest";
import app from "../../src/app";
import { DataSource } from "typeorm";
import { AppDataSource } from "../../src/config/data-source";
import { User } from "../../src/entity/User";
import { Roles } from "../../src/constants";

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
        password: "secret",
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
        password: "secret",
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
        password: "secret",
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
        password: "secret",
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
        password: "secret",
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
        password: "secret",
      };

      // A - Act
      await request(app).post("/auth/register").send(userData);

      // A - Assert
      const userRepository = connection.getRepository(User);
      const users = await userRepository.find();
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
        password: "secret",
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
  });
  describe("Fields are missing", () => {});
});
