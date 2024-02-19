import request from "supertest";
import app from "../../src/app";
import { DataSource } from "typeorm";
import { AppDataSource } from "../../src/config/data-source";
import { truncateDBTables } from "../utils";
import { User } from "../../src/entity/User";

describe("POST /auth/register", () => {
  let connection: DataSource;

  beforeAll(async () => {
    // Create DB connection - before all the testcases
    connection = await AppDataSource.initialize();
  });

  beforeEach(async () => {
    // TRUNCATE Database - before each testcase to see proper result of each testcases
    await truncateDBTables(connection);
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
  });
  describe("Fields are missing", () => {});
});
