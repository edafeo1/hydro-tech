export const company = {
  name: 'Hydro-Tec Building Protection Group',
  shortName: 'Hydro-Tec',
  contact: 'Noxy Adams',
  phone: '0456 905 187',
  phoneHref: '+61456905187',
  email: 'noxy@hydrotecbuildingprotectiongroup.com.au',
  abn: '61 701 648 839',
  areas: ['Brisbane', 'Gold Coast', 'Sunshine Coast'],
};

export const services = [
  {
    slug: 'leaking-balcony-repairs', label: 'Leaking balconies', category: 'RESTORE',
    title: 'Leaking balcony repairs.<br>From the slab up.',
    subtitle: 'Remedial balcony waterproofing, from the slab to the final seal.',
    image: 'balcony.jpg', alt: 'Finished balcony with dark-grey tiles',
    lead: 'Water getting into the unit below? We investigate the cause, assess the existing system and scope the restoration. Our crew can coordinate the strip-out, screed, waterproofing, tiling and sealing.',
    signs: ['Water stains or leaks below a balcony', 'Leaks returning after re-grouting or patching', 'Poor drainage or water ponding against walls'],
    scope: [
      ['Strip-out & preparation', 'Remove the existing tiles and failed material back to a suitable substrate.'],
      ['Correct the falls', 'Lay screed so the surface drains towards the waste.'],
      ['Install the membrane', 'Prepare and detail the waterproofing system at edges, joints and penetrations.'],
      ['Tile & seal', 'Relay tiles, grout and seal, with a documented handover.'],
    ],
    faq: [
      ['Will new grout solve the leak?', 'It depends on the cause. Re-grouting will not repair a failed waterproofing membrane. An investigation comes before a recommendation.'],
      ['Do we need a separate tiler?', 'Hydro-Tec offers the restoration as one coordinated scope, including screeding, waterproofing, tiling and sealing.'],
    ],
    related: ['remedial-waterproofing', 'screeding-to-falls', 'body-corporate-remediation'],
  },
  {
    slug: 'remedial-waterproofing', label: 'Remedial waterproofing', category: 'WATERPROOF',
    title: 'Remedial waterproofing.<br>Find the source.',
    subtitle: 'Rooftops, podiums, balconies and below-ground waterproofing.',
    image: 'rooftop.jpg', alt: 'Waterproofed rooftop beside a brick wall',
    lead: 'A recurring leak deserves a clear diagnosis. We investigate water ingress, assess the substrate and detail a waterproofing scope for the area, access and existing building conditions.',
    signs: ['Water stains or drips in units, ceilings or car parks', 'Blistered, cracked or deteriorating membranes', 'Water ingress returning after local repairs'],
    scope: [
      ['Investigate', 'Trace the water entry point and assess the existing waterproofing.'],
      ['Specify the scope', 'Set out preparation, detailing, access and the proposed system.'],
      ['Prepare & install', 'Prepare the substrate and install the waterproofing to the agreed scope.'],
      ['Record & hand over', 'Provide photo records and the project handover documentation.'],
    ],
    faq: [
      ['Can a targeted repair be suitable?', 'Sometimes. The investigation should establish whether a local repair is appropriate or whether the existing system needs replacement.'],
      ['Do you work below ground?', 'Yes. We work on below-ground areas, car parks and basements. The proposed system depends on the building and defect.'],
    ],
    related: ['leaking-balcony-repairs', 'screeding-to-falls', 'body-corporate-remediation'],
  },
  {
    slug: 'facade-coatings', label: 'Facade coatings', category: 'PROTECT',
    title: 'Facade coatings.<br>Built on preparation.',
    subtitle: 'Facade preparation, repairs, joint sealing and protective coatings.',
    image: 'facade.jpg', alt: 'Rope access technician preparing a building facade',
    lead: 'The outside of a building needs a considered scope. We combine surface preparation, repairs, sealing and protective coatings, with rope access where suitable for the work.',
    signs: ['Deteriorating facade coatings', 'Failed joints or sealants', 'A facade that needs repair and renewed protection'],
    scope: [
      ['Assess the surface', 'Review the existing coating, defects and required access.'],
      ['Prepare', 'Clean and prepare the substrate for the proposed repair and coating system.'],
      ['Repair & seal', 'Address the scoped repairs and joint sealing before finishing.'],
      ['Apply & document', 'Apply the protective coating and record the work for handover.'],
    ],
    faq: [
      ['Will the building need scaffolding?', 'Rope access can be an alternative for suitable facade work. The access method needs to be assessed for the building and scope.'],
      ['Do you also handle the joint sealing?', 'Yes. Caulking and joint sealing can be included with the preparation and coating work in your written scope.'],
    ],
    related: ['rope-access', 'body-corporate-remediation', 'remedial-waterproofing'],
  },
  {
    slug: 'rope-access', label: 'Rope access', category: 'ACCESS',
    title: 'Rope access.<br>Reach the repair.',
    subtitle: 'Facade repairs, sealing and coatings at height.',
    image: 'hero.jpg', alt: 'Hydro-Tec technician working at height on a facade',
    lead: 'Rope access can make suitable facade work possible without a full scaffold installation. We assess the access together with the repair, sealing or coating scope.',
    signs: ['Facade repairs or joint sealing at height', 'Coatings needed on difficult-to-reach elevations', 'A project where access arrangements need careful planning'],
    scope: [
      ['Review the building', 'Consider the elevation, access points and required works.'],
      ['Plan the method', 'Include the proposed access method in the project scope.'],
      ['Carry out the work', 'Complete the scoped preparation, repair, sealing or coatings.'],
      ['Document', 'Capture photo evidence and provide a clear handover record.'],
    ],
    faq: [
      ['Is rope access suitable for every building?', 'No. Suitability depends on the building, access arrangements and work. It is considered as part of the assessment.'],
      ['What work can be combined?', 'Facade repairs, caulking, joint sealing and protective coatings can be considered together in the rope-access scope.'],
    ],
    related: ['facade-coatings', 'body-corporate-remediation', 'remedial-waterproofing'],
  },
  {
    slug: 'screeding-to-falls', label: 'Screeding to falls', category: 'DRAIN',
    title: 'Screeding to falls.<br>Start with the drainage.',
    subtitle: 'Correct drainage falls before the membrane and finish go down.',
    image: 'balcony-screed.jpg', alt: 'New screed laid on a balcony to correct drainage falls',
    lead: 'A surface needs to direct water towards its outlet. Screeding forms the falls beneath the waterproofing and finish, and can be coordinated with the rest of a balcony or remedial scope.',
    signs: ['Water pooling on a balcony or external deck', 'Drainage towards walls instead of the waste', 'A restoration that needs a new substrate and corrected falls'],
    scope: [
      ['Assess the levels', 'Review the substrate, outlet and existing drainage arrangement.'],
      ['Prepare the base', 'Prepare the area as part of the agreed remedial scope.'],
      ['Form the falls', 'Lay screed towards the waste before the next system layers.'],
      ['Coordinate the finish', 'Continue into waterproofing and tiling where included.'],
    ],
    faq: [
      ['Can screeding be part of the whole balcony restoration?', 'Yes. Screeding, membrane installation, tiling and sealing can be coordinated as one restoration scope.'],
      ['Does correcting falls replace waterproofing?', 'No. Falls and waterproofing perform different jobs and need to be considered together as a system.'],
    ],
    related: ['leaking-balcony-repairs', 'remedial-waterproofing', 'body-corporate-remediation'],
  },
  {
    slug: 'body-corporate-remediation', label: 'Body corporate remediation', category: 'COORDINATE',
    title: 'Body corporate remediation.<br>One coordinated scope.',
    subtitle: 'Coordinated remedial works for strata and body corporate buildings.',
    image: 'walkway.jpg', alt: 'Waterproofed walkway beside a commercial building',
    lead: 'Committees and building managers need a scope they can understand and work they can track. We investigate, scope and coordinate remedial waterproofing and related trades, with project records for the building.',
    signs: ['Balcony, rooftop or facade defects affecting a shared building', 'Several trades needed within a single remedial scope', 'Committee decisions that need a written scope and documentation'],
    scope: [
      ['Investigate the defects', 'Establish the cause and the areas that need attention.'],
      ['Prepare the scope', 'Set out the proposed system, trades and access in writing.'],
      ['Coordinate the crew', 'Bring the relevant remedial trades under one point of contact.'],
      ['Hand over the records', 'Provide photo evidence, QA records and the project handover pack.'],
    ],
    faq: [
      ['What types of buildings do you work on?', 'Apartment and unit complexes, townhouse complexes, commercial buildings and mixed-use buildings.'],
      ['What size of work is a good fit?', 'We focus on larger remedial scopes, with typical projects of $10,000–$100,000+. Small handyman work and one-off patch jobs are outside that focus.'],
    ],
    related: ['leaking-balcony-repairs', 'remedial-waterproofing', 'facade-coatings'],
  },
];

export const gallery = [
  {image:'rooftop.jpg',title:'Rooftop membrane',category:'Waterproofing',alt:'Waterproofing membrane beside a brick parapet'},
  {image:'broadway-feature.jpg',title:'Balcony restoration',category:'Balconies',alt:'Balcony restoration featured in Hydro-Tec’s project portfolio'},
  {image:'walkway.jpg',title:'Commercial walkway',category:'Waterproofing',alt:'Waterproofed walkway beside a commercial building'},
  {image:'facade.jpg',title:'Facade preparation',category:'Facades',alt:'Technician preparing a building facade by rope access'},
  {image:'balcony.jpg',title:'Tiled balcony finish',category:'Balconies',alt:'Balcony finished with large dark-grey tiles'},
  {image:'rooftop-preparation.jpg',title:'Rooftop preparation',category:'Waterproofing',alt:'Beachfront rooftop prepared for membrane work'},
  {image:'below-ground.jpg',title:'Below-ground protection',category:'Waterproofing',alt:'Below-ground area with a waterproof membrane'},
  {image:'technician-screeding.jpg',title:'Screeding on site',category:'Balconies',alt:'Tradesman laying screed on a balcony'},
];

export const faqs = [
  {group:'Getting started',q:'What projects are a good fit?',a:'We specialise in larger remedial projects for strata, body corporate, commercial and mixed-use buildings. Typical projects run from $10,000–$100,000+. Small handyman work and one-off patch jobs are outside that focus.'},
  {group:'Getting started',q:'Where do you work?',a:'Brisbane, the Gold Coast and the Sunshine Coast. Share the building suburb when you enquire so access and location can be discussed.'},
  {group:'Getting started',q:'Do we need an existing report?',a:'No. If you already have a report or scope, mention it when you get in touch. If not, discuss the problem with Noxy and arrange the next assessment step.'},
  {group:'Getting started',q:'How do we request an inspection or quote?',a:'Call Noxy directly or use the contact page to prepare an email enquiry. Describe the building, suburb and problem. A written scope is prepared after the cause and requirements have been assessed.'},
  {group:'The work',q:'Can you repair a leak without replacing everything?',a:'Sometimes. Investigation comes first. A local repair may be suitable for a localised defect; a failed system may need a broader restoration. The recommendation should follow the evidence.'},
  {group:'The work',q:'Will we need to organise separate trades?',a:'We coordinate strip-out, screeding, waterproofing, tiling, caulking and protective coatings through our own crew. The trades included in your job are set out in the agreed scope.'},
  {group:'The work',q:'How long will the work take?',a:'Duration depends on the affected area, preparation, access, the proposed system and site conditions. Ask for the expected program and any access restrictions when the written scope is discussed.'},
  {group:'The work',q:'Will the project need scaffolding?',a:'Rope access is an option for suitable facade repairs, sealing and coatings. The access method needs to be assessed for the particular building and work.'},
  {group:'Handover & warranty',q:'What records will our building receive?',a:'Photo evidence, QA records and a professional handover pack form part of our documented approach. Confirm the documentation included in your written scope.'},
  {group:'Handover & warranty',q:'What warranty applies?',a:'Ask Noxy for the written warranty terms for your project, including the duration, coverage, exclusions and any maintenance responsibilities. The scope and applicable terms should be clear before work proceeds.'},
  {group:'Handover & warranty',q:'Can we review licence and insurance information?',a:'Yes. Ask Noxy for the current licence and insurance documents relevant to the proposed work before proceeding.'},
];

export const process = [
  {number:'01',title:'Investigate',text:'Find the cause before recommending the repair.'},
  {number:'02',title:'Scope',text:'A written plan for the system, access and trades.'},
  {number:'03',title:'Remediate',text:'Preparation and installation by one coordinated crew.'},
  {number:'04',title:'Document',text:'Photo records, QA and a clear project handover.'},
];
