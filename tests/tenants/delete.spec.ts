import { DataSource } from "typeorm";
import { AppDataSource } from "../../src/config/data-source";
import request from "supertest";
import createJWKSMock from "mock-jwks";
import app from "../../src/app";
import { Tenant } from "../../src/entity/Tenant";
import { Roles } from "../../src/constants";

describe("DELETE /tenants/:id", () => {
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
      const tenantRepository = connection.getRepository(Tenant);
      const tenantDataInp = {
        name: "Tenant 1",
        address: "Tenant 1 address",
      };
      const tenantData = await tenantRepository.save(tenantDataInp);
      const adminToken = jwks.token({ sub: "1", role: Roles.ADMIN });
      const response = await request(app)
        .delete(`/tenants/${tenantData.id}`)
        .set("Cookie", [`accessToken=${adminToken}`])
        .send();

      expect(response.statusCode).toBe(200);
    });

    it("should delete tenant data from the DB", async () => {
      const tenantRepository = connection.getRepository(Tenant);
      const tenantDataInp = {
        name: "Tenant 1",
        address: "Tenant 1 address",
      };
      const tenantData = await tenantRepository.save(tenantDataInp);
      const adminToken = jwks.token({ sub: "1", role: Roles.ADMIN });
      await request(app)
        .delete(`/tenants/${tenantData.id}`)
        .set("Cookie", [`accessToken=${adminToken}`])
        .send();

      const tenants = await tenantRepository.find();
      expect(tenants.length).toBe(0);

      const tenant = await tenantRepository.findOne({
        where: { id: tenantData.id },
      });
      expect(tenant).toBeNull();
    });

    it("should return 400 status code if tenant with the given id does not exist in the DB", async () => {
      const adminToken = jwks.token({ sub: "1", role: Roles.ADMIN });
      const response = await request(app)
        .delete(`/tenants/10`)
        .set("Cookie", [`accessToken=${adminToken}`])
        .send();

      expect(response.statusCode).toBe(400);
    });

    it("should return 401 status code if user is not authenticated", async () => {
      const response = await request(app)
        .delete(`/tenants/10`)
        //   .set("Cookie",[`accessToken=${adminToken}`])
        .send();
      expect(response.statusCode).toBe(401);
    });

    it("should return 403 status code if user is not a admin user", async () => {
      const adminToken = jwks.token({ sub: "1", role: Roles.MANAGER });
      const response = await request(app)
        .delete(`/tenants/10`)
        .set("Cookie", [`accessToken=${adminToken}`])
        .send();
      expect(response.statusCode).toBe(403);
    });
  });
});
