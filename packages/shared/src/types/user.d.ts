export interface JwtPayload {
    sub: number;
    email: string;
    iat?: number;
    exp?: number;
}
export interface UserProfile {
    id: number;
    email: string;
    username: string;
    avatarUrl: string | null;
    isActive: boolean;
    createdAt: string;
    permissions: string[];
}
//# sourceMappingURL=user.d.ts.map