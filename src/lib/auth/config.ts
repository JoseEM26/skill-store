import type { NextAuthConfig } from 'next-auth';
import GitHub from 'next-auth/providers/github';
import { syncUserFromGitHub } from '@/lib/auth/user-sync';

export const authConfig: NextAuthConfig = {
  providers: [
    GitHub({
      clientId: process.env.GITHUB_ID || 'dummy-github-id',
      clientSecret: process.env.GITHUB_SECRET || 'dummy-github-secret',
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: Number(process.env.AUTH_SESSION_MAX_AGE || 2592000),
  },
  secret: process.env.AUTH_SECRET || 'dummy-auth-secret-for-local-testing-32-chars-long-min',
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async jwt({ token, user, account, profile }) {
      if (account && profile) {
        const githubId = String(profile.id ?? account.providerAccountId);
        const username = (profile.login as string) || (user?.name ?? 'github-user');
        const avatarUrl = (profile.avatar_url as string) || (user?.image ?? null);

        try {
          const dbUser = await syncUserFromGitHub({
            githubId,
            username,
            avatarUrl,
          });
          token.userId = dbUser.id;
          token.githubId = dbUser.githubId;
          token.username = dbUser.username;
          token.avatarUrl = dbUser.avatarUrl;
        } catch (error) {
          console.error('Error syncing user on JWT callback:', error);
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = (token.userId as string) || session.user.id;
        (session.user as unknown as { githubId?: string }).githubId = token.githubId as string;
        (session.user as unknown as { username?: string }).username = token.username as string;
        if (token.avatarUrl) {
          session.user.image = token.avatarUrl as string;
        }
      }
      return session;
    },
  },
};
