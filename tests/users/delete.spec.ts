import request from "supertest";
import app from "../../src/app";
import { AppDataSource } from "../../src/config/data-source";
import { DataSource } from "typeorm";
import createJWKSMock from "mock-jwks";
import { User } from "../../src/entity/User";
import { Roles } from "../../src/constants";

describe("DELETE /users/:id", () => {
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
      const userRepository = connection.getRepository(User);
      const userData = {
        firstName: "Panka",
        lastName: "Kumar",
        email: "pankaj@testemail.com",
        password: "secret123",
        role: Roles.MANAGER,
        tenantId: 1,
      };
      const user = await userRepository.save(userData);
      const adminToken = jwks.token({ sub: "1", role: Roles.ADMIN });

      const userUpdateData = {
        firstName: "Panka",
        lastName: "Kumar Update",
        email: "pankaj@testemail.com",
        password: "secret123",
        role: Roles.MANAGER,
        tenantId: 2,
      };
      const response = await request(app)
        .delete(`/users/${user.id}`)
        .set("Cookie", [`accessToken=${adminToken}`])
        .send(userUpdateData);
      expect(response.statusCode).toBe(200);
    });

    it("should delete the user from the DB", async () => {
      const userRepository = connection.getRepository(User);
      const userData = {
        firstName: "Panka",
        lastName: "Kumar",
        email: "pankaj@testemail.com",
        password: "secret123",
        role: Roles.MANAGER,
        tenantId: 1,
      };
      const user = await userRepository.save(userData);
      const adminToken = jwks.token({ sub: "1", role: Roles.ADMIN });

      await request(app)
        .delete(`/users/${user.id}`)
        .set("Cookie", [`accessToken=${adminToken}`])
        .send();

      const userDt = await userRepository.findOne({ where: { id: user.id } });

      expect(userDt).toBeNull();
    });

    it("should return 400 status code if the user with the given id does not exist", async () => {
      const adminToken = jwks.token({ sub: "1", role: Roles.ADMIN });

      const response = await request(app)
        .delete(`/users/2`)
        .set("Cookie", [`accessToken=${adminToken}`])
        .send();

      expect(response.statusCode).toBe(400);
    });

    it("should return 401 status code if user is not authenticated", async () => {
      // const adminToken = jwks.token({ sub: "1", role: Roles.ADMIN })

      const response = await request(app)
        .delete(`/users/2`)
        // .set("Cookie", [`accessToken=${adminToken}`])
        .send();

      expect(response.statusCode).toBe(401);
    });

    it("should return 403 status code if non admin user is trying to delete", async () => {
      const managerToken = jwks.token({ sub: "1", role: Roles.MANAGER });

      const response = await request(app)
        .delete(`/users/2`)
        .set("Cookie", [`accessToken=${managerToken}`])
        .send();

      expect(response.statusCode).toBe(403);
    });
  });
});
