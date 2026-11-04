import { api } from "@/src/shared/api";
import type { IUser, IUpdateProfilePayload } from "@/src/shared/types";

class UserApi {
  getProfile() {
    return api.get<IUser>("user/profile");
  }

  updateProfile(body: IUpdateProfilePayload) {
    return api.patch<IUser>("user/profile", body as Record<string, string>);
  }

  searchUsers(q: string, take = 20) {
    if (take <= 0) {
      return Promise.resolve([]);
    } else if (typeof take === "number") {
      const params = new URLSearchParams({
        take: String(take),
      });
      if (q !== undefined && q.trim() !== "") {
        params.append("q", q.trim());
      }
      return api.get<IUser[]>(`user/search?${params.toString()}`);
    } else {
      throw new Error("Invalid 'take' parameter");
    }
  }
}

export const userApi = new UserApi();
