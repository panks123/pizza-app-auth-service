import { NextFunction, Request, Response } from "express";
import { TenantService } from "../services/TenantService";
import { CreateTenantRequest, PaginationQueryParams } from "../types";
import { Logger } from "winston";
import createHttpError from "http-errors";
import { matchedData, validationResult } from "express-validator";

export class TenantController {
  constructor(
    private tenatService: TenantService,
    private logger: Logger,
  ) {}
  async create(req: CreateTenantRequest, res: Response, next: NextFunction) {
    const validationRes = validationResult(req);
    if (!validationRes.isEmpty()) {
      return next(createHttpError(400, validationRes.array()[0].msg as string));
    }

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

  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const validatedQuery = matchedData(req, {
        onlyValidData: true,
      }) as PaginationQueryParams;
      const [tenants, count] = await this.tenatService.getAll(validatedQuery);
      this.logger.info("All tenant have been fetched");
      res.json({
        data: tenants,
        total: count,
        perPage: validatedQuery.perPage,
        currentPage: validatedQuery.currentPage,
      });
    } catch (err) {
      next(err);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    const tenantId = req.params.id;
    if (isNaN(Number(tenantId))) {
      const error = createHttpError(400, "Invalid url param");
      return next(error);
    }
    try {
      const tenant = await this.tenatService.getById(Number(tenantId));
      if (!tenant) {
        const error = createHttpError(400, "Tenant does not exist");
        return next(error);
      }
      this.logger.info("Tenant successfully fetched", { tenantId });
      res.json(tenant);
    } catch (err) {
      next(err);
    }
  }

  async update(req: CreateTenantRequest, res: Response, next: NextFunction) {
    const validationRes = validationResult(req);
    if (!validationRes.isEmpty()) {
      return next(createHttpError(400, validationRes.array()[0].msg as string));
    }
    const tenantId = req.params.id;
    if (isNaN(Number(tenantId))) {
      const error = createHttpError(400, "Invalid url param");
      return next(error);
    }

    const { name, address } = req.body;
    this.logger.debug("Request for updating a tenant", {
      id: tenantId,
      updateDate: req.body,
    });
    try {
      const tenant = await this.tenatService.getById(Number(tenantId));
      if (!tenant) {
        const error = createHttpError(400, "Tenant does not exist");
        return next(error);
      }
      await this.tenatService.updateById(Number(tenantId), {
        name,
        address,
      });
      this.logger.info("Tenant has been updated", { id: tenantId });
      res.json({ id: Number(tenantId) });
    } catch (err) {
      next(err);
    }
  }

  async remove(req: Request, res: Response, next: NextFunction) {
    const tenantId = req.params.id;
    if (isNaN(Number(tenantId))) {
      const err = createHttpError(400, "Invalid url param");
      return next(err);
    }
    this.logger.debug("Request for deleting a tenant", { id: tenantId });
    try {
      const tenant = await this.tenatService.getById(Number(tenantId));
      if (!tenant) {
        const error = createHttpError(400, "Tenant does not exist");
        return next(error);
      }
      await this.tenatService.deleteById(Number(tenantId));
      this.logger.info("Tenant has been deleted", { id: tenantId });

      res.json({ id: tenantId });
    } catch (err) {
      next(err);
    }
  }
}
