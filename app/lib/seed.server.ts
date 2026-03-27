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
    // Aviation - Truth Bomb
    { id: generateId(), title: "Pilot Pay Reality", templateText: "Most people think pilots make $300K starting. Here's what my first year paycheck actually looked like…", contentType: "truth_bomb", pillar: "aviation", createdAt: new Date().toISOString() },
    { id: generateId(), title: "Seniority System", templateText: "In aviation, a 25-year-old can outrank a 55-year-old. Here's how seniority actually works…", contentType: "truth_bomb", pillar: "aviation", createdAt: new Date().toISOString() },
    { id: generateId(), title: "Reserve Life", templateText: "Imagine being on-call 24/7 and having to be at the airport in 2 hours. That's reserve life as a pilot.", contentType: "truth_bomb", pillar: "aviation", createdAt: new Date().toISOString() },
    { id: generateId(), title: "Commuter Pilot", templateText: "I live in NYC but I'm based in Dallas. Here's what commuting as a pilot actually looks like…", contentType: "truth_bomb", pillar: "aviation", createdAt: new Date().toISOString() },
    { id: generateId(), title: "Pilot Schedule", templateText: "People think pilots work 9-5. I haven't had a 'normal' week in 3 years. Here's my actual schedule…", contentType: "truth_bomb", pillar: "aviation", createdAt: new Date().toISOString() },
    { id: generateId(), title: "Training Costs", templateText: "It cost me over $100K to become a pilot. Nobody talks about the financial reality of flight training.", contentType: "truth_bomb", pillar: "aviation", createdAt: new Date().toISOString() },
    { id: generateId(), title: "Upgrade Timeline", templateText: "How long does it actually take to become a Captain at a major airline? The answer might surprise you.", contentType: "truth_bomb", pillar: "aviation", createdAt: new Date().toISOString() },
    { id: generateId(), title: "Hotel Life", templateText: "I've slept in over 200 different hotel rooms this year. Here's the reality of overnight trips.", contentType: "truth_bomb", pillar: "aviation", createdAt: new Date().toISOString() },
    // Aviation - Access
    { id: generateId(), title: "Cockpit Sunrise", templateText: "POV: You're watching the sunrise from 38,000 feet in the cockpit of a 737.", contentType: "access", pillar: "aviation", createdAt: new Date().toISOString() },
    { id: generateId(), title: "Pre-flight Walk", templateText: "Walk with me through the pre-flight inspection of an American Airlines 737.", contentType: "access", pillar: "aviation", createdAt: new Date().toISOString() },
    { id: generateId(), title: "Cockpit Tour", templateText: "Everything you see in a 737 cockpit and what each button does — pilot explains.", contentType: "access", pillar: "aviation", createdAt: new Date().toISOString() },
    { id: generateId(), title: "Layover Reveal", templateText: "24 hours in [city] on a pilot layover. Here's what we actually do…", contentType: "access", pillar: "aviation", createdAt: new Date().toISOString() },
    { id: generateId(), title: "Night Landing", templateText: "POV: Landing at LAX at night from the cockpit. This never gets old.", contentType: "access", pillar: "aviation", createdAt: new Date().toISOString() },
    // Lifestyle
    { id: generateId(), title: "NYC Pilot Life", templateText: "What it's like being a pilot who lives in New York City. The best of both worlds.", contentType: "lifestyle", pillar: "lifestyle", createdAt: new Date().toISOString() },
    { id: generateId(), title: "Bella & Me", templateText: "Leaving Bella for a 4-day trip never gets easier. Being a pilot with a dog hits different.", contentType: "lifestyle", pillar: "lifestyle", createdAt: new Date().toISOString() },
    { id: generateId(), title: "NYC Apartment", templateText: "My NYC apartment tour — how a pilot lives in the city that never sleeps.", contentType: "lifestyle", pillar: "lifestyle", createdAt: new Date().toISOString() },
    { id: generateId(), title: "Turning 30", templateText: "Turning 30 as a pilot, founder, and creator in NYC. Here's what I've learned.", contentType: "lifestyle", pillar: "lifestyle", createdAt: new Date().toISOString() },
    { id: generateId(), title: "Day Off NYC", templateText: "Day off in NYC as a pilot — coffee, gym, Bella, and the best city in the world.", contentType: "lifestyle", pillar: "lifestyle", createdAt: new Date().toISOString() },
    { id: generateId(), title: "Pilot Routine", templateText: "5AM pilot morning routine before a 4-day trip. NYC edition.", contentType: "lifestyle", pillar: "lifestyle", createdAt: new Date().toISOString() },
    { id: generateId(), title: "Date Night Flying", templateText: "Planning date night when you might get called to fly to Miami in 2 hours. Pilot relationship reality.", contentType: "lifestyle", pillar: "lifestyle", createdAt: new Date().toISOString() },
    { id: generateId(), title: "NYC Hidden Gems", templateText: "Pilots know the best hidden spots in every city. Here are my NYC favorites.", contentType: "lifestyle", pillar: "lifestyle", createdAt: new Date().toISOString() },
    // Wellness / Atlas
    { id: generateId(), title: "Pilot Hydration", templateText: "Flying dehydrates you 3x faster than normal. That's why I built Atlas Hydration.", contentType: "founder", pillar: "wellness", createdAt: new Date().toISOString() },
    { id: generateId(), title: "Atlas Origin", templateText: "I built a hydration brand at 28 while flying full-time. Here's the Atlas Hydration story.", contentType: "founder", pillar: "wellness", createdAt: new Date().toISOString() },
    { id: generateId(), title: "Clean Ingredients", templateText: "Most electrolyte drinks are loaded with sugar and artificial junk. Atlas is different. Here's why.", contentType: "education", pillar: "wellness", createdAt: new Date().toISOString() },
    { id: generateId(), title: "Cockpit Hydration", templateText: "What I drink in the cockpit during a 12-hour flight day. Atlas Hydration keeps me sharp.", contentType: "product", pillar: "wellness", createdAt: new Date().toISOString() },
    { id: generateId(), title: "Gym Routine", templateText: "Staying fit as a pilot is harder than you think. Here's my layover gym routine.", contentType: "lifestyle", pillar: "wellness", createdAt: new Date().toISOString() },
    { id: generateId(), title: "Water Mission", templateText: "Every Atlas purchase helps provide clean water. Here's why that mission matters to me.", contentType: "mission", pillar: "wellness", createdAt: new Date().toISOString() },
    { id: generateId(), title: "Travel Nutrition", templateText: "How I eat healthy while flying 15+ days a month. Pilot nutrition tips.", contentType: "education", pillar: "wellness", createdAt: new Date().toISOString() },
    { id: generateId(), title: "Flavor Drop", templateText: "NEW FLAVOR DROP 🚨 Atlas Hydration [Flavor] is here. Zero sugar, full electrolytes, clean water mission.", contentType: "product", pillar: "wellness", createdAt: new Date().toISOString() },
    // Travel
    { id: generateId(), title: "Layover Guide", templateText: "8-hour layover in [city]? Here's exactly what you should do — from a pilot who's been 50+ times.", contentType: "guide", pillar: "travel", createdAt: new Date().toISOString() },
    { id: generateId(), title: "Best Layover Cities", templateText: "Ranking the best layover cities in America. #1 might surprise you.", contentType: "ranking", pillar: "travel", createdAt: new Date().toISOString() },
    { id: generateId(), title: "Airport Secrets", templateText: "Airport secrets pilots know that passengers don't. Thread 🧵", contentType: "education", pillar: "travel", createdAt: new Date().toISOString() },
    { id: generateId(), title: "Pilot Travel Hacks", templateText: "Travel hacks only pilots know. After 1000+ flights, here's what I've learned.", contentType: "education", pillar: "travel", createdAt: new Date().toISOString() },
    { id: generateId(), title: "Hotel Room Tour", templateText: "Pilot hotel room vs. what you'd expect. Layover hotel room tour in [city].", contentType: "access", pillar: "travel", createdAt: new Date().toISOString() },
    { id: generateId(), title: "Best Airport Food", templateText: "Best food at [airport]. A pilot's definitive ranking after eating here 100+ times.", contentType: "ranking", pillar: "travel", createdAt: new Date().toISOString() },
    { id: generateId(), title: "Non-Rev Travel", templateText: "Flying for free as a pilot sounds amazing until you're stuck in the airport for 8 hours. Non-rev reality.", contentType: "truth_bomb", pillar: "travel", createdAt: new Date().toISOString() },
    // Founder
    { id: generateId(), title: "Building in Public", templateText: "Month [X] of building Atlas Hydration while flying full-time. Here's what happened.", contentType: "update", pillar: "founder", createdAt: new Date().toISOString() },
    { id: generateId(), title: "SkyWay Preview", templateText: "I'm building an app that will change how pilots plan their lives. First look at SkyWay.", contentType: "launch", pillar: "founder", createdAt: new Date().toISOString() },
    { id: generateId(), title: "Founder Pilot", templateText: "Running a company from 35,000 feet. What it's really like being a founder and pilot.", contentType: "story", pillar: "founder", createdAt: new Date().toISOString() },
    { id: generateId(), title: "Revenue Milestone", templateText: "Atlas Hydration just hit [milestone]. From idea to reality — here's the journey.", contentType: "milestone", pillar: "founder", createdAt: new Date().toISOString() },
    { id: generateId(), title: "Side Hustle Reality", templateText: "3 businesses, 1 airline job, 0 days off. The real side hustle culture nobody shows you.", contentType: "truth_bomb", pillar: "founder", createdAt: new Date().toISOString() },
    { id: generateId(), title: "Why I Build", templateText: "I could just fly planes and make great money. Here's why I also build companies.", contentType: "story", pillar: "founder", createdAt: new Date().toISOString() },
    { id: generateId(), title: "Lessons Learned", templateText: "5 things I wish I knew before starting a business as a full-time pilot.", contentType: "education", pillar: "founder", createdAt: new Date().toISOString() },
    // Comedy
    { id: generateId(), title: "Passenger Types", templateText: "Types of passengers every pilot secretly knows about. Which one are you?", contentType: "comedy", pillar: "comedy", createdAt: new Date().toISOString() },
    { id: generateId(), title: "Pilot Myths", templateText: "Things people think pilots do vs. what we actually do. The accuracy is painful.", contentType: "comedy", pillar: "comedy", createdAt: new Date().toISOString() },
    { id: generateId(), title: "Family Questions", templateText: "'So do you just push buttons?' — questions every pilot gets at family dinners.", contentType: "comedy", pillar: "comedy", createdAt: new Date().toISOString() },
    { id: generateId(), title: "Dating a Pilot", templateText: "What people think dating a pilot is like vs. the reality. Sorry in advance.", contentType: "comedy", pillar: "comedy", createdAt: new Date().toISOString() },
    { id: generateId(), title: "Turbulence Panic", templateText: "Passengers during light turbulence vs. pilots during light turbulence. The difference is hilarious.", contentType: "comedy", pillar: "comedy", createdAt: new Date().toISOString() },
    { id: generateId(), title: "Crew Meals", templateText: "What pilots eat on the plane might shock you. Crew meal reveal!", contentType: "comedy", pillar: "comedy", createdAt: new Date().toISOString() },
    { id: generateId(), title: "PA Announcements", templateText: "What the pilot PA announcement says vs. what it actually means. A translator.", contentType: "comedy", pillar: "comedy", createdAt: new Date().toISOString() },
    { id: generateId(), title: "Autopilot Jokes", templateText: "'So the plane flies itself?' If I had a dollar for every time someone said this…", contentType: "comedy", pillar: "comedy", createdAt: new Date().toISOString() },
  ];
  await kvSet("hooks:library", hooks);
}

async function seedSeries() {
  const series: ContentSeries[] = [
    { id: generateId(), name: "Pilot Truths", pillar: "aviation", episodeCount: 0, description: "Numbered series exposing real truths about the airline pilot career — pay, lifestyle, seniority, and everything in between.", createdAt: new Date().toISOString() },
    { id: generateId(), name: "Layover in [City]", pillar: "travel", episodeCount: 0, description: "City-by-city layover guides from a pilot who's been everywhere. Food, spots, and hidden gems.", createdAt: new Date().toISOString() },
    { id: generateId(), name: "Building Atlas", pillar: "founder", episodeCount: 0, description: "Monthly founder update documenting the journey of building Atlas Hydration from the cockpit.", createdAt: new Date().toISOString() },
    { id: generateId(), name: "Life at 30", pillar: "lifestyle", episodeCount: 0, description: "Reflections, lessons, and adventures from turning 30 as a pilot, founder, and creator in NYC.", createdAt: new Date().toISOString() },
  ];
  await kvSet("content:series", series);
}

async function seedHashtags() {
  const hashtagSets: HashtagSet[] = [
    { id: generateId(), name: "Aviation Core", pillar: "aviation", platform: "all", hashtags: ["#pilot", "#aviation", "#pilotlife", "#airline", "#americanairlines", "#737", "#cockpit", "#avgeek", "#flyguy", "#flywithgarrett"], createdAt: new Date().toISOString() },
    { id: generateId(), name: "NYC Lifestyle", pillar: "lifestyle", platform: "all", hashtags: ["#nyc", "#newyork", "#nyclife", "#manhattan", "#nyclifestyle", "#citylife", "#newyorkcity", "#nycliving", "#flywithgarrett"], createdAt: new Date().toISOString() },
    { id: generateId(), name: "Wellness & Atlas", pillar: "wellness", platform: "all", hashtags: ["#hydration", "#atlashydration", "#electrolytes", "#wellness", "#health", "#cleanwater", "#zerosugar", "#fitness", "#flywithgarrett"], createdAt: new Date().toISOString() },
    { id: generateId(), name: "Travel", pillar: "travel", platform: "all", hashtags: ["#travel", "#layover", "#explore", "#travelgram", "#wanderlust", "#airport", "#pilottravel", "#travellife", "#flywithgarrett"], createdAt: new Date().toISOString() },
    { id: generateId(), name: "Founder Journey", pillar: "founder", platform: "all", hashtags: ["#founder", "#entrepreneur", "#startup", "#buildinpublic", "#sidehustle", "#ceo", "#business", "#grind", "#flywithgarrett"], createdAt: new Date().toISOString() },
  ];
  await kvSet("hashtags:sets", hashtagSets);
}

async function seedBrand() {
  const brand: BrandConfig = {
    handle: "@flywithgarrett",
    tagline: "Living at altitude.",
    tone: ["Confident", "Aspirational", "Grounded", "Funny", "Self-aware"],
    audiences: ["Aviation Dreamers", "Lifestyle Followers", "Founder Curious"],
    contentWorlds: ["The Flight Deck", "The Life", "The Build"],
    platformBios: {
      instagram: "✈️ American Airlines Pilot | 🧊 @atlashydration founder | 📱 Building @skyway.app | NYC 🗽 | Living at altitude.",
      tiktok: "AA Pilot ✈️ | Atlas Hydration founder 🧊 | NYC 🗽 | The pilot internet chose.",
      youtube: "American Airlines pilot sharing the real aviation life. Founder of Atlas Hydration. NYC based. New videos every Saturday.",
      threads: "Pilot thoughts at altitude. @flywithgarrett everywhere else.",
      x: "AA 737 pilot. Building @atlashydration & @skywayapp. NYC. Thoughts from 38,000ft.",
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
    { id: generateId(), platform: "threads", followers: 149000, views: 0, reach: 0, engagementRate: 0, topPostTitle: "", recordedAt: new Date().toISOString() },
    { id: generateId(), platform: "x", followers: 1900, views: 0, reach: 0, engagementRate: 0, topPostTitle: "", recordedAt: new Date().toISOString() },
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
