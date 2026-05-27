import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const race = await prisma.race.create({
    data: {
      name: "IRONMAN 70.3 Chattanooga 2026 (demo)",
      date: new Date("2026-05-17"),
      location: "Chattanooga, TN",
    },
  });

  const demo = [
    {
      bib: "364", firstName: "Jason", lastName: "George", country: "United States",
      ageGroup: "M60-64", gender: "M",
      swimSeconds: 2241, t1Seconds: 384, bikeSeconds: 8672, t2Seconds: 244, runSeconds: 5831,
      totalSeconds: 17373, overallRank: 151, divisionRank: 1, genderRank: 126,
      swimDivisionRank: 6, bikeDivisionRank: 1, runDivisionRank: 1,
      finishStatus: "FIN", qualifierSeconds: 14231, qualifierRank: 1, qualified: true,
    },
    {
      bib: "718", firstName: "Jeff", lastName: "Scarella", country: "United States",
      ageGroup: "M45-49", gender: "M",
      swimSeconds: 1989, t1Seconds: 249, bikeSeconds: 8292, t2Seconds: 122, runSeconds: 5353,
      totalSeconds: 16004, overallRank: 59, divisionRank: 1, genderRank: 54,
      swimDivisionRank: 8, bikeDivisionRank: 1, runDivisionRank: 4,
      finishStatus: "FIN", qualifierSeconds: 14368, qualifierRank: 2, qualified: true,
    },
    {
      bib: "1923", firstName: "Doug", lastName: "Covington", country: "United States",
      ageGroup: "M55-59", gender: "M",
      swimSeconds: 2178, t1Seconds: 344, bikeSeconds: 8720, t2Seconds: 199, runSeconds: 5435,
      totalSeconds: 16877, overallRank: 108, divisionRank: 1, genderRank: 89,
      swimDivisionRank: 5, bikeDivisionRank: 1, runDivisionRank: 1,
      finishStatus: "FIN", qualifierSeconds: 14455, qualifierRank: 4, qualified: true,
    },
  ];

  await prisma.participant.createMany({
    data: demo.map((p) => ({ raceId: race.id, ...p })),
  });

  console.log(`Seeded race ${race.id} with ${demo.length} participants`);
}

main().finally(() => prisma.$disconnect());
