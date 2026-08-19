export const STANDARD_VIDEO_HOURLY_RATE_USD = 20;
export const BONUS_VIDEO_HOURLY_RATE_USD = 40;

export type VideoPayMode =
  | "per-hour"
  | "per-video";

export type VideoEarningsRecord = {
  videoDuration: string;
  payMode?: VideoPayMode | null;
  payRateUsd?: number | null;
  hourlyRateUsd?: number | null;
  earningsUsd?: number | null;
};

export function parseVideoDurationToMilliseconds(
  value: string
): number | null {
  const match = value
    .trim()
    .match(/^(\d+):([0-5]\d):([0-5]\d):(\d{1,3})$/);

  if (!match) {
    return null;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = Number(match[3]);
  const milliseconds = Number(match[4]);

  if (
    !Number.isFinite(hours) ||
    !Number.isFinite(minutes) ||
    !Number.isFinite(seconds) ||
    !Number.isFinite(milliseconds)
  ) {
    return null;
  }

  return (
    hours * 60 * 60 * 1000 +
    minutes * 60 * 1000 +
    seconds * 1000 +
    milliseconds
  );
}

export function truncateVideoCurrency(
  value: number
) {
  return (
    Math.floor(
      (value + Number.EPSILON) * 100
    ) / 100
  );
}

export function getVideoPayMode(
  record: VideoEarningsRecord
): VideoPayMode {
  return record.payMode === "per-video"
    ? "per-video"
    : "per-hour";
}

export function getVideoPayRateUsd(
  record: VideoEarningsRecord
) {
  if (
    typeof record.payRateUsd === "number" &&
    Number.isFinite(record.payRateUsd) &&
    record.payRateUsd > 0
  ) {
    return record.payRateUsd;
  }

  if (
    typeof record.hourlyRateUsd === "number" &&
    Number.isFinite(record.hourlyRateUsd) &&
    record.hourlyRateUsd > 0
  ) {
    return record.hourlyRateUsd;
  }

  return STANDARD_VIDEO_HOURLY_RATE_USD;
}

export function calculateVideoEarningsUsd(
  videoDuration: string,
  payRateUsd = STANDARD_VIDEO_HOURLY_RATE_USD,
  payMode: VideoPayMode = "per-hour"
) {
  if (
    !Number.isFinite(payRateUsd) ||
    payRateUsd <= 0
  ) {
    return 0;
  }

  if (payMode === "per-video") {
    return truncateVideoCurrency(
      payRateUsd
    );
  }

  const durationMilliseconds =
    parseVideoDurationToMilliseconds(
      videoDuration
    );

  if (
    durationMilliseconds === null ||
    durationMilliseconds <= 0
  ) {
    return 0;
  }

  const durationHours =
    durationMilliseconds /
    (60 * 60 * 1000);

  return truncateVideoCurrency(
    durationHours * payRateUsd
  );
}

export function getVideoRecordEarningsUsd(
  record: VideoEarningsRecord
) {
  return calculateVideoEarningsUsd(
    record.videoDuration,
    getVideoPayRateUsd(record),
    getVideoPayMode(record)
  );
}

export function calculateVideoRecordsEarningsUsd(
  records: VideoEarningsRecord[]
) {
  return truncateVideoCurrency(
    records.reduce(
      (total, record) =>
        total +
        getVideoRecordEarningsUsd(record),
      0
    )
  );
}

export function formatVideoPayRate(
  record: VideoEarningsRecord
) {
  const rate =
    getVideoPayRateUsd(record);

  return getVideoPayMode(record) ===
    "per-video"
      ? `$${rate.toFixed(2)}/video`
      : `$${rate.toFixed(2)}/hr`;
}
