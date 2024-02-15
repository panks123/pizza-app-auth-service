import request from "supertest";
import app from "../../src/app";

describe("POST /auth/register", () => {
  describe("Given all fields", () => {
    it("should return 201 status code", async () => {
      // AAA rule
      // A - Arrange data
      const userData = {
        firstName: "Panka",
        lastName: "Kumar",
        email: "pankaj@testemail.com",
        password: "secret",
      };
      // A - Act
      const response = await request(app).post("/auth/register").send(userData);
      // A - Assert
      expect(response.statusCode).toBe(201);
    });

    it("should return a valid json response", async () => {
      const userData = {
        firstName: "Panka",
        lastName: "Kumar",
        email: "pankaj@testemail.com",
        password: "secret",
      };

      const response = await request(app).post("/auth/register").send(userData);
      expect(response.headers["content-type"]).toEqual(
        expect.stringContaining("json"),
      );
    });
  });
  describe("Fields are missing", () => {});
});
