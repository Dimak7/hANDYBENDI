export const phone = "(224) 486-3481";
export const phoneHref = "tel:+12244863481";
export const neighborhoods = [
  "Andersonville",
  "Edgewater",
  "Uptown",
  "Lakeview",
  "Lincoln Square",
  "Rogers Park",
  "Lincoln Park",
  "Logan Square",
  "Evanston",
  "Skokie",
  "Oak Park",
];
export const serviceGuides: Record<string, { headline: string; tasks: string[]; prepare: string }> =
  {
    "general-repairs": {
      headline: "The little fixes. Finally fixed.",
      tasks: [
        "Small household repairs and adjustments",
        "Loose fittings and hardware",
        "A multi-room repair list",
      ],
      prepare:
        "Send a list by room and a close-up of each issue. Tell us what parts you already have.",
    },
    "furniture-assembly": {
      headline: "From flat pack to favorite spot.",
      tasks: [
        "Flat-pack beds, desks, and storage",
        "Cabinet and shelving assembly",
        "Furniture leveling and positioning",
      ],
      prepare:
        "Include the product link or model, number of items, delivery status, and any wall-anchoring requirements.",
    },
    "tv-mounting": {
      headline: "A better view. A cleaner wall.",
      tasks: [
        "TV bracket and screen installation",
        "Placement and height planning",
        "Wall and cable-routing review",
      ],
      prepare:
        "Send the screen size, mount model, wall photos, and any building restrictions. Tell us if the wall is brick or plaster.",
    },
    "shelf-picture-hanging": {
      headline: "Straight, secure, and in the right place.",
      tasks: [
        "Shelves and storage hardware",
        "Pictures, mirrors, and wall decor",
        "Layout and wall-fixing review",
      ],
      prepare:
        "Share the item dimensions and weight, wall type if known, and a photo of the intended location.",
    },
    "caulking-patching": {
      headline: "Small details. A fresher room.",
      tasks: [
        "Caulk removal and replacement",
        "Small wall patches",
        "Surface preparation and finish review",
      ],
      prepare:
        "Send wide and close-up photos, the approximate area, and whether you have matching paint or sealant.",
    },
    "door-window-repairs": {
      headline: "Doors that close. Windows that work.",
      tasks: [
        "Door alignment and hardware",
        "Latch, hinge, and handle adjustments",
        "Window hardware and sealing review",
      ],
      prepare:
        "Tell us what happens when you open or close it. Include photos of the hardware and damaged areas.",
    },
    "drywall-repair": {
      headline: "A fresh start for a damaged wall.",
      tasks: [
        "Small holes and everyday wall damage",
        "Surface preparation and patching",
        "Finish and matching-paint review",
      ],
      prepare:
        "Send a close-up and a wider view, approximate dimensions, and details of any moisture or recurring damage.",
    },
    painting: {
      headline: "A new coat. A different feeling.",
      tasks: [
        "Walls, trim, and touch-ups",
        "Preparation and surface review",
        "Paint and finish planning",
      ],
      prepare:
        "Tell us room dimensions, ceiling height, current surface condition, and the colors or paint you have in mind.",
    },
    carpentry: {
      headline: "Made right. Fitted to your space.",
      tasks: [
        "Trim and woodwork repairs",
        "Cabinet hardware and adjustments",
        "Small carpentry projects",
      ],
      prepare:
        "Include dimensions, photos of the existing woodwork, and the finish you want to keep or match.",
    },
    plumbing: {
      headline: "Start with the drip. Understand the job.",
      tasks: [
        "Initial issue and fixture review",
        "Leak and hardware assessment",
        "Licensed-trade and permit review where required",
      ],
      prepare:
        "Describe where the problem occurs, when it started, and any previous repairs. For an active emergency, call the office.",
    },
    "appliance-installation": {
      headline: "The new appliance. Properly planned.",
      tasks: [
        "Installation space and appliance review",
        "Existing connection and clearance checks",
        "Specialist installation requirements",
      ],
      prepare:
        "Share the appliance model, installation instructions, access dimensions, and photos of the existing connections.",
    },
    "accent-walls": {
      headline: "One wall. A little more character.",
      tasks: [
        "Feature-wall layout planning",
        "Surface and material review",
        "Finish details and installation scope",
      ],
      prepare:
        "Send a photo of the space, wall dimensions, and inspiration or product links for the finish you want.",
    },
    tile: {
      headline: "A finish that fits the room.",
      tasks: [
        "Tile layout and material review",
        "Surface preparation planning",
        "Installation and finish scope",
      ],
      prepare:
        "Include area measurements, the tile product, and photos of the surface and adjoining edges.",
    },
    "property-maintenance": {
      headline: "Keep the building’s list moving.",
      tasks: [
        "Common-area repair lists",
        "Unit and building hardware",
        "Planned property maintenance requests",
      ],
      prepare:
        "Group work by location and priority. Include access arrangements and who can authorize the scope.",
    },
    "apartment-turnover": {
      headline: "Between leases. Ahead of the list.",
      tasks: [
        "Unit-by-unit repair review",
        "Doors, walls, and fitting repairs",
        "Move-in readiness punch lists",
      ],
      prepare:
        "Share the vacancy window, target move-in date, unit details, and the tasks needed before handover.",
    },
    "commercial-repairs": {
      headline: "Keep the space open for business.",
      tasks: [
        "Office and shop repair lists",
        "Furniture and fixture adjustments",
        "Work-hour and building access planning",
      ],
      prepare:
        "Describe your operating hours, task priorities, and any safety, access, or authorization requirements.",
    },
  };
export const audiences: Record<
  string,
  { eyebrow: string; title: string; intro: string; items: [string, string][]; commercial?: boolean }
> = {
  residential: {
    eyebrow: "FOR THE PLACE YOU CALL HOME",
    title: "Your home has a list. We can handle it.",
    intro:
      "From one stubborn door to a room-by-room punch list, start with what needs doing. We’ll help turn it into a clear written scope.",
    items: [
      ["Homeowners", "Combine the small repairs you keep putting off into one organized request."],
      [
        "Renters & condo owners",
        "Mount the TV, assemble the furniture, and discuss building access and COI requirements with the office.",
      ],
      [
        "A clear next step",
        "Your request goes to the office. Pricing and your appointment are confirmed before work starts.",
      ],
    ],
  },
  commercial: {
    eyebrow: "FOR THE PLACES CHICAGO WORKS",
    title: "Keep your space working as hard as you do.",
    intro:
      "Repairs and maintenance for offices, shops, hospitality spaces, and managed buildings. Tell us about access, disruption, and approval requirements from the start.",
    commercial: true,
    items: [
      [
        "Plan around your business",
        "Request preferred working windows, including after-hours needs, for the office to review.",
      ],
      [
        "A written scope",
        "List locations, tasks, and approval contacts so everyone knows what is being quoted.",
      ],
      ["Keep the details together", "One request connects the site, contact, scope, and estimate."],
    ],
  },
  landlords: {
    eyebrow: "FOR LANDLORDS",
    title: "Between tenants? Start with the punch list.",
    intro:
      "Door adjustments, wall repairs, furniture assembly, and the details that need attention before the next move-in. Send the whole list together.",
    commercial: true,
    items: [
      [
        "Apartment turnovers",
        "Share the move-out and target move-in dates, with tasks grouped by unit.",
      ],
      [
        "Access made clear",
        "Record key arrangements, tenant contacts, parking, and building rules.",
      ],
      ["Written approval", "Review the work and materials before agreeing to the visit."],
    ],
  },
  "property-management": {
    eyebrow: "FOR PROPERTY MANAGERS",
    title: "One reliable place for the repair list.",
    intro:
      "Give the office your property details, priorities, and authorization requirements in one clear brief.",
    commercial: true,
    items: [
      [
        "Multiple locations",
        "Identify each address and unit so the office can organize the scope.",
      ],
      [
        "Approval requirements",
        "Include purchase order references, spending limits, and your approval contact.",
      ],
      [
        "Building coordination",
        "Discuss COI paperwork, resident access, working hours, and reporting requirements.",
      ],
    ],
  },
  offices: {
    eyebrow: "OFFICES",
    title: "Fix the distractions. Get back to work.",
    intro:
      "Assembling workstations, hanging shelves, and repairing the little things around the office. Plan around the people using the space.",
    commercial: true,
    items: [
      ["Workstation setup", "List desks, storage, and furniture that need assembly."],
      ["Office repairs", "Share wall damage, sticking doors, and loose hardware."],
      [
        "Working hours",
        "Tell us when the office is occupied and which building approvals are needed.",
      ],
    ],
  },
  retail: {
    eyebrow: "RETAIL SPACES",
    title: "Make the space ready for your customers.",
    intro:
      "Shelves, fittings, furniture, and everyday shop repairs. Send your list and opening hours so the office can plan with you.",
    commercial: true,
    items: [
      ["Displays & fixtures", "Describe items, fixing locations, and wall surfaces."],
      ["Daily wear", "Group door, hardware, and surface repairs into one list."],
      ["Opening hours", "Request a window that limits disruption to your shop."],
    ],
  },
  restaurants: {
    eyebrow: "RESTAURANTS & HOSPITALITY",
    title: "Take care of the room around the service.",
    intro:
      "Furniture, doors, fittings, and general maintenance for hospitality spaces. Regulated systems require an appropriate specialist review.",
    commercial: true,
    items: [
      [
        "Front-of-house repairs",
        "List furniture, shelving, doors, and hardware needing attention.",
      ],
      ["Plan the visit", "Share service times, delivery access, and cleaning requirements."],
      [
        "Know the scope",
        "Gas, electrical, and specialist equipment work must be reviewed separately.",
      ],
    ],
  },
  "condo-associations": {
    eyebrow: "CONDO ASSOCIATIONS",
    title: "The shared-space list, taken care of.",
    intro:
      "Coordinate common-area repairs with a clear contact, building requirements, and written scope.",
    commercial: true,
    items: [
      ["Common areas", "Describe doors, fixtures, walls, and shared-space repairs."],
      ["Board approvals", "Provide authorization contacts and spending review requirements."],
      ["Building paperwork", "Discuss COI, access, and resident notifications with the office."],
    ],
  },
  "apartment-buildings": {
    eyebrow: "APARTMENT BUILDINGS",
    title: "Many units. One organized request.",
    intro:
      "Group tasks by unit or common area and include access arrangements. The office can review the complete list.",
    commercial: true,
    items: [
      ["Unit-by-unit details", "Identify each unit, issue, and time-sensitive access."],
      ["Common-area work", "Keep shared-space repairs visible alongside unit tasks."],
      ["Clear approvals", "Include the person responsible for confirming scope and pricing."],
    ],
  },
};
