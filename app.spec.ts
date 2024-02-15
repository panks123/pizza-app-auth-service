import app from "./src/app";
import { calculateDiscount } from "./src/utils";
import request from "supertest";

describe.skip("App", () => {
  it("should calculate the discount", () => {
    const result = calculateDiscount(100, 5);
    expect(result).toBe(5);
  });

  it("should return 200 status", async () => {
    const response = await request(app).get("/");
    expect(response.statusCode).toBe(200);
  });
});
