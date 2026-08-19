export function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function getEnergyLabel(value: number) {
  if (value <= 12) return "very low";
  if (value <= 37) return "low";
  if (value <= 62) return "in the middle";
  if (value <= 87) return "bright";
  return "high";
}

export function getTemperatureLabel(value: number) {
  if (value <= 12) return "cold";
  if (value <= 37) return "cool";
  if (value <= 62) return "comfortable";
  if (value <= 87) return "warm";
  return "hot";
}
