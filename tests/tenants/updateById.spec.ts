import { DataSource } from "typeorm";
import { AppDataSource } from "../../src/config/data-source";
import request from "supertest";
import createJWKSMock from "mock-jwks";
import app from "../../src/app";
import { Tenant } from "../../src/entity/Tenant";
import { Roles } from "../../src/constants";

describe("PATCH /tenants/:id", () => {
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
      const tenatUpdateData = {
        ...tenantDataInp,
        name: "Updated Tenant 1",
      };
      const response = await request(app)
        .patch(`/tenants/${tenantData.id}`)
        .set("Cookie", [`accessToken=${adminToken}`])
        .send(tenatUpdateData);

      expect(response.statusCode).toBe(200);
    });

    it("should update data in the DB", async () => {
      const tenantRepository = connection.getRepository(Tenant);
      const tenantDataInp = {
        name: "Tenant 1",
        address: "Tenant 1 address",
      };
      const tenantData = await tenantRepository.save(tenantDataInp);
      const adminToken = jwks.token({ sub: "1", role: Roles.ADMIN });
      const tenatUpdateData = {
        name: "Updated Tenant 1",
        address: "Updated Tenant 1 address",
      };
      await request(app)
        .patch(`/tenants/${tenantData.id}`)
        .set("Cookie", [`accessToken=${adminToken}`])
        .send(tenatUpdateData);

      const updatedData = await tenantRepository.findOne({
        where: { id: tenantData.id },
      });
      expect(updatedData?.name).toBe(tenatUpdateData.name);
      expect(updatedData?.address).toBe(tenatUpdateData.address);
    });
  });

  describe("Fields are missing", () => {
    it("should return 400 status code if name field is missing", async () => {
      const tenantRepository = connection.getRepository(Tenant);
      const tenantDataInp = {
        name: "Tenant 1",
        address: "Tenant 1 address",
      };
      const tenantData = await tenantRepository.save(tenantDataInp);
      const adminToken = jwks.token({ sub: "1", role: Roles.ADMIN });
      const tenatUpdateData = {
        address: tenantDataInp.address,
      };
      const response = await request(app)
        .patch(`/tenants/${tenantData.id}`)
        .set("Cookie", [`accessToken=${adminToken}`])
        .send(tenatUpdateData);

      expect(response.statusCode).toBe(400);
    });
    it("should return 400 status code if address field is missing", async () => {
      const tenantRepository = connection.getRepository(Tenant);
      const tenantDataInp = {
        name: "Tenant 1",
        address: "Tenant 1 address",
      };
      const tenantData = await tenantRepository.save(tenantDataInp);
      const adminToken = jwks.token({ sub: "1", role: Roles.ADMIN });
      const tenatUpdateData = {
        name: "Updated Tenant 1",
      };
      const response = await request(app)
        .patch(`/tenants/${tenantData.id}`)
        .set("Cookie", [`accessToken=${adminToken}`])
        .send(tenatUpdateData);

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 status code if tenant doesn't exist in the DB with the given id", async () => {
      const tenatUpdateData = {
        name: "Updated Tenant 1",
        address: "Tenant 1 address",
      };
      const adminToken = jwks.token({ sub: "1", role: Roles.ADMIN });
      const response = await request(app)
        .patch(`/tenants/10`)
        .set("Cookie", [`accessToken=${adminToken}`])
        .send(tenatUpdateData);

      expect(response.statusCode).toBe(400);
    });

    it("should return 401 status code if user is not authenticated", async () => {
      const tenatUpdateData = {
        name: "Updated Tenant 1",
        address: "Tenant 1 address",
      };
      const response = await request(app)
        .patch(`/tenants/1`)
        .send(tenatUpdateData);

      expect(response.statusCode).toBe(401);
    });

    it("should return 403 status code if user is not an admin user", async () => {
      const adminToken = jwks.token({ sub: "1", role: Roles.MANAGER });
      const tenatUpdateData = {
        name: "Updated Tenant 1",
        address: "Tenant 1 address",
      };
      const response = await request(app)
        .patch(`/tenants/10`)
        .set("Cookie", [`accessToken=${adminToken}`])
        .send(tenatUpdateData);
      expect(response.statusCode).toBe(403);
    });
  });
});
