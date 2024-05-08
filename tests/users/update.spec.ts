import request from "supertest";
import app from "../../src/app";
import { AppDataSource } from "../../src/config/data-source";
import { DataSource } from "typeorm";
import createJWKSMock from "mock-jwks";
import { User } from "../../src/entity/User";
import { Roles } from "../../src/constants";

describe("PATCH /users", () => {
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
        tenantId: 3,
      };
      const user = await userRepository.save(userData);
      const adminToken = jwks.token({ sub: "1", role: Roles.ADMIN });

      // Creating tenants before updating user so that it does not cause foreign key constraint issue
      const tenantData = {
        name: "Tenant 1",
        address: "Tenant 1 address",
      };
      const res = await request(app)
        .post("/tenants")
        .set("Cookie", [`accessToken=${adminToken}`])
        .send(tenantData);

      const userUpdateData = {
        firstName: "Panka",
        lastName: "Kumar Update",
        email: "pankaj@testemail.com",
        role: Roles.MANAGER,
        tenantId: Number(res.body.id),
      };
      const response = await request(app)
        .patch(`/users/${user.id}`)
        .set("Cookie", [`accessToken=${adminToken}`])
        .send(userUpdateData);
      expect(response.statusCode).toBe(200);
    });

    it("should update the user's data in the DB", async () => {
      const userRepository = connection.getRepository(User);
      const adminToken = jwks.token({ sub: "1", role: Roles.ADMIN });

      const userData = {
        firstName: "Panka",
        lastName: "Kumar",
        email: "pankaj@testemail.com",
        password: "secret123",
        role: Roles.MANAGER,
        tenantId: 3,
      };
      const user = await userRepository.save(userData);
      // Creating tenants before updating user so that it does not cause foreign key constraint issue
      const tenantData = {
        name: "Tenant 1",
        address: "Tenant 1 address",
      };
      const res = await request(app)
        .post("/tenants")
        .set("Cookie", [`accessToken=${adminToken}`])
        .send(tenantData);

      const userUpdateData = {
        firstName: "Panka",
        lastName: "Kumar Update",
        email: "pankaj@testemail.com",
        role: Roles.MANAGER,
        tenantId: Number(res.body.id),
      };
      const response = await request(app)
        .patch(`/users/${user.id}`)
        .set("Cookie", [`accessToken=${adminToken}`])
        .send(userUpdateData);

      const userDt = await userRepository.findOne({
        where: { id: (response.body as { id: number }).id },
      });

      expect(userDt?.lastName).toBe(userUpdateData.lastName);
      expect(userDt?.firstName).toBe(userUpdateData.firstName);
    });

    it("should return 401 status code if user is not authenticated", async () => {
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
      // const adminToken = jwks.token({ sub: "1", role: Roles.ADMIN })

      const userUpdateData = {
        firstName: "Panka update",
        lastName: "Kumar Update",
        email: "pankaj@testemail.com",
        password: "secret123",
        role: Roles.MANAGER,
        tenantId: 1,
      };
      const response = await request(app)
        .patch(`/users/${user.id}`)
        // .set("Cookie", [`accessToken=${adminToken}`])
        .send(userUpdateData);

      expect(response.statusCode).toBe(401);
    });

    it("should return 403 status code if user is not a admin user", async () => {
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
      const adminToken = jwks.token({ sub: "1", role: Roles.MANAGER });

      const userUpdateData = {
        firstName: "Panka update",
        lastName: "Kumar Update",
        email: "pankaj@testemail.com",
        password: "secret123",
        role: Roles.MANAGER,
        tenantId: 1,
      };
      const response = await request(app)
        .patch(`/users/${user.id}`)
        .set("Cookie", [`accessToken=${adminToken}`])
        .send(userUpdateData);

      expect(response.statusCode).toBe(403);
    });

    it("should not update the user's email and password", async () => {
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
      const adminToken = jwks.token({ sub: "1", role: Roles.MANAGER });

      const userUpdateData = {
        firstName: "Panka update",
        lastName: "Kumar Update",
        email: "pankaj@testemail.com",
        password: "secret123",
        role: Roles.MANAGER,
        tenantId: 1,
      };
      const response = await request(app)
        .patch(`/users/${user.id}`)
        .set("Cookie", [`accessToken=${adminToken}`])
        .send(userUpdateData);

      const updateUser = await userRepository.findOne({
        where: { id: (response.body as { id: number }).id },
        select: ["email", "password"],
      });

      expect(updateUser?.email).toBe(user.email);
      expect(updateUser?.password).toBe(user.password);
    });

    it("should return 400 status code if the user being updated does not exist", async () => {
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
        .patch(`/users/10`)
        .set("Cookie", [`accessToken=${adminToken}`])
        .send(userUpdateData);
      expect(response.statusCode).toBe(400);
    });
  });

  //   describe("When fields are missing", () => {
  //   })
});
