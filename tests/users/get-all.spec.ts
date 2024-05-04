import request from "supertest";
import app from "../../src/app";
import { AppDataSource } from "../../src/config/data-source";
import { DataSource } from "typeorm";
import createJWKSMock from "mock-jwks";
import { User } from "../../src/entity/User";
import { Roles } from "../../src/constants";

describe("GET /users", () => {
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
      const adminToken = jwks.token({ sub: "1", role: Roles.ADMIN });
      const response = await request(app)
        .get("/users")
        .set("Cookie", [`accessToken=${adminToken}`])
        .send();

      expect(response.statusCode).toBe(200);
    });

    it("should return an array of users in the response", async () => {
      const userData = {
        firstName: "Panka",
        lastName: "Kumar",
        email: "",
        password: "secret123",
        role: Roles.MANAGER,
      };

      const userRepository = connection.getRepository(User);
      await userRepository.save(userData);

      const adminToken = jwks.token({ sub: "1", role: Roles.ADMIN });
      const response = await request(app)
        .get("/users")
        .set("Cookie", [`accessToken=${adminToken}`])
        .send();

      expect(Array.isArray(response.body.data)).toBeTruthy();
    });

    it("should return 401 status code if user is not authenticated", async () => {
      // const adminToken = jwks.token({sub: "1", role:Roles.ADMIN})
      const response = await request(app)
        .get("/users")
        // .set("Cookie", [`accessToken=${adminToken}`])
        .send();
      expect(response.statusCode).toBe(401);
    });

    it("should return 403 status code if user is not an admin user", async () => {
      const managerToken = jwks.token({ sub: "1", role: Roles.MANAGER });
      const response = await request(app)
        .get("/users")
        .set("Cookie", [`accessToken=${managerToken}`])
        .send();
      expect(response.statusCode).toBe(403);
    });
  });
});
