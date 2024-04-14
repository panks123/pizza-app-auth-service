import bcrypt from "bcryptjs";

export class CredentialService {
  async comaparePassword(userPassword: string, hashedDBPassword: string) {
    return await bcrypt.compare(userPassword, hashedDBPassword);
  }
}
