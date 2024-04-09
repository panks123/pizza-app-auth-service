import { DataSource } from "typeorm";
import { AppDataSource } from "../../src/config/data-source";
import request from "supertest";
import createJWKSMock from "mock-jwks";
import app from "../../src/app";
import { Tenant } from "../../src/entity/Tenant";
import { Roles } from "../../src/constants";

describe("GET /tenants/:id", () => {
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
    it("should return a 200 status code", async () => {
      const adminToken = jwks.token({ sub: "1", role: Roles.ADMIN });
      const tenantRepository = connection.getRepository(Tenant);
      const tenantDataInp = {
        name: "Tenant 1",
        address: "Tenant 1 address",
      };
      const tenantData = await tenantRepository.save(tenantDataInp);
      const response = await request(app)
        .get(`/tenants/${tenantData.id}`)
        .set("Cookie", [`accessToken=${adminToken}`])
        .send();

      expect(response.statusCode).toBe(200);
      expect((response.body as Tenant).name).toBe(tenantDataInp.name);
      expect((response.body as Tenant).address).toBe(tenantDataInp.address);
    });

    it("should return a 401 status code if user is not authenticated", async () => {
      // const adminToken = jwks.token({sub: "1", role: Roles.ADMIN})
      const tenantRepository = connection.getRepository(Tenant);
      const tenantDataInp = {
        name: "Tenant 1",
        address: "Tenant 1 address",
      };
      const tenantData = await tenantRepository.save(tenantDataInp);
      const response = await request(app)
        .get(`/tenants/${tenantData.id}`)
        // .set("Cookie", [`accessToken=${adminToken}`])
        .send();

      expect(response.statusCode).toBe(401);
    });

    it("should return a 403 status code if user is not an admin user", async () => {
      const managerToken = jwks.token({ sub: "1", role: Roles.MANAGER });
      const tenantRepository = connection.getRepository(Tenant);
      const tenantDataInp = {
        name: "Tenant 1",
        address: "Tenant 1 address",
      };
      const tenantData = await tenantRepository.save(tenantDataInp);
      const response = await request(app)
        .get(`/tenants/${tenantData.id}`)
        .set("Cookie", [`accessToken=${managerToken}`])
        .send();

      expect(response.statusCode).toBe(403);
    });
  });
});
