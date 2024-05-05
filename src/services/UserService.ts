import { Brackets, Repository } from "typeorm";
import { User } from "../entity/User";
import { LimitedUserData, PaginationQueryParams, UserData } from "../types";
import createHttpError from "http-errors";
import bcrypt from "bcryptjs";

export class UserService {
  constructor(private userRepository: Repository<User>) {}

  async create({
    firstName,
    lastName,
    email,
    password,
    role,
    tenantId,
  }: UserData) {
    const user = await this.userRepository.findOne({ where: { email } });
    if (user) {
      const error = createHttpError(400, "Email already exists!");
      throw error;
    }
    // Hash the password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    try {
      const user = await this.userRepository.save({
        firstName,
        lastName,
        email,
        password: hashedPassword,
        role,
        tenant: tenantId ? { id: tenantId } : undefined,
      });
      return user;
    } catch (err) {
      const error = createHttpError(
        500,
        "Failed to store the error in the database du to some internal server error",
      );
      throw error;
    }
  }

  async findByEmailWithPassword(email: string) {
    return await this.userRepository.findOne({
      where: {
        email,
      },
      select: ["id", "email", "firstName", "lastName", "password", "role"],
    });
  }

  async findById(id: number) {
    return await this.userRepository.findOne({
      where: { id },
      relations: {
        tenant: true,
      },
    });
  }

  async getAll(validatedQuery: PaginationQueryParams) {
    const { currentPage, perPage, q, role } = validatedQuery;
    const queryBuilder = this.userRepository.createQueryBuilder("user");
    if (q) {
      const searchTerm = `%${q}%`;
      queryBuilder.where(
        new Brackets((qb) => {
          qb.where("CONCAT(user.firstName, ' ', user.lastName) ILike :q", {
            q: searchTerm,
          }).orWhere("user.email ILike :q", { q: searchTerm });
        }),
      );
    }

    if (role) {
      queryBuilder.andWhere("user.role = :role", { role });
    }
    const result = await queryBuilder
      .skip((currentPage - 1) * perPage)
      .take(perPage)
      .orderBy("user.id", "DESC")
      .getManyAndCount();
    return result;
  }

  async updateById(userId: number, userData: LimitedUserData) {
    const { firstName, lastName, role } = userData;
    try {
      return await this.userRepository.update(userId, {
        firstName,
        lastName,
        role,
      });
    } catch (err) {
      const error = createHttpError(
        500,
        "Failed to update the user in the database",
      );
      throw error;
    }
  }

  async deleteById(userId: number) {
    try {
      return await this.userRepository.delete({ id: userId });
    } catch (err) {
      const error = createHttpError(500, "Failed to delete the user");
      throw error;
    }
  }
}
