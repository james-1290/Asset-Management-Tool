import { apiClient } from "../api-client";
import type { User } from "../../types/user";

export const usersApi = {
  getAll(): Promise<User[]> {
    return apiClient.get<User[]>("/users");
  },
};
