import { api } from "@/src/shared/api";
import { TypeLoginSchema, TypeRegisterSchema } from "@/src/features/auth";
import { IUser } from "@/src/shared/types";

class AuthService {
  public async register(body: TypeRegisterSchema) {
    const response = await api.post<IUser>("auth/register", body);
    return response;
  }
  public async login(body: TypeLoginSchema) {
    const response = await api.post<IUser>("auth/login", body);
    return response;
  }
  public async logout() {
    const response = await api.post("auth/logout");
    return response;
  }
}

export const authService = new AuthService();
