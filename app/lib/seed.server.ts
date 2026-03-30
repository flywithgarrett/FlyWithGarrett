import { kvGet, kvSet } from "./kv.server";
import { generateId } from "./utils";
import type { HookTemplate, ContentSeries, HashtagSet, BrandConfig, AnalyticsSnapshot } from "./types";

export async function seedIfEmpty() {
  const existing = await kvGet<HookTemplate[]>("hooks:library");
  if (existing && existing.length > 0) return;

  await Promise.all([
    seedHooks(),
    seedSeries(),
    seedHashtags(),
    seedBrand(),
    seedFollowers(),
    seedAtlasProducts(),
  ]);
}

async function seedHooks() {
  const hooks: HookTemplate[] = [
    // Lifestyle & Finance
    { id: generateId(), title: "Credit Card Points", templateText: "3 ways I maximize credit card points while living in NYC", contentType: "education", pillar: "lifestyle", createdAt: new Date().toISOString() },
    { id: generateId(), title: "NYC Money Tips", templateText: "How I afford living in NYC on a pilot's schedule — the money systems nobody talks about", contentType: "education", pillar: "lifestyle", createdAt: new Date().toISOString() },
    { id: generateId(), title: "Investing at 30", templateText: "I started investing seriously at 28. Here's what my portfolio looks like 2 years later.", contentType: "truth_bomb", pillar: "lifestyle", createdAt: new Date().toISOString() },
    { id: generateId(), title: "NYC Apartment Tour", templateText: "My NYC apartment tour — how a pilot lives in the city that never sleeps.", contentType: "lifestyle", pillar: "lifestyle", createdAt: new Date().toISOString() },
    { id: generateId(), title: "Day Off NYC", templateText: "Day off in NYC — coffee, gym, Bella, and the best city in the world.", contentType: "lifestyle", pillar: "lifestyle", createdAt: new Date().toISOString() },
    { id: generateId(), title: "Morning Routine NYC", templateText: "5AM morning routine in NYC. How I optimize my day for performance & focus.", contentType: "routine", pillar: "lifestyle", createdAt: new Date().toISOString() },
    { id: generateId(), title: "Homeownership Tips", templateText: "What I wish I knew before buying property in my late 20s. NYC real estate reality.", contentType: "education", pillar: "lifestyle", createdAt: new Date().toISOString() },
    { id: generateId(), title: "NYC Hidden Gems", templateText: "NYC spots most people don't know about. Saving this for later.", contentType: "guide", pillar: "lifestyle", createdAt: new Date().toISOString() },
    { id: generateId(), title: "Finance Tips Pilot", templateText: "How I build wealth with an irregular pilot schedule. The systems that work.", contentType: "education", pillar: "lifestyle", createdAt: new Date().toISOString() },
    { id: generateId(), title: "Turning 30 NYC", templateText: "Turning 30 as a pilot, founder, and creator in NYC. Here's what I've learned.", contentType: "story", pillar: "lifestyle", createdAt: new Date().toISOString() },
    // Dog Dad
    { id: generateId(), title: "Bella NYC Day", templateText: "Day in the life with Bella — NYC edition", contentType: "vlog", pillar: "dogdad", createdAt: new Date().toISOString() },
    { id: generateId(), title: "Dog Dad Diaries", templateText: "Dog Dad Diaries: taking Bella to her favorite NYC park. She runs this city.", contentType: "series", pillar: "dogdad", createdAt: new Date().toISOString() },
    { id: generateId(), title: "Bella Weimaraner", templateText: "What nobody tells you about owning a Weimaraner in NYC", contentType: "education", pillar: "dogdad", createdAt: new Date().toISOString() },
    { id: generateId(), title: "Leaving Bella", templateText: "Leaving Bella for a 4-day trip never gets easier. Being a pilot with a dog hits different.", contentType: "emotional", pillar: "dogdad", createdAt: new Date().toISOString() },
    { id: generateId(), title: "Dog Dad NYC", templateText: "NYC dog dad life — the parks, the walks, the chaos. Bella approved guide.", contentType: "guide", pillar: "dogdad", createdAt: new Date().toISOString() },
    { id: generateId(), title: "Bella Routine", templateText: "Bella's morning routine is better than mine. NYC dog dad content.", contentType: "comedy", pillar: "dogdad", createdAt: new Date().toISOString() },
    { id: generateId(), title: "Dog Friendly NYC", templateText: "The most dog-friendly spots in NYC. Bella tested, Garrett approved.", contentType: "guide", pillar: "dogdad", createdAt: new Date().toISOString() },
    { id: generateId(), title: "FaceTime Bella", templateText: "FaceTiming my dog from 35,000 feet. Yes, I'm that dog dad.", contentType: "comedy", pillar: "dogdad", createdAt: new Date().toISOString() },
    // Peak Performance
    { id: generateId(), title: "Optimize Day", templateText: "How I optimize my day for performance & focus", contentType: "routine", pillar: "performance", createdAt: new Date().toISOString() },
    { id: generateId(), title: "Supplement Stack", templateText: "Supplements, training, and treatments that fuel my life", contentType: "education", pillar: "performance", createdAt: new Date().toISOString() },
    { id: generateId(), title: "Hangover Hack", templateText: "How I recover from a night out — hangover hack", contentType: "hack", pillar: "performance", createdAt: new Date().toISOString() },
    { id: generateId(), title: "Gym Routine", templateText: "Full gym routine — how I stay fit while flying 15 days a month", contentType: "routine", pillar: "performance", createdAt: new Date().toISOString() },
    { id: generateId(), title: "Paddle NYC", templateText: "Paddle is the new NYC workout. Here's why I'm addicted.", contentType: "lifestyle", pillar: "performance", createdAt: new Date().toISOString() },
    { id: generateId(), title: "Recovery Routine", templateText: "My recovery routine: cold plunge, sauna, stretching. The non-negotiables.", contentType: "routine", pillar: "performance", createdAt: new Date().toISOString() },
    { id: generateId(), title: "Atlas Gym", templateText: "Pre-workout hydration hits different with Atlas. Gym day vlog.", contentType: "product", pillar: "performance", createdAt: new Date().toISOString() },
    { id: generateId(), title: "Pilot Fitness", templateText: "Staying fit with an unpredictable schedule. The pilot fitness playbook.", contentType: "education", pillar: "performance", createdAt: new Date().toISOString() },
    // Entrepreneur / Atlas
    { id: generateId(), title: "Atlas BTS", templateText: "A day in the life building a CPG brand in NYC", contentType: "vlog", pillar: "entrepreneur", createdAt: new Date().toISOString() },
    { id: generateId(), title: "Atlas Mistake", templateText: "Here's 1 mistake I'm learning from while building Atlas", contentType: "truth_bomb", pillar: "entrepreneur", createdAt: new Date().toISOString() },
    { id: generateId(), title: "Building Atlas Monthly", templateText: "Month [X] of building Atlas Hydration while flying full-time. Here's what happened.", contentType: "update", pillar: "entrepreneur", createdAt: new Date().toISOString() },
    { id: generateId(), title: "CPG Business", templateText: "What nobody tells you about starting a CPG brand. The real costs.", contentType: "education", pillar: "entrepreneur", createdAt: new Date().toISOString() },
    { id: generateId(), title: "Atlas Clean Water", templateText: "Every Atlas purchase helps provide clean water. Here's why that mission matters.", contentType: "mission", pillar: "entrepreneur", createdAt: new Date().toISOString() },
    { id: generateId(), title: "Founder Schedule", templateText: "Running a company from 35,000 feet. What it's really like being a founder and pilot.", contentType: "story", pillar: "entrepreneur", createdAt: new Date().toISOString() },
    { id: generateId(), title: "Atlas Revenue", templateText: "Atlas just hit [milestone]. From idea to reality — here's the journey.", contentType: "milestone", pillar: "entrepreneur", createdAt: new Date().toISOString() },
    { id: generateId(), title: "Product Dev", templateText: "Creating a new Atlas flavor from scratch. 6 months in 60 seconds.", contentType: "bts", pillar: "entrepreneur", createdAt: new Date().toISOString() },
    { id: generateId(), title: "Side Hustle Real", templateText: "3 businesses, 1 airline job, 0 days off. The real side hustle culture nobody shows.", contentType: "truth_bomb", pillar: "entrepreneur", createdAt: new Date().toISOString() },
    { id: generateId(), title: "Why I Build", templateText: "I could just fly planes and make great money. Here's why I also build companies.", contentType: "story", pillar: "entrepreneur", createdAt: new Date().toISOString() },
    { id: generateId(), title: "Clean Ingredients", templateText: "Most electrolyte drinks are loaded with sugar. Atlas is different. Here's why.", contentType: "education", pillar: "entrepreneur", createdAt: new Date().toISOString() },
    // Pilot Life (subtle)
    { id: generateId(), title: "Pilot Subtle", templateText: "POV: watching the sunrise from 38,000 feet. Some offices are better than others.", contentType: "access", pillar: "pilot", createdAt: new Date().toISOString() },
    { id: generateId(), title: "Layover City", templateText: "24 hours in [city]. How I spend layovers.", contentType: "vlog", pillar: "pilot", createdAt: new Date().toISOString() },
    { id: generateId(), title: "Pilot Pay", templateText: "Most people think pilots make $300K starting. Here's what year one actually looked like.", contentType: "truth_bomb", pillar: "pilot", createdAt: new Date().toISOString() },
    { id: generateId(), title: "Seniority", templateText: "In aviation, a 25-year-old can outrank a 55-year-old. Seniority explained.", contentType: "education", pillar: "pilot", createdAt: new Date().toISOString() },
    { id: generateId(), title: "Night Landing", templateText: "This view never gets old. Night landing POV.", contentType: "access", pillar: "pilot", createdAt: new Date().toISOString() },
    { id: generateId(), title: "Travel Hacks", templateText: "Travel hacks after 1000+ flights. Things only pilots know.", contentType: "education", pillar: "pilot", createdAt: new Date().toISOString() },
    { id: generateId(), title: "Hotel Life", templateText: "200+ hotel rooms this year. The reality of overnight trips.", contentType: "truth_bomb", pillar: "pilot", createdAt: new Date().toISOString() },
    { id: generateId(), title: "Best Layover Cities", templateText: "Ranking the best layover cities in America. #1 might surprise you.", contentType: "ranking", pillar: "pilot", createdAt: new Date().toISOString() },
    { id: generateId(), title: "Pilot Myths", templateText: "Things people think pilots do vs. what we actually do.", contentType: "comedy", pillar: "pilot", createdAt: new Date().toISOString() },
    { id: generateId(), title: "Family Questions", templateText: "'So do you just push buttons?' — questions every pilot gets at family dinners.", contentType: "comedy", pillar: "pilot", createdAt: new Date().toISOString() },
    { id: generateId(), title: "Turbulence Panic", templateText: "Passengers during light turbulence vs. pilots. The difference is hilarious.", contentType: "comedy", pillar: "pilot", createdAt: new Date().toISOString() },
    { id: generateId(), title: "Autopilot Jokes", templateText: "'So the plane flies itself?' If I had a dollar for every time...", contentType: "comedy", pillar: "pilot", createdAt: new Date().toISOString() },
    { id: generateId(), title: "Airport Food Ranking", templateText: "Best food at [airport]. A pilot's ranking after 100+ times.", contentType: "ranking", pillar: "pilot", createdAt: new Date().toISOString() },
  ];
  await kvSet("hooks:library", hooks);
}

async function seedSeries() {
  const series: ContentSeries[] = [
    { id: generateId(), name: "Dog Dad Diaries: NYC Edition", pillar: "dogdad", episodeCount: 0, description: "Bella adventures across NYC — parks, restaurants, walks, and the chaos of being a dog dad in the city.", createdAt: new Date().toISOString() },
    { id: generateId(), name: "Optimize Life", pillar: "performance", episodeCount: 0, description: "Gym, supplements, paddle, recovery — how Garrett optimizes every aspect of performance and wellness.", createdAt: new Date().toISOString() },
    { id: generateId(), name: "Atlas BTS", pillar: "entrepreneur", episodeCount: 0, description: "Behind-the-scenes of building Atlas Hydration — product dev, meetings, warehouse visits, investor calls.", createdAt: new Date().toISOString() },
    { id: generateId(), name: "Lifestyle Finance", pillar: "lifestyle", episodeCount: 0, description: "Credit cards, investing, NYC money tips, homeownership — practical finance content for young professionals.", createdAt: new Date().toISOString() },
    { id: generateId(), name: "In The Moment", pillar: "lifestyle", episodeCount: 0, description: "Raw, unfiltered vlogs capturing authentic moments in Garrett's life — travel, NYC, friends, Bella.", createdAt: new Date().toISOString() },
    { id: generateId(), name: "Pilot Truths", pillar: "pilot", episodeCount: 0, description: "Numbered series exposing real truths about the airline pilot career — pay, lifestyle, seniority.", createdAt: new Date().toISOString() },
    { id: generateId(), name: "Layover In", pillar: "pilot", episodeCount: 0, description: "City-by-city layover guides from a pilot who's been everywhere.", createdAt: new Date().toISOString() },
    { id: generateId(), name: "Building Atlas", pillar: "entrepreneur", episodeCount: 0, description: "Monthly founder update documenting the Atlas Hydration journey.", createdAt: new Date().toISOString() },
  ];
  await kvSet("content:series", series);
}

async function seedHashtags() {
  const hashtagSets: HashtagSet[] = [
    { id: generateId(), name: "Lifestyle & NYC", pillar: "lifestyle", platform: "all", hashtags: ["#nyc", "#nyclife", "#nyclifestyle", "#creditcardpoints", "#investing", "#personalfinance", "#manhattan", "#flywithgarrett"], createdAt: new Date().toISOString() },
    { id: generateId(), name: "Dog Dad", pillar: "dogdad", platform: "all", hashtags: ["#dogdad", "#weimaraner", "#dogsofnyc", "#nycdogs", "#dogdadlife", "#bella", "#dogdaddiaries", "#flywithgarrett"], createdAt: new Date().toISOString() },
    { id: generateId(), name: "Peak Performance", pillar: "performance", platform: "all", hashtags: ["#fitness", "#supplements", "#recovery", "#gymlife", "#paddle", "#optimizelife", "#wellness", "#flywithgarrett"], createdAt: new Date().toISOString() },
    { id: generateId(), name: "Atlas & Entrepreneur", pillar: "entrepreneur", platform: "all", hashtags: ["#atlashydration", "#electrolytes", "#founder", "#entrepreneur", "#cpg", "#buildinpublic", "#startup", "#flywithgarrett"], createdAt: new Date().toISOString() },
    { id: generateId(), name: "Pilot & Travel", pillar: "pilot", platform: "all", hashtags: ["#pilot", "#aviation", "#pilotlife", "#787", "#layover", "#travel", "#cockpitview", "#flywithgarrett"], createdAt: new Date().toISOString() },
  ];
  await kvSet("hashtags:sets", hashtagSets);
}

async function seedBrand() {
  const brand: BrandConfig = {
    handle: "@flywithgarrett",
    tagline: "Living at altitude.",
    tone: ["Authentic", "Aspirational", "Approachable"],
    audiences: ["Aviation Dreamers", "Lifestyle Followers", "Founder Curious"],
    contentWorlds: ["The Flight Deck", "The Life", "The Build"],
    platformBios: {
      instagram: "787 Pilot | Atlas Hydration founder | NYC + Bella | Living at altitude.",
      youtube: "Building Atlas Hydration while flying 787s. Entrepreneur content, BTS, and real talk. NYC based.",
      tiktok: "Atlas Hydration founder | 787 Pilot | NYC | Quick business tips & real talk.",
    },
    captionTemplates: [],
  };
  await kvSet("brand:config", brand);
}

async function seedFollowers() {
  const snapshots: AnalyticsSnapshot[] = [
    { id: generateId(), platform: "instagram", followers: 806000, views: 0, reach: 0, engagementRate: 0, topPostTitle: "", recordedAt: new Date().toISOString() },
    { id: generateId(), platform: "tiktok", followers: 542000, views: 0, reach: 0, engagementRate: 0, topPostTitle: "", recordedAt: new Date().toISOString() },
    { id: generateId(), platform: "youtube", followers: 182000, views: 0, reach: 0, engagementRate: 0, topPostTitle: "", recordedAt: new Date().toISOString() },
  ];
  await kvSet("analytics:snapshots", snapshots);
}

async function seedAtlasProducts() {
  const products = [
    { id: generateId(), name: "Grapefruit", description: "Clean citrus electrolyte hydration. Zero sugar.", color: "#F97316", inStock: true },
    { id: generateId(), name: "Mixed Berry", description: "Berry blend electrolyte hydration. Zero sugar.", color: "#8B5CF6", inStock: true },
    { id: generateId(), name: "Strawberry Lemonade", description: "Sweet & tart electrolyte hydration. Zero sugar.", color: "#EC4899", inStock: true },
    { id: generateId(), name: "Lemon Lime", description: "Classic citrus electrolyte hydration. Zero sugar.", color: "#10B981", inStock: true },
  ];
  await kvSet("atlas:products", products);
}
