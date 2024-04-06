import { DataSource } from "typeorm";
import { AppDataSource } from "../../src/config/data-source";
import request from "supertest";
import createJWKSMock from "mock-jwks";
import app from "../../src/app";
import { Roles } from "../../src/constants";

describe("GET /tenants", () => {
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
      const response = await request(app).get("/tenants").send();

      expect(response.statusCode).toBe(200);
    });

    it("should return an array as response", async () => {
      const tenantData = {
        name: "Tenant 1",
        address: "Tenant 1 address",
      };
      const adminToken = jwks.token({ sub: "1", role: Roles.ADMIN });
      await request(app)
        .post("/tenants")
        .set("Cookie", [`accessToken=${adminToken}`])
        .send(tenantData);

      const tenantData2 = {
        name: "Tenant 2",
        address: "Tenant 2 address",
      };
      const adminToken2 = jwks.token({ sub: "2", role: Roles.ADMIN });
      await request(app)
        .post("/tenants")
        .set("Cookie", [`accessToken=${adminToken2}`])
        .send(tenantData2);

      const response = await request(app).get("/tenants").send();

      expect(Array.isArray(response.body)).toBeTruthy();
      expect(response.body).toHaveLength(2);
    });
  });
});
