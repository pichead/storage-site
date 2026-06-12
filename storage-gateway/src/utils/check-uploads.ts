import { PrismaClient } from 'generated/prisma';

const prisma = new PrismaClient();
const CHUNK_SIZE = 8 * 1024 * 1024; // 8MB

async function main() {
  console.log('=== Checking Incomplete / Stuck Uploads ===');
  
  const files = await prisma.file.findMany({
    include: {
      chunks: {
        orderBy: { chunkIndex: 'asc' },
      },
      user: {
        select: { username: true },
      },
    },
  });

  const incompleteFiles: any[] = [];

  for (const file of files) {
    const expectedChunks = Math.ceil(file.size / CHUNK_SIZE);
    const uploadedChunks = file.chunks.length;

    // A file is incomplete if the uploaded chunks count is less than expected
    if (uploadedChunks < expectedChunks) {
      // Find the last active chunk's upload time
      let lastActiveTime = file.createdAt;
      if (file.chunks.length > 0) {
        const lastChunk = file.chunks[file.chunks.length - 1];
        lastActiveTime = lastChunk.createdAt;
      }

      const minutesSinceLastActive = (Date.now() - new Date(lastActiveTime).getTime()) / (1000 * 60);
      const isStuck = minutesSinceLastActive > 30; // Stuck if no chunk upload for > 30 mins

      incompleteFiles.push({
        id: file.id,
        name: file.name,
        username: file.user.username,
        sizeMb: (file.size / (1024 * 1024)).toFixed(2),
        uploadedChunks,
        expectedChunks,
        progress: ((uploadedChunks / expectedChunks) * 100).toFixed(1) + '%',
        createdAt: file.createdAt,
        lastActiveTime,
        isStuck,
        minutesSinceLastActive: minutesSinceLastActive.toFixed(1),
      });
    }
  }

  if (incompleteFiles.length === 0) {
    console.log('No incomplete uploads found. All uploads are clean.');
    await prisma.$disconnect();
    return;
  }

  console.log(`Found ${incompleteFiles.length} incomplete upload(s):\n`);
  
  incompleteFiles.forEach((file, index) => {
    console.log(`${index + 1}. [${file.isStuck ? 'STUCK' : 'UPLOADING'}] "${file.name}" (ID: ${file.id})`);
    console.log(`   User: ${file.username}`);
    console.log(`   Size: ${file.sizeMb} MB`);
    console.log(`   Progress: ${file.uploadedChunks} / ${file.expectedChunks} chunks (${file.progress})`);
    console.log(`   Created At: ${file.createdAt.toISOString()}`);
    console.log(`   Last Active: ${file.lastActiveTime.toISOString()} (${file.minutesSinceLastActive} minutes ago)`);
    console.log('----------------------------------------------------');
  });

  // Check if "--clean" argument was passed
  const args = process.argv.slice(2);
  const shouldClean = args.includes('--clean') || args.includes('clean');
  if (shouldClean) {
    console.log('\nCleaning up stuck uploads (older than 30 minutes)...');
    let cleanCount = 0;
    for (const file of incompleteFiles) {
      if (file.isStuck) {
        console.log(`Deleting stuck file "${file.name}" (ID: ${file.id})...`);
        // This will cascade delete file chunks in DB due to onDelete: Cascade
        await prisma.file.delete({
          where: { id: file.id },
        });
        cleanCount++;
      }
    }
    console.log(`Cleanup complete. Deleted ${cleanCount} stuck upload(s).`);
  } else {
    console.log('\nTo clean up stuck uploads, run this script with "clean" or "--clean":');
    console.log('npm run check-uploads -- --clean');
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  prisma.$disconnect();
  process.exit(1);
});
