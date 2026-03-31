import { kvGet, kvSet } from "./kv.server";

interface WeatherData {
  temperature: number;
  description: string;
  icon: string;
}

export async function getNYCWeather(): Promise<WeatherData> {
  const cacheKey = `cache:weather:${new Date().toISOString().split("T")[0]}:${Math.floor(new Date().getHours() / 2)}`;
  const cached = await kvGet<WeatherData>(cacheKey);
  if (cached) return cached;

  try {
    const res = await fetch(
      "https://api.open-meteo.com/v1/forecast?latitude=40.7128&longitude=-74.006&current=temperature_2m,weather_code&temperature_unit=fahrenheit&timezone=America/New_York"
    );
    const data = await res.json();
    const temp = Math.round(data.current?.temperature_2m ?? 70);
    const code = data.current?.weather_code ?? 0;
    const desc = weatherCodeToDescription(code);
    const icon = weatherCodeToIcon(code);
    const weather = { temperature: temp, description: desc, icon };
    await kvSet(cacheKey, weather);
    return weather;
  } catch {
    return { temperature: 70, description: "Clear", icon: "☀" };
  }
}

function weatherCodeToDescription(code: number): string {
  if (code === 0) return "Clear skies";
  if (code <= 3) return "Partly cloudy";
  if (code <= 49) return "Foggy";
  if (code <= 59) return "Drizzle";
  if (code <= 69) return "Rain";
  if (code <= 79) return "Snow";
  if (code <= 82) return "Rain showers";
  if (code <= 86) return "Snow showers";
  if (code >= 95) return "Thunderstorm";
  return "Cloudy";
}

function weatherCodeToIcon(code: number): string {
  if (code === 0) return "☀";
  if (code <= 3) return "⛅";
  if (code <= 49) return "🌫";
  if (code <= 69) return "🌧";
  if (code <= 79) return "🌨";
  if (code <= 86) return "❄";
  if (code >= 95) return "⛈";
  return "☁";
}
