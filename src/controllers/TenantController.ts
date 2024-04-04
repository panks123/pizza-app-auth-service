import { NextFunction, Response } from "express";
import { TenantService } from "../services/TenantService";
import { CreateTenantRequest } from "../types";
import { Logger } from "winston";

export class TenantController {
  constructor(
    private tenatService: TenantService,
    private logger: Logger,
  ) {}
  async create(req: CreateTenantRequest, res: Response, next: NextFunction) {
    const { name, address } = req.body;

    this.logger.debug("Request for creating tenant", req.body);

    try {
      const tenant = await this.tenatService.create({ name, address });

      this.logger.info("Tenant has been created", { id: tenant.id });

      res.status(201).send({ id: tenant.id });
    } catch (err) {
      next(err);
    }
  }
}
