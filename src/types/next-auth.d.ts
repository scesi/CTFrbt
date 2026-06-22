import "next-auth";

declare module "next-auth" {
  interface User {
    id: string;
    alias: string;
    name: string;
    isAdmin: boolean;
    teamId?: string;
    isTeamLeader: boolean;
  }

  interface Session {
    user: {
      id: string;
      alias: string;
      name: string;
      isAdmin: boolean;
      teamId?: string;
      isTeamLeader: boolean;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    alias: string;
    isAdmin: boolean;
    teamId?: string;
    isTeamLeader: boolean;
  }
}
