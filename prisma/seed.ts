import { PrismaClient, LeadStatus } from "@prisma/client";
import { businessDay, chicagoMidnight } from "../src/lib/dates";
import { stageLabels } from "../src/lib/workflows";
const db = new PrismaClient();
async function main() {
  await db.businessSettings.upsert({
    where: { id: "business" },
    update: {},
    create: { id: "business" },
  });
  for (const [position, [status, label]] of Object.entries(stageLabels).entries())
    await db.pipelineStage.upsert({
      where: { status: status as LeadStatus },
      update: {},
      create: { status: status as LeadStatus, label, position },
    });
  const category = await db.serviceCategory.upsert({
    where: { name: "Home & property services" },
    update: {},
    create: { name: "Home & property services" },
  });
  const catalog = [
    [
      "general-repairs",
      "General repairs",
      "The everyday repairs, adjustments, and small fixes on your list.",
      18000,
      false,
    ],
    [
      "furniture-assembly",
      "Furniture assembly",
      "Flat-pack furniture assembled, leveled, and ready to use.",
      14000,
      false,
    ],
    [
      "tv-mounting",
      "TV mounting",
      "A considered installation for your TV, wall, and room.",
      15500,
      false,
    ],
    [
      "door-window-repairs",
      "Door & window repairs",
      "Help with sticking doors, loose hardware, and drafty windows.",
      null,
      false,
    ],
    [
      "drywall-repair",
      "Drywall repairs",
      "Patching and surface repairs, scoped for your space.",
      17500,
      false,
    ],
    [
      "painting",
      "Painting",
      "Refresh walls, trim, and the details that make a room.",
      24000,
      false,
    ],
    [
      "carpentry",
      "Carpentry",
      "Practical repairs for trim, cabinetry, and woodwork.",
      24000,
      false,
    ],
    [
      "plumbing",
      "Plumbing-related services",
      "Describe the issue for scope, licensing, and permit review.",
      null,
      true,
    ],
    [
      "appliance-installation",
      "Appliance installation",
      "A reviewed installation plan for your appliance and connections.",
      22000,
      true,
    ],
    [
      "accent-walls",
      "Accent walls",
      "A finishing detail that gives your room a little character.",
      null,
      false,
    ],
    [
      "tile",
      "Tile installation",
      "Tile work scoped to the surface, material, and finish.",
      null,
      false,
    ],
    [
      "property-maintenance",
      "Property maintenance",
      "Ongoing repairs and punch lists for buildings and businesses.",
      null,
      false,
    ],
    [
      "apartment-turnover",
      "Apartment turnovers",
      "A coordinated repair list to get the next move-in ready.",
      45000,
      false,
    ],
    [
      "commercial-repairs",
      "Commercial repairs",
      "Considered repairs for offices, stores, and shared spaces.",
      null,
      false,
    ],
  ] as const;
  for (const [slug, name, description, price, licensingReview] of catalog)
    await db.service.upsert({
      where: { slug },
      update: {},
      create: {
        id: slug,
        slug,
        name,
        description,
        categoryId: category.id,
        startingPriceCents: price,
        pricingMode: price === null ? "QUOTE" : "STARTING",
        licensingReview,
      },
    });
  if (process.env.DEMO_MODE !== "true") {
    console.log("Business configuration and service catalog seeded; no demo records created.");
    return;
  }
  if (process.env.NODE_ENV === "production")
    throw new Error("Demo seeding is disabled in production");
  const day = businessDay();
  const now = new Date();
  const people = [
    {
      id: "demo-maya",
      name: "Maya Reynolds",
      email: "maya@example.test",
      skill: ["tv-mounting", "furniture-assembly", "general-repairs"],
    },
    {
      id: "demo-daniel",
      name: "Daniel Brooks",
      email: "daniel@example.test",
      skill: ["door-window-repairs", "general-repairs", "carpentry"],
    },
    {
      id: "demo-jamie",
      name: "Jamie Parker",
      email: "jamie@example.test",
      skill: ["drywall-repair", "painting", "apartment-turnover", "property-maintenance"],
    },
    {
      id: "demo-chris",
      name: "Chris Torres",
      email: "chris@example.test",
      skill: ["tv-mounting", "painting", "commercial-repairs", "general-repairs"],
    },
  ];
  for (const p of people) {
    await db.user.upsert({
      where: { id: p.id },
      update: {},
      create: { id: p.id, name: p.name, email: p.email, role: "TECHNICIAN" },
    });
    await db.employee.upsert({
      where: { userId: p.id },
      update: {},
      create: {
        id: `employee-${p.id}`,
        userId: p.id,
        title: p.id === "demo-maya" ? "Lead technician" : "Field technician",
        phone: "(312) 555-0100",
        classification: "DEMO",
        startDate: new Date("2025-04-01T12:00:00Z"),
        territory: ["Chicago North Side"],
        skills: { create: p.skill.map((skill) => ({ skill })) },
        availability: {
          create: {
            startAt: new Date(day.start.getTime() - 7 * 86400000),
            endAt: new Date(day.end.getTime() + 60 * 86400000),
          },
        },
      },
    });
  }
  const requests = [
    {
      name: "Emma Wilson",
      email: "emma@example.test",
      address: "1847 W Addison St",
      zip: "60613",
      title: "TV mounting & cable concealment",
      service: "tv-mounting",
      status: "NEW",
      priority: "HIGH",
      value: 24500,
      type: "RESIDENTIAL",
    },
    {
      name: "James Miller",
      email: "james@example.test",
      address: "2310 N Lincoln Ave",
      zip: "60614",
      title: "Living room drywall repair",
      service: "drywall-repair",
      status: "NEW",
      priority: "NORMAL",
      value: 35000,
      type: "RESIDENTIAL",
    },
    {
      name: "Olivia Chen",
      email: "olivia@example.test",
      address: "5230 N Clark St",
      zip: "60640",
      title: "Assemble a wardrobe & bookshelf",
      service: "furniture-assembly",
      status: "NEW",
      priority: "NORMAL",
      value: 32000,
      type: "RESIDENTIAL",
    },
    {
      name: "Ethan Davis",
      email: "ethan@example.test",
      address: "3812 N Southport Ave",
      zip: "60613",
      title: "Front door alignment & lock",
      service: "door-window-repairs",
      status: "CONTACTED",
      priority: "NORMAL",
      value: 28000,
      type: "RESIDENTIAL",
    },
    {
      name: "Nora Patel",
      email: "nora@example.test",
      address: "1710 W Berwyn Ave",
      zip: "60640",
      title: "Kitchen cabinet touch-ups",
      service: "carpentry",
      status: "CONTACTED",
      priority: "LOW",
      value: 48000,
      type: "RESIDENTIAL",
    },
    {
      name: "Harper Property Group",
      email: "harper@example.test",
      address: "4800 N Damen Ave",
      zip: "60625",
      title: "Unit 3B · Turnover punch list",
      service: "apartment-turnover",
      status: "INSPECTION",
      priority: "HIGH",
      value: 125000,
      type: "COMMERCIAL",
    },
    {
      name: "Grace Thompson",
      email: "grace@example.test",
      address: "1225 W Montrose Ave",
      zip: "60613",
      title: "Bedroom paint refresh",
      service: "painting",
      status: "FOLLOW_UP",
      priority: "NORMAL",
      value: 65000,
      type: "RESIDENTIAL",
    },
    {
      name: "Logan Square Studio",
      email: "studio@example.test",
      address: "2600 N Milwaukee Ave",
      zip: "60647",
      title: "Office shelving & wall repairs",
      service: "commercial-repairs",
      status: "ESTIMATE_SENT",
      priority: "NORMAL",
      value: 84000,
      type: "COMMERCIAL",
    },
    {
      name: "Sofia Martinez",
      email: "sofia@example.test",
      address: "1650 W Foster Ave",
      zip: "60640",
      title: "TV mounting & floating shelf",
      service: "tv-mounting",
      status: "SCHEDULED",
      priority: "NORMAL",
      value: 34500,
      type: "RESIDENTIAL",
    },
    {
      name: "Liam Anderson",
      email: "liam@example.test",
      address: "4500 N Lincoln Ave",
      zip: "60625",
      title: "Front door & hardware repair",
      service: "door-window-repairs",
      status: "IN_PROGRESS",
      priority: "HIGH",
      value: 42000,
      type: "RESIDENTIAL",
    },
    {
      name: "Lakeside Living",
      email: "lakeside@example.test",
      address: "5200 N Sheridan Rd",
      zip: "60640",
      title: "Apartment 204 · Patch & paint",
      service: "drywall-repair",
      status: "SCHEDULED",
      priority: "NORMAL",
      value: 78000,
      type: "COMMERCIAL",
    },
    {
      name: "Henry Walker",
      email: "henry@example.test",
      address: "3400 N Ashland Ave",
      zip: "60657",
      title: "Furniture assembly",
      service: "furniture-assembly",
      status: "SCHEDULED",
      priority: "NORMAL",
      value: 29000,
      type: "RESIDENTIAL",
    },
    {
      name: "Ava Robinson",
      email: "ava@example.test",
      address: "1930 W Lawrence Ave",
      zip: "60640",
      title: "Interior door repair",
      service: "door-window-repairs",
      status: "APPROVED",
      priority: "NORMAL",
      value: 31000,
      type: "RESIDENTIAL",
    },
  ] as const;
  for (const [i, r] of requests.entries()) {
    const cid = `demo-customer-${i}`;
    const pid = `demo-property-${i}`;
    const lid = `demo-lead-${i}`;
    const createdAt = new Date(now.getTime() - (i % 7) * 86400000 - 3600000);
    await db.customer.upsert({
      where: { id: cid },
      update: {},
      create: {
        id: cid,
        name: r.name,
        email: r.email,
        phone: `(312) 555-${String(110 + i).padStart(4, "0")}`,
        type: r.type,
        company: r.type === "COMMERCIAL" ? r.name : null,
        demo: true,
        source: i % 2 ? "Google search" : "Referral",
        createdAt,
      },
    });
    await db.property.upsert({
      where: { id: pid },
      update: {},
      create: {
        id: pid,
        customerId: cid,
        address: r.address,
        postalCode: r.zip,
        unit: r.type === "COMMERCIAL" ? "204" : null,
        accessInstructions:
          "DEMO: Call the customer on arrival. Coordinate building access with dispatch.",
      },
    });
    if (r.type === "COMMERCIAL")
      await db.commercialAccount.upsert({
        where: { customerId: cid },
        update: {},
        create: {
          id: `commercial-${cid}`,
          customerId: cid,
          name: r.name,
          approvalLimitCents: 150000,
          netDays: 30,
        },
      });
    await db.lead.upsert({
      where: { id: lid },
      update: {},
      create: {
        id: lid,
        customerId: cid,
        propertyId: pid,
        title: r.title,
        description: `DEMONSTRATION RECORD — Fictional customer and request.\n\n${r.title}. Please review the scope, materials, wall conditions, and access arrangements before preparing the written estimate.`,
        status: r.status,
        priority: r.priority,
        estimatedValueCents: r.value,
        source: "Demo seed",
        utmSource: i % 2 ? "google" : "referral",
        preferredDate: day.ymd,
        preferredWindow: "Office to confirm",
        createdAt,
        services: { create: { serviceId: r.service } },
        activities: {
          create: {
            type: "CREATED",
            body: "Fictional demonstration request imported by the development seed.",
            createdAt,
          },
        },
      },
    });
    if (i >= 7) {
      const eid = `demo-estimate-${i}`;
      await db.estimate.upsert({
        where: { id: eid },
        update: {},
        create: {
          id: eid,
          customerId: cid,
          leadId: lid,
          status: i === 7 ? "DRAFT" : "APPROVED",
          subtotalCents: r.value,
          totalCents: r.value,
          terms:
            "DEMONSTRATION ONLY. Scope includes listed work. Additional work requires separate written approval. No actual customer or payment.",
          expiresAt: new Date(now.getTime() + 14 * 86400000),
          sentAt: createdAt,
          approvedAt: i >= 8 ? createdAt : null,
          items: {
            create: {
              description: r.title,
              unitPriceCents: r.value,
              totalCents: r.value,
              quantity: 1,
            },
          },
        },
      });
    }
    if (i >= 8 && i <= 11) {
      const hour = [9, 10, 13, 15][i - 8];
      const startAt = new Date(day.start.getTime() + hour * 3600000);
      const endAt = new Date(startAt.getTime() + 90 * 60000);
      await db.job.upsert({
        where: { id: `demo-job-${i}` },
        update: {},
        create: {
          id: `demo-job-${i}`,
          customerId: cid,
          propertyId: pid,
          leadId: lid,
          estimateId: `demo-estimate-${i}`,
          title: r.title,
          description: `Fictional demonstration job. ${r.title}.`,
          status: i === 9 ? "IN_PROGRESS" : "ASSIGNED",
          priority: r.priority,
          startAt,
          endAt,
          quotedCents: r.value,
          requiredSkills: [r.service],
          assignments: { create: { employeeId: `employee-${people[(i - 8) % 4].id}` } },
          history: {
            create: {
              actorId: people[(i - 8) % 4].id,
              toStatus: "ASSIGNED",
              reason: "Fictional development appointment",
            },
          },
        },
      });
    }
  }
  // Six months of explicitly fictional ledger records support real report queries.
  for (let m = 0; m < 6; m++)
    for (let n = 0; n < 4; n++) {
      const paidAt = new Date(
        Date.UTC(
          now.getUTCFullYear(),
          now.getUTCMonth() - 5 + m,
          Math.min(3 + n * 4, now.getUTCDate()),
          18,
        ),
      );
      const amount = 100000 + m * 42000 + n * 18500;
      const id = `demo-invoice-${m}-${n}`;
      await db.invoice.upsert({
        where: { id },
        update: {},
        create: {
          id,
          customerId: `demo-customer-${n}`,
          status: "PAID",
          subtotalCents: amount,
          totalCents: amount,
          dueAt: paidAt,
          createdAt: paidAt,
          items: {
            create: {
              description: "DEMONSTRATION — property repair services",
              quantity: 1,
              unitPriceCents: amount,
              totalCents: amount,
            },
          },
          payments: {
            create: {
              amountCents: amount,
              provider: "DEMO_LEDGER",
              providerEventId: `demo-payment-${m}-${n}`,
              paidAt,
            },
          },
        },
      });
    }
  await db.invoice.upsert({
    where: { id: "demo-overdue" },
    update: {},
    create: {
      id: "demo-overdue",
      customerId: "demo-customer-5",
      status: "OVERDUE",
      subtotalCents: 245000,
      totalCents: 245000,
      dueAt: new Date(now.getTime() - 5 * 86400000),
      items: {
        create: {
          description: "DEMONSTRATION — turnover repairs",
          quantity: 1,
          unitPriceCents: 245000,
          totalCents: 245000,
        },
      },
    },
  });
  console.log(
    "Seed complete. Fictional demo records are labeled; demo technicians have no passwords or live integrations.",
  );
}
main().finally(async () => {
  await db.$disconnect();
});
