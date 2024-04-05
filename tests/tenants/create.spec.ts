import { DataSource } from "typeorm";
import { AppDataSource } from "../../src/config/data-source";
import request from "supertest";
import app from "../../src/app";
import { Tenant } from "../../src/entity/Tenant";
import createJWKSMock from "mock-jwks";
import { Roles } from "../../src/constants";

describe("POST /tenants", () => {
  let connection: DataSource;
  let jwks: ReturnType<typeof createJWKSMock>;

  beforeAll(async () => {
    // Create DB connection - before all the testcases
    jwks = createJWKSMock("http://localhost:5501");
    connection = await AppDataSource.initialize();
  });

  beforeEach(async () => {
    jwks.start();
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
    it("return a 201 status code", async () => {
      const tenantData = {
        name: "Tenant 1",
        address: "Tenant 1 address",
      };
      const adminToken = jwks.token({ sub: "1", role: Roles.ADMIN });
      const response = await request(app)
        .post("/tenants")
        .set("Cookie", [`accessToken=${adminToken}`])
        .send(tenantData);

      expect(response.statusCode).toBe(201);
    });

    it("should create a tenant in the database", async () => {
      const tenantData = {
        name: "Tenant 1",
        address: "Tenant 1 address",
      };
      const adminToken = jwks.token({ sub: "1", role: Roles.ADMIN });
      await request(app)
        .post("/tenants")
        .set("Cookie", [`accessToken=${adminToken}`])
        .send(tenantData);

      const tenantRepository = connection.getRepository(Tenant);

      const tenants = await tenantRepository.find();
      expect(tenants.length).toBe(1);

      const tenant = tenants[0];
      expect(tenant.name).toBe(tenantData.name);
      expect(tenant.address).toBe(tenantData.address);
    });

    it("should return 401 if user is not authenticated", async () => {
      const tenantData = {
        name: "Tenant 1",
        address: "Tenant 1 address",
      };
      const response = await request(app).post("/tenants").send(tenantData);
      expect(response.statusCode).toBe(401);

      const tenantRepository = connection.getRepository(Tenant);

      const tenants = await tenantRepository.find();
      expect(tenants.length).toBe(0);
    });
  });
});
