import { DataSource, Repository } from "typeorm";
import { Tenant } from "../../src/entity/Tenant";

export const truncateDBTables = async (connection: DataSource) => {
  const entities = connection.entityMetadatas;

  for (const entity of entities) {
    const repository = connection.getRepository(entity.name);
    await repository.clear(); // truncate the table
  }
};

export const isJWT = (token: string | null): boolean => {
  if (!token) return false;

  const parts = token.split(".");
  if (parts.length !== 3) return false;

  try {
    parts.forEach((part) => {
      Buffer.from(part, "base64").toString("utf-8");
    });
  } catch (e) {
    return false;
  }
  return true;
};

export const createTenant = async (tenantRepository: Repository<Tenant>) => {
  const tenantData = {
    name: "Test Tenant",
    address: "Test Address",
  };
  const tenant = await tenantRepository.save(tenantData);
  return tenant;
};
