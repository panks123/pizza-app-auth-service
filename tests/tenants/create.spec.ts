import { DataSource } from "typeorm";
import { AppDataSource } from "../../src/config/data-source";
import request from "supertest";
import app from "../../src/app";
import { Tenant } from "../../src/entity/Tenant";

describe("POST /tenants", () => {
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
    it("return a 201 status code", async () => {
      const tenantData = {
        name: "Tenant 1",
        address: "Tenant 1 address",
      };
      const response = await request(app).post("/tenants").send(tenantData);

      expect(response.statusCode).toBe(201);
    });

    it("should create a tenant in the database", async () => {
      const tenantData = {
        name: "Tenant 1",
        address: "Tenant 1 address",
      };
      await request(app).post("/tenants").send(tenantData);

      const tenantRepository = connection.getRepository(Tenant);

      const tenants = await tenantRepository.find();
      expect(tenants.length).toBe(1);

      const tenant = tenants[0];
      expect(tenant.name).toBe(tenantData.name);
      expect(tenant.address).toBe(tenantData.address);
    });
  });
});
