import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const race = await prisma.race.create({
    data: {
      name: "IRONMAN Lake Placid 2025",
      date: new Date("2025-07-20"),
      location: "Lake Placid, NY",
    },
  });

  const demo = [
    { bib: "101", firstName: "Alex", lastName: "Morgan", ageGroup: "M30-34", gender: "M",
      swimSeconds: 3720, t1Seconds: 180, bikeSeconds: 19800, t2Seconds: 150, runSeconds: 14400,
      totalSeconds: 38250, overallRank: 42, divisionRank: 7, genderRank: 38 },
    { bib: "204", firstName: "Jamie", lastName: "Chen", ageGroup: "F35-39", gender: "F",
      swimSeconds: 4080, t1Seconds: 240, bikeSeconds: 21600, t2Seconds: 180, runSeconds: 16200,
      totalSeconds: 42300, overallRank: 318, divisionRank: 11, genderRank: 64 },
    { bib: "377", firstName: "Sam", lastName: "Patel", ageGroup: "M40-44", gender: "M",
      swimSeconds: 4500, t1Seconds: 300, bikeSeconds: 23400, t2Seconds: 240, runSeconds: 18000,
      totalSeconds: 46440, overallRank: 712, divisionRank: 89, genderRank: 540 },
  ];

  for (const p of demo) {
    await prisma.participant.create({ data: { raceId: race.id, ...p } });
  }

  console.log(`Seeded race ${race.id} with ${demo.length} participants`);
}

main().finally(() => prisma.$disconnect());
