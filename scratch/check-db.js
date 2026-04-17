
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany();
  console.log('Users in DB:', users.map(u => ({ 
    id: u.id, 
    email: u.email, 
    hasPassword: !!u.password,
    passwordPreview: u.password ? u.password.substring(0, 10) + '...' : null 
  })));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
