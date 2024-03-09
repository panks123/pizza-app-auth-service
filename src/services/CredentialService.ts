import bcrypt from "bcrypt";

export class CredentialService {
  async comaparePassword(userPassword: string, hashedDBPassword: string) {
    return await bcrypt.compare(userPassword, hashedDBPassword);
  }
}
