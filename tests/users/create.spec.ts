import request from "supertest";
import app from "../../src/app";
import { AppDataSource } from "../../src/config/data-source";
import { DataSource } from "typeorm";
import createJWKSMock from "mock-jwks";
import { User } from "../../src/entity/User";
import { Roles } from "../../src/constants";
import { createTenant } from "../utils";
import { Tenant } from "../../src/entity/Tenant";

describe("POST /users", () => {
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
    it("should return 201 status code", async () => {
      // create tenant first
      const tenant = await createTenant(connection.getRepository(Tenant));

      const userData = {
        firstName: "Panka",
        lastName: "Kumar",
        email: "pankaj@testemail.com",
        password: "secret123",
        tenantId: tenant.id,
        role: Roles.MANAGER,
      };

      const adminToken = jwks.token({ sub: "1", role: Roles.ADMIN });

      const response = await request(app)
        .post("/users")
        .set("Cookie", [`accessToken=${adminToken}`])
        .send(userData);

      expect(response.statusCode).toBe(201);
    });

    it("should return id of the created user in response", async () => {
      const tenant = await createTenant(connection.getRepository(Tenant));
      const userData = {
        firstName: "Panka",
        lastName: "Kumar",
        email: "pankaj@testemail.com",
        password: "secret123",
        tenantId: tenant.id,
        role: Roles.MANAGER,
      };

      const adminToken = jwks.token({ sub: "1", role: Roles.ADMIN });

      const response = await request(app)
        .post("/users")
        .set("Cookie", [`accessToken=${adminToken}`])
        .send(userData);

      expect(response.headers["content-type"]).toEqual(
        expect.stringContaining("json"),
      );

      expect(response.body).toHaveProperty("id");
      expect(
        typeof (response.body as { id: number | string }).id === "string" ||
          typeof (response.body as { id: number | string }).id === "number",
      ).toBe(true);
    });

    it("should persist the user in the DB", async () => {
      const tenant = await createTenant(connection.getRepository(Tenant));
      const userData = {
        firstName: "Panka",
        lastName: "Kumar",
        email: "pankaj@testemail.com",
        password: "secret123",
        tenantId: tenant.id,
        role: Roles.MANAGER,
      };

      const adminToken = jwks.token({ sub: "1", role: Roles.ADMIN });

      await request(app)
        .post("/users")
        .set("Cookie", [`accessToken=${adminToken}`])
        .send(userData);

      const userRepository = connection.getRepository(User);

      const users = await userRepository.find();

      expect(users.length).toBe(1);

      expect(users[0].firstName).toBe(userData.firstName);
      expect(users[0].lastName).toBe(userData.lastName);
      expect(users[0].email).toBe(userData.email);
    });

    it("should create a manager user", async () => {
      const tenant = await createTenant(connection.getRepository(Tenant));
      const userData = {
        firstName: "Panka",
        lastName: "Kumar",
        email: "pankaj@testemail.com",
        password: "secret123",
        tenantId: tenant.id,
        role: Roles.MANAGER,
      };

      const adminToken = jwks.token({ sub: "1", role: Roles.ADMIN });

      await request(app)
        .post("/users")
        .set("Cookie", [`accessToken=${adminToken}`])
        .send(userData);

      const userRepository = connection.getRepository(User);
      const users = await userRepository.find();

      expect(users.length).toBe(1);
      expect(users[0].role).toBe(Roles.MANAGER);
    });

    it("should return 401 status code if user is not autheticated", async () => {
      const tenant = await createTenant(connection.getRepository(Tenant));
      const userData = {
        firstName: "Panka",
        lastName: "Kumar",
        email: "pankaj@testemail.com",
        password: "secret123",
        tenantId: tenant.id,
        role: Roles.MANAGER,
      };

      const response = await request(app).post("/users").send(userData);

      expect(response.statusCode).toBe(401);
    });

    it("should return 403 error if the user is not admin user", async () => {
      const tenant = await createTenant(connection.getRepository(Tenant));
      const userData = {
        firstName: "Panka",
        lastName: "Kumar",
        email: "pankaj@testemail.com",
        password: "secret123",
        tenantId: tenant.id,
        role: Roles.MANAGER,
      };

      const managerToken = jwks.token({ sub: "1", role: Roles.MANAGER });

      const response = await request(app)
        .post("/users")
        .set("Cookie", [`accessToken=${managerToken}`])
        .send(userData);

      expect(response.statusCode).toBe(403);
    });
  });

  describe("When fields are missing", () => {
    it("should return 400 status code if email field is missing", async () => {
      const tenant = await createTenant(connection.getRepository(Tenant));
      const userData = {
        firstName: "Panka",
        lastName: "Kumar",
        email: "",
        password: "secret123",
        tenantId: tenant.id,
        role: Roles.MANAGER,
      };

      const adminToken = jwks.token({ sub: "1", role: Roles.ADMIN });

      const response = await request(app)
        .post("/users")
        .set("Cookie", [`accessToken=${adminToken}`])
        .send(userData);

      expect(response.statusCode).toBe(400);
    });

    it("should return an array of errors if email field is missing", async () => {
      const tenant = await createTenant(connection.getRepository(Tenant));
      const userData = {
        firstName: "Panka",
        lastName: "Kumar",
        email: "",
        password: "secret123",
        tenantId: tenant.id,
        role: Roles.MANAGER,
      };

      const adminToken = jwks.token({ sub: "1", role: Roles.ADMIN });

      const response = await request(app)
        .post("/users")
        .set("Cookie", [`accessToken=${adminToken}`])
        .send(userData);

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

    it("should return 400 status code if password field is missing", async () => {
      const tenant = await createTenant(connection.getRepository(Tenant));
      const userData = {
        firstName: "Panka",
        lastName: "Kumar",
        email: "pankaj@testemail.com",
        // password: "secret123",
        tenantId: tenant.id,
        role: Roles.MANAGER,
      };

      const adminToken = jwks.token({ sub: "1", role: Roles.ADMIN });
      const response = await request(app)
        .post("/users")
        .set("Cookie", [`accessToken=${adminToken}`])
        .send(userData);

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 status code if firstname field is missing", async () => {
      const tenant = await createTenant(connection.getRepository(Tenant));
      const userData = {
        // firstName: "Panka",
        lastName: "Kumar",
        email: "pankaj@testemail.com",
        password: "secret123",
        tenantId: tenant.id,
        role: Roles.MANAGER,
      };

      const adminToken = jwks.token({ sub: "1", role: Roles.ADMIN });
      const response = await request(app)
        .post("/users")
        .set("Cookie", [`accessToken=${adminToken}`])
        .send(userData);

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 status code if lastname field is missing", async () => {
      const tenant = await createTenant(connection.getRepository(Tenant));
      const userData = {
        firstName: "Panka",
        // lastName: "Kumar",
        email: "pankaj@testemail.com",
        password: "secret123",
        tenantId: tenant.id,
        role: Roles.MANAGER,
      };

      const adminToken = jwks.token({ sub: "1", role: Roles.ADMIN });
      const response = await request(app)
        .post("/users")
        .set("Cookie", [`accessToken=${adminToken}`])
        .send(userData);

      expect(response.statusCode).toBe(400);
    });
  });

  describe("Fields are not in proper format", () => {
    it("should return 400 status code if email is not a valid email", async () => {
      const tenant = await createTenant(connection.getRepository(Tenant));
      const userData = {
        firstName: "Panka",
        lastName: "Kumar",
        email: "pankajemail",
        password: "secret123",
        tenantId: tenant.id,
        role: Roles.MANAGER,
      };

      const adminToken = jwks.token({ sub: "1", role: Roles.ADMIN });
      const response = await request(app)
        .post("/users")
        .set("Cookie", [`accessToken=${adminToken}`])
        .send(userData);

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 status code if password is less than 8 characters", async () => {
      const tenant = await createTenant(connection.getRepository(Tenant));
      const userData = {
        firstName: "Panka",
        lastName: "Kumar",
        email: "pankaj@testemail.com",
        password: "secret",
        tenantId: tenant.id,
        role: Roles.MANAGER,
      };

      const adminToken = jwks.token({ sub: "1", role: Roles.ADMIN });
      const response = await request(app)
        .post("/users")
        .set("Cookie", [`accessToken=${adminToken}`])
        .send(userData);

      expect(response.statusCode).toBe(400);
    });
  });
});
