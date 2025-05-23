import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import { prisma } from '@/lib/prisma'

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [Google],
  trustHost: true, // Add this line to trust the host
  callbacks: {
    async signIn({ user }) {  
      if (!user.email) return false
      
      try {
        await prisma.user.upsert({
          where: { email: user.email },
          create: {
            email: user.email,
            fullName: user.name || 'User',
            preferences: JSON.stringify({ theme: 'default', language: 'en' }), // Default preferences
            isAdmin: false, // Default to non-admin user
            isDisabled: false
          },
          update: {
            fullName: user.name || 'User',
            // We don't update preferences here to avoid overwriting user settings
          },
        })
        return true
      } catch (error) {
        console.error('Error saving user:', error)
        return false
      }
    }
  }
})