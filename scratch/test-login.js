
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function testAuthorize(email, password) {
  console.log(`Testing login for ${email} with password: ${password}`);
  const user = await prisma.user.findUnique({
    where: { email }
  });

  if (!user || !user.password) {
    console.log("User not found or no password");
    return null;
  }

  const isValid = await bcrypt.compare(password, user.password);
  console.log(`Password is valid: ${isValid}`);
  return isValid ? user : null;
}

async function main() {
  const result = await testAuthorize('test@example.com', 'password123');
  console.log('Login result:', result ? 'SUCCESS' : 'FAILURE');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
