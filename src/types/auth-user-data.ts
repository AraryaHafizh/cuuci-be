import { Role } from "../generated/prisma/enums";

export interface AuthUserData {
  authUserId: string;
  role: Role
  outletId?: string;
  isHistory?: boolean;
}
