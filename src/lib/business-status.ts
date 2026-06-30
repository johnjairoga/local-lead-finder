import { BusinessStatus } from "@/types/business";

export interface BusinessStatusOption {
  value: BusinessStatus;
  label: string;
  emoji: string;
  description: string;
}

export const BUSINESS_STATUS_OPTIONS: BusinessStatusOption[] = [
  {
    value: BusinessStatus.NEW,
    emoji: "🆕",
    label: "New",
    description: "Lead recién descubierto.",
  },
  {
    value: BusinessStatus.NOT_CONTACTED,
    emoji: "⏳",
    label: "Not Contacted",
    description: "Aún no has hecho ningún contacto.",
  },
  {
    value: BusinessStatus.CONTACTED,
    emoji: "📞",
    label: "Contacted",
    description: "Ya hubo al menos un intento de contacto.",
  },
  {
    value: BusinessStatus.NOT_INTERESTED,
    emoji: "🚫",
    label: "Not Interested",
    description: "Respondió que no le interesa.",
  },
  {
    value: BusinessStatus.INTERESTED,
    emoji: "🤝",
    label: "Interested",
    description: "Mostró interés.",
  },
  {
    value: BusinessStatus.CLIENT,
    emoji: "✅",
    label: "Client",
    description: "Se convirtió en cliente.",
  },
];

export function getBusinessStatusOption(status: BusinessStatus): BusinessStatusOption {
  return (
    BUSINESS_STATUS_OPTIONS.find((option) => option.value === status) ??
    BUSINESS_STATUS_OPTIONS[0]
  );
}

export function formatBusinessStatusLabel(status: BusinessStatus): string {
  const option = getBusinessStatusOption(status);
  return `${option.emoji} ${option.label}`;
}
