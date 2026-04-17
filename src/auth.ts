import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: {
    signIn: '/login',
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          console.log("Auth: Missing email or password");
          return null;
        }

        console.log(`Auth: Attempting login for ${credentials.email}`);

        try {
          const user = await prisma.user.findUnique({
            where: { email: credentials.email as string }
          });

          // If no user exists, or user exists but has no password (e.g. OAuth only)
          // we create/update them with this password for seamless local dev
          if (!user || !user.password) {
            console.log(`Auth: ${!user ? "Creating new" : "Updating existing"} user for ${credentials.email}`);
            const hashedPassword = await bcrypt.hash(credentials.password as string, 10);
            
            const updatedUser = await prisma.user.upsert({
              where: { email: credentials.email as string },
              update: { password: hashedPassword },
              create: {
                email: credentials.email as string,
                password: hashedPassword,
                name: (credentials.email as string).split('@')[0]
              }
            });
            return updatedUser;
          }

          const isValid = await bcrypt.compare(credentials.password as string, user.password);
          if (!isValid) {
            console.log("Auth: Invalid password");
            return null;
          }

          console.log("Auth: Login successful");
          return user;
        } catch (error) {
          console.error("Auth: Error in authorize function:", error);
          return null;
        }
      }
    })
  ]
})
