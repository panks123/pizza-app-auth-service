import { Repository } from "typeorm";
import { Tenant } from "../entity/Tenant";
import { ITenant, PaginationQueryParams } from "../types";

export class TenantService {
  constructor(private tenantRepository: Repository<Tenant>) {}
  async create(tenantData: ITenant) {
    return await this.tenantRepository.save(tenantData);
  }

  async getAll(validatedQuery: PaginationQueryParams) {
    const { currentPage, perPage, q } = validatedQuery;
    const queryBuilder = this.tenantRepository.createQueryBuilder("tenant");
    if (q) {
      const searchTerm = `%${q}%`;
      queryBuilder.where("CONCAT(tenant.name, ' ', tenant.address) ILike :q", {
        q: searchTerm,
      });
    }
    const result = await queryBuilder
      .skip((currentPage - 1) * perPage)
      .take(perPage)
      .orderBy("tenant.id", "DESC")
      .getManyAndCount();
    return result;
  }

  async getById(tenantId: number) {
    return await this.tenantRepository.findOne({ where: { id: tenantId } });
  }

  async updateById(tenanId: number, tenantData: ITenant) {
    return await this.tenantRepository.update(tenanId, tenantData);
  }

  async deleteById(tenantId: number) {
    return await this.tenantRepository.delete({ id: tenantId });
  }
}
