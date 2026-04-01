import { useLoaderData } from "react-router";
import {
  Calendar, Camera, Play, Music2, Sparkles,
  Apple, ShoppingBag, ExternalLink, Check, Clock,
} from "lucide-react";
import { kvGet } from "~/lib/kv.server";
import type { OAuthTokens } from "~/lib/types";
import type { Route } from "./+types/integrations";

interface IntegrationConfig {
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  kvKey: string | null;
  authUrl: string | null;
  comingSoon: boolean;
}

const INTEGRATIONS: IntegrationConfig[] = [
  {
    name: "Google Calendar",
    description: "Sync your calendar events",
    icon: Calendar,
    color: "#4285F4",
    kvKey: "auth:google-calendar",
    authUrl: "/auth/google-calendar",
    comingSoon: false,
  },
  {
    name: "Instagram",
    description: "Connect Instagram analytics",
    icon: Camera,
    color: "#E4405F",
    kvKey: "auth:instagram",
    authUrl: "/auth/instagram",
    comingSoon: false,
  },
  {
    name: "YouTube",
    description: "Connect YouTube analytics",
    icon: Play,
    color: "#FF0000",
    kvKey: "auth:youtube",
    authUrl: "/auth/youtube",
    comingSoon: false,
  },
  {
    name: "TikTok",
    description: "Connect TikTok analytics",
    icon: Music2,
    color: "#000000",
    kvKey: "auth:tiktok",
    authUrl: "/auth/tiktok",
    comingSoon: false,
  },
  {
    name: "Anthropic AI",
    description: "Power AI features",
    icon: Sparkles,
    color: "#D97706",
    kvKey: null,
    authUrl: null,
    comingSoon: false,
  },
  {
    name: "Apple Health",
    description: "Coming Soon",
    icon: Apple,
    color: "#FF2D55",
    kvKey: null,
    authUrl: null,
    comingSoon: true,
  },
  {
    name: "Shopify",
    description: "Coming Soon",
    icon: ShoppingBag,
    color: "#96BF48",
    kvKey: null,
    authUrl: null,
    comingSoon: true,
  },
];

export function meta() {
  return [{ title: "Integrations — FlyWithGarrett" }];
}

export async function loader() {
  const [googleCal, instagram, youtube, tiktok] = await Promise.all([
    kvGet<OAuthTokens>("auth:google-calendar"),
    kvGet<OAuthTokens>("auth:instagram"),
    kvGet<OAuthTokens>("auth:youtube"),
    kvGet<OAuthTokens>("auth:tiktok"),
  ]);

  const hasAnthropicKey = !!process.env.ANTHROPIC_API_KEY;

  const statuses: Record<string, { connected: boolean; lastSynced: string | null }> = {
    "Google Calendar": {
      connected: !!googleCal,
      lastSynced: googleCal ? new Date().toISOString() : null,
    },
    Instagram: {
      connected: !!instagram,
      lastSynced: instagram ? new Date().toISOString() : null,
    },
    YouTube: {
      connected: !!youtube,
      lastSynced: youtube ? new Date().toISOString() : null,
    },
    TikTok: {
      connected: !!tiktok,
      lastSynced: tiktok ? new Date().toISOString() : null,
    },
    "Anthropic AI": {
      connected: hasAnthropicKey,
      lastSynced: hasAnthropicKey ? new Date().toISOString() : null,
    },
    "Apple Health": {
      connected: false,
      lastSynced: null,
    },
    Shopify: {
      connected: false,
      lastSynced: null,
    },
  };

  return { statuses };
}

export default function IntegrationsPage() {
  const { statuses } = useLoaderData<typeof loader>();

  const connectedCount = Object.values(statuses).filter(
    (s) => s.connected
  ).length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <p className="text-title">Integrations</p>
        <p className="text-[14px] text-[rgba(245,245,245,0.55)] mt-1">
          Connect your accounts and services
        </p>
      </div>

      {/* Summary */}
      <div className="card-static">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[12px] bg-[#34c75915] flex items-center justify-center">
            <Check className="w-5 h-5 text-[#34c759]" />
          </div>
          <div>
            <p className="text-[15px] font-medium text-[#f5f5f5]">
              {connectedCount} of {INTEGRATIONS.length} connected
            </p>
            <p className="text-[12px] text-[rgba(245,245,245,0.55)]">
              Connect more services to unlock features
            </p>
          </div>
        </div>
      </div>

      {/* Integration Grid */}
      <div className="grid md:grid-cols-2 gap-3">
        {INTEGRATIONS.map((integration) => {
          const Icon = integration.icon;
          const status = statuses[integration.name];
          const isConnected = status?.connected ?? false;

          return (
            <div key={integration.name} className="card-static">
              <div className="flex items-start gap-4">
                <div
                  className="w-10 h-10 rounded-[12px] flex items-center justify-center shrink-0"
                  style={{ backgroundColor: integration.color + "15" }}
                >
                  <Icon
                    className="w-5 h-5"
                    style={{ color: integration.color }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-[14px] font-medium text-[#f5f5f5]">
                      {integration.name}
                    </p>
                    {integration.comingSoon && (
                      <span className="pill text-[10px] !bg-[#1e1e1e] !text-[rgba(245,245,245,0.3)]">
                        Coming Soon
                      </span>
                    )}
                  </div>
                  <p className="text-[12px] text-[rgba(245,245,245,0.55)] mt-0.5">
                    {integration.description}
                  </p>
                  {isConnected && status?.lastSynced && (
                    <div className="flex items-center gap-1 mt-1.5">
                      <Clock className="w-3 h-3 text-[rgba(245,245,245,0.3)]" />
                      <span className="text-[11px] text-[rgba(245,245,245,0.3)]">
                        Last synced{" "}
                        {new Date(status.lastSynced).toLocaleDateString(
                          "en-US",
                          { month: "short", day: "numeric" }
                        )}
                      </span>
                    </div>
                  )}
                </div>
                <div className="shrink-0">
                  {integration.comingSoon ? (
                    <span className="text-[12px] text-[rgba(245,245,245,0.3)] px-3 py-1.5 rounded-full bg-[rgba(255,255,255,0.04)]">
                      Unavailable
                    </span>
                  ) : isConnected ? (
                    <span className="flex items-center gap-1.5 text-[12px] font-medium text-[#34c759] px-3 py-1.5 rounded-full bg-[#34c75912]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#34c759]" />
                      Connected
                    </span>
                  ) : integration.authUrl ? (
                    <a
                      href={integration.authUrl}
                      className="btn-primary text-[12px] flex items-center gap-1.5"
                    >
                      Connect
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : integration.name === "Anthropic AI" ? (
                    <span className="text-[12px] text-[rgba(245,245,245,0.3)] px-3 py-1.5 rounded-full bg-[rgba(255,255,255,0.04)]">
                      Set env var
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Help Section */}
      <div className="card-static !bg-[#1e1e1e]">
        <p className="text-[14px] font-medium text-[#f5f5f5] mb-1">
          Need help connecting?
        </p>
        <p className="text-[13px] text-[rgba(245,245,245,0.55)] leading-relaxed">
          Each integration requires authentication with the respective platform.
          Click "Connect" to begin the OAuth flow. For Anthropic AI, add your
          API key as the ANTHROPIC_API_KEY environment variable.
        </p>
      </div>
    </div>
  );
}
